import prisma from '../../../lib/prisma';
import type { Payable, PayablePayment, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import { PAYABLE_OUTSTANDING_STATUSES } from '../models/Payable.model';
import { scopeToday } from '../models/dates';
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
    // BE-INCR-SUBLEDGER-FILTERS §2. Cada filtro é um BLOCO em `AND` (F10→(a)), não um spread no
    // objeto raiz: dois filtros podem escrever a MESMA chave (`overdue` e `dueTo` disputam
    // `dueDate`; `overdue` e `status` disputam `status`) e, por spread, o último venceria EM
    // SILÊNCIO. Em `AND` os dois valem — `?overdue=true&status=PAID` vira conjunto vazio por
    // composição honesta. Efeito colateral desejado: a base (escopo + deletedAt) fica FORA do
    // alcance de qualquer filtro por construção, não por convenção (comportamento 6).
    const filtros: Prisma.PayableWhereInput[] = [];
    if (params.status) filtros.push({ status: params.status });
    if (params.counterpartyId) filtros.push({ counterpartyId: params.counterpartyId });
    // Faixa INCLUSIVA (F4): `dueDate` é gravado como MEIA-NOITE UTC da data-calendário
    // (`new Date('YYYY-MM-DD')` no create), logo `lte` no extremo inclui o próprio dia.
    if (params.dueFrom) filtros.push({ dueDate: { gte: new Date(`${params.dueFrom}T00:00:00.000Z`) } });
    if (params.dueTo) filtros.push({ dueDate: { lte: new Date(`${params.dueTo}T00:00:00.000Z`) } });
    // Vencido (F1): `dueDate < hoje` E status em aberto. O `<` (e não `<=`) espelha o aging, onde
    // `dueDate >= as_of` é "a vencer" e o atraso começa em 1 — vencer HOJE não é estar vencido.
    // `scopeToday(scope)` é a MESMA fonte do aging (F9 + ADR do fuso F-TZ1→(c)): hoje no FUSO DO
    // ESCOPO, não em UTC — senão, das 21h às 23h59 BRT, conta que vence hoje apareceria vencida.
    if (params.overdue) {
      filtros.push({
        dueDate: { lt: new Date(`${scopeToday(scope)}T00:00:00.000Z`) },
        status: { in: [...PAYABLE_OUTSTANDING_STATUSES] },
      });
    }
    // F2: description OU documentNumber. Tombstone de rename-on-delete (`deleted:<id>:<doc>`)
    // nunca aparece porque `deletedAt: null` está na base, fora do AND.
    if (params.q) {
      filtros.push({
        OR: [{ description: { contains: params.q } }, { documentNumber: { contains: params.q } }],
      });
    }

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
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    // Atomic conditional transition OPEN → PAYING. `updateMany` matches only when the row is
    // still OPEN, so two concurrent callers race on THIS single-row write and exactly one gets
    // count===1 (D4). Scoped by owner+unit so it can never touch another tenant's row.
    const result = await (tx ?? prisma).payable.updateMany({
      where: { id, ...accountingScopeWhere(scope), status: 'OPEN', deletedAt: null },
      data: { status: 'PAYING' },
    });
    return result.count;
  }

  public async markPaidIfPaying(
    scope: AccountingScope,
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    // Atomic conditional transition PAYING → PAID (mirror of claimForPayment). Matches only when
    // the row is still PAYING, so of N concurrent finalizers (a raced reconcile + the normal
    // registerPayment, or two reconcile passes) exactly one gets count===1 and thus emits the
    // payable.payment_registered audit exactly once.
    const result = await (tx ?? prisma).payable.updateMany({
      where: { id, ...accountingScopeWhere(scope), status: 'PAYING' },
      data: { status: 'PAID' },
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
