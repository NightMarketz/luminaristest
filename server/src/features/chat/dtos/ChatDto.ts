import { z } from 'zod';

// Schema for a single history item.
const HistoryItemSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

/**
 * RAG-PR-B item 15a (emenda 07/11, F-RAG-M1/M2): modo da resposta no RAG. DESCRITIVO numera os trechos e devolve
 * `citations`; RAPIDO é o comportamento anterior. Sem o campo, o service usa RAPIDO.
 */
export const RagModeSchema = z.enum(['DESCRITIVO', 'RAPIDO']);
export type RagMode = z.infer<typeof RagModeSchema>;

/** Item 15d (F-RAG-M5): dados técnicos de um trecho, para o hover do modo descritivo. */
export const RagTechnicalSchema = z.object({
  chunkId: z.string(),
  documentId: z.string(),
  fileName: z.string(),
  chunkIndex: z.number().int(),
  score: z.number(),
  embeddingStamp: z.string(),
}).strict();
export type RagTechnical = z.infer<typeof RagTechnicalSchema>;

/** Item 15b (F-RAG-M4): liga o marcador `[n]` da resposta ao trecho entregue ao modelo. */
export const RagCitationSchema = z.object({
  marker: z.number().int().min(1),
  chunkId: z.string(),
}).strict();
export type RagCitation = z.infer<typeof RagCitationSchema>;

/**
 * Schema validating the chat request.
 */
export const ChatRequestSchema = z.object({
  query: z.string().max(4000).optional(),
  documentIds: z.array(z.string()).optional(),
  history: z.array(HistoryItemSchema).max(50).optional(),
  // Target chat instance: when present, the server persists the user message and the assistant reply.
  chatInstanceId: z.string().optional(),
  // Id of a confirmed action proposal sent back by the frontend.
  confirmedProposalId: z.string().optional(),
  // Item 15a: modo da resposta (F-RAG-M1). Vale no modo RAG e, no agente, para search_documents (15f).
  ragMode: RagModeSchema.optional(),
});

/**
 * Schema for the chat response.
 */
export const ChatResponseSchema = z.object({
  answer: z.string(),
  // Response type so the frontend knows whether to show a confirmation modal.
  type: z.enum(['TEXT', 'ACTION_PROPOSAL']).default('TEXT'),
  // Proposal metadata, when present.
  proposal: z.object({
    id: z.string(),
    // DELETE has no emitter yet (no delete tool in LuminarisAgentService); kept for TEAMMATES, whose
    // TABLE_ROW proposal uses the same enum (dono, 2026-10-29, D-2026-10-29-FIX-CHAT-AGENTE-FECHAMENTO, #20).
    action: z.enum(['CREATE', 'UPDATE', 'DELETE']),
    tableName: z.string(),
    tableLabel: z.string(),
    data: z.any(),
  }).optional(),
  sourceDocuments: z.array(
    z.object({
      id: z.string(),
      score: z.number(),
      payload: z.object({
        documentId: z.string(),
        textContent: z.string(),
        fileName: z.string(),
        chunkId: z.string(),
        index: z.number(),
      }),
      // Item 15d: o que o hover mostra; sai do servidor, o front só exibe.
      technical: RagTechnicalSchema.optional(),
    })
  ).optional(),
  // Item 15b/15f: só no DESCRITIVO. Cada marcador aponta para um item de sourceDocuments.
  citations: z.array(RagCitationSchema).optional(),
  // Item 15d (F-RAG-M5): modelo que gerou a resposta.
  answerModel: z.string().optional(),
});

/** Item 15e (F-RAG-M7): o que fica em `ChatMessage.ragDetail` para o chat reaberto mostrar o mesmo. */
export const RagDetailSchema = z.object({
  mode: RagModeSchema,
  citations: z.array(RagCitationSchema),
  sources: z.array(RagTechnicalSchema),
  answerModel: z.string().optional(),
}).strict();
export type RagDetail = z.infer<typeof RagDetailSchema>;

// Inferred types for use across the codebase.
export type ChatRequestDto = z.infer<typeof ChatRequestSchema>;
export type ChatResponseDto = z.infer<typeof ChatResponseSchema>;
