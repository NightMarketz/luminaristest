import { z } from 'zod';

/**
 * BE-INCR-TEAMMATES PR-0 item 3 — contratos Zod da §2.2 do BRIEF (docs/accounting/BE-INCR-TEAMMATES-brief.md), transcritos.
 * `ActionClassSchema` mora com o mapa `TOOL_CLASS` (item 4, um arquivo só) e é reexportado aqui como contrato.
 */
export { ActionClassSchema } from '../models/ActionClass.model';

export const LlmProviderIdSchema = z.enum(['anthropic', 'openai', 'gemini']);

const TeammateFields = z
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

/**
 * L-PR1-3 decidida (dono, chat, 2026-11-06, questionário: "Exigir o par no DTO"): `fallbackProvider` e `fallbackModel`
 * vêm juntos ou nenhum dos dois; só um deles ⇒ 400.
 */
const fallbackEmPar = (v: { fallbackProvider?: unknown; fallbackModel?: unknown }) =>
  (v.fallbackProvider === undefined) === (v.fallbackModel === undefined);
const FALLBACK_EM_PAR = { message: 'fallbackProvider e fallbackModel vêm juntos ou nenhum dos dois.', path: ['fallbackProvider'] };

export const TeammateCreateSchema = TeammateFields.refine(fallbackEmPar, FALLBACK_EM_PAR);

/** PR-2 item 10 (U do CRUD): mesmos campos, todos opcionais; a regra do par vale igual. */
export const TeammateUpdateSchema = TeammateFields.partial().strict().refine(fallbackEmPar, FALLBACK_EM_PAR);

/** PR-2 item 10 — o que sai do CRUD: a linha viva sem `userId`/`deletedAt`. */
export const TeammateReadSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    role: z.string(),
    playbook: z.string(),
    allowedTools: z.array(z.string()),
    toolOverrides: z.record(z.string(), z.literal('PROPOSTA')).nullable(),
    provider: LlmProviderIdSchema,
    model: z.string(),
    fallbackProvider: LlmProviderIdSchema.nullable(),
    fallbackModel: z.string().nullable(),
    dailyTurnLimit: z.number().int(),
    status: z.enum(['ACTIVE', 'PAUSED']),
    createdAt: z.string(),
    updatedAt: z.string(),
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
export type TeammateUpdateInput = z.infer<typeof TeammateUpdateSchema>;
export type TeammateRead = z.infer<typeof TeammateReadSchema>;
export type LlmCredentialCreateInput = z.infer<typeof LlmCredentialCreateSchema>;
export type LlmCredentialRead = z.infer<typeof LlmCredentialReadSchema>;
export type RoutineSchedule = z.infer<typeof RoutineScheduleSchema>;
export type ChannelPostInput = z.infer<typeof ChannelPostSchema>;
export type McpServerCreateInput = z.infer<typeof McpServerCreateSchema>;
export type TurnJob = z.infer<typeof TurnJobSchema>;
export type ProposalPayload = z.infer<typeof ProposalPayloadSchema>;
