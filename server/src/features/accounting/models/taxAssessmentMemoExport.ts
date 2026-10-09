import type { TaxAssessment } from 'generated/prisma';
import { MemoriaCalculoSchema } from './taxAssessmentCalc';
import { periodoBounds, type LalurPeriodo } from './Lalur.model';

/**
 * X7 Fase C PR-1 — memória de cálculo das apurações no pacote do contador (`EXPORT_TAX_ASSESSMENT_MEMO`).
 * BRIEF `docs/accounting/BE-INCR-TAX-ASSESSMENT-C-brief.md` itens 3–8, 10 e 12; forks F-TC-5 (a) e F-TC-6 (a)
 * ratificados em 06/10 (D-2026-10-06-X7-FASE-C-FORKS). Puro: sem I/O, sem recálculo — só transporta o que
 * foi confirmado (`memoria` persistida + colunas do model).
 */

/** Colunas da planilha (BRIEF C §2.1, `MemoLinhaExport`), na ordem. */
export const MEMO_COLUMNS = [
  'anoCalendario', 'periodo', 'tributo', 'regime', 'forma', 'modo', 'codigoReceita',
  'tabelaVersao', 'confirmedAt', 'apuracaoId', 'substitui', 'tipoLinha',
  'codigo', 'descricao', 'valorCents', 'fonte',
] as const;

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

/** Item 4: memória persistida inválida não é silenciada — erro sem classe HTTP ⇒ 500, com o id. */
export class MemoriaInvalidaError extends Error {
  constructor(public readonly apuracaoId: string) {
    super(`Memória de cálculo inválida na apuração ${apuracaoId}.`);
    this.name = 'MemoriaInvalidaError';
  }
}

/** Itens 5, 7, 8: formato longo, uma linha por `MemoriaLinha`, precedida das linhas `RESUMO`; centavos em string inteira. */
export function linhasDaApuracao(r: TaxAssessment): string[][] {
  const parsed = MemoriaCalculoSchema.safeParse(r.memoria);
  if (!parsed.success) throw new MemoriaInvalidaError(r.id);
  const prefixo = [
    String(r.anoCalendario), r.periodo, r.tributo, r.regime, r.forma, r.modo, r.codigoReceita,
    r.tabelaVersao, r.confirmedAt.toISOString(), r.id, r.supersedesId ?? '',
  ];
  const resumo = RESUMO_COLUNAS.map(([codigo, coluna]) => [
    ...prefixo, 'RESUMO', codigo, coluna, (r[coluna] as bigint).toString(), `TaxAssessment.${coluna}`,
  ]);
  const memoria = parsed.data.map((l) => [...prefixo, 'MEMORIA', l.codigo, l.descricao, l.valorCents, l.fonte]);
  return [...resumo, ...memoria];
}

/** Item 6: linha-meta no topo (precedente: `EXPORT_ENTRY_SAMPLE`). */
export function linhaMeta(w: MemoWindow, apuracoes: number, geradoEm: Date): string {
  return `# kind=EXPORT_TAX_ASSESSMENT_MEMO; periodStart=${w.periodStart}; periodEnd=${w.periodEnd}; apuracoes=${apuracoes}; geradoEm=${geradoEm.toISOString()}`;
}
