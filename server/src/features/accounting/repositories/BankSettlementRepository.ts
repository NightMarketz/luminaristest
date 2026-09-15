import prisma from '../../../lib/prisma';
import type { AccountingScopeSettings, BankSettlementItem, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import { centsFromDb } from '../models/money';
import { PAYABLE_SETTLEABLE_STATUSES } from '../models/Payable.model';
import { RECEIVABLE_SETTLEABLE_STATUSES } from '../models/Receivable.model';
import type { BankSettlementStatus, BankSettlementTitleType, CandidateTitle } from '../models/BankSettlement.model';
import type {
  BankSettlementItemPatch,
  BankSettlementItemWithLine,
  CreateBankSettlementItemData,
  IBankSettlementRepository,
} from './IBankSettlementRepository';

/**
 * Prisma-backed repository for `bank_settlement_items` + `accounting_scope_settings` (BE-INCR-BANK-SETTLEMENT,
 * nó F7). `payables`/`receivables` só em LEITURA projetada — o AP/AR segue dono da escrita.
 */
export class BankSettlementRepository implements IBankSettlementRepository {
  private db(tx?: Prisma.TransactionClient) {
    return tx ?? prisma;
  }

  public async create(scope: AccountingScope, data: CreateBankSettlementItemData, tx?: Prisma.TransactionClient): Promise<BankSettlementItem> {
    return this.db(tx).bankSettlementItem.create({
      data: {
        ...accountingScopeWhere(scope),
        origin: data.origin,
        statementLineId: data.statementLineId,
        titleType: data.titleType,
        titleId: data.titleId,
        proposedCents: BigInt(data.proposedCents),
        chargeCents: BigInt(data.chargeCents),
        status: 'PENDING',
      },
    });
  }

  public async findById(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<BankSettlementItemWithLine | null> {
    return this.db(tx).bankSettlementItem.findFirst({
      where: { id, ...accountingScopeWhere(scope), deletedAt: null },
      include: { statementLine: true },
    });
  }

  public async findByLine(scope: AccountingScope, statementLineId: string, tx?: Prisma.TransactionClient): Promise<BankSettlementItem[]> {
    return this.db(tx).bankSettlementItem.findMany({
      where: { ...accountingScopeWhere(scope), statementLineId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  public async findMany(
    scope: AccountingScope,
    params: { statementId?: string; status?: BankSettlementStatus; page: number; limit: number },
  ): Promise<{ items: BankSettlementItemWithLine[]; total: number }> {
    const where: Prisma.BankSettlementItemWhereInput = {
      ...accountingScopeWhere(scope),
      deletedAt: null,
      ...(params.status ? { status: params.status } : {}),
      ...(params.statementId ? { statementLine: { statementId: params.statementId } } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.bankSettlementItem.findMany({
        where,
        include: { statementLine: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.bankSettlementItem.count({ where }),
    ]);
    return { items, total };
  }

  public async findPendingByStatement(scope: AccountingScope, statementId: string, tx?: Prisma.TransactionClient): Promise<BankSettlementItem[]> {
    return this.db(tx).bankSettlementItem.findMany({
      where: { ...accountingScopeWhere(scope), deletedAt: null, status: 'PENDING', statementLine: { statementId } },
    });
  }

  public async update(scope: AccountingScope, id: string, patch: BankSettlementItemPatch, tx?: Prisma.TransactionClient): Promise<BankSettlementItem> {
    // updateMany + re-read: `update` não aceita where composto por escopo (tenancy no where, sempre).
    await this.db(tx).bankSettlementItem.updateMany({ where: { id, ...accountingScopeWhere(scope) }, data: patch });
    const row = await this.db(tx).bankSettlementItem.findFirst({ where: { id, ...accountingScopeWhere(scope) } });
    if (!row) throw new Error(`bank_settlement_items ${id} desapareceu durante o update`);
    return row;
  }

  public async compareAndSetStatus(
    scope: AccountingScope,
    id: string,
    from: BankSettlementStatus,
    to: BankSettlementStatus,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const r = await this.db(tx).bankSettlementItem.updateMany({
      where: { id, ...accountingScopeWhere(scope), deletedAt: null, status: from },
      data: { status: to },
    });
    return r.count;
  }

  public async findSettleableTitles(scope: AccountingScope, titleType: BankSettlementTitleType, tx?: Prisma.TransactionClient): Promise<CandidateTitle[]> {
    const where = { ...accountingScopeWhere(scope), deletedAt: null };
    if (titleType === 'PAYABLE') {
      const rows = await this.db(tx).payable.findMany({
        where: { ...where, status: { in: [...PAYABLE_SETTLEABLE_STATUSES] } },
        select: { id: true, dueDate: true, amountCents: true, paidCents: true, documentNumber: true },
      });
      return rows.map((r) => ({
        id: r.id,
        titleType: 'PAYABLE' as const,
        dueDate: r.dueDate,
        openCents: centsFromDb(r.amountCents) - centsFromDb(r.paidCents),
        documentNumber: r.documentNumber,
      }));
    }
    const rows = await this.db(tx).receivable.findMany({
      where: { ...where, status: { in: [...RECEIVABLE_SETTLEABLE_STATUSES] } },
      select: { id: true, dueDate: true, amountCents: true, receivedCents: true, documentNumber: true },
    });
    return rows.map((r) => ({
      id: r.id,
      titleType: 'RECEIVABLE' as const,
      dueDate: r.dueDate,
      openCents: centsFromDb(r.amountCents) - centsFromDb(r.receivedCents),
      documentNumber: r.documentNumber,
    }));
  }

  public async findTitle(
    scope: AccountingScope,
    titleType: BankSettlementTitleType,
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<(CandidateTitle & { status: string; counterpartyName: string }) | null> {
    const where = { id, ...accountingScopeWhere(scope), deletedAt: null };
    if (titleType === 'PAYABLE') {
      const r = await this.db(tx).payable.findFirst({
        where,
        select: { id: true, dueDate: true, amountCents: true, paidCents: true, documentNumber: true, status: true, supplierName: true },
      });
      return r
        ? {
            id: r.id,
            titleType: 'PAYABLE',
            dueDate: r.dueDate,
            openCents: centsFromDb(r.amountCents) - centsFromDb(r.paidCents),
            documentNumber: r.documentNumber,
            status: r.status,
            counterpartyName: r.supplierName,
          }
        : null;
    }
    const r = await this.db(tx).receivable.findFirst({
      where,
      select: { id: true, dueDate: true, amountCents: true, receivedCents: true, documentNumber: true, status: true, customerName: true },
    });
    return r
      ? {
          id: r.id,
          titleType: 'RECEIVABLE',
          dueDate: r.dueDate,
          openCents: centsFromDb(r.amountCents) - centsFromDb(r.receivedCents),
          documentNumber: r.documentNumber,
          status: r.status,
          counterpartyName: r.customerName,
        }
      : null;
  }

  public async getSettings(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<AccountingScopeSettings | null> {
    return this.db(tx).accountingScopeSettings.findFirst({ where: accountingScopeWhere(scope) });
  }

  public async upsertSettings(
    scope: AccountingScope,
    data: { bankChargeExpenseAccountId?: string | null; bankChargeIncomeAccountId?: string | null },
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingScopeSettings> {
    const { userId, unitId } = accountingScopeWhere(scope);
    return this.db(tx).accountingScopeSettings.upsert({
      where: { userId_unitId: { userId, unitId } },
      create: { userId, unitId, updatedById: scope.actorUserId, ...data },
      update: { updatedById: scope.actorUserId, ...data },
    });
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
