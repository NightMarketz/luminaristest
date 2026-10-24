import type { ConsumptionTaxAssessment } from 'generated/prisma';
import { MemoriaIbsCbsSchema } from '../dtos/IbsCbsAssessmentDto';
import { fimDoMes } from './taxAssessmentCalcAnual';
import { MemoriaInvalidaError, type MemoWindow } from './taxAssessmentMemoExport';

/**
 * IBS-CBS-2027 PR-5 (BRIEF `docs/accounting/BE-INCR-IBS-CBS-2027-brief.md` item 24) — memória das apurações mensais de IBS/CBS no
 * pacote do contador (`EXPORT_IBS_CBS_MEMO`). Molde `taxAssessmentMemoExport.ts` (X7 Fase C PR-1): formato longo, linhas
 * `RESUMO` das colunas do model antes das `MEMORIA` persistidas, linha-meta no topo. Puro: só transporta o que foi confirmado.
 */

/** Colunas da planilha, na ordem. */
export const IBS_CBS_MEMO_COLUMNS = [
  'anoCalendario', 'mes', 'tributo', 'regime', 'parametrosSha256', 'confirmedAt', 'apuracaoId', 'substitui', 'tipoLinha',
  'codigo', 'descricao', 'valorCents', 'fonte',
] as const;

const RESUMO_COLUNAS = [
  ['debitos', 'debitosCents'],
  ['creditos', 'creditosCents'],
  ['saldo', 'saldoCents'],
] as const;

/** Entra a apuração `CONFIRMED`, viva, cujo mês cabe inteiro na janela. Ordem: ano, mês, tributo. */
export function selecionarApuracoesIbsCbs(rows: readonly ConsumptionTaxAssessment[], w: MemoWindow): ConsumptionTaxAssessment[] {
  return rows
    .filter((r) => r.status === 'CONFIRMED' && r.deletedAt === null)
    .filter((r) => `${r.anoCalendario}-${String(r.mes).padStart(2, '0')}-01` >= w.periodStart && fimDoMes(r.anoCalendario, r.mes) <= w.periodEnd)
    .sort((a, b) => a.anoCalendario - b.anoCalendario || a.mes - b.mes || a.tributo.localeCompare(b.tributo));
}

/** Uma linha por `MemoriaLinha`, precedida das `RESUMO`; centavos em string inteira. Memória inválida ⇒ 500 com o id. */
export function linhasDaApuracaoIbsCbs(r: ConsumptionTaxAssessment): string[][] {
  const parsed = MemoriaIbsCbsSchema.safeParse(r.memoria);
  if (!parsed.success) throw new MemoriaInvalidaError(r.id);
  const prefixo = [String(r.anoCalendario), String(r.mes), r.tributo, r.regime, r.parametrosSha256, r.confirmedAt.toISOString(), r.id, r.supersedesId ?? ''];
  const resumo = RESUMO_COLUNAS.map(([codigo, coluna]) => [...prefixo, 'RESUMO', codigo, coluna, r[coluna].toString(), `ConsumptionTaxAssessment.${coluna}`]);
  const memoria = parsed.data.map((l) => [...prefixo, 'MEMORIA', l.codigo, l.descricao, l.valorCents, l.fonte]);
  return [...resumo, ...memoria];
}

export function linhaMetaIbsCbs(w: MemoWindow, apuracoes: number, geradoEm: Date): string {
  return `# kind=EXPORT_IBS_CBS_MEMO; periodStart=${w.periodStart}; periodEnd=${w.periodEnd}; apuracoes=${apuracoes}; geradoEm=${geradoEm.toISOString()}`;
}
