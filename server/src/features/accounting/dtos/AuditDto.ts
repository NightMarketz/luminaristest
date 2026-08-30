import { z } from 'zod';

/**
 * AuditDto — contrato de entrada (query) de `GET /api/accounting/audit/verify-chain`
 * (BRIEF-W1-A). Só `unitId`: a verificação é sempre sobre a cadeia INTEIRA do escopo corrente,
 * sem parâmetro de posição/data — espelha `CounterpartyScopeQuerySchema`
 * (`CounterpartyDto.ts:66-68`), que também é uma query de 1 campo sem `.strict()` extra.
 */
export const VerifyAuditChainQuerySchema = z.object({ unitId: z.string().min(1) });

export type VerifyAuditChainQueryInput = z.infer<typeof VerifyAuditChainQuerySchema>;

/** @openapi
 * components:
 *   schemas:
 *     VerifyAuditChainQuery:
 *       type: object
 *       required: [unitId]
 *       properties:
 *         unitId: { type: string }
 */
