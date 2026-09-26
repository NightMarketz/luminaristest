import { z } from 'zod';
import { UNIT_TYPE_OPTIONS } from '../presets/modules/core/UnitsModule';
import { moduleKeySchema } from '../presets/modules/registry';

/**
 * BE-INCR-ONBOARDING-FIRST-UNIT (nó I1, BRIEF item 1 e §2) — body do `POST /dashboard/create`.
 *
 * `unit` é OBRIGATÓRIO nos dois ramos (F-I1-2 → b, ratificado 2026-09-07): sem ele, 400 — o sistema gerado não nasce
 * mais sem unidade (antes: `units` vazia → `unitId = ''` → contabilidade inerte). `UnitInput` é `.strict()`: chave
 * desconhecida (`unit: { foo: 1 }`) → 400. Os ramos externos passaram a `.strict()` no I8 (abaixo).
 */
export const UnitInputSchema = z
  .object({
    name: z.string().trim().min(1, 'unit.name é obrigatório').max(120),
    cnpj: z.string().max(18).optional(),
    type: z.enum(UNIT_TYPE_OPTIONS).optional(),
  })
  .strict();

/**
 * BE-INCR-CRM-MODULE-COMPOSITION (nó I8), comportamento 2 + contrato §3 (F-CRM-9 → b, lista plana): `modules`
 * seleciona módulos do registro; categoria e dependências vêm do registro. Os dois ramos passam a ser `.strict()`
 * (o BRIEF §3 fecha o body do create): chave desconhecida → 400.
 */
const moduleSelection = {
  modules: z.array(moduleKeySchema).default([]),
  // I8 c11 (F-CRM-8 → a, F-I8-C11): { tabela: { campo: opções } } — só selects da allowlist `freeSelects`.
  selectOverrides: z.record(z.string(), z.record(z.string(), z.array(z.string().min(1)).min(1))).optional(),
};

export const QuickCreationSchema = z
  .object({
    mode: z.literal('quick').optional(),
    suiteKey: z.string().min(1, 'suiteKey é obrigatório'),
    unit: UnitInputSchema,
    ...moduleSelection,
  })
  .strict();

export const CustomCreationSchema = z
  .object({
    mode: z.literal('custom'),
    presetKey: z.string().min(1, 'presetKey é obrigatório'),
    removedTables: z.array(z.string()).optional(),
    addedFields: z.record(z.string(), z.array(z.unknown())).optional(),
    unit: UnitInputSchema,
    ...moduleSelection,
  })
  .strict();

export const UnifiedCreationSchema = z.union([QuickCreationSchema, CustomCreationSchema]);

export type UnitInput = z.infer<typeof UnitInputSchema>;
export type UnifiedCreationInput = z.infer<typeof UnifiedCreationSchema>;
