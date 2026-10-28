import { z } from 'zod';

/**
 * NFE-DANFE-IBSCBS PR-3 (item 19, `docs/accounting/BE-INCR-NFE-DANFE-IBSCBS-brief.md` §4) — params de
 * `GET /api/nfe/dfe/documents/:id/danfe`. A query (`unitId`) é a `FiscalDocumentScopeQuerySchema` da leitura por id.
 */
export const DanfeParamsSchema = z.object({ id: z.string().min(1) }).strict();
export type DanfeParams = z.infer<typeof DanfeParamsSchema>;
