import prisma from '../../../lib/prisma';
import type { AccountingDeliveryItem, AccountingDeliveryLog, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import type {
  CreateDeliveryItemData,
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

  public async createItems(
    deliveryId: string,
    items: CreateDeliveryItemData[],
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingDeliveryItem[]> {
    const client = tx ?? prisma;
    // Sequencial, não Promise.all: dentro de uma tx do SQLite, escritas concorrentes na mesma
    // conexão não trazem ganho e a ordem de criação aqui é a ordem de `position` — determinismo
    // sobre paralelismo que não existe de verdade neste driver.
    const created: AccountingDeliveryItem[] = [];
    for (const item of items) {
      created.push(await client.accountingDeliveryItem.create({ data: { deliveryId, ...item } }));
    }
    return created;
  }

  public async listItems(
    scope: AccountingScope,
    deliveryId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingDeliveryItem[]> {
    return (tx ?? prisma).accountingDeliveryItem.findMany({
      where: { deliveryId, delivery: { ...accountingScopeWhere(scope) } },
      orderBy: [{ position: 'asc' }],
    });
  }

  public async listDeliveries(
    scope: AccountingScope,
    filter: { status?: string; year?: number; page: number; limit: number },
  ): Promise<{ items: Array<AccountingDeliveryLog & { items: AccountingDeliveryItem[] }>; total: number }> {
    const where: Prisma.AccountingDeliveryLogWhereInput = { ...accountingScopeWhere(scope) };
    if (filter.status) where.status = filter.status;
    if (filter.year !== undefined) {
      where.periodStart = { gte: new Date(Date.UTC(filter.year, 0, 1)), lt: new Date(Date.UTC(filter.year + 1, 0, 1)) };
    }
    const [items, total] = await Promise.all([
      prisma.accountingDeliveryLog.findMany({
        where,
        include: { items: { orderBy: [{ position: 'asc' }] } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      prisma.accountingDeliveryLog.count({ where }),
    ]);
    return { items, total };
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
