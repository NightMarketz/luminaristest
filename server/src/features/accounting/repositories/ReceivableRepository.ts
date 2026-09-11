import prisma from '../../../lib/prisma';
import type { Receivable, ReceivableReceipt, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import { RECEIVABLE_OUTSTANDING_STATUSES, RECEIVABLE_SETTLEABLE_STATUSES } from '../models/Receivable.model';
import { scopeToday } from '../models/dates';
import { buildSubledgerFilterWhere } from './subledgerFilters';
import type {
  CreateReceivableData,
  CreateReceiptData,
  IReceivableRepository,
  ReceivableWithReceipts,
} from './IReceivableRepository';

/**
 * Prisma-backed repository for Contas a Receber. Only place with `prisma.receivable.*` /
 * `prisma.receivableReceipt.*` access. Tenancy is two-level via AccountingScope (ownerUserId +
 * unitId). Receivables soft-delete (reads filter `deletedAt: null`); receipts use a status flip
 * (`ACTIVE|CANCELLED`), no soft-delete column. MIRROR of PayableRepository.
 */
export class ReceivableRepository implements IReceivableRepository {
  public async create(data: CreateReceivableData, tx?: Prisma.TransactionClient): Promise<Receivable> {
    return (tx ?? prisma).receivable.create({ data });
  }

  public async findById(
    scope: AccountingScope,
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Receivable | null> {
    return (tx ?? prisma).receivable.findFirst({
      where: { id, ...accountingScopeWhere(scope), deletedAt: null },
    });
  }

  public async findByIdWithReceipts(
    scope: AccountingScope,
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ReceivableWithReceipts | null> {
    return (tx ?? prisma).receivable.findFirst({
      where: { id, ...accountingScopeWhere(scope), deletedAt: null },
      include: { receipts: true },
    });
  }

  public async findManyByUnit(
    scope: AccountingScope,
    params: {
      status?: string;
      counterpartyId?: string;
      dueFrom?: string;
      dueTo?: string;
      q?: string;
      overdue?: boolean;
      skip: number;
      limit: number;
    },
  ): Promise<{ receivables: ReceivableWithReceipts[]; total: number }> {
    // BE-INCR-SUBLEDGER-FILTERS §2 — where-builder compartilhado com o AP (RC, F6: espelho
    // literal). `scopeToday(scope)` é resolvido AQUI (a mesma fonte do aging, F9 + ADR do fuso
    // F-TZ1→(c)) e entra como parâmetro — `buildSubledgerFilterWhere` é pura e nunca calcula hoje.
    const filtros = buildSubledgerFilterWhere<Prisma.ReceivableWhereInput>(params, {
      openStatuses: RECEIVABLE_OUTSTANDING_STATUSES,
      today: scopeToday(scope),
    });

    // O mesmo objeto alimenta findMany E count, então `total` conta o conjunto filtrado (comp. 7).
    const where: Prisma.ReceivableWhereInput = {
      ...accountingScopeWhere(scope),
      deletedAt: null,
      ...(filtros.length ? { AND: filtros } : {}),
    };
    const [receivables, total] = await Promise.all([
      prisma.receivable.findMany({
        where,
        include: { receipts: true },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
        skip: params.skip,
        take: params.limit,
      }),
      prisma.receivable.count({ where }),
    ]);
    return { receivables, total };
  }

  public async findAllActive(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<Receivable[]> {
    return (tx ?? prisma).receivable.findMany({
      where: { ...accountingScopeWhere(scope), deletedAt: null },
    });
  }

  public async findAllByDocumentNumber(
    scope: AccountingScope,
    documentNumber: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Receivable[]> {
    // Tombstone-aware, NO deletedAt filter; caller classifies (see IReceivableRepository JSDoc).
    return (tx ?? prisma).receivable.findMany({
      where: {
        ...accountingScopeWhere(scope),
        OR: [
          { documentNumber },
          { documentNumber: { startsWith: 'deleted:', endsWith: `:${documentNumber}` } },
        ],
      },
    });
  }

  public async findOutstanding(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<Receivable[]> {
    return (tx ?? prisma).receivable.findMany({
      where: {
        ...accountingScopeWhere(scope),
        deletedAt: null,
        status: { in: [...RECEIVABLE_OUTSTANDING_STATUSES] },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    });
  }

  public async claimForReceipt(
    scope: AccountingScope,
    id: string,
    amountCents: number,
    newCents: number,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    // Sum-CAS — MIRROR of PayableRepository.claimForPayment (see its comment). `amountCents` is a
    // literal read before the call; `receivedCents <= amountCents - newCents` is the Prisma-expressible
    // form of `receivedCents + newCents <= amountCents`.
    const result = await (tx ?? prisma).receivable.updateMany({
      where: {
        id,
        ...accountingScopeWhere(scope),
        status: { in: [...RECEIVABLE_SETTLEABLE_STATUSES] },
        deletedAt: null,
        receivedCents: { lte: amountCents - newCents },
      },
      data: { status: 'RECEIVING', receivedCents: { increment: newCents } },
    });
    return result.count;
  }

  public async finalizeIfReceiving(
    scope: AccountingScope,
    id: string,
    amountCents: number,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    // RECEIVING → RECEIVED (balance closed) else RECEIVING → PARTIALLY_RECEIVED — MIRROR of
    // PayableRepository.finalizeIfPaying; exactly one finalizer gets count===1.
    const db = tx ?? prisma;
    const received = await db.receivable.updateMany({
      where: { id, ...accountingScopeWhere(scope), status: 'RECEIVING', receivedCents: { gte: amountCents } },
      data: { status: 'RECEIVED' },
    });
    if (received.count === 1) return 1;
    const partial = await db.receivable.updateMany({
      where: { id, ...accountingScopeWhere(scope), status: 'RECEIVING' },
      data: { status: 'PARTIALLY_RECEIVED' },
    });
    return partial.count;
  }

  public async releaseSettlement(
    scope: AccountingScope,
    id: string,
    cents: number,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    // Atomic decrement for the reversal of ONE receipt among N — MIRROR of AP releaseSettlement.
    const result = await (tx ?? prisma).receivable.updateMany({
      where: {
        id,
        ...accountingScopeWhere(scope),
        status: { in: ['PARTIALLY_RECEIVED', 'RECEIVED'] },
        receivedCents: { gte: cents },
      },
      data: { receivedCents: { decrement: cents } },
    });
    return result.count;
  }

  public async updateReceivable(
    scope: AccountingScope,
    id: string,
    data: Prisma.ReceivableUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Receivable> {
    const { userId, unitId } = accountingScopeWhere(scope);
    return (tx ?? prisma).receivable.update({ where: { id, userId, unitId }, data });
  }

  public async createReceipt(
    data: CreateReceiptData,
    tx?: Prisma.TransactionClient,
  ): Promise<ReceivableReceipt> {
    return (tx ?? prisma).receivableReceipt.create({ data });
  }

  public async findReceiptById(
    scope: AccountingScope,
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ReceivableReceipt | null> {
    return (tx ?? prisma).receivableReceipt.findFirst({
      where: { id, ...accountingScopeWhere(scope) },
    });
  }

  public async findActiveReceipt(
    scope: AccountingScope,
    receivableId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ReceivableReceipt | null> {
    return (tx ?? prisma).receivableReceipt.findFirst({
      where: { ...accountingScopeWhere(scope), receivableId, status: 'ACTIVE' },
    });
  }

  public async findAllActiveReceipts(
    scope: AccountingScope,
    tx?: Prisma.TransactionClient,
  ): Promise<ReceivableReceipt[]> {
    return (tx ?? prisma).receivableReceipt.findMany({
      where: { ...accountingScopeWhere(scope), status: 'ACTIVE' },
    });
  }

  public async updateReceipt(
    scope: AccountingScope,
    id: string,
    data: Prisma.ReceivableReceiptUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<ReceivableReceipt> {
    const { userId, unitId } = accountingScopeWhere(scope);
    return (tx ?? prisma).receivableReceipt.update({ where: { id, userId, unitId }, data });
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
