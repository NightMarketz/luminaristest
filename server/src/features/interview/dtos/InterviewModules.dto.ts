import { z } from 'zod';
import { moduleSelectorSchema } from '../../dynamicTables/presets/modules/registry';

/**
 * W1 (F-W1-6 → a + sincronização, dono, questionário 2026-10-24) — corpo de `POST /api/dashboard/ai/InterviewModules`.
 * O usuário marca/desmarca módulo durante a customização e a sessão regrava as tabelas dos módulos. `modules` é a
 * seleção inteira (não um delta). `.strict()`: chave desconhecida → 400.
 */
export const InterviewModulesSchema = z
  .object({
    sessionId: z.string().uuid(),
    modules: z.array(moduleSelectorSchema),
  })
  .strict();

export type InterviewModulesDto = z.infer<typeof InterviewModulesSchema>;
