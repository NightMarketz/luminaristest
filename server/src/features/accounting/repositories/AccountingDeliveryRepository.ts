import prisma from '../../../lib/prisma';
import type { AccountingDeliveryLog, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import type {
  CreateDeliveryLogData,
  IAccountingDeliveryRepository,
} from './IAccountingDeliveryRepository';

/**
 * Repositório Prisma do log de entrega ao contador. Único lugar com
 * `prisma.accountingDeliveryLog.*`. Wrapper fino — gate de período, manifesto e auditoria moram no
 * service.
 */
export class AccountingDeliveryRepository implements IAccountingDeliveryRepository {
  public async create(
    data: CreateDeliveryLogData,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingDeliveryLog> {
    return (tx ?? prisma).accountingDeliveryLog.create({ data });
  }

  public async findById(
    scope: AccountingScope,
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingDeliveryLog | null> {
    return (tx ?? prisma).accountingDeliveryLog.findFirst({
      where: { id, ...accountingScopeWhere(scope) },
    });
  }

  public async findByJobsAndContact(
    scope: AccountingScope,
    ecdJobId: string,
    ecfJobId: string,
    contactId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingDeliveryLog | null> {
    return (tx ?? prisma).accountingDeliveryLog.findFirst({
      where: { ...accountingScopeWhere(scope), ecdJobId, ecfJobId, contactId },
    });
  }

  public async update(
    scope: AccountingScope,
    id: string,
    data: Prisma.AccountingDeliveryLogUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingDeliveryLog> {
    const { userId, unitId } = accountingScopeWhere(scope);
    return (tx ?? prisma).accountingDeliveryLog.update({ where: { id, userId, unitId }, data });
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
