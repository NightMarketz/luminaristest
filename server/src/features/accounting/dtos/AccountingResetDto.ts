import { z } from 'zod';
import { ACCOUNTING_RESET_BLOCKING_REPORT } from '../models/accountingResetClassification';
import type { SystemResetBlockedDetails } from '../models/accountingResetClassification';

export type { AccountingResetOutcome, SystemResetBlockedDetails } from '../models/accountingResetClassification';

/**
 * BE-INCR-RESET-CONSISTENTE item 13 (F-I7-1, D3+) — `details` do 409 `SYSTEM_RESET_BLOCKED_BY_ACCOUNTING` do
 * `DELETE /api/dashboard/system`: as tabelas BLOCKING com linha do usuário e quantas. O serviço valida por aqui antes de
 * lançar o erro.
 */
export const SystemResetBlockedDetailsSchema = z
  .object({
    blocking: z
      .array(
        z
          .object({
            table: z.enum(ACCOUNTING_RESET_BLOCKING_REPORT),
            count: z.number().int().positive(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict() satisfies z.ZodType<SystemResetBlockedDetails>;
