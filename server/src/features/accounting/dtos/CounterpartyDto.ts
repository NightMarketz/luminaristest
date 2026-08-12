import { z } from 'zod';
import { COUNTERPARTY_TYPES } from '../models/Counterparty.model';
import { queryBoolean } from './queryPrimitives';

/**
 * CounterpartyDto — Contraparte (INCR-COUNTERPARTY / A1) request schemas. A counterparty is a
 * classification/identity record: NO money, NO dates, so there is no MAX_CENTS / date-only concern
 * here. Os schemas de CORPO são `.strict()` (campo com typo é 400, não descarte silencioso); os de
 * QUERY não são — ver o levantamento no PR que introduziu o `queryPrimitives`.
 *
 * `type` is the SUPPLIER/CUSTOMER discriminator; `name` is the display identity (uniqueness is
 * `[userId,unitId,type,name]`, enforced at the DB + mapped to a ValidationError in the service).
 * `ref` is an OPTIONAL scoped link to a DynamicTable row (plain string, not a FK).
 */

/** @openapi
 * components:
 *   schemas:
 *     CreateCounterpartyInput:
 *       type: object
 *       required: [unitId, type, name]
 *       properties:
 *         unitId: { type: string }
 *         type:   { type: string, enum: [SUPPLIER, CUSTOMER], description: "Fornecedor (AP) ou cliente (AR)" }
 *         name:   { type: string, description: "Nome de exibição — chave de negócio por [unidade, tipo, nome]" }
 *         ref:    { type: string, description: "Ref opcional escopada a uma linha de DynamicTable (não é FK)" }
 */
export const CreateCounterpartySchema = z
  .object({
    unitId: z.string().min(1),
    type: z.enum(COUNTERPARTY_TYPES),
    name: z.string().min(1).max(200),
    ref: z.string().min(1).optional(),
  })
  .strict();

/** @openapi
 * components:
 *   schemas:
 *     ArchiveCounterpartyInput:
 *       type: object
 *       required: [unitId]
 *       properties:
 *         unitId: { type: string }
 */
export const ArchiveCounterpartySchema = z
  .object({
    unitId: z.string().min(1),
  })
  .strict();

/** @openapi
 * components:
 *   schemas:
 *     ListCounterpartiesQuery:
 *       type: object
 *       required: [unitId]
 *       properties:
 *         unitId:          { type: string }
 *         type:            { type: string, enum: [SUPPLIER, CUSTOMER] }
 *         includeArchived: { type: boolean }
 */
export const ListCounterpartiesQuerySchema = z.object({
  unitId: z.string().min(1),
  type: z.enum(COUNTERPARTY_TYPES).optional(),
  // queryBoolean, não z.coerce.boolean(): `?includeArchived=false` devolvia as arquivadas.
  includeArchived: queryBoolean(),
});

/** Query DTO for GET /counterparties/:id — unitId required. */
export const CounterpartyScopeQuerySchema = z.object({
  unitId: z.string().min(1),
});

export type CreateCounterpartyInput = z.infer<typeof CreateCounterpartySchema>;
export type ArchiveCounterpartyInput = z.infer<typeof ArchiveCounterpartySchema>;
export type ListCounterpartiesQueryInput = z.infer<typeof ListCounterpartiesQuerySchema>;
export type CounterpartyScopeQueryInput = z.infer<typeof CounterpartyScopeQuerySchema>;

/** Type guard for CreateCounterpartyInput. */
export function isCreateCounterpartyInput(obj: unknown): obj is CreateCounterpartyInput {
  return CreateCounterpartySchema.safeParse(obj).success;
}
