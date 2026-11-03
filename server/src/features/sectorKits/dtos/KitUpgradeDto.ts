import { z } from 'zod';
import {
  ADDITIVE_KINDS,
  CONFLICT_REASONS,
  FORWARD_KINDS,
  KIT_PENDING_STATUSES,
  KIT_UPGRADE_MODES,
  KIT_UPGRADE_RUN_STATUSES,
} from '../models/kitUpgradeTypes';
import { KIT_INSTALL_STATUSES } from '../models/kitInstallTypes';
import { KitInstallStepsSchema } from './KitInstallationDto';

/**
 * Contratos da atualização do kit (BE-INCR-KIT-SETOR, PR-4; BRIEF §3.3, §3.4; emenda §12).
 */

/** §3.3 — o diff do alvo contra o estado real do tenant. */
export const KitDiffSchema = z
  .object({
    additive: z.array(z.object({ kind: z.enum(ADDITIVE_KINDS), itemKey: z.string(), value: z.unknown() }).strict()),
    forward: z.array(
      z
        .object({
          kind: z.enum(FORWARD_KINDS),
          itemKey: z.string(),
          eventKey: z.string().optional(),
          before: z.unknown(),
          after: z.unknown(),
        })
        .strict(),
    ),
    conflict: z.array(
      z
        .object({ reason: z.enum(CONFLICT_REASONS), itemKey: z.string(), kitValue: z.unknown(), tenantValue: z.unknown() })
        .strict(),
    ),
    notices: z.array(z.object({ itemKey: z.string(), message: z.string() }).strict()),
  })
  .strict();
export type KitDiff = z.infer<typeof KitDiffSchema>;

export const KIT_ITEM_OUTCOMES = ['applied', 'pending', 'skipped', 'failed'] as const;

/** §3.3 — `KitUpgradeRun.report` (coluna JSON). */
export const KitUpgradeReportSchema = KitDiffSchema.extend({
  results: z.array(
    z.object({ itemKey: z.string(), outcome: z.enum(KIT_ITEM_OUTCOMES), error: z.string().optional() }).strict(),
  ),
  bindingVersionBefore: z.number().int().optional(),
  bindingVersionAfter: z.number().int().optional(),
}).strict();
export type KitUpgradeReport = z.infer<typeof KitUpgradeReportSchema>;

/** Entrada de `KitUpgradeService.upgrade` (item 34). */
export const UpgradeUnitInputSchema = z
  .object({
    mode: z.enum(KIT_UPGRADE_MODES),
    deployId: z.string().min(1).max(200),
    /** `'deploy-cli'` ou o userId de quem roda. */
    actor: z.string().min(1),
  })
  .strict();
export type UpgradeUnitInput = z.infer<typeof UpgradeUnitInputSchema>;

/** Resumo de uma execução (na view da instalação e no resultado do `upgrade`). */
export const KitUpgradeRunSummarySchema = z
  .object({
    id: z.string(),
    mode: z.enum(KIT_UPGRADE_MODES),
    status: z.enum(KIT_UPGRADE_RUN_STATUSES),
    fromVersion: z.number().int(),
    toVersion: z.number().int(),
    deployId: z.string(),
    startedAt: z.string(),
    finishedAt: z.string().nullable(),
    counts: z.object({ additive: z.number().int(), forward: z.number().int(), conflicts: z.number().int() }).strict(),
  })
  .strict();
export type KitUpgradeRunSummary = z.infer<typeof KitUpgradeRunSummarySchema>;

/** Item 38 — `GET /accounting-kit?unitId=`; `null` quando a unidade não tem kit. */
export const KitInstallationViewSchema = z
  .object({
    kitKey: z.string(),
    kitVersion: z.number().int(),
    latestVersion: z.number().int(),
    status: z.enum(KIT_INSTALL_STATUSES),
    lastRun: KitUpgradeRunSummarySchema.nullable(),
    openPendingCount: z.number().int().min(0),
    /** As entradas do `changelog` das versões depois da instalada, até a última. */
    changelog: z.array(z.object({ kitVersion: z.number().int(), entries: z.array(z.string()) }).strict()),
    /** EMENDA-2 da LAC-B, item 0 (F-KA-4 b): o último passo concluído e os avisos do referencial, como gravados. */
    steps: KitInstallStepsSchema,
  })
  .strict();
export type KitInstallationView = z.infer<typeof KitInstallationViewSchema>;

export const KitUpgradePendingViewSchema = z
  .object({
    id: z.string(),
    kitKey: z.string(),
    toVersion: z.number().int(),
    runId: z.string(),
    itemKey: z.string(),
    reason: z.enum(CONFLICT_REASONS),
    kitValue: z.unknown(),
    tenantValue: z.unknown(),
    status: z.enum(KIT_PENDING_STATUSES),
    decidedById: z.string().nullable(),
    decidedAt: z.string().nullable(),
    motivo: z.string().nullable(),
    createdAt: z.string(),
  })
  .strict();
export type KitUpgradePendingView = z.infer<typeof KitUpgradePendingViewSchema>;

/** `GET /accounting-kit/pending?unitId=&status=` (item 37). */
export const ListKitPendingQuerySchema = z
  .object({ unitId: z.string().min(1), status: z.enum(KIT_PENDING_STATUSES).optional() })
  .strict();

/** `POST /accounting-kit/pending/:id/accept|reject` (item 37): `motivo` obrigatório, mesma faixa do ajuste (10–500). */
export const DecideKitPendingRequestSchema = z
  .object({ unitId: z.string().min(1), motivo: z.string().trim().min(10).max(500) })
  .strict();
export type DecideKitPendingRequest = z.infer<typeof DecideKitPendingRequestSchema>;
