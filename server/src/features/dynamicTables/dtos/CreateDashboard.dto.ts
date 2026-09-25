import { z } from 'zod';
import { UNIT_TYPE_OPTIONS } from '../presets/modules/core/UnitsModule';

/**
 * BE-INCR-ONBOARDING-FIRST-UNIT (nó I1, BRIEF item 1 e §2) — body do `POST /dashboard/create`.
 *
 * `unit` é OBRIGATÓRIO nos dois ramos (F-I1-2 → b, ratificado 2026-09-07): sem ele, 400 — o sistema gerado não nasce
 * mais sem unidade (antes: `units` vazia → `unitId = ''` → contabilidade inerte). `UnitInput` é `.strict()`: chave
 * desconhecida (`unit: { foo: 1 }`) → 400. Os ramos externos seguem sem `.strict()`, como antes (fora do escopo).
 */
export const UnitInputSchema = z
  .object({
    name: z.string().trim().min(1, 'unit.name é obrigatório').max(120),
    cnpj: z.string().max(18).optional(),
    type: z.enum(UNIT_TYPE_OPTIONS).optional(),
  })
  .strict();

export const QuickCreationSchema = z.object({
  mode: z.literal('quick').optional(),
  suiteKey: z.string().min(1, 'suiteKey é obrigatório'),
  unit: UnitInputSchema,
});

export const CustomCreationSchema = z.object({
  mode: z.literal('custom'),
  presetKey: z.string().min(1, 'presetKey é obrigatório'),
  removedTables: z.array(z.string()).optional(),
  addedFields: z.record(z.string(), z.array(z.unknown())).optional(),
  unit: UnitInputSchema,
});

export const UnifiedCreationSchema = z.union([QuickCreationSchema, CustomCreationSchema]);

export type UnitInput = z.infer<typeof UnitInputSchema>;
export type UnifiedCreationInput = z.infer<typeof UnifiedCreationSchema>;
