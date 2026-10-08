import { z } from 'zod';
import { KIT_INSTALL_STATUSES, KIT_INSTALL_WARNINGS, LAST_KIT_INSTALL_STEP } from '../models/kitInstallTypes';

/**
 * Contratos da instalação do kit (BE-INCR-KIT-SETOR, PR-2; BRIEF §3.2 e §3.4).
 */

/** `KitInstallation.steps` (coluna JSON): o último passo concluído e os avisos acumulados. */
export const KitInstallStepsSchema = z
  .object({
    lastCompletedStep: z.number().int().min(0).max(LAST_KIT_INSTALL_STEP),
    warnings: z.array(z.enum(KIT_INSTALL_WARNINGS)),
  })
  .strict();
export type KitInstallSteps = z.infer<typeof KitInstallStepsSchema>;

/** O kit na resposta do `activate-default` (item 11, aditivo e opcional). */
export const KitRefSchema = z
  .object({
    kitKey: z.string().min(1),
    kitVersion: z.number().int().min(1),
    status: z.enum(KIT_INSTALL_STATUSES),
  })
  .strict();
export type KitRef = z.infer<typeof KitRefSchema>;

/**
 * Entrada de `KitInstallService.install` (item 10). `regime` ausente ⇒ resolvido pela regra do item 12;
 * `ano` = ano do `today` do validador. As duas flags são as do `activate-default` (pré-checks mantidos, item 11):
 * o CLI passa as duas `false`, como hoje (nunca instala plano nem abre período).
 */
export const InstallKitInputSchema = z
  .object({
    kitKey: z.string().min(1),
    ano: z.number().int().min(2000).max(9999),
    regime: z.enum(['MEI', 'SIMPLES', 'PRESUMIDO', 'REAL']).nullable().optional(),
    installChartIfEmpty: z.boolean(),
    openCurrentPeriodIfMissing: z.boolean(),
    /** Data-only `YYYY-MM-DD` do mês a abrir e do dry-run do compile. */
    today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .strict();
export type InstallKitInput = z.infer<typeof InstallKitInputSchema>;
