import prisma from '../../../lib/prisma';
import type { Payable, PayablePayment, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import { PAYABLE_OUTSTANDING_STATUSES, PAYABLE_SETTLEABLE_STATUSES } from '../models/Payable.model';
import { scopeToday } from '../models/dates';
import { buildSubledgerFilterWhere } from './subledgerFilters';
import type {
  CreatePayableData,
  CreatePaymentData,
  IPayableRepository,
  PayableWithPayments,
} from './IPayableRepository';

/**
 * Prisma-backed repository for Contas a Pagar. Only place with `prisma.payable.*` /
 * `prisma.payablePayment.*` access. Tenancy is two-level via AccountingScope (ownerUserId +
 * unitId). Payables soft-delete (reads filter `deletedAt: null`); payments use a status flip
 * (`ACTIVE|CANCELLED`), no soft-delete column.
 */
export class PayableRepository implements IPayableRepository {
  public async create(data: CreatePayableData, tx?: Prisma.TransactionClient): Promise<Payable> {
    return (tx ?? prisma).payable.create({ data });
  }

  public async findById(
    scope: AccountingScope,
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Payable | null> {
    return (tx ?? prisma).payable.findFirst({
      where: { id, ...accountingScopeWhere(scope), deletedAt: null },
    });
  }

  /** BE-INCR-NFE-PREVIEW (F-PREV-3 → b) — espelho de `findById`, chaveado pelo `documentNumber`. */
  public async findByDocumentNumber(
    scope: AccountingScope,
    documentNumber: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Payable | null> {
    return (tx ?? prisma).payable.findFirst({
      where: { documentNumber, ...accountingScopeWhere(scope), deletedAt: null },
    });
  }

  public async findByIdWithPayments(
    scope: AccountingScope,
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PayableWithPayments | null> {
    return (tx ?? prisma).payable.findFirst({
      where: { id, ...accountingScopeWhere(scope), deletedAt: null },
      include: { payments: true },
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
  ): Promise<{ payables: PayableWithPayments[]; total: number }> {
    // BE-INCR-SUBLEDGER-FILTERS §2 — where-builder compartilhado com o AR (RC, F6: espelho
    // literal). `scopeToday(scope)` é resolvido AQUI (a mesma fonte do aging, F9 + ADR do fuso
    // F-TZ1→(c)) e entra como parâmetro — `buildSubledgerFilterWhere` é pura e nunca calcula hoje.
    const filtros = buildSubledgerFilterWhere<Prisma.PayableWhereInput>(params, {
      openStatuses: PAYABLE_OUTSTANDING_STATUSES,
      today: scopeToday(scope),
    });

    // O mesmo objeto alimenta findMany E count, então `total` conta o conjunto filtrado (comp. 7).
    const where: Prisma.PayableWhereInput = {
      ...accountingScopeWhere(scope),
      deletedAt: null,
      ...(filtros.length ? { AND: filtros } : {}),
    };
    const [payables, total] = await Promise.all([
      prisma.payable.findMany({
        where,
        include: { payments: true },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
        skip: params.skip,
        take: params.limit,
      }),
      prisma.payable.count({ where }),
    ]);
    return { payables, total };
  }

  public async findAllActive(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<Payable[]> {
    return (tx ?? prisma).payable.findMany({
      where: { ...accountingScopeWhere(scope), deletedAt: null },
    });
  }

  public async findOutstanding(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<Payable[]> {
    return (tx ?? prisma).payable.findMany({
      where: {
        ...accountingScopeWhere(scope),
        deletedAt: null,
        status: { in: [...PAYABLE_OUTSTANDING_STATUSES] },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    });
  }

  public async claimForPayment(
    scope: AccountingScope,
    id: string,
    amountCents: number,
    newCents: number,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    // Sum-CAS (BE-INCR-PARTIAL-SETTLEMENT, ADR §3 corrected form): the balance check and the
    // OPEN|PARTIALLY_PAID → PAYING claim are ONE conditional write. `amountCents` is a literal read
    // before the call (immutable after create); `paidCents <= amountCents - newCents` ⇔
    // `paidCents + newCents <= amountCents`, the form Prisma cannot express column-to-column.
    // Concurrent callers race on THIS single-row write: exactly the ones the balance carries win.
    const result = await (tx ?? prisma).payable.updateMany({
      where: {
        id,
        ...accountingScopeWhere(scope),
        status: { in: [...PAYABLE_SETTLEABLE_STATUSES] },
        deletedAt: null,
        paidCents: { lte: amountCents - newCents },
      },
      data: { status: 'PAYING', paidCents: { increment: newCents } },
    });
    return result.count;
  }

  public async finalizeIfPaying(
    scope: AccountingScope,
    id: string,
    amountCents: number,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    // Atomic conditional transition PAYING → PAID (balance closed) else PAYING → PARTIALLY_PAID.
    // Both writes match only while the row is still PAYING, so of N concurrent finalizers (a raced
    // reconcile + the normal registerPayment, or two reconcile passes) exactly one gets count===1
    // and thus emits the payable.settlement_registered audit exactly once.
    const db = tx ?? prisma;
    const paid = await db.payable.updateMany({
      where: { id, ...accountingScopeWhere(scope), status: 'PAYING', paidCents: { gte: amountCents } },
      data: { status: 'PAID' },
    });
    if (paid.count === 1) return 1;
    const partial = await db.payable.updateMany({
      where: { id, ...accountingScopeWhere(scope), status: 'PAYING' },
      data: { status: 'PARTIALLY_PAID' },
    });
    return partial.count;
  }

  public async releaseSettlement(
    scope: AccountingScope,
    id: string,
    cents: number,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    // Atomic decrement for the reversal of ONE receipt among N (F-PS3 → a, any order). A settlement
    // in flight (PAYING) does NOT block it (review #307 F1): the decrement is atomic and that
    // settlement's finalize reads the balance already decremented. The only refusal is the
    // invariant (`paidCents >= cents`) — never lets paidCents go negative.
    const result = await (tx ?? prisma).payable.updateMany({
      where: {
        id,
        ...accountingScopeWhere(scope),
        status: { in: ['PARTIALLY_PAID', 'PAID', 'PAYING'] },
        paidCents: { gte: cents },
      },
      data: { paidCents: { decrement: cents } },
    });
    return result.count;
  }

  public async updatePayable(
    scope: AccountingScope,
    id: string,
    data: Prisma.PayableUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Payable> {
    const { userId, unitId } = accountingScopeWhere(scope);
    return (tx ?? prisma).payable.update({ where: { id, userId, unitId }, data });
  }

  public async createPayment(
    data: CreatePaymentData,
    tx?: Prisma.TransactionClient,
  ): Promise<PayablePayment> {
    return (tx ?? prisma).payablePayment.create({ data });
  }

  public async findPaymentById(
    scope: AccountingScope,
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PayablePayment | null> {
    return (tx ?? prisma).payablePayment.findFirst({
      where: { id, ...accountingScopeWhere(scope) },
    });
  }

  public async findActivePayment(
    scope: AccountingScope,
    payableId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PayablePayment | null> {
    return (tx ?? prisma).payablePayment.findFirst({
      where: { ...accountingScopeWhere(scope), payableId, status: 'ACTIVE' },
    });
  }

  public async findAllActivePayments(
    scope: AccountingScope,
    tx?: Prisma.TransactionClient,
  ): Promise<PayablePayment[]> {
    return (tx ?? prisma).payablePayment.findMany({
      where: { ...accountingScopeWhere(scope), status: 'ACTIVE' },
    });
  }

  public async cancelPaymentIfActive(
    scope: AccountingScope,
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    // Authoritative gate of the cancel (review #307 F8): only the caller that flips ACTIVE → CANCELLED
    // gives the cents back; a concurrent duplicate gets 0 and returns idempotently.
    const result = await (tx ?? prisma).payablePayment.updateMany({
      where: { id, ...accountingScopeWhere(scope), status: 'ACTIVE' },
      data: { status: 'CANCELLED' },
    });
    return result.count;
  }

  public async updatePayment(
    scope: AccountingScope,
    id: string,
    data: Prisma.PayablePaymentUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<PayablePayment> {
    const { userId, unitId } = accountingScopeWhere(scope);
    return (tx ?? prisma).payablePayment.update({ where: { id, userId, unitId }, data });
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
