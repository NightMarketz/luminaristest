import { z } from 'zod';
import { isValidDateOnly } from '../models/dates';

/**
 * SourceDocumentUploadDto — BE-INCR-SOURCE-DOCUMENT-UPLOAD (BRIEF `docs/accounting/BE-INCR-SOURCE-DOCUMENT-UPLOAD-brief.md`
 * §2; F-SD-1..11 ratificados, dono, chat, 2026-10-15). Cria um `SourceDocument` a partir de um arquivo, sem lançamento:
 * o FE envia o arquivo primeiro e passa o `sourceDocumentId` devolvido nos PUTs do DAS e do histórico (F-SD-1 → a).
 *
 * Os campos chegam do multer como strings (multipart/form-data). `.strict()`: campo desconhecido = 400.
 */

// cuid/uuid charset — rejeita separador de caminho e segmento de ponto (o id do SD vira segmento do caminho em disco).
const idLike = z.string().min(1).regex(/^[A-Za-z0-9_-]+$/, 'invalid id');

/**
 * F-SD-3 → (a): lista fechada de proveniência. Consumidor novo amplia a lista (com autorização própria). Os PUTs que
 * recebem o id conferem que o SD tem o `sourceType` deles.
 */
export const SOURCE_DOCUMENT_UPLOAD_TYPES = ['tax.simples.das', 'tax.simples.historico'] as const;
export type SourceDocumentUploadType = (typeof SOURCE_DOCUMENT_UPLOAD_TYPES)[number];
export const SOURCE_TYPE_SIMPLES_DAS: SourceDocumentUploadType = 'tax.simples.das';
export const SOURCE_TYPE_SIMPLES_HISTORICO: SourceDocumentUploadType = 'tax.simples.historico';

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateSourceDocumentUpload:
 *       type: object
 *       required: [unitId, sourceType, file]
 *       properties:
 *         unitId: { type: string, minLength: 1 }
 *         sourceType: { type: string, enum: [tax.simples.das, tax.simples.historico] }
 *         externalRef: { type: string, minLength: 1, maxLength: 255, description: 'referência humana (ex.: número do DAS)' }
 *         documentDate: { type: string, description: 'date-only YYYY-MM-DD (data real, validada)' }
 *         description: { type: string, maxLength: 500 }
 *         file: { type: string, format: binary, description: 'PDF, PNG ou JPEG (F-SD-6 b), até 50 MB' }
 *     SourceDocumentUpload:
 *       type: object
 *       required: [id, sourceType, createdAt, attachment]
 *       properties:
 *         id: { type: string }
 *         sourceType: { type: string }
 *         externalRef: { type: string, nullable: true }
 *         documentDate: { type: string, nullable: true, description: 'YYYY-MM-DD' }
 *         description: { type: string, nullable: true }
 *         createdAt: { type: string, format: date-time }
 *         attachment:
 *           type: object
 *           required: [id, fileName, mimeType, fileSize, sha256]
 *           properties:
 *             id: { type: string }
 *             fileName: { type: string }
 *             mimeType: { type: string }
 *             fileSize: { type: integer }
 *             sha256: { type: string, description: 64-char hex checksum }
 */
export const CreateSourceDocumentUploadSchema = z
  .object({
    unitId: idLike,
    sourceType: z.enum(SOURCE_DOCUMENT_UPLOAD_TYPES),
    externalRef: z.string().trim().min(1).max(255).optional(),
    documentDate: z.string().refine(isValidDateOnly, 'documentDate deve ser uma data real YYYY-MM-DD').optional(),
    description: z.string().trim().max(500).optional(),
  })
  .strict();
export type CreateSourceDocumentUploadDto = z.infer<typeof CreateSourceDocumentUploadSchema>;

/** Resposta 201 (BRIEF item 4) — sem `storageKey`, `userId`, `unitId` (mesma regra do `DocumentAttachmentResponse`). */
export const SourceDocumentUploadViewSchema = z
  .object({
    id: z.string(),
    sourceType: z.string(),
    externalRef: z.string().nullable(),
    documentDate: z.string().nullable(),
    description: z.string().nullable(),
    createdAt: z.string(),
    attachment: z
      .object({ id: z.string(), fileName: z.string(), mimeType: z.string(), fileSize: z.number().int(), sha256: z.string() })
      .strict(),
  })
  .strict();
export type SourceDocumentUploadView = z.infer<typeof SourceDocumentUploadViewSchema>;

/**
 * F-SD-9 → (a): o documento como os consumidores (DAS, histórico) o expõem — o FE baixa pelo `GET /attachments/:id`.
 * `attachmentId`/`fileName` nulos quando o SD não tem anexo ativo.
 */
export const DocumentoRefSchema = z
  .object({ sourceDocumentId: z.string(), attachmentId: z.string().nullable(), fileName: z.string().nullable() })
  .strict()
  .nullable();
export type DocumentoRef = z.infer<typeof DocumentoRefSchema>;
