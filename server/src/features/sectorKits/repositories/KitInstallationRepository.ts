import prisma from '../../../lib/prisma';
import type { KitInstallation, Prisma } from 'generated/prisma';
import { bindingScopeWhere, type BindingScope } from '../../accountingBinding/repositories/IAccountingBindingRepository';
import type { KitInstallSteps } from '../dtos/KitInstallationDto';
import type { KitInstallStatus } from '../models/kitInstallTypes';
import type { IKitInstallationRepository } from './IKitInstallationRepository';

const EMPTY_STEPS: KitInstallSteps = { lastCompletedStep: 0, warnings: [] };

/** Prisma-backed — mesmo esqueleto do `AccountingBindingRepository` (where explícito, `tx ?? prisma`). */
export class KitInstallationRepository implements IKitInstallationRepository {
  public async findByScope(scope: BindingScope, tx?: Prisma.TransactionClient): Promise<KitInstallation | null> {
    return (tx ?? prisma).kitInstallation.findFirst({ where: { ...bindingScopeWhere(scope), deletedAt: null } });
  }

  public async begin(
    scope: BindingScope,
    kit: { kitKey: string; kitVersion: number },
    tx?: Prisma.TransactionClient,
  ): Promise<KitInstallation> {
    const client = tx ?? prisma;
    const existing = await this.findByScope(scope, tx);
    if (existing) {
      return client.kitInstallation.update({
        where: { id: existing.id },
        data: { status: 'INSTALLING', updatedById: scope.actorUserId },
      });
    }
    return client.kitInstallation.create({
      data: {
        ...bindingScopeWhere(scope),
        kitKey: kit.kitKey,
        kitVersion: kit.kitVersion,
        status: 'INSTALLING',
        steps: JSON.stringify(EMPTY_STEPS),
        updatedById: scope.actorUserId,
      },
    });
  }

  public async saveSteps(
    scope: BindingScope,
    id: string,
    steps: KitInstallSteps,
    tx?: Prisma.TransactionClient,
  ): Promise<KitInstallation> {
    return (tx ?? prisma).kitInstallation.update({
      where: { id, ...bindingScopeWhere(scope) },
      data: { steps: JSON.stringify(steps), updatedById: scope.actorUserId },
    });
  }

  public async finish(
    scope: BindingScope,
    id: string,
    status: Exclude<KitInstallStatus, 'INSTALLING'>,
    steps: KitInstallSteps,
    tx?: Prisma.TransactionClient,
  ): Promise<KitInstallation> {
    return (tx ?? prisma).kitInstallation.update({
      where: { id, ...bindingScopeWhere(scope) },
      data: {
        status,
        steps: JSON.stringify(steps),
        updatedById: scope.actorUserId,
        ...(status === 'INSTALLED' ? { installedAt: new Date() } : {}),
      },
    });
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
