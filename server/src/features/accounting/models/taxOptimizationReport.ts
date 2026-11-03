import { canonicalSha256 } from './taxOptimization';
import type { CODIGOS_LINHA_MEDIDA, TaxOptimizationReport, TaxOptimizationReportLinha } from '../dtos/TaxOptimizationDto';

/**
 * EFICIENCIA-FISCAL PR-4 itens 22–23 (BRIEF BE-INCR-EFICIENCIA-FISCAL; ADR-INCR-EFICIENCIA-FISCAL D9, I-10, I-11; decisões do
 * dono #5 e #6 em D-2026-10-28-EFICIENCIA-FISCAL-PR4-EXECUCAO) — relatório de economia por competência, PURO.
 *
 * - Sugestões: só ACCEPTED somam (I-11); as outras entram na contagem. O mês de cada uma (#5): COMPETENCIA = o próprio;
 *   SALE/SALE_KIT = o mês da venda (subrazão); o resto (UNIT, ANO, PARTNER…) = o mês da decisão no fuso do escopo.
 * - Medida (#6), só no ME/EPP do Simples: segregação = DAS sem as marcas − DAS com elas; desconto = Σ desconto incondicional
 *   do mês × DAS ÷ receita do PA (a receita bruta não inclui o desconto incondicional — LC 123 art. 3º § 1º).
 * - Consumidas (item 22): retenções sofridas e crédito não tomado ficam NAO_DISPONIVEL com o nó citado — o dado não existe
 *   em `main` (conferido no código em 28/10; ver a cédula).
 */

export interface SugestaoDoRelatorio {
  id: string;
  practice: string;
  subjectType: string;
  subjectId: string;
  status: string;
  estimatedSavingCents: bigint;
  legalBasis: unknown;
  decidedAt: Date | null;
  createdAt: Date;
}

export interface MedidaDoSimples {
  dasCents: bigint;
  dasSemSegregacaoCents: bigint | null;
  receitaPaCents: bigint;
  descontoIncondicionalCents: bigint;
}

const SUJEITOS_DE_VENDA = new Set(['SALE', 'SALE_KIT']);

/** #5 — em que competência a sugestão produz efeito. */
export function competenciaDaSugestao(s: SugestaoDoRelatorio, competenciaDaVenda: ReadonlyMap<string, string>, diaNoEscopo: (d: Date) => string): string {
  if (s.subjectType === 'COMPETENCIA' && /^\d{4}-\d{2}$/.test(s.subjectId)) return s.subjectId;
  if (SUJEITOS_DE_VENDA.has(s.subjectType)) {
    const daVenda = competenciaDaVenda.get(s.subjectId.split(':')[0]);
    if (daVenda) return daVenda;
  }
  return diaNoEscopo(s.decidedAt ?? s.createdAt).slice(0, 7);
}

/** O saleId do assunto, para buscar o mês da venda (SALE_KIT = `saleId:kit`). */
export function saleIdDoAssunto(s: Pick<SugestaoDoRelatorio, 'subjectType' | 'subjectId'>): string | null {
  return SUJEITOS_DE_VENDA.has(s.subjectType) ? s.subjectId.split(':')[0] : null;
}

const baseLegal = (v: unknown): TaxOptimizationReportLinha['legalBasis'] =>
  Array.isArray(v) ? v.map((l) => ({ norma: String((l as { norma?: unknown }).norma ?? ''), artigo: String((l as { artigo?: unknown }).artigo ?? '') })) : [];

const BASE_SEGREGACAO = [
  { norma: 'LC 123/2006', artigo: 'art. 18 § 4º-A' },
  { norma: 'Res. CGSN 140/2018', artigo: 'art. 25 §§ 6º e 8º' },
];
const BASE_DESCONTO = [{ norma: 'LC 123/2006', artigo: 'art. 3º § 1º' }];

/** Item 22 — as linhas que só consomem dado de outro nó (o dado não existe em `main`). */
export const LINHAS_CONSUMIDAS: readonly TaxOptimizationReportLinha[] = [
  {
    tipo: 'CONSUMIDA',
    codigo: 'RETENCAO_SOFRIDA',
    suggestionId: null,
    disponivel: false,
    economiaCents: null,
    legalBasis: [],
    detalhe: 'retenções sofridas do mês: o RETENCOES-FONTE ainda não grava a retenção sofrida (TaxWithholding SUFFERED)',
    noDependente: 'RETENCOES-FONTE',
  },
  {
    tipo: 'CONSUMIDA',
    codigo: 'CREDITO_NAO_TOMADO',
    suggestionId: null,
    disponivel: false,
    economiaCents: null,
    legalBasis: [],
    detalhe: 'crédito de IBS/CBS não tomado: o IBS-CBS-2027 grava o crédito PENDENTE de extinção (LC 214 art. 47), não o crédito a que se tem direito e não foi apropriado',
    noDependente: 'IBS-CBS-2027',
  },
];

const naoDisponivel = (codigo: (typeof CODIGOS_LINHA_MEDIDA)[number], legalBasis: TaxOptimizationReportLinha['legalBasis'], detalhe: string): TaxOptimizationReportLinha => ({
  tipo: 'MEDIDA',
  codigo,
  suggestionId: null,
  disponivel: false,
  economiaCents: null,
  legalBasis,
  detalhe,
  noDependente: null,
});

/** #6 — as duas linhas medidas. `medida = null` ⇒ fora do ME/EPP do Simples (motivo no detalhe). */
export function linhasMedidas(medida: MedidaDoSimples | null, motivoSemMedida: string): TaxOptimizationReportLinha[] {
  if (medida === null) {
    return [naoDisponivel('SEGREGACAO_MEDIDA', BASE_SEGREGACAO, motivoSemMedida), naoDisponivel('DESCONTO_INCONDICIONAL_MEDIDO', BASE_DESCONTO, motivoSemMedida)];
  }
  const seg = medida.dasSemSegregacaoCents === null ? 0n : medida.dasSemSegregacaoCents - medida.dasCents;
  const desconto = medida.receitaPaCents > 0n ? (medida.descontoIncondicionalCents * medida.dasCents) / medida.receitaPaCents : 0n;
  return [
    {
      tipo: 'MEDIDA',
      codigo: 'SEGREGACAO_MEDIDA',
      suggestionId: null,
      disponivel: true,
      economiaCents: (seg > 0n ? seg : 0n).toString(),
      legalBasis: BASE_SEGREGACAO,
      detalhe:
        medida.dasSemSegregacaoCents === null
          ? 'nenhuma receita do PA segregada (monofásico, ICMS-ST ou ISS retido)'
          : `DAS sem segregação ${medida.dasSemSegregacaoCents} − DAS apurado ${medida.dasCents} (centavos)`,
      noDependente: null,
    },
    {
      tipo: 'MEDIDA',
      codigo: 'DESCONTO_INCONDICIONAL_MEDIDO',
      suggestionId: null,
      disponivel: true,
      economiaCents: desconto.toString(),
      legalBasis: BASE_DESCONTO,
      detalhe: `desconto incondicional do mês ${medida.descontoIncondicionalCents} × DAS ${medida.dasCents} ÷ receita do PA ${medida.receitaPaCents} (centavos)`,
      noDependente: null,
    },
  ];
}

export function montarRelatorio(args: {
  competencia: string;
  unitId: string;
  sugestoes: readonly SugestaoDoRelatorio[];
  competenciaDaVenda: ReadonlyMap<string, string>;
  diaNoEscopo: (d: Date) => string;
  medida: MedidaDoSimples | null;
  motivoSemMedida: string;
}): TaxOptimizationReport {
  const doMes = args.sugestoes
    .filter((s) => competenciaDaSugestao(s, args.competenciaDaVenda, args.diaNoEscopo) === args.competencia)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
  const aceitas: TaxOptimizationReportLinha[] = doMes
    .filter((s) => s.status === 'ACCEPTED')
    .map((s) => ({
      tipo: 'SUGESTAO_ACEITA',
      codigo: s.practice,
      suggestionId: s.id,
      disponivel: true,
      economiaCents: (s.estimatedSavingCents > 0n ? s.estimatedSavingCents : 0n).toString(),
      legalBasis: baseLegal(s.legalBasis),
      detalhe: `${s.subjectType} ${s.subjectId}`,
      noDependente: null,
    }));
  const medidas = linhasMedidas(args.medida, args.motivoSemMedida);
  const soma = (ls: readonly TaxOptimizationReportLinha[]) => ls.reduce((t, l) => t + (l.economiaCents === null ? 0n : BigInt(l.economiaCents)), 0n);
  const aceitasCents = soma(aceitas);
  const medidaCents = soma(medidas);
  const contar = (st: string) => doMes.filter((s) => s.status === st).length;
  return {
    competencia: args.competencia,
    unitId: args.unitId,
    linhas: [...aceitas, ...medidas, ...LINHAS_CONSUMIDAS],
    totais: { aceitasCents: aceitasCents.toString(), medidaCents: medidaCents.toString(), totalCents: (aceitasCents + medidaCents).toString() },
    contagem: { PROPOSED: contar('PROPOSED'), REJECTED: contar('REJECTED'), EXPIRED: contar('EXPIRED') },
    parametrosSha256: canonicalSha256({
      competencia: args.competencia,
      sugestoes: doMes.map((s) => [s.id, s.status, s.estimatedSavingCents]),
      medida: args.medida,
    }),
  };
}

// ---- EXPORT_ECONOMIA_FISCAL (item 23: o relatório no pacote do contador, C6b) ----

export const ECONOMIA_COLUMNS = ['competencia', 'tipo', 'codigo', 'disponivel', 'economiaCents', 'baseLegal', 'detalhe', 'noDependente', 'suggestionId'] as const;

/** As competências YYYY-MM da janela date-only do export, em ordem. */
export function competenciasDaJanela(w: { periodStart: string; periodEnd: string }): string[] {
  const out: string[] = [];
  let [a, m] = w.periodStart.slice(0, 7).split('-').map(Number);
  const fim = w.periodEnd.slice(0, 7);
  for (let c = `${a}-${String(m).padStart(2, '0')}`; c <= fim; c = `${a}-${String(m).padStart(2, '0')}`) {
    out.push(c);
    if (++m > 12) [a, m] = [a + 1, 1];
  }
  return out;
}

/** Uma linha de planilha por linha do relatório; a contagem de PROPOSED/REJECTED/EXPIRED vai na linha-meta (I-11). */
export function linhasExportEconomia(r: TaxOptimizationReport): string[][] {
  return r.linhas.map((l) => [
    r.competencia,
    l.tipo,
    l.codigo,
    l.disponivel ? 'SIM' : 'NAO_DISPONIVEL',
    l.economiaCents ?? '',
    l.legalBasis.map((b) => `${b.norma} ${b.artigo}`).join('; '),
    l.detalhe,
    l.noDependente ?? '',
    l.suggestionId ?? '',
  ]);
}

export function linhaMetaEconomia(w: { periodStart: string; periodEnd: string }, relatorios: readonly TaxOptimizationReport[], geradoEm: Date): string {
  const soma = (k: 'aceitasCents' | 'medidaCents') => relatorios.reduce((t, r) => t + BigInt(r.totais[k]), 0n).toString();
  const contar = (k: 'PROPOSED' | 'REJECTED' | 'EXPIRED') => relatorios.reduce((t, r) => t + r.contagem[k], 0);
  return `# kind=EXPORT_ECONOMIA_FISCAL; periodStart=${w.periodStart}; periodEnd=${w.periodEnd}; aceitasCents=${soma('aceitasCents')}; medidaCents=${soma('medidaCents')}; proposed=${contar('PROPOSED')}; rejected=${contar('REJECTED')}; expired=${contar('EXPIRED')}; geradoEm=${geradoEm.toISOString()}`;
}
