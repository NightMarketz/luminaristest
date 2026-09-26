import { z } from 'zod';

/**
 * LAC-B — `POST /accounting-binding/activate-default` (FE-INCR-BINDING-ACTIVATION-brief.md,
 * "Contratos esboçados" + emenda F-I3-1 → a de 2026-09-07). Equivalente HTTP do CLI
 * `activateAccountingBindingCli.ts`: o cliente manda só a unidade (e opcionalmente o setor); o
 * binding/snapshot do setor é embutido server-side (`fixtures/sectorBindingRegistry.ts`).
 *
 *   - `installChartIfEmpty` (F-B2 → a): plano de contas VAZIO + flag ⇒ instala o plano canônico
 *     antes do compile; sem a flag ⇒ bloqueante `CHART_OF_ACCOUNTS_EMPTY` (comportamento (b)).
 *   - `openCurrentPeriodIfMissing` (F-I3-1 → a): período do mês corrente ausente/FUTURE + flag ⇒
 *     seed-year + open; sem a flag ⇒ bloqueante `ACCOUNTING_PERIOD_NOT_OPEN`.
 *
 * Os dois bloqueantes de pré-condição são checados ANTES do compile e NÃO gravam versão (decisão
 * do dono em 2026-09-25, lacuna "pré-check sem gravar" — espelha o CLI, que recusa sem compilar).
 */
export const ActivateDefaultBindingRequestSchema = z
  .object({
    unitId: z.string().min(1, 'unitId é obrigatório.'),
    sectorKey: z.string().min(1).optional(),
    installChartIfEmpty: z.boolean().optional(),
    openCurrentPeriodIfMissing: z.boolean().optional(),
  })
  .strict();
export type ActivateDefaultBindingRequest = z.infer<typeof ActivateDefaultBindingRequestSchema>;

/** Códigos dos bloqueantes de pré-condição + o gate de cobertura de evento, somados aos códigos
 *  do validador (`BindingValidationIssueCode`) que um compile `Draft` devolve. */
export const ACTIVATION_PRECONDITION_CODES = [
  'CHART_OF_ACCOUNTS_EMPTY',
  'ACCOUNTING_PERIOD_NOT_OPEN',
  'EVENT_COVERAGE_MISSING',
] as const;

export const ActivationBlockingIssueSchema = z
  .object({
    code: z.string().min(1),
    message: z.string().min(1),
    slot: z.string().optional(),
    accountCode: z.string().optional(),
    /** Só em `ACCOUNTING_PERIOD_NOT_OPEN` — contrato da emenda I3 (ONBOARDING-WIZARD-plano-grafo-brief §3). */
    period: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  })
  .strict();
export type ActivationBlockingIssue = z.infer<typeof ActivationBlockingIssueSchema>;

export const ACTIVATE_DEFAULT_STATUSES = ['Active', 'already-active', 'Draft'] as const;

/** `data` da resposta — saída materializada do contrato (o controller valida contra ele). */
export const ActivateDefaultBindingResultSchema = z
  .object({
    status: z.enum(ACTIVATE_DEFAULT_STATUSES),
    /** Ausente quando o pré-check barrou (nada foi gravado). */
    bindingVersion: z.number().int().positive().optional(),
    blocking: z.array(ActivationBlockingIssueSchema).optional(),
  })
  .strict();
export type ActivateDefaultBindingResult = z.infer<typeof ActivateDefaultBindingResultSchema>;
