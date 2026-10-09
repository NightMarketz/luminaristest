import prisma from '../../../lib/prisma';
import type { CollectionCharge, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import type { CreateCollectionChargeData, ICollectionChargeRepository } from './ICollectionChargeRepository';

/** Repositório Prisma de `collection_charges`. Zero regra de negócio (ver o contrato). */
export class CollectionChargeRepository implements ICollectionChargeRepository {
  public async create(data: CreateCollectionChargeData, tx?: Prisma.TransactionClient): Promise<CollectionCharge> {
    return (tx ?? prisma).collectionCharge.create({ data });
  }

  public async findById(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<CollectionCharge | null> {
    return (tx ?? prisma).collectionCharge.findFirst({ where: { id, ...accountingScopeWhere(scope), deletedAt: null } });
  }

  public async findByIdAnyScope(id: string, tx?: Prisma.TransactionClient): Promise<CollectionCharge | null> {
    return (tx ?? prisma).collectionCharge.findFirst({ where: { id, deletedAt: null } });
  }

  public async findByProviderRefAnyScope(
    paymentAccountId: string,
    providerRef: string,
    tx?: Prisma.TransactionClient,
  ): Promise<CollectionCharge | null> {
    return (tx ?? prisma).collectionCharge.findFirst({ where: { paymentAccountId, providerRef, deletedAt: null } });
  }

  public async findLiveByReceivable(
    scope: AccountingScope,
    receivableId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<CollectionCharge | null> {
    return (tx ?? prisma).collectionCharge.findFirst({
      where: { ...accountingScopeWhere(scope), receivableId, status: { in: ['CREATING', 'PENDING'] }, deletedAt: null },
    });
  }

  public async findManyByReceivable(scope: AccountingScope, receivableId: string): Promise<CollectionCharge[]> {
    return prisma.collectionCharge.findMany({
      where: { ...accountingScopeWhere(scope), receivableId, deletedAt: null },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  public async findLastByCounterparty(scope: AccountingScope, counterpartyId: string): Promise<CollectionCharge | null> {
    return prisma.collectionCharge.findFirst({
      where: { ...accountingScopeWhere(scope), counterpartyId, deletedAt: null },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  public async findPollable(staleBefore: Date): Promise<CollectionCharge[]> {
    return prisma.collectionCharge.findMany({
      where: {
        deletedAt: null,
        OR: [{ status: 'PENDING' }, { status: 'CREATING', updatedAt: { lt: staleBefore } }],
      },
      orderBy: [{ createdAt: 'asc' }],
    });
  }

  public async casStatus(
    id: string,
    from: string,
    data: Prisma.CollectionChargeUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const r = await (tx ?? prisma).collectionCharge.updateMany({ where: { id, status: from, deletedAt: null }, data });
    return r.count;
  }

  public async findCompanyName(userId: string): Promise<string | null> {
    const profile = await prisma.companyFiscalProfile.findFirst({
      where: { userId, deletedAt: null },
      orderBy: [{ anoCalendario: 'desc' }],
      select: { declarante: true },
    });
    const d = profile?.declarante;
    if (d && typeof d === 'object' && !Array.isArray(d) && typeof (d as Record<string, unknown>).nome === 'string') {
      return (d as Record<string, unknown>).nome as string;
    }
    return null;
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
