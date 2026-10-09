import { z } from 'zod';
import { CHARGE_KINDS } from '../models/CollectionCharge.model';

/**
 * CollectionChargeDto — cobrança no provedor (BE-INCR-PAYMENT-PROVIDER PR-2; BRIEF §4.3, P2-2/P2-10/P2-11/P2-12/P2-15).
 * Corpos `.strict()`: juros, multa, desconto ou qualquer campo não anunciado ⇒ 400 (P2-12, invariante 13 — nunca aceita e
 * ignora). Sem `default` no schema (memória zod4-partial-aplica-default-reseta-campo): o prazo padrão é do serviço (F4 a).
 * `unitId` carrega o escopo como nos demais DTOs de accounting (corpo nos comandos, query nas leituras).
 */

export const PayerAddressSchema = z
  .object({
    streetName: z.string().min(1),
    streetNumber: z.string().min(1),
    zipCode: z.string().regex(/^\d{8}$/),
    neighborhood: z.string().min(1),
    city: z.string().min(1),
    state: z.string().regex(/^[A-Z]{2}$/),
  })
  .strict();

export const PayerSchema = z
  .object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    identification: z
      .object({ type: z.enum(['CPF', 'CNPJ']), number: z.string().regex(/^\d{11}$|^\d{14}$/) })
      .strict(),
    address: PayerAddressSchema.optional(), // obrigatório se kind = BOLETO (serviço → 400 charge_address_required)
  })
  .strict();

/** @openapi
 * components:
 *   schemas:
 *     CreateCollectionChargeInput:
 *       type: object
 *       required: [unitId, kind, payer]
 *       properties:
 *         unitId:           { type: string }
 *         kind:             { type: string, enum: [BOLETO, PIX] }
 *         expiresInDays:    { type: integer, minimum: 1, maximum: 30, description: 'só BOLETO; omitido = 3 dias úteis' }
 *         expiresInMinutes: { type: integer, minimum: 30, maximum: 43200, description: 'só PIX; omitido = 24 h' }
 *         payer:            { type: object }
 */
export const CreateChargeSchema = z
  .object({
    unitId: z.string().min(1),
    kind: z.enum(CHARGE_KINDS),
    expiresInDays: z.number().int().min(1).max(30).optional(),
    expiresInMinutes: z.number().int().min(30).max(43_200).optional(),
    payer: PayerSchema,
  })
  .strict();

export const CollectionChargeScopeQuerySchema = z.object({ unitId: z.string().min(1) }).strict();
export const CancelChargeSchema = z.object({ unitId: z.string().min(1) }).strict();

export const CollectionWebhookParamsSchema = z
  .object({ provider: z.string().min(1), accountId: z.string().min(1) })
  .strict();

export type PayerInputDto = z.infer<typeof PayerSchema>;
export type CreateChargeInputDto = z.infer<typeof CreateChargeSchema>;
