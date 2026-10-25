import { z } from 'zod';
import { moduleSelectorSchema } from '../../dynamicTables/presets/modules/registry';

/**
 * BE-INCR-INTERVIEW-SESSION (nó W4, item 7) — corpo de `POST /api/dashboard/ai/ChatInterview`, saído do controller.
 * O front (`useAiInterview`) manda `{ messages, stage, presetKey?, sessionId?, choice? }`; mensagens chegam como
 * `{ sender, text }` e o controller as normaliza para `{ role, content }`. `.strict()`: chave desconhecida → 400.
 */
export const InterviewMessageSchema = z
  .object({
    role: z.enum(['user', 'assistant']).optional(),
    sender: z.enum(['user', 'ai']).optional(),
    content: z.string().optional(),
    text: z.string().optional(),
  })
  .strict();

export const ChatInterviewSchema = z
  .object({
    stage: z.string().optional().default('GREETING'),
    messages: z.array(InterviewMessageSchema).optional().default([]),
    presetKey: z.string().optional(),
    // Id da linha `InterviewSession` (uuid gerado pelo Prisma, item 1).
    sessionId: z.string().uuid().optional(),
    // W3 (b), F-W3-B1 a: escolha por botão — decide sem ler o texto.
    choice: z.enum(['create', 'customize']).optional(),
    // W1 (F-W1-6 a): módulos marcados no front; lidos só no turno que abre a sessão (`choice:'customize'`).
    modules: z.array(moduleSelectorSchema).optional(),
  })
  .strict();

export type InterviewMessageDto = z.infer<typeof InterviewMessageSchema>;
export type ChatInterviewDto = z.infer<typeof ChatInterviewSchema>;
