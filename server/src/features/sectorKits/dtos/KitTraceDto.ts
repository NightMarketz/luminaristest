import { z } from 'zod';

/**
 * Rastro evento → fato → lançamento (BE-INCR-KIT-SETOR PR-6, item 50; BRIEF §3.4). Só leitura.
 * `GET /api/accounting-kit/trace?unitId=&sourceType=&sourceId=`.
 */
export const KitTraceQuerySchema = z
  .object({
    unitId: z.string().min(1),
    sourceType: z.string().min(1),
    sourceId: z.string().min(1),
  })
  .strict();
export type KitTraceQuery = z.infer<typeof KitTraceQuerySchema>;

/**
 * `eventKey` = o `sourceType` do lançamento (o evento de negócio). `archetypeKey`/`bindingVersion` vêm do binding gravado
 * no `JournalEntry` (dono, chat, 13/10: "Gravar a versão"); `null` quando o lançamento não passou por binding (manual,
 * subrazão) ou é anterior ao PR-6.
 */
export const KitTraceViewSchema = z
  .object({
    eventKey: z.string(),
    archetypeKey: z.string().nullable(),
    bindingVersion: z.number().int().nullable(),
    journalEntryId: z.string(),
  })
  .strict();
export type KitTraceView = z.infer<typeof KitTraceViewSchema>;
