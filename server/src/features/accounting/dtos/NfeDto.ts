import { z } from 'zod';
import { isValidDateOnly } from '../models/dates';

/**
 * NfeDto — request schemas for fiscal NF-e ingestion (BE-INCR-NFE / A2). The XML itself is parsed by
 * the PURE `lib/nfe.ts` into a `ParsedNfe`; THIS DTO validates only the operator-supplied request body
 * that accompanies the upload. Every schema is `.strict()` so a typo'd field fails loud instead of being
 * silently dropped.
 *
 * The money of a purchase NF-e is NOT in this DTO — it is computed in `NfeImportService` from the parsed
 * totals (cost D3 + rateio) and guarded by `MAX_CENTS` there. The only operator input is the tenant
 * scope, the confirmed counterparty, and the item→product confirmation (D6 — a `cProd` never
 * auto-creates a product; the operator maps each note item to a known `productRef`).
 */

const dateOnly = (field: string) =>
  z.string().refine(isValidDateOnly, `${field} deve ser uma data real YYYY-MM-DD`);

/** One operator-confirmed mapping of a note item (`cProd` from the XML) to a known inventory
 *  `productRef` (D6 — never auto-create a product from the note). */
const itemMapping = z
  .object({
    cProd: z.string().min(1),
    productRef: z.string().min(1),
  })
  .strict();

/** @openapi
 * components:
 *   schemas:
 *     ImportNfePurchaseInput:
 *       type: object
 *       required: [unitId, itemMappings]
 *       properties:
 *         unitId:         { type: string }
 *         counterpartyId: { type: string, description: "FK opcional a uma Counterparty(SUPPLIER) desta unidade confirmada pelo operador para o emitente (D6 — nunca auto-cria); re-escopada no service" }
 *         dueDate:        { type: string, description: "Data-only YYYY-MM-DD de vencimento; ausente ⇒ usa a data de emissão da NF-e (dhEmi)" }
 *         itemMappings:
 *           type: array
 *           description: "Mapeamento cProd→productRef confirmado pelo operador (D6). TODO item da nota precisa de um mapeamento; item sem mapeamento é rejeitado."
 *           items:
 *             type: object
 *             required: [cProd, productRef]
 *             properties:
 *               cProd:      { type: string }
 *               productRef: { type: string }
 */
export const ImportNfePurchaseSchema = z
  .object({
    unitId: z.string().min(1),
    counterpartyId: z.string().min(1).optional(),
    dueDate: dateOnly('dueDate').optional(),
    itemMappings: z.array(itemMapping).min(1),
  })
  .strict();

export type ImportNfePurchaseInput = z.infer<typeof ImportNfePurchaseSchema>;
