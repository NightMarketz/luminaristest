import { z } from 'zod';
import { queryBoolean } from './queryPrimitives';

/**
 * DepreciationRateDto — tabela de taxas de depreciação (BE-INCR-FIXED-ASSETS, nó C8, Bloco A).
 * `.strict()` nos corpos; a query não é `.strict()` (padrão `queryPrimitives`). Toda linha criada
 * por este DTO nasce `source='CUSTOM'` — as linhas `ANEXO_III_*` só existem via seed (parecer D4,
 * imutáveis; não há rota de edição nesta fatia).
 */

/** @openapi
 * components:
 *   schemas:
 *     ListDepreciationRatesQuery:
 *       type: object
 *       required: [unitId]
 *       properties:
 *         unitId:        { type: string }
 *         includeHidden: { type: string, enum: ['true', 'false'], description: 'default false — omite linhas ocultas (hiddenAt)' }
 */
export const ListDepreciationRatesQuerySchema = z.object({
  unitId: z.string().min(1),
  includeHidden: queryBoolean(),
});

/** @openapi
 * components:
 *   schemas:
 *     UpsertDepreciationRateInput:
 *       type: object
 *       required: [unitId, description, lifeYears, annualRateBp, justification]
 *       properties:
 *         unitId:        { type: string }
 *         ncm:           { type: string, description: 'referência NCM, texto livre — opcional (a taxa pode não ter NCM único, ex. classe de uso)' }
 *         description:   { type: string }
 *         lifeYears:     { type: integer, minimum: 1 }
 *         annualRateBp:  { type: integer, minimum: 1, maximum: 10000, description: 'basis points anuais — 10% = 1000' }
 *         justification: { type: string, description: 'obrigatório — CUSTOM sempre cita a origem da taxa (laudo, contrato, etc.)' }
 */
export const UpsertDepreciationRateSchema = z
  .object({
    unitId: z.string().min(1),
    ncm: z.string().min(1).optional(),
    description: z.string().min(1),
    lifeYears: z.number().int().gt(0),
    annualRateBp: z.number().int().min(1).max(10000),
    justification: z.string().min(1),
  })
  .strict();

/** @openapi
 * components:
 *   schemas:
 *     HideDepreciationRateInput:
 *       type: object
 *       required: [unitId]
 *       properties:
 *         unitId: { type: string }
 */
export const HideDepreciationRateSchema = z
  .object({
    unitId: z.string().min(1),
  })
  .strict();

export type ListDepreciationRatesQueryInput = z.infer<typeof ListDepreciationRatesQuerySchema>;
export type UpsertDepreciationRateInput = z.infer<typeof UpsertDepreciationRateSchema>;
export type HideDepreciationRateInput = z.infer<typeof HideDepreciationRateSchema>;
