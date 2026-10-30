import { z } from 'zod';

// Schema for a single history item.
const HistoryItemSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

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
        userId: z.string(),
        textContent: z.string(),
        fileName: z.string(),
        chunkId: z.string(),
        index: z.number(),
      }),
    })
  ).optional(),
});

// Inferred types for use across the codebase.
export type ChatRequestDto = z.infer<typeof ChatRequestSchema>;
export type ChatResponseDto = z.infer<typeof ChatResponseSchema>;
