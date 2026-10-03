import prisma from '../../../lib/prisma';
import { ConflictError } from '../../../lib/errors';
import type { AccountingPeriod, AccountingPeriodStatus, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import type { IAccountingPeriodRepository } from './IAccountingPeriodRepository';

export class AccountingPeriodRepository implements IAccountingPeriodRepository {
  public async findByYearMonth(
    scope: AccountingScope,
    year: number,
    month: number,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingPeriod | null> {
    return (tx ?? prisma).accountingPeriod.findUnique({
      where: { userId_unitId_year_month: { ...accountingScopeWhere(scope), year, month } },
    });
  }

  public async findById(
    scope: AccountingScope,
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingPeriod | null> {
    return (tx ?? prisma).accountingPeriod.findFirst({
      where: { id, ...accountingScopeWhere(scope) },
    });
  }

  public async seedYear(
    scope: AccountingScope,
    year: number,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingPeriod[]> {
    const { userId, unitId } = accountingScopeWhere(scope);
    const client = tx ?? prisma;

    // ponytail: upsert 12x — createMany.skipDuplicates not supported on SQLite
    for (let m = 1; m <= 12; m++) {
      await client.accountingPeriod.upsert({
        where: { userId_unitId_year_month: { userId, unitId, year, month: m } },
        create: { userId, unitId, year, month: m, status: 'FUTURE' },
        update: {},
      });
    }

    return client.accountingPeriod.findMany({
      where: { ...accountingScopeWhere(scope), year },
      orderBy: { month: 'asc' },
    });
  }

  public async setStatus(
    scope: AccountingScope,
    year: number,
    month: number,
    nextStatus: AccountingPeriodStatus,
    actorUserId: string,
    reason: string | undefined,
    tx: Prisma.TransactionClient,
    fromStatus: AccountingPeriodStatus,
  ): Promise<AccountingPeriod> {
    const { userId, unitId } = accountingScopeWhere(scope);

    const isOpening = nextStatus === 'OPEN';
    const isClosing = nextStatus === 'SOFT_CLOSED' || nextStatus === 'HARD_CLOSED';

    // CAS (item 11): o status checado fora da tx pode ter mudado — 0 linhas = outra transição venceu.
    const { count } = await tx.accountingPeriod.updateMany({
      where: { userId, unitId, year, month, status: fromStatus },
      data: {
        status: nextStatus,
        ...(isOpening ? { openedAt: new Date(), openedById: actorUserId } : {}),
        ...(isClosing ? { closedAt: new Date(), closedById: actorUserId } : {}),
      },
    });
    if (count === 0) {
      throw new ConflictError(
        `Período ${year}/${String(month).padStart(2, '0')} mudou de status (esperado ${fromStatus}) — recarregue e tente de novo.`,
        'PERIOD_STATUS_CHANGED',
      );
    }
    const updated = await tx.accountingPeriod.findUniqueOrThrow({
      where: { userId_unitId_year_month: { userId, unitId, year, month } },
    });

    await tx.accountingPeriodTransition.create({
      data: {
        userId,
        unitId,
        periodId: updated.id,
        fromStatus,
        toStatus: nextStatus,
        actorUserId,
        reason: reason ?? null,
      },
    });

    return updated;
  }

  public async list(scope: AccountingScope, year: number): Promise<AccountingPeriod[]> {
    return prisma.accountingPeriod.findMany({
      where: { ...accountingScopeWhere(scope), year },
      orderBy: { month: 'asc' },
    });
  }

  public async findEarliestOpenOrSoftClosed(scope: AccountingScope): Promise<AccountingPeriod | null> {
    return prisma.accountingPeriod.findFirst({
      where: { ...accountingScopeWhere(scope), status: { in: ['OPEN', 'SOFT_CLOSED'] } },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    });
  }
}
