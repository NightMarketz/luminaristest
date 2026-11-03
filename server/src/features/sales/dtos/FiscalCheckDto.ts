import { z } from 'zod';
import { VIOLATION_CODES } from '../models/fiscalGuard';
import { CRITERIOS_ALOCACAO } from '../models/discountAllocation';

/**
 * EFICIENCIA-FISCAL PR-1 item 6 (BRIEF BE-INCR-EFICIENCIA-FISCAL §4.2; ADR-INCR-EFICIENCIA-FISCAL D4.2) — contrato do
 * `POST /api/sales/:id/fiscal-check`. A venda é lida pelo repositório; o corpo só pode trazer o que já é dado: nada.
 * Centavos saem como string (sem serialização global de BigInt); `z.coerce.bigint()` os aceita de volta.
 */
export const FiscalCheckParamsSchema = z.object({ id: z.string().min(1) }).strict();
export const FiscalCheckBodySchema = z.object({}).strict();

export const FiscalCheckViolationSchema = z
  .object({
    code: z.enum(VIOLATION_CODES),
    itemRef: z.string().nullable(),
    severity: z.enum(['BLOCK', 'WARN']),
    legalBasis: z.string(),
    detail: z.string(),
  })
  .strict();

export const FiscalCheckResponseSchema = z
  .object({
    saleId: z.string(),
    ok: z.boolean(),
    criterio: z.enum(CRITERIOS_ALOCACAO),
    violations: z.array(FiscalCheckViolationSchema),
    alocacao: z.array(
      z
        .object({
          itemRef: z.string(),
          discountCents: z.coerce.bigint(),
          pisoCents: z.coerce.bigint().nullable(),
          cargaBp: z.number().int().nullable(),
        })
        .strict(),
    ),
    economiaPotencialCents: z.coerce.bigint().nullable(),
    suggestionId: z.string().nullable(),
  })
  .strict();
export type FiscalCheckResponse = z.infer<typeof FiscalCheckResponseSchema>;
