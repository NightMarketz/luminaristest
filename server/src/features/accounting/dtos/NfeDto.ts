import { z } from 'zod';
import { isValidDateOnly } from '../models/dates';
import { NFE_CHAVE_REGEX } from '../../../lib/cnpj';

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

// ── BE-INCR-NFE-PREVIEW (rodada 2a; F-FENFE-1 → b) ─────────────────────────────────────────────────

/** @openapi
 * components:
 *   schemas:
 *     PreviewNfeInput:
 *       type: object
 *       required: [unitId]
 *       properties:
 *         unitId: { type: string }
 *     NfePreview:
 *       type: object
 *       description: "Dry-run do parser da NF-e (BE-INCR-NFE-PREVIEW): espelho integral do ParsedNfe menos protocolo.chNFe (redundante com chaveAcesso), mais o indicador de idempotência. Dinheiro em centavos INTEIROS (number). Nada é escrito."
 *       required: [chaveAcesso, ide, emit, dest, itens, totais, protocolo, alreadyImported, existingPayableId]
 *       properties:
 *         chaveAcesso:       { type: string, description: "44 posições — [0-9]{6}[A-Z0-9]{12}[0-9]{26} (NT 2026.004)" }
 *         ide:               { type: object, properties: { numero: { type: string }, serie: { type: string }, dhEmiDate: { type: string, format: date }, tpNF: { type: string }, natOp: { type: string }, mod: { type: string } } }
 *         emit:              { type: object, properties: { cnpj: { type: string }, cpf: { type: string }, nome: { type: string }, ie: { type: string } } }
 *         dest:              { type: object, properties: { cnpj: { type: string }, cpf: { type: string }, nome: { type: string }, ie: { type: string } } }
 *         itens:             { type: array, items: { type: object, properties: { nItem: { type: integer }, cProd: { type: string }, cEAN: { type: string }, xProd: { type: string }, ncm: { type: string }, cfop: { type: string }, uCom: { type: string }, qCom: { type: string }, vUnComStr: { type: string }, vProdCents: { type: integer }, vDescCents: { type: integer }, indTot: { type: string, enum: ["0", "1"], description: "0 = nao compoe o total (sera ignorado pelo import)" } } } }
 *         totais:            { type: object, properties: { vProdCents: { type: integer }, vDescCents: { type: integer }, vFreteCents: { type: integer }, vSegCents: { type: integer }, vOutroCents: { type: integer }, vIPICents: { type: integer }, vSTCents: { type: integer }, vICMSCents: { type: integer }, vNFCents: { type: integer } } }
 *         protocolo:         { type: object, properties: { cStat: { type: string }, nProt: { type: string }, dhRecbtoDate: { type: string, format: date } } }
 *         alreadyImported:   { type: boolean, description: "true quando ja existe conta a pagar VIVA com documentNumber = chaveAcesso nesta unidade (F-PREV-3 → b)" }
 *         existingPayableId: { type: string, nullable: true }
 */
export const PreviewNfeSchema = z.object({ unitId: z.string().min(1) }).strict();
export type PreviewNfeInput = z.infer<typeof PreviewNfeSchema>;

const centsInt = z.number().int().nonnegative();
const nfeParty = z
  .object({
    cnpj: z.string().optional(),
    cpf: z.string().optional(),
    nome: z.string().optional(),
    ie: z.string().optional(),
  })
  .strict();

/** Contrato de SAÍDA do preview — materializado em Zod para o snapshot de shape e para o teste de
 *  contrato (o `ParsedNfe` dos fixtures tem de passar aqui). `.strict()` em todo nível. */
export const NfePreviewSchema = z
  .object({
    chaveAcesso: z.string().regex(NFE_CHAVE_REGEX),
    ide: z
      .object({
        numero: z.string(),
        serie: z.string(),
        dhEmiDate: z.string(),
        tpNF: z.string(),
        natOp: z.string(),
        mod: z.string(),
      })
      .strict(),
    emit: nfeParty,
    dest: nfeParty,
    itens: z
      .array(
        z
          .object({
            nItem: z.number().int().positive(),
            cProd: z.string(),
            cEAN: z.string(),
            xProd: z.string(),
            ncm: z.string(),
            cfop: z.string(),
            uCom: z.string(),
            qCom: z.string(),
            vUnComStr: z.string(),
            vProdCents: centsInt,
            vDescCents: centsInt,
            indTot: z.enum(['0', '1']),
          })
          .strict(),
      )
      .min(1),
    totais: z
      .object({
        vProdCents: centsInt,
        vDescCents: centsInt,
        vFreteCents: centsInt,
        vSegCents: centsInt,
        vOutroCents: centsInt,
        vIPICents: centsInt,
        vSTCents: centsInt,
        vICMSCents: centsInt,
        vNFCents: centsInt,
      })
      .strict(),
    protocolo: z.object({ cStat: z.string(), nProt: z.string(), dhRecbtoDate: z.string() }).strict(),
    alreadyImported: z.boolean(),
    existingPayableId: z.string().nullable(),
  })
  .strict();
export type NfePreview = z.infer<typeof NfePreviewSchema>;
