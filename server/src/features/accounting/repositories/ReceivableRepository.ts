import prisma from '../../../lib/prisma';
import type { Receivable, ReceivableReceipt, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import { RECEIVABLE_OUTSTANDING_STATUSES } from '../models/Receivable.model';
import { scopeToday } from '../models/dates';
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
    // BE-INCR-SUBLEDGER-FILTERS §2 — espelho literal do AP (F6). Cada filtro é um BLOCO em `AND`
    // (F10→(a)): `overdue` disputa `dueDate` com `dueTo` e `status` com o filtro de status, e por
    // spread o último venceria em silêncio. Em `AND` os dois valem. A base (escopo + deletedAt)
    // fica fora do alcance de qualquer filtro por construção (comportamento 6).
    const filtros: Prisma.ReceivableWhereInput[] = [];
    if (params.status) filtros.push({ status: params.status });
    if (params.counterpartyId) filtros.push({ counterpartyId: params.counterpartyId });
    // Faixa INCLUSIVA (F4): `dueDate` é meia-noite UTC da data-calendário, logo `lte` inclui o dia.
    if (params.dueFrom) filtros.push({ dueDate: { gte: new Date(`${params.dueFrom}T00:00:00.000Z`) } });
    if (params.dueTo) filtros.push({ dueDate: { lte: new Date(`${params.dueTo}T00:00:00.000Z`) } });
    // Vencido (F1): `<` e não `<=` — vencer HOJE não é estar vencido, espelhando o aging, onde
    // `dueDate >= as_of` é "a vencer". `scopeToday(scope)` é a MESMA fonte do aging (F9 + ADR do
    // fuso F-TZ1→(c)): hoje no fuso do escopo, nunca UTC.
    if (params.overdue) {
      filtros.push({
        dueDate: { lt: new Date(`${scopeToday(scope)}T00:00:00.000Z`) },
        status: { in: [...RECEIVABLE_OUTSTANDING_STATUSES] },
      });
    }
    // F2: description OU documentNumber; tombstone já excluído pela base, fora do AND.
    if (params.q) {
      filtros.push({
        OR: [{ description: { contains: params.q } }, { documentNumber: { contains: params.q } }],
      });
    }

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
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    // Atomic conditional transition OPEN → RECEIVING. `updateMany` matches only when the row is
    // still OPEN, so two concurrent callers race on THIS single-row write and exactly one gets
    // count===1 (D4). Scoped by owner+unit so it can never touch another tenant's row.
    const result = await (tx ?? prisma).receivable.updateMany({
      where: { id, ...accountingScopeWhere(scope), status: 'OPEN', deletedAt: null },
      data: { status: 'RECEIVING' },
    });
    return result.count;
  }

  public async markReceivedIfReceiving(
    scope: AccountingScope,
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    // Atomic conditional transition RECEIVING → RECEIVED (mirror of claimForReceipt). Matches only
    // when the row is still RECEIVING, so of N concurrent finalizers (a raced reconcile + the normal
    // registerReceipt, or two reconcile passes) exactly one gets count===1 and thus emits the
    // receivable.receipt_registered audit exactly once.
    const result = await (tx ?? prisma).receivable.updateMany({
      where: { id, ...accountingScopeWhere(scope), status: 'RECEIVING' },
      data: { status: 'RECEIVED' },
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
