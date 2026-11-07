import { z } from 'zod';
import { DocumentPurpose } from '../models/Document.model';
import { DocumentContext } from '../models/DocumentContext';

/**
 * Schema for creating a new Document record upon file upload.
 */
export const CreateDocumentSchema = z.object({
  fileName: z.string({ message: 'document.validation.fileNameRequired' })
    .min(1, 'document.validation.fileNameRequired'),
  fileType: z.enum(['PDF', 'DOCX', 'XLSX'] as const, {
    message: 'document.validation.fileTypeRequired',
  }),
  fileSize: z.number({ message: 'document.validation.fileSizeRequired' })
    .positive('document.validation.fileSizePositive'),
  documentPurpose: z.nativeEnum(DocumentPurpose, {
    message: 'document.validation.purposeRequired',
  }).default(DocumentPurpose.DATA_ANALYSIS),
});

/**
 * Contexto gerado do documento (F-RAG-B1 a), em `Document.generatedContext`. Quem grava a parte gerada é o pipeline
 * (RAG-PR-D, item 26); o usuário corrige pelo `PATCH /documents/:id` e cada campo corrigido entra em `userEditedFields`
 * (o pipeline não sobrescreve campo editado).
 */
export const GeneratedContextSchema = z.object({
  version: z.literal(1),
  documentType: z.string().min(1).max(60).nullable(),
  entities: z.array(z.object({
    type: z.enum(['PESSOA', 'EMPRESA', 'DATA', 'VALOR', 'IDENTIFICADOR', 'OUTRO']),
    value: z.string().min(1).max(200),
  }).strict()).max(50),
  userEditedFields: z.array(z.enum(['summary', 'documentType', 'entities'])).default([]),
}).strict();
export type GeneratedContext = z.infer<typeof GeneratedContextSchema>;
export type UserEditableContextField = GeneratedContext['userEditedFields'][number];

/**
 * Corpo do `PATCH /documents/:id` (RAG-PR-B item 18, F-RAG-4). Só o que o usuário corrige: `fileName`,
 * `documentPurpose`, `summary` e os campos corrigíveis do contexto gerado. `status`, `processingError`,
 * `processingDate` e `contextJson` são do pipeline (gravados pelo repositório) — chave extra → 400.
 */
export const UpdateDocumentContextSchema = z.object({
  fileName: z.string().min(1).max(255).optional(),
  documentPurpose: z.nativeEnum(DocumentPurpose).optional(),
  summary: z.string().max(4000).nullable().optional(),
  documentType: z.string().min(1).max(60).nullable().optional(),
  entities: GeneratedContextSchema.shape.entities.optional(),
}).strict();
export type UpdateDocumentContextDto = z.infer<typeof UpdateDocumentContextSchema>;

/**
 * Query schema for the paginated document list. Caps `limit` to protect against unbounded reads.
 */
export const ListDocumentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
export type ListDocumentsQuery = z.infer<typeof ListDocumentsQuerySchema>;

/**
 * Body schema for semantic search (`POST /documents/search`). Caps `limit` to protect against unbounded reads.
 * RAG-PR-B item 14 (BRIEF §2.4): `documentIds` (máx. 50) restringe a busca; `.strict()` — chave extra → 400.
 */
export const SearchDocumentsSchema = z.object({
  query: z.string().min(1, 'document.validation.queryRequired'),
  documentIds: z.array(z.string()).max(50).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10),
}).strict();
export type SearchDocumentsDto = z.infer<typeof SearchDocumentsSchema>;

/**
 * Args da ferramenta `search_documents` do agente (RAG-PR-B item 16, BRIEF §2.4). Sem `documentIds`: a busca com
 * seleção é o modo RAG do chat (F-RAG-3 a).
 */
export const SearchDocumentsToolArgsSchema = z.object({
  query: z.string().min(1).max(2000),
  limit: z.number().int().min(1).max(10).default(5),
}).strict();
export type SearchDocumentsToolArgs = z.infer<typeof SearchDocumentsToolArgsSchema>;

/** Um acerto da busca (BRIEF §2.4). */
export type DocumentSearchHit = { documentId: string; fileName: string; chunkIndex: number; text: string; score: number };

export type CreateDocumentDto = z.infer<typeof CreateDocumentSchema>;
 