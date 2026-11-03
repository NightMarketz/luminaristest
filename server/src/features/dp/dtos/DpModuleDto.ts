/**
 * DTOs das rotas `/api/dp/modules` — BE-INCR-DP-F0-F1 item 15 (PR-1), esboço do §3.4. `.strict()`; o `unitId` resolve o
 * escopo pelo `AccountingScopeResolver` (como `/api/accounting/partners`), mas a ativação é por instância.
 */
import { z } from 'zod';
import { CompetenciaSchema } from '../models/competencia';
import { dpModuleKeySchema } from '../models/moduleRegistry';

export const DpScopeQuerySchema = z.object({ unitId: z.string().min(1) }).strict();
export type DpScopeQuery = z.infer<typeof DpScopeQuerySchema>;

export const DpIdParamSchema = z.object({ id: z.string().cuid() }).strict();

export const AtivarModuloSchema = z
  .object({
    unitId: z.string().min(1),
    moduleKey: dpModuleKeySchema,
    competenciaInicio: CompetenciaSchema,
    motivo: z.string().min(3).max(500),
  })
  .strict();
export type AtivarModuloInput = z.infer<typeof AtivarModuloSchema>;

export const EncerrarModuloSchema = z
  .object({
    unitId: z.string().min(1),
    competenciaFim: CompetenciaSchema,
    motivo: z.string().min(3).max(500),
  })
  .strict();
export type EncerrarModuloInput = z.infer<typeof EncerrarModuloSchema>;
