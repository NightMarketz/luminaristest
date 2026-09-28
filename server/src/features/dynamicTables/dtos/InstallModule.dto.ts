import { z } from 'zod';
import { moduleKeySchema } from '../presets/modules/registry';

/**
 * BE-INCR-CRM-MODULE-COMPOSITION (nó I8), comportamento 8 + contrato §3 — `POST /dashboard/modules/install`.
 * Liga UM módulo do registro num tenant já criado (F-CRM-6 → a: só ligar; desligar não existe).
 */
export const InstallModuleSchema = z.object({ moduleKey: moduleKeySchema }).strict();
export type InstallModuleInput = z.infer<typeof InstallModuleSchema>;

export const InstallModuleResultSchema = z
  .object({
    status: z.enum(['installed', 'already-installed']),
    tables: z.array(z.string()),
    synced: z.array(z.string()),
  })
  .strict();
export type InstallModuleResult = z.infer<typeof InstallModuleResultSchema>;
