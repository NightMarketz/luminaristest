import { z } from 'zod';

/**
 * BE-INCR-W6-CUSTOMIZE-FIELDS (nó W6, item 2; BRIEF WIZARD-W6 §2.1) — corpo de `POST /api/dashboard/ai/CustomizeFields`.
 * União discriminada por `kind`, `.strict()` nos dois ramos: o histórico mora no servidor (F-W6-3 a), então
 * `conversationHistory` no corpo é chave desconhecida → 400.
 */
const SessionRef = { sessionId: z.string().min(1), tableKey: z.string().min(1) };

/**
 * W6 emenda (BRIEF WIZARD-W6-MANUAL-SESSION §2.1): o campo que o modo manual cria. É a borda da rota; a regra do
 * campo continua sendo o `AdvancedFieldSchema` (item 3). F-MS-2 (a): `email`/`phone` chegam como `format`.
 */
const ManualFieldSchema = z
  .object({
    name: z.string().trim().min(1),
    label: z.string().trim().min(1),
    type: z.enum(['string', 'number', 'boolean', 'date', 'datetime']),
    format: z.enum(['email', 'phone']).optional(),
    required: z.boolean(),
  })
  .strict()
  // Revisão do #786 (dono, 21/10): e-mail e telefone são formato de texto; em número/data/booleano não fazem sentido.
  .refine((f) => f.format === undefined || f.type === 'string', { message: '`format` só vale para campo texto.', path: ['format'] });

/** F-MS-1 (a): só o que o modo manual sabe fazer — acrescentar campo e trocar a visibilidade. */
const ManualChangeSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('add'), field: ManualFieldSchema }).strict(),
  z.object({ action: z.literal('setHidden'), name: z.string().min(1), hidden: z.boolean() }).strict(),
]);

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
  z
    .object({
      kind: z.literal('manual'),
      ...SessionRef,
      changes: z.array(ManualChangeSchema).min(1).max(50),
      // F-MS-3 (a): a mesma ciência do modo IA quando um campo novo casa a rede de dado sensível.
      acknowledgeSensitive: z.literal(true).optional(),
    })
    .strict(),
]);

export type CustomizeFieldsDtoType = z.infer<typeof CustomizeFieldsDto>;
export type CustomizeFieldsMessageDto = Extract<CustomizeFieldsDtoType, { kind: 'message' }>;
export type CustomizeFieldsDecisionDto = Extract<CustomizeFieldsDtoType, { kind: 'decision' }>;
export type CustomizeFieldsManualDto = Extract<CustomizeFieldsDtoType, { kind: 'manual' }>;
export type ManualChange = CustomizeFieldsManualDto['changes'][number];
