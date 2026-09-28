import { z } from 'zod';
import { moduleKeySchema, moduleSelectorSchema } from '../presets/modules/registry';

/**
 * BE-INCR-CRM-MODULE-COMPOSITION (nó I8), comportamento 8 + contrato §3 — `POST /dashboard/modules/install`.
 * Liga UM módulo do registro num tenant já criado (F-CRM-6 → a: só ligar; desligar não existe).
 * BE-INCR-CRM-SUBMODULES item 7 (F-SUB-2 → a): `moduleKey` aceita também a chave de grupo ('CRM-2'), que instala
 * os membros em ordem; o resultado agregado traz `modules` com as chaves atômicas.
 */
export const InstallModuleSchema = z.object({ moduleKey: moduleSelectorSchema }).strict();
export type InstallModuleInput = z.infer<typeof InstallModuleSchema>;

export const InstallModuleResultSchema = z
  .object({
    status: z.enum(['installed', 'already-installed']),
    tables: z.array(z.string()),
    synced: z.array(z.string()),
    modules: z.array(moduleKeySchema).optional(),
  })
  .strict();
export type InstallModuleResult = z.infer<typeof InstallModuleResultSchema>;
