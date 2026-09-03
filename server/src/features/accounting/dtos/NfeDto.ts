import { z } from 'zod';
import { isValidDateOnly } from '../models/dates';

/**
 * NfeDto — request schemas for fiscal NF-e ingestion (BE-INCR-NFE): `ImportNfePurchaseSchema` (A2,
 * compra) and `ImportNfeSaleSchema` (A3, venda). Both live here per the impl plan §2 (A2-1); the sale
 * schema was born in its own file only so the A2 ∥ A3 write-sets stayed disjoint (PAR-002) and was
 * folded back in Fase B. The XML itself is parsed by
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

/**
 * NF-e de VENDA (A3 / D2b) — F-NFE8 → (a) (ADR-INCR-NFE §9, ratificado 2026-07-22): the NF-e XML does
 * NOT carry the Luminaris `saleId`, so a value+date heuristic would attach the note to the WRONG sale
 * in a salon with several same-ticket sales on the same day. The operator therefore supplies the anchor
 * EXPLICITLY — `saleId` is required. The service confirms total/date and SIGNALS divergence WITHOUT
 * posting (0 new journal entries); a sale with no booked anchor is rejected.
 *
 * The raw XML travels as a multipart file (controller boundary), not in this body — this schema only
 * governs the JSON fields.
 *
 * @openapi
 * components:
 *   schemas:
 *     ImportNfeSaleInput:
 *       type: object
 *       required: [unitId, saleId]
 *       properties:
 *         unitId: { type: string }
 *         saleId: { type: string, description: "Âncora EXPLÍCITA do operador (F-NFE8) — o XML da NF-e não carrega o saleId do Luminaris; nunca inferido por heurística de valor/data" }
 */
export const ImportNfeSaleSchema = z
  .object({
    unitId: z.string().min(1),
    // F-NFE8 → (a): explicit operator anchor. The XML has no saleId — never inferred by heuristic.
    saleId: z.string().min(1),
  })
  .strict();

export type ImportNfeSaleInput = z.infer<typeof ImportNfeSaleSchema>;
