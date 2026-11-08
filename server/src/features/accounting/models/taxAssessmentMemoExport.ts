import type { TaxAssessment } from 'generated/prisma';
import { MemoriaCalculoSchema } from './taxAssessmentCalc';
import { isLalurMes, isLalurQuarter, periodoBounds, type LalurPeriodo } from './Lalur.model';
import { linhaEcfDoPasso, linhaEcfDoResumo, type LinhaEcf } from './taxAssessmentEcfLinhas';
import { RastreioApuracaoSchema, type RastreioLinha } from './taxAssessmentRastreio';
import { ultimoDiaUtilDoMesSeguinte } from '../../../lib/ibsCbsApuracao';

/** Os feriados que `ultimoDiaUtilDoMesSeguinte` recebe (a fotografia `FERIADO_NACIONAL` do LEGAL-PARAMS). */
export type Feriados = Parameters<typeof ultimoDiaUtilDoMesSeguinte>[2];

/**
 * X7 Fase C PR-1 — memória de cálculo das apurações no pacote do contador (`EXPORT_TAX_ASSESSMENT_MEMO`).
 * BRIEF `docs/accounting/BE-INCR-TAX-ASSESSMENT-C-brief.md` itens 3–8, 10 e 12; forks F-TC-5 (a) e F-TC-6 (a)
 * ratificados em 06/10 (D-2026-10-06-X7-FASE-C-FORKS). Puro: sem I/O, sem recálculo — só transporta o que
 * foi confirmado (`memoria` persistida + colunas do model).
 *
 * EMENDA RASTREIO (`BE-INCR-TAX-ASSESSMENT-C-EMENDA-RASTREIO-brief.md` itens 6–10; F-RT-1..6 ratificados em 03/11): a
 * origem de cada linha (`rastreio` persistido na confirmação), as linhas `RASTREIO` por conta, a versão dos parâmetros
 * legais e o vencimento do DARF.
 */

/**
 * Colunas da planilha (BRIEF C §2.1, `MemoLinhaExport`), na ordem. EMENDA RASTREIO (item 6, contrato §2.2): as 11 novas
 * entram ao FIM — as 16 primeiras ficam idênticas às de antes da emenda. Emenda C8 (03/11, nota D-2026-11-02-DELEGACAO-DONO §9):
 * `registroEcf` e `linhaEcf` também ao FIM, depois das colunas do RASTREIO — vazias quando o passo não tem linha na ECF.
 */
export const MEMO_COLUMNS = [
  'anoCalendario', 'periodo', 'tributo', 'regime', 'forma', 'modo', 'codigoReceita',
  'tabelaVersao', 'confirmedAt', 'apuracaoId', 'substitui', 'tipoLinha',
  'codigo', 'descricao', 'valorCents', 'fonte',
  'vencimentoDarf', 'parametrosIds', 'parametrosSha256', 'origemTipo', 'origemApuracaoId', 'origemPeriodo',
  'accountCode', 'accountName', 'origemFrom', 'origemTo', 'saldoFinalCents',
  'registroEcf', 'linhaEcf',
] as const;

const ecf = (l: LinhaEcf | null): [string, string] => (l ? [l.registro, l.linha] : ['', '']);

/** F-TC-6 (a): linhas `RESUMO` lidas das colunas do model (S1), antes das `MEMORIA` da mesma apuração. */
const RESUMO_COLUNAS = [
  ['base', 'baseCents'],
  ['devido', 'devidoCents'],
  ['deducoes', 'deducoesCents'],
  ['aPagar', 'aPagarCents'],
  ['saldoNegativo', 'saldoNegativoCents'],
  ['diferencaPostergada', 'diferencaPostergadaCents'],
] as const;

export interface MemoWindow {
  periodStart: string; // AAAA-MM-DD
  periodEnd: string; // AAAA-MM-DD
}

/** Anos-calendário tocados pela janela (de onde o serviço lê `findConfirmedByYear`). */
export function anosDaJanela(w: MemoWindow): number[] {
  const de = Number(w.periodStart.slice(0, 4));
  const ate = Number(w.periodEnd.slice(0, 4));
  const anos: number[] = [];
  for (let a = de; a <= ate; a += 1) anos.push(a);
  return anos;
}

/**
 * Item 3 + F-TC-5 (a): entra a apuração `CONFIRMED`, viva, cujo `periodoBounds(anoCalendario, periodo)` cabe
 * inteiro na janela. Ordem: `anoCalendario`, `periodo`, `tributo`. Item 10: sem filtro por tributo.
 */
export function selecionarApuracoes(rows: readonly TaxAssessment[], w: MemoWindow): TaxAssessment[] {
  const from = new Date(`${w.periodStart}T00:00:00.000Z`).getTime();
  const to = new Date(`${w.periodEnd}T23:59:59.999Z`).getTime();
  return rows
    .filter((r) => r.status === 'CONFIRMED' && r.deletedAt === null)
    .filter((r) => {
      const b = periodoBounds(r.anoCalendario, r.periodo as LalurPeriodo);
      return b.from.getTime() >= from && b.to.getTime() <= to;
    })
    .sort((a, b) => a.anoCalendario - b.anoCalendario || a.periodo.localeCompare(b.periodo) || a.tributo.localeCompare(b.tributo));
}

/**
 * EMENDA RASTREIO item 9 (F-RT-3 a: só a quota única) — vencimento do DARF de IRPJ/CSLL, Lei 9.430/1996 (acervo
 * ctresb/leis, compilada; dossiê `pesquisas-legais/pc1-vencimento-darf-irpj-csll` [D01]):
 *  - trimestral `T0n`: último dia útil do mês seguinte ao fim do trimestre (art. 5º caput);
 *  - estimativa mensal `A01..A12`: último dia útil do mês seguinte (art. 6º caput; dezembro ⇒ janeiro, § 3º);
 *  - ajuste anual `A00`: último dia útil de março do ano seguinte (art. 6º § 1º I);
 *  - CSLL: as mesmas (art. 28).
 * Tributo federal ⇒ só feriado nacional (`codMun = null`).
 */
export function vencimentoQuotaUnica(anoCalendario: number, periodo: LalurPeriodo, feriados: Feriados): string {
  if (periodo === 'A00') return ultimoDiaUtilDoMesSeguinte(anoCalendario + 1, 2, feriados, null);
  if (isLalurMes(periodo)) return ultimoDiaUtilDoMesSeguinte(anoCalendario, Number(periodo.slice(1)), feriados, null);
  return ultimoDiaUtilDoMesSeguinte(anoCalendario, Number(periodo.slice(1)) * 3, feriados, null);
}

/** Item 9: só IRPJ/CSLL têm a regra; PIS/COFINS (X8, mesmo model, `M01..M12`) saem com a coluna vazia. */
function vencimentoDaApuracao(r: TaxAssessment, feriados: Feriados): string {
  const periodoIrpjCsll = r.periodo === 'A00' || isLalurMes(r.periodo) || isLalurQuarter(r.periodo);
  const irpjCsll = r.tributo === 'IRPJ' || r.tributo === 'CSLL';
  return irpjCsll && periodoIrpjCsll ? vencimentoQuotaUnica(r.anoCalendario, r.periodo as LalurPeriodo, feriados) : '';
}

/** Item 4: memória persistida inválida não é silenciada — erro sem classe HTTP ⇒ 500, com o id. */
export class MemoriaInvalidaError extends Error {
  constructor(public readonly apuracaoId: string) {
    super(`Memória de cálculo inválida na apuração ${apuracaoId}.`);
    this.name = 'MemoriaInvalidaError';
  }
}

/** EMENDA RASTREIO item 1: rastreio persistido inválido também não é silenciado (500 com o id). */
export class RastreioPersistidoInvalidoError extends Error {
  constructor(public readonly apuracaoId: string) {
    super(`Rastreio da memória de cálculo inválido na apuração ${apuracaoId}.`);
    this.name = 'RastreioPersistidoInvalidoError';
  }
}

/** Item 8: ids das linhas de lei do cálculo, ordenados e `;`-separados; vazio antes do PR-4 do LEGAL-PARAMS. */
function parametrosIdsDe(r: TaxAssessment): string {
  return Array.isArray(r.parametrosIds) ? r.parametrosIds.map(String).sort().join(';') : '';
}

/**
 * Itens 5, 7, 8: formato longo, uma linha por `MemoriaLinha`, precedida das linhas `RESUMO`; centavos em string inteira.
 * EMENDA RASTREIO (itens 6–9): `RESUMO*` → (`MEMORIA` → `RASTREIO*`)*; uma `RASTREIO` por conta da linha-mãe, com
 * `codigo` = o da mãe, `descricao` = nome da conta, `valorCents` = movimento, `fonte` = 'razão'. Apuração anterior à
 * emenda (`rastreio` nulo) sai sem `RASTREIO` e com as colunas de origem vazias; vencimento e parâmetros vêm do model.
 * Emenda C8: `registroEcf`/`linhaEcf` ao fim de cada `RESUMO` e `MEMORIA`; `RASTREIO` não é passo da ECF, sai vazio.
 */
export function linhasDaApuracao(r: TaxAssessment, feriados: Feriados): string[][] {
  const parsed = MemoriaCalculoSchema.safeParse(r.memoria);
  if (!parsed.success) throw new MemoriaInvalidaError(r.id);
  let rastreio: Map<string, RastreioLinha> | null = null;
  if (r.rastreio !== null) {
    const rp = RastreioApuracaoSchema.safeParse(r.rastreio);
    if (!rp.success) throw new RastreioPersistidoInvalidoError(r.id);
    rastreio = new Map(rp.data.map((l) => [l.codigo, l]));
  }
  const prefixo = [
    String(r.anoCalendario), r.periodo, r.tributo, r.regime, r.forma, r.modo, r.codigoReceita,
    r.tabelaVersao, r.confirmedAt.toISOString(), r.id, r.supersedesId ?? '',
  ];
  const daApuracao = [vencimentoDaApuracao(r, feriados), parametrosIdsDe(r), r.parametrosSha256 ?? ''];
  const semConta = ['', '', '', '', ''];
  const resumo = RESUMO_COLUNAS.map(([codigo, coluna]) => [
    ...prefixo, 'RESUMO', codigo, coluna, (r[coluna] as bigint).toString(), `TaxAssessment.${coluna}`,
    ...daApuracao, '', '', '', ...semConta,
    ...ecf(linhaEcfDoResumo(r, codigo)),
  ]);
  const memoria = parsed.data.flatMap((l) => {
    const o = rastreio?.get(l.codigo);
    const mae = [
      ...prefixo, 'MEMORIA', l.codigo, l.descricao, l.valorCents, l.fonte,
      ...daApuracao, o?.origemTipo ?? '', o?.origemApuracaoId ?? '', o?.origemPeriodo ?? '', ...semConta,
      ...ecf(linhaEcfDoPasso(r, l, parsed.data)),
    ];
    const contas = (o?.contas ?? []).map((c) => [
      ...prefixo, 'RASTREIO', l.codigo, c.accountName, c.movimentoCents, 'razão',
      ...daApuracao, 'RAZAO', '', '', c.accountCode, c.accountName, c.from, c.to, c.saldoFinalCents ?? '',
      '', '',
    ]);
    return [mae, ...contas];
  });
  return [...resumo, ...memoria];
}

/** Item 6: linha-meta no topo (precedente: `EXPORT_ENTRY_SAMPLE`). EMENDA RASTREIO item 10: `rastreio=v1` ao fim. */
export function linhaMeta(w: MemoWindow, apuracoes: number, geradoEm: Date): string {
  return `# kind=EXPORT_TAX_ASSESSMENT_MEMO; periodStart=${w.periodStart}; periodEnd=${w.periodEnd}; apuracoes=${apuracoes}; geradoEm=${geradoEm.toISOString()}; rastreio=v1`;
}
