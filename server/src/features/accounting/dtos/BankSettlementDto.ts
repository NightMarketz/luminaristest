import { z } from 'zod';
import { PAYMENT_METHODS } from '../models/Payable.model';
import { BANK_SETTLEMENT_STATUSES } from '../models/BankSettlement.model';

/**
 * BE-INCR-BANK-SETTLEMENT (nó F7) — DTOs Zod, todos `.strict()` (campo extra = 400, classe
 * `param-aceito-e-ignorado-e-bug`). Contratos do BRIEF §2 ("DTOs").
 *
 * `method` reusa `PAYMENT_METHODS` (mapa fechado `PAYMENT_METHOD_ACCOUNTS`, D2 do AP) — F-F7-3 (a): o
 * método vem do humano e o pré-cheque exige que a conta resolvida seja a conta do extrato. O AR usa o
 * MESMO alfabeto (`RECEIPT_METHOD_ACCOUNTS` é espelho) — um enum só.
 */

/** POST /api/bank-settlements/scan */
export const ScanBankSettlementsSchema = z
  .object({
    unitId: z.string().min(1),
    statementId: z.string().min(1),
  })
  .strict();
export type ScanBankSettlementsInput = z.infer<typeof ScanBankSettlementsSchema>;

/** POST /api/bank-settlements/:id/confirm */
export const ConfirmBankSettlementSchema = z
  .object({
    unitId: z.string().min(1),
    method: z.enum(PAYMENT_METHODS),
  })
  .strict();
export type ConfirmBankSettlementInput = z.infer<typeof ConfirmBankSettlementSchema>;

/** POST /api/bank-settlements/:id/reject */
export const RejectBankSettlementSchema = z
  .object({
    unitId: z.string().min(1),
    reason: z.string().min(1).max(500),
  })
  .strict();
export type RejectBankSettlementInput = z.infer<typeof RejectBankSettlementSchema>;

/** POST /api/bank-settlements/:id/retry — `method` de novo porque a etapa (i) pode não ter rodado (item 9). */
export const RetryBankSettlementSchema = z
  .object({
    unitId: z.string().min(1),
    method: z.enum(PAYMENT_METHODS),
  })
  .strict();
export type RetryBankSettlementInput = z.infer<typeof RetryBankSettlementSchema>;

/** GET /api/bank-settlements — paginação offset (`StandardPagination` do FE consome page/limit). */
export const ListBankSettlementsQuerySchema = z
  .object({
    unitId: z.string().min(1),
    statementId: z.string().min(1).optional(),
    status: z.enum(BANK_SETTLEMENT_STATUSES).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();
export type ListBankSettlementsQueryInput = z.infer<typeof ListBankSettlementsQuerySchema>;
