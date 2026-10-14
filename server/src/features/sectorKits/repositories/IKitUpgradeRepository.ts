import type { KitUpgradePending, KitUpgradeRun, Prisma } from 'generated/prisma';
import type { BindingScope } from '../../accountingBinding/repositories/IAccountingBindingRepository';
import type { ConflictReason, KitPendingStatus, KitUpgradeMode, KitUpgradeRunStatus } from '../models/kitUpgradeTypes';

export interface CreateKitUpgradeRunInput {
  kitKey: string;
  fromVersion: number;
  toVersion: number;
  deployId: string;
  mode: KitUpgradeMode;
  status: KitUpgradeRunStatus;
  report: string;
  actor: string;
}

export interface CreateKitPendingInput {
  kitKey: string;
  toVersion: number;
  runId: string;
  itemKey: string;
  reason: ConflictReason;
  kitValue: string;
  tenantValue: string;
}

/**
 * Acesso a `kit_upgrade_runs` e `kit_upgrade_pendings` (BE-INCR-KIT-SETOR, PR-4, itens 32–33). Único lugar com
 * `prisma.kitUpgradeRun.*`/`prisma.kitUpgradePending.*`. Escopo = o `BindingScope` da unidade.
 */
export interface IKitUpgradeRepository {
  createRun(scope: BindingScope, data: CreateKitUpgradeRunInput, tx?: Prisma.TransactionClient): Promise<KitUpgradeRun>;
  finishRun(
    scope: BindingScope,
    id: string,
    data: { status: KitUpgradeRunStatus; report: string },
    tx?: Prisma.TransactionClient,
  ): Promise<KitUpgradeRun>;
  /** Item 34: o DRY_RUN da mesma (unidade, kit, from→to) no mesmo deploy. */
  findDryRun(
    scope: BindingScope,
    key: { kitKey: string; fromVersion: number; toVersion: number; deployId: string },
  ): Promise<KitUpgradeRun | null>;
  findLastRun(scope: BindingScope, kitKey: string): Promise<KitUpgradeRun | null>;

  /** Cria só as pendências que ainda não existem para (kit, toVersion, itemKey) — a recusada não reaparece (item 37). */
  createPendingsIfAbsent(scope: BindingScope, items: CreateKitPendingInput[], tx: Prisma.TransactionClient): Promise<number>;
  listPendings(scope: BindingScope, status?: KitPendingStatus): Promise<KitUpgradePending[]>;
  countOpenPendings(scope: BindingScope): Promise<number>;
  findPending(scope: BindingScope, id: string, tx?: Prisma.TransactionClient): Promise<KitUpgradePending | null>;
  /** CAS `OPEN → status`; devolve as linhas afetadas (0 = já decidida). */
  decidePending(
    scope: BindingScope,
    id: string,
    data: { status: Exclude<KitPendingStatus, 'OPEN'>; motivo: string },
    tx: Prisma.TransactionClient,
  ): Promise<number>;

  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
