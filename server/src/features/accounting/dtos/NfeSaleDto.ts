import { z } from 'zod';

/**
 * NfeSaleDto — input contract for the NF-e de VENDA reconciliation (BE-INCR-NFE, A3 / D2b).
 *
 * F-NFE8 → (a) (ADR-INCR-NFE §9, ratificado 2026-07-22): the NF-e XML does NOT carry the
 * Luminaris `saleId`, so a value+date heuristic would attach the note to the WRONG sale in a
 * salon with several same-ticket sales on the same day. The operator therefore supplies the
 * anchor EXPLICITLY — `saleId` is required. The service then confirms total/date and SIGNALS
 * divergence WITHOUT posting (0 new journal entries); a sale with no booked anchor is rejected.
 *
 * The raw XML travels as a multipart file (controller boundary, Fase B), not in this body —
 * this schema only governs the JSON fields (`unitId`, `saleId`). `.strict()` rejects unknown
 * keys so a typo fails loud.
 *
 * NOTE (plan × code, PAR-002): the impl plan nominally places `ImportNfeSaleSchema` in the shared
 * `NfeDto.ts` alongside the purchase schema (A2). To keep the A2 ∥ A3 write-sets disjoint, the
 * sale schema lives in its OWN file here; Fase B reconciles the two if A2 also declares it.
 */
export const ImportNfeSaleSchema = z
  .object({
    unitId: z.string().min(1),
    // F-NFE8 → (a): explicit operator anchor. The XML has no saleId — never inferred by heuristic.
    saleId: z.string().min(1),
  })
  .strict();

export type ImportNfeSaleInput = z.infer<typeof ImportNfeSaleSchema>;
