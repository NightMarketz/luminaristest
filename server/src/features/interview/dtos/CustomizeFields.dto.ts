import { z } from 'zod';

/**
 * BE-INCR-W6-CUSTOMIZE-FIELDS (nó W6, item 2; BRIEF WIZARD-W6 §2.1) — corpo de `POST /api/dashboard/ai/CustomizeFields`.
 * União discriminada por `kind`, `.strict()` nos dois ramos: o histórico mora no servidor (F-W6-3 a), então
 * `conversationHistory` no corpo é chave desconhecida → 400.
 */
const SessionRef = { sessionId: z.string().min(1), tableKey: z.string().min(1) };

export const CustomizeFieldsDto = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('message'), ...SessionRef, message: z.string().trim().min(1).max(2000) }).strict(),
  z
    .object({
      kind: z.literal('decision'),
      ...SessionRef,
      proposalId: z.string().min(1),
      decision: z.enum(['apply', 'discard']),
      acknowledgeSensitive: z.literal(true).optional(),
    })
    .strict(),
]);

export type CustomizeFieldsDtoType = z.infer<typeof CustomizeFieldsDto>;
export type CustomizeFieldsMessageDto = Extract<CustomizeFieldsDtoType, { kind: 'message' }>;
export type CustomizeFieldsDecisionDto = Extract<CustomizeFieldsDtoType, { kind: 'decision' }>;
