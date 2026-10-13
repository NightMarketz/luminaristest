import prisma from '../../../lib/prisma';
import type { Prisma, RoleAccountOverride } from 'generated/prisma';
import { bindingScopeWhere, type BindingScope } from '../../accountingBinding/repositories/IAccountingBindingRepository';
import type { IRoleAccountOverrideRepository, RoleAccountOverrideWithCode } from './IRoleAccountOverrideRepository';

/** Prisma-backed — mesmo esqueleto do `KitInstallationRepository` (where explícito, `tx ?? prisma`). */
export class RoleAccountOverrideRepository implements IRoleAccountOverrideRepository {
  public async findLive(scope: BindingScope, tx?: Prisma.TransactionClient): Promise<RoleAccountOverrideWithCode[]> {
    return (tx ?? prisma).roleAccountOverride.findMany({
      where: { ...bindingScopeWhere(scope), deletedAt: null },
      include: { account: { select: { code: true } } },
      orderBy: { role: 'asc' },
    });
  }

  public async findLiveByRole(scope: BindingScope, role: string, tx: Prisma.TransactionClient): Promise<RoleAccountOverride | null> {
    return tx.roleAccountOverride.findFirst({ where: { ...bindingScopeWhere(scope), role, deletedAt: null } });
  }

  public async create(
    scope: BindingScope,
    data: { role: string; accountId: string; motivo: string },
    tx: Prisma.TransactionClient,
  ): Promise<RoleAccountOverride> {
    return tx.roleAccountOverride.create({ data: { ...bindingScopeWhere(scope), ...data, setById: scope.actorUserId } });
  }

  public async softDelete(scope: BindingScope, id: string, tx: Prisma.TransactionClient): Promise<void> {
    await tx.roleAccountOverride.update({ where: { id, ...bindingScopeWhere(scope) }, data: { deletedAt: new Date() } });
  }

  public async revive(scope: BindingScope, id: string, tx: Prisma.TransactionClient): Promise<void> {
    await tx.roleAccountOverride.update({ where: { id, ...bindingScopeWhere(scope) }, data: { deletedAt: null } });
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
