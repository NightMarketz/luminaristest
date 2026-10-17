import { z } from 'zod';
import { AI_FIELD_TYPES, MODEL_SENSITIVE_CATEGORIES } from './Types';

/**
 * Saída do modelo presa a schema (F-W6-4 a; BRIEF WIZARD-W6 §2.3): `json_schema` strict, uma chamada por turno, com o
 * casamento de preset no mesmo schema (`presetKey` ∈ chaves do `FieldPresetKnowledgeBase` ou `null`). O strict mode
 * exige todo campo em `required`; o que não se aplica volta `null` ou vazio e a validação do item 8 normaliza.
 */
export function buildFieldCustomizationResponseFormat(presetKeys: readonly string[]) {
  const nullable = (schema: Record<string, unknown>) => ({ anyOf: [schema, { type: 'null' }] });
  return {
    type: 'json_schema' as const,
    json_schema: {
      name: 'field_customization',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['friendlyMessage', 'changes'],
        properties: {
          friendlyMessage: { type: 'string' },
          changes: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: [
                'action',
                'name',
                'originalName',
                'label',
                'type',
                'required',
                'options',
                'description',
                'sensitiveCategory',
                'presetKey',
              ],
              properties: {
                action: { type: 'string', enum: ['add', 'update', 'remove'] },
                name: { type: 'string' },
                originalName: nullable({ type: 'string' }),
                label: { type: 'string' },
                type: { type: 'string', enum: [...AI_FIELD_TYPES] },
                required: { type: 'boolean' },
                options: { type: 'array', items: { type: 'string' } },
                description: { type: 'string' },
                sensitiveCategory: nullable({ type: 'string', enum: [...MODEL_SENSITIVE_CATEGORIES] }),
                presetKey: nullable({ type: 'string', enum: [...presetKeys] }),
              },
            },
          },
        },
      },
    },
  };
}

/**
 * Defesa além do schema da API: a resposta é relida com Zod. `type` e `presetKey` ficam `string` aqui de propósito —
 * valor fora da lista é descarte por campo (item 8), não falha do turno inteiro.
 */
const ModelChangeSchema = z.object({
  action: z.enum(['add', 'update', 'remove']),
  name: z.string(),
  originalName: z.string().nullable(),
  label: z.string(),
  type: z.string(),
  required: z.boolean(),
  options: z.array(z.string()),
  description: z.string(),
  sensitiveCategory: z.enum(MODEL_SENSITIVE_CATEGORIES).nullable(),
  presetKey: z.string().nullable(),
});

export const ModelOutputSchema = z.object({
  friendlyMessage: z.string(),
  changes: z.array(ModelChangeSchema),
});

export type ModelChange = z.infer<typeof ModelChangeSchema>;
export type ModelOutput = z.infer<typeof ModelOutputSchema>;

/** JSON inválido ou fora do schema ⇒ `null` (item 6: o turno segue sem proposta). */
export function parseModelOutput(content: string | null | undefined): ModelOutput | null {
  if (!content) return null;
  try {
    const parsed = ModelOutputSchema.safeParse(JSON.parse(content));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
