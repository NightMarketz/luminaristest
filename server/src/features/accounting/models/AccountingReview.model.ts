import type { AccountingReviewFinding } from 'generated/prisma';

/**
 * AccountingReview domain constants + funções puras (BE-INCR-REVIEW-LAYER, nó C11).
 *
 * O que a revisão É (§1 do BRIEF): o registro de que um profissional identificado revisou um
 * pacote GERADO, com os achados dele e a resolução de cada um por um dos dois caminhos ratificados
 * — (a) edição do dado-fonte pelos serviços existentes, (c) lançamento de acerto extemporâneo —,
 * a regeração obrigatória depois e o sign-off. O `.txt` gerado é IMUTÁVEL (F-EDIT-1 b vetado).
 */

/** Registros SPED que um achado pode apontar (item 3; enum fechado do BRIEF §4). */
export const REVIEW_REGISTERS = [
  '0000', 'I050', 'I051', 'I200', 'I250', 'J150', 'J930', 'M300', 'M350', 'M410', 'N630',
] as const;
export type ReviewRegister = (typeof REVIEW_REGISTERS)[number];

export const FINDING_SEVERITIES = ['BLOCKER', 'NOTE'] as const;
export type FindingSeverity = (typeof FINDING_SEVERITIES)[number];

export const FINDING_RESOLUTIONS = ['DATA_EDIT', 'ADJUSTMENT_ENTRY', 'NO_ACTION'] as const;
export type FindingResolution = (typeof FINDING_RESOLUTIONS)[number];

/**
 * Alvos do ponteiro DATA_EDIT (F-C11-2 a): o dado é editado pelo serviço DONO; a revisão só guarda
 * para onde apontar. `generation_input` = o job regerado (lacuna de spec fechada pelo dono
 * 2026-09-16: o DTO de geração não é persistido, o job é). `journal_entry` é o alvo do acerto (c).
 */
export const RESOLUTION_TARGETS = [
  'account', 'referential_mapping', 'counterparty', 'generation_input', 'journal_entry',
] as const;
export type ResolutionTarget = (typeof RESOLUTION_TARGETS)[number];

/**
 * Junção achado → trilha (item 13): o `targetType` que cada serviço dono grava no `AuditEvent`
 * (verificado em PostingService 'account'/'journal_entry', ReferentialMappingService
 * 'ReferentialMapping', CounterpartyService 'counterparty', Sped*GenerationService
 * 'data_exchange_job'). Sem este mapa, a leitura por `targetId` devolveria vazio para o mapeamento.
 */
export const RESOLUTION_TARGET_AUDIT_TYPE: Record<ResolutionTarget, string> = {
  account: 'account',
  referential_mapping: 'ReferentialMapping',
  counterparty: 'counterparty',
  generation_input: 'data_exchange_job',
  journal_entry: 'journal_entry',
};

/** `sourceType` do lançamento de acerto (item 5) — chave de idempotência com `sourceId = findingId`. */
export const REVIEW_ADJUSTMENT_SOURCE_TYPE = 'review_adjustment';

/** Audit event keys — os seis estão na allowlist de `auditCanonical.ts` (item 12). */
export const REVIEW_OPENED = 'review.opened';
export const REVIEW_FINDING_ADDED = 'review.finding_added';
export const REVIEW_FINDING_RESOLVED = 'review.finding_resolved';
export const REVIEW_JOBS_REPLACED = 'review.jobs_replaced';
export const REVIEW_SIGNED_OFF = 'review.signed_off';
export const REVIEW_REJECTED = 'review.rejected';

/** Histórico do acerto (item 5) — referencia o achado, nunca copia PII além da descrição já no razão. */
export function adjustmentDescription(reviewId: string, findingSeq: number, description: string): string {
  return `Acerto — revisão ${reviewId}, achado ${findingSeq}: ${description}`;
}

/**
 * Staleness (item 8): sign-off só se cada job da revisão foi gerado DEPOIS da última resolução e
 * nenhum BLOCKER está sem resolução. Função pura para o teste não precisar de banco.
 * Devolve os achados que invalidam o sign-off; vazio = pode assinar.
 */
export function staleFindings(
  jobs: Array<{ id: string; createdAt: Date }>,
  findings: Pick<AccountingReviewFinding, 'id' | 'severity' | 'resolution' | 'resolvedAt'>[],
): { unresolvedBlockers: string[]; resolvedAfterGeneration: string[] } {
  const unresolvedBlockers = findings
    .filter((f) => f.severity === 'BLOCKER' && !f.resolution)
    .map((f) => f.id);
  const oldestJob = jobs.reduce<number>(
    (min, j) => Math.min(min, j.createdAt.getTime()),
    Number.POSITIVE_INFINITY,
  );
  const resolvedAfterGeneration = findings
    .filter((f) => f.resolvedAt && f.resolvedAt.getTime() >= oldestJob)
    .map((f) => f.id);
  return { unresolvedBlockers, resolvedAfterGeneration };
}
