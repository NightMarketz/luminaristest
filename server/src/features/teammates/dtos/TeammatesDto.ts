import { z } from 'zod';

/**
 * BE-INCR-TEAMMATES PR-0 item 3 — contratos Zod da §2.2 do BRIEF (docs/accounting/BE-INCR-TEAMMATES-brief.md), transcritos.
 * `ActionClassSchema` mora com o mapa `TOOL_CLASS` (item 4, um arquivo só) e é reexportado aqui como contrato.
 */
export { ActionClassSchema } from '../models/ActionClass.model';

export const LlmProviderIdSchema = z.enum(['anthropic', 'openai', 'gemini']);

export const TeammateCreateSchema = z
  .object({
    name: z.string().min(1).max(80),
    role: z.string().min(1).max(160),
    playbook: z.string().min(1).max(8000),
    allowedTools: z.array(z.string()).min(1),
    toolOverrides: z.record(z.string(), z.literal('PROPOSTA')).optional(),
    provider: LlmProviderIdSchema,
    model: z.string().min(1),
    fallbackProvider: LlmProviderIdSchema.optional(),
    fallbackModel: z.string().min(1).optional(),
    dailyTurnLimit: z.number().int().min(1).max(1000).optional(),
  })
  .strict();

export const LlmCredentialCreateSchema = z
  .object({
    provider: LlmProviderIdSchema,
    apiKey: z.string().min(10),
    monthlyTokenBudget: z.number().int().positive().optional(),
  })
  .strict();

export const LlmCredentialReadSchema = z
  .object({
    id: z.string(),
    provider: LlmProviderIdSchema,
    last4: z.string(),
    monthlyTokenBudget: z.number().int().nullable(),
    createdAt: z.string(),
  })
  .strict(); // nunca a chave

const Hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const RoutineScheduleSchema = z.discriminatedUnion('freq', [
  z.object({ freq: z.literal('DAILY'), time: Hhmm }).strict(),
  z.object({ freq: z.literal('WEEKLY'), time: Hhmm, weekday: z.number().int().min(0).max(6) }).strict(),
  z.object({ freq: z.literal('MONTHLY'), time: Hhmm, monthday: z.number().int().min(1).max(28) }).strict(),
]);

export const ChannelPostSchema = z
  .object({
    content: z.string().min(1).max(8000),
    threadId: z.string().optional(),
  })
  .strict(); // menções são extraídas do content no service, contra os membros do canal

export const McpServerCreateSchema = z
  .object({
    name: z.string().min(1).max(80),
    url: z.string().url().startsWith('https://'),
    token: z.string().min(1).optional(),
  })
  .strict(); // host privado/loopback recusado no service (item 40)

export const TurnJobSchema = z.object({ turnId: z.string() }).strict(); // cerca da fila (item 20)

export const ProposalPayloadSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('TABLE_ROW'),
      action: z.enum(['CREATE', 'UPDATE', 'DELETE']),
      tableId: z.string(),
      data: z.record(z.string(), z.unknown()),
    })
    .strict(),
  z
    .object({
      kind: z.literal('SETTLEMENT_MATCH'),
      statementLineId: z.string(),
      targetType: z.enum(['RECEIVABLE', 'PAYABLE', 'ACQUIRER']),
      targetId: z.string(),
      amountCents: z.string().regex(/^\d+$/), // colunas *Cents são BigInt: string de dígitos na borda
      rationale: z.string().max(2000),
    })
    .strict(),
  z
    .object({
      kind: z.literal('MCP_TOOL_CALL'),
      mcpServerId: z.string(),
      tool: z.string(),
      arguments: z.record(z.string(), z.unknown()),
    })
    .strict(),
  z
    .object({
      kind: z.literal('LIMITE_ATINGIDO'),
      limit: z.enum(['DAILY_TURNS', 'MONTHLY_TOKENS', 'HOPS']),
      teammateId: z.string().optional(),
      threadId: z.string().optional(),
    })
    .strict(),
]);

export type TeammateCreateInput = z.infer<typeof TeammateCreateSchema>;
export type LlmCredentialCreateInput = z.infer<typeof LlmCredentialCreateSchema>;
export type LlmCredentialRead = z.infer<typeof LlmCredentialReadSchema>;
export type RoutineSchedule = z.infer<typeof RoutineScheduleSchema>;
export type ChannelPostInput = z.infer<typeof ChannelPostSchema>;
export type McpServerCreateInput = z.infer<typeof McpServerCreateSchema>;
export type TurnJob = z.infer<typeof TurnJobSchema>;
export type ProposalPayload = z.infer<typeof ProposalPayloadSchema>;
