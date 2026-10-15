import prisma from '../../../lib/prisma';
import type { KitUpgradePending, KitUpgradeRun, Prisma } from 'generated/prisma';
import { bindingScopeWhere, type BindingScope } from '../../accountingBinding/repositories/IAccountingBindingRepository';
import type { KitPendingStatus, KitUpgradeRunStatus } from '../models/kitUpgradeTypes';
import type { CreateKitPendingInput, CreateKitUpgradeRunInput, IKitUpgradeRepository } from './IKitUpgradeRepository';

/** Prisma-backed — mesmo esqueleto do `KitInstallationRepository` (where explícito, `tx ?? prisma`). */
export class KitUpgradeRepository implements IKitUpgradeRepository {
  public async createRun(scope: BindingScope, data: CreateKitUpgradeRunInput, tx?: Prisma.TransactionClient): Promise<KitUpgradeRun> {
    return (tx ?? prisma).kitUpgradeRun.create({ data: { ...bindingScopeWhere(scope), ...data } });
  }

  public async finishRun(
    scope: BindingScope,
    id: string,
    data: { status: KitUpgradeRunStatus; report: string },
    tx?: Prisma.TransactionClient,
  ): Promise<KitUpgradeRun> {
    return (tx ?? prisma).kitUpgradeRun.update({
      where: { id, ...bindingScopeWhere(scope) },
      data: { ...data, finishedAt: new Date() },
    });
  }

  public async findDryRun(
    scope: BindingScope,
    key: { kitKey: string; fromVersion: number; toVersion: number; deployId: string },
  ): Promise<KitUpgradeRun | null> {
    return prisma.kitUpgradeRun.findFirst({ where: { ...bindingScopeWhere(scope), ...key, mode: 'DRY_RUN' } });
  }

  public async findLastRun(scope: BindingScope, kitKey: string): Promise<KitUpgradeRun | null> {
    return prisma.kitUpgradeRun.findFirst({ where: { ...bindingScopeWhere(scope), kitKey }, orderBy: { startedAt: 'desc' } });
  }

  public async createPendingsIfAbsent(
    scope: BindingScope,
    items: CreateKitPendingInput[],
    tx: Prisma.TransactionClient,
  ): Promise<number> {
    let created = 0;
    for (const item of items) {
      const key = { ...bindingScopeWhere(scope), kitKey: item.kitKey, toVersion: item.toVersion, itemKey: item.itemKey };
      if (await tx.kitUpgradePending.findFirst({ where: key, select: { id: true } })) continue;
      await tx.kitUpgradePending.create({ data: { ...bindingScopeWhere(scope), ...item, status: 'OPEN' } });
      created++;
    }
    return created;
  }

  public async listPendings(scope: BindingScope, status?: KitPendingStatus): Promise<KitUpgradePending[]> {
    return prisma.kitUpgradePending.findMany({
      where: { ...bindingScopeWhere(scope), ...(status ? { status } : {}) },
      orderBy: [{ createdAt: 'asc' }, { itemKey: 'asc' }],
    });
  }

  public async countOpenPendings(scope: BindingScope): Promise<number> {
    return prisma.kitUpgradePending.count({ where: { ...bindingScopeWhere(scope), status: 'OPEN' } });
  }

  public async findPending(scope: BindingScope, id: string, tx?: Prisma.TransactionClient): Promise<KitUpgradePending | null> {
    return (tx ?? prisma).kitUpgradePending.findFirst({ where: { id, ...bindingScopeWhere(scope) } });
  }

  public async decidePending(
    scope: BindingScope,
    id: string,
    data: { status: Exclude<KitPendingStatus, 'OPEN'>; motivo: string },
    tx: Prisma.TransactionClient,
  ): Promise<number> {
    const { count } = await tx.kitUpgradePending.updateMany({
      where: { id, ...bindingScopeWhere(scope), status: 'OPEN' },
      data: { ...data, decidedById: scope.actorUserId, decidedAt: new Date() },
    });
    return count;
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
