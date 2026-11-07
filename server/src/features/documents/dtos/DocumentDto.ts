import { z } from 'zod';
import { DocumentStatus, DocumentPurpose } from '../models/Document.model';
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
 * Schema for updating a Document record's processing status and results.
 */
export const UpdateDocumentSchema = z.object({
  contextJson: z.object({
    processing: z.object({
      totalChunks: z.number(),
      processedChunks: z.number(),
      failedChunks: z.number(),
      duration: z.number(),
      startTime: z.string(),
      endTime: z.string()
    }),
    statistics: z.object({
      wordCount: z.number(),
      charCount: z.number(),
      avgWordLength: z.number()
    }),
    errors: z.array(z.object({
      code: z.string(),
      message: z.string(),
      timestamp: z.string()
    })).optional()
  }).optional(),
  status: z.nativeEnum(DocumentStatus, {
    message: 'document.validation.statusRequired',
  }),
  summary: z.string().nullable(),
  processingDate: z.preprocess((val) => {
    if (typeof val === 'string' || val instanceof Date) {
      return val instanceof Date ? val : new Date(val);
    }
    return val;
  }, z.date().nullable()),
  processingError: z.string().nullable(),
});

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
export type UpdateDocumentDto = z.infer<typeof UpdateDocumentSchema>; 