import { z } from 'zod';
import { isValidDateOnly } from '../models/dates';

/**
 * SourceDocumentDto — BE-INCR-PROVENANCE-ATTACH (NFE-X).
 *
 * Contratos da borda HTTP que anexa PROVENIÊNCIA FORMAL a um lançamento **já postado**
 * (`PostingService.attachSourceDocument`) e lê os documentos de origem de um lançamento.
 * Escopo autorizado: item NFE-X do Bloco A da fila §5.1 do ACCOUNTING-MASTER-MAP.md,
 * F-D2→(a) ratificado 2026-08-28; forks do incremento em
 * `docs/accounting/BE-INCR-PROVENANCE-ATTACH-brief.md` §6 (F-PA3→(b) — a borda HTTP entra
 * com POST + GET).
 *
 * `documentDate` é date-only validada por `isValidDateOnly` (regex + round-trip): a regex
 * sozinha aceita `2026-02-30`, que `new Date()` rola em silêncio para 02-mar — class-fix
 * `date-only-regex-nao-valida-calendario`, mesmo tratamento do `PayableDto`.
 *
 * Todo schema é `.strict()`: campo desconhecido é 400 em vez de descarte silencioso.
 *
 * Nenhum campo booleano aqui, de propósito. Se algum for acrescentado em QUERY, não use
 * `z.coerce.boolean()` — `?flag=false` vira `true`; use o `queryBoolean` de `./queryPrimitives`.
 */

// cuid charset — rejeita separador de caminho e segmento de ponto.
const idLike = z.string().min(1).regex(/^[A-Za-z0-9_-]+$/, 'invalid id');

/**
 * Corpo do POST. `externalRef` é a referência HUMANA do documento (a chave de acesso de 44
 * dígitos da NF-e), NUNCA um `sourceId` de idempotência — T7. É ela que chaveia o
 * curto-circuito de re-anexo.
 *
 * `sourceType` é opcional: omitido, o serviço espelha o `sourceType` do lançamento-alvo
 * (convenção D5 do ADR-INCR8).
 *
 * @openapi
 * components:
 *   schemas:
 *     AttachSourceDocument:
 *       type: object
 *       required: [unitId]
 *       properties:
 *         unitId: { type: string, minLength: 1 }
 *         externalRef: { type: string, minLength: 1, maxLength: 255, description: referência humana do documento (chave de acesso da NF-e) }
 *         documentDate: { type: string, description: 'date-only YYYY-MM-DD (data real, validada)' }
 *         description: { type: string, maxLength: 500 }
 *         attachmentId: { type: string }
 *         rawJson: { type: string }
 *         sourceType: { type: string, maxLength: 100, description: 'omitido, espelha o sourceType do lançamento-alvo' }
 *     SourceDocument:
 *       type: object
 *       required: [id, sourceType, createdAt]
 *       properties:
 *         id: { type: string, format: cuid }
 *         sourceType: { type: string }
 *         externalRef: { type: string, nullable: true }
 *         documentDate: { type: string, format: date-time, nullable: true }
 *         description: { type: string, nullable: true }
 *         attachmentId: { type: string, nullable: true }
 *         createdAt: { type: string, format: date-time }
 */
export const AttachSourceDocumentSchema = z
  .object({
    unitId: idLike,
    externalRef: z.string().trim().min(1).max(255).optional(),
    documentDate: z
      .string()
      .refine(isValidDateOnly, 'documentDate deve ser uma data real YYYY-MM-DD')
      .optional(),
    description: z.string().trim().max(500).optional(),
    attachmentId: idLike.optional(),
    rawJson: z.string().optional(),
    sourceType: z.string().trim().min(1).max(100).optional(),
  })
  .strict();
export type AttachSourceDocumentDto = z.infer<typeof AttachSourceDocumentSchema>;

/** Query do GET — `unitId` é a chave de escopo do tenant; o entryId vem do path param. */
export const ListSourceDocumentsQuerySchema = z
  .object({
    unitId: idLike,
  })
  .strict();
export type ListSourceDocumentsQueryDto = z.infer<typeof ListSourceDocumentsQuerySchema>;
