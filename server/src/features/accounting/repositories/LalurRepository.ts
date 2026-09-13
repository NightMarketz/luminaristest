import prisma from '../../../lib/prisma';
import type { LalurEntry, LalurParteBAccount, LalurParteBMovement, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import type {
  CreateLalurEntryData,
  CreateLalurParteBAccountData,
  CreateLalurParteBBalanceData,
  CreateLalurParteBMovementData,
  ILalurRepository,
  LalurClosingWithBalances,
  LalurEntryFilter,
  LalurEntryWithRelations,
  LalurMovementFilter,
  LalurMovementWithRelations,
  LalurProcessoData,
} from './ILalurRepository';

const ENTRY_RELATIONS = {
  parteB: true,
  account: { select: { id: true, code: true, nature: true, deletedAt: true } },
  processos: { orderBy: [{ indProc: 'asc' }, { numProc: 'asc' }] },
  journalLinks: { select: { journalEntryId: true, journalEntry: { select: { entryNumber: true } } }, orderBy: { journalEntryId: 'asc' } },
} satisfies Prisma.LalurEntryInclude;

const CLOSING_INCLUDE = {
  balances: { include: { parteB: true }, orderBy: [{ parteB: { codTributo: 'asc' } }, { parteB: { codCtaB: 'asc' } }] },
} satisfies Prisma.LalurParteBClosingInclude;

/**
 * Prisma-backed repository for the e-Lalur/e-Lacs store (BE-INCR-SPED-ECF-FASE3B item 11). Only place
 * with `prisma.lalurEntry.*` / `prisma.lalurParteBAccount.*` access. Tenancy is two-level via
 * AccountingScope. Soft-archive: reads default to `deletedAt: null` unless includeArchived.
 */
export class LalurRepository implements ILalurRepository {
  // ── Entries ────────────────────────────────────────────────────────────────
  public async createEntry(data: CreateLalurEntryData, tx?: Prisma.TransactionClient): Promise<LalurEntry> {
    return (tx ?? prisma).lalurEntry.create({ data });
  }

  public async findEntryById(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<LalurEntry | null> {
    return (tx ?? prisma).lalurEntry.findFirst({ where: { id, ...accountingScopeWhere(scope) } });
  }

  public async findManyEntries(scope: AccountingScope, filter: LalurEntryFilter, tx?: Prisma.TransactionClient): Promise<LalurEntry[]> {
    return (tx ?? prisma).lalurEntry.findMany({
      where: {
        ...accountingScopeWhere(scope),
        ...(filter.year !== undefined ? { year: filter.year } : {}),
        ...(filter.quarter ? { quarter: filter.quarter } : {}),
        ...(filter.livro ? { livro: filter.livro } : {}),
        ...(filter.includeArchived ? {} : { deletedAt: null }),
      },
      orderBy: [{ year: 'asc' }, { quarter: 'asc' }, { livro: 'asc' }, { codigo: 'asc' }],
    });
  }

  public async findEntriesForYear(scope: AccountingScope, year: number, tx?: Prisma.TransactionClient): Promise<LalurEntryWithRelations[]> {
    return (tx ?? prisma).lalurEntry.findMany({
      where: { ...accountingScopeWhere(scope), year, deletedAt: null },
      include: ENTRY_RELATIONS,
      // ordem determinística = arquivo byte-idêntico entre gerações (item 16)
      orderBy: [{ quarter: 'asc' }, { livro: 'asc' }, { codigo: 'asc' }],
    });
  }

  public async countLiveEntriesByAccount(scope: AccountingScope, accountId: string, tx?: Prisma.TransactionClient): Promise<number> {
    return (tx ?? prisma).lalurEntry.count({ where: { ...accountingScopeWhere(scope), accountId, deletedAt: null } });
  }

  // ── Value-object children (C2): replace-the-set inside the parent's tx ─────
  public async replaceEntryProcesses(entryId: string, processos: LalurProcessoData[], tx: Prisma.TransactionClient): Promise<void> {
    await tx.lalurProcess.deleteMany({ where: { entryId } });
    if (processos.length > 0) {
      await tx.lalurProcess.createMany({ data: processos.map((p) => ({ parentId: entryId, entryId, indProc: p.indProc, numProc: p.numProc })) });
    }
  }

  public async replaceMovementProcesses(movementId: string, processos: LalurProcessoData[], tx: Prisma.TransactionClient): Promise<void> {
    await tx.lalurProcess.deleteMany({ where: { movementId } });
    if (processos.length > 0) {
      await tx.lalurProcess.createMany({ data: processos.map((p) => ({ parentId: movementId, movementId, indProc: p.indProc, numProc: p.numProc })) });
    }
  }

  public async replaceEntryJournalLinks(entryId: string, journalEntryIds: string[], tx: Prisma.TransactionClient): Promise<void> {
    await tx.lalurEntryJournalEntry.deleteMany({ where: { entryId } });
    if (journalEntryIds.length > 0) {
      await tx.lalurEntryJournalEntry.createMany({ data: journalEntryIds.map((journalEntryId) => ({ entryId, journalEntryId })) });
    }
  }

  public async findJournalEntriesForLinks(scope: AccountingScope, ids: string[], tx?: Prisma.TransactionClient) {
    if (ids.length === 0) return [];
    return (tx ?? prisma).journalEntry.findMany({
      where: { id: { in: ids }, ...accountingScopeWhere(scope) },
      select: { id: true, entryNumber: true, date: true },
    });
  }

  // ── Parte B movements (M410) ───────────────────────────────────────────────
  public async createMovement(data: CreateLalurParteBMovementData, tx?: Prisma.TransactionClient): Promise<LalurParteBMovement> {
    return (tx ?? prisma).lalurParteBMovement.create({ data });
  }

  public async findMovementById(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<LalurParteBMovement | null> {
    return (tx ?? prisma).lalurParteBMovement.findFirst({ where: { id, ...accountingScopeWhere(scope) } });
  }

  public async findManyMovements(scope: AccountingScope, filter: LalurMovementFilter, tx?: Prisma.TransactionClient): Promise<LalurParteBMovement[]> {
    return (tx ?? prisma).lalurParteBMovement.findMany({
      where: {
        ...accountingScopeWhere(scope),
        ...(filter.year !== undefined ? { year: filter.year } : {}),
        ...(filter.quarter ? { quarter: filter.quarter } : {}),
        ...(filter.parteBId ? { parteBId: filter.parteBId } : {}),
        ...(filter.includeArchived ? {} : { deletedAt: null }),
      },
      orderBy: [{ year: 'asc' }, { quarter: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  public async findMovementsForYear(scope: AccountingScope, year: number, tx?: Prisma.TransactionClient): Promise<LalurMovementWithRelations[]> {
    return (tx ?? prisma).lalurParteBMovement.findMany({
      where: { ...accountingScopeWhere(scope), year, deletedAt: null },
      include: { parteB: true, contrapartida: true, processos: { orderBy: [{ indProc: 'asc' }, { numProc: 'asc' }] } },
      // BRIEF 3C item 5: (quarter, parteB.codCtaB, createdAt, id) — arquivo byte-idêntico entre gerações
      orderBy: [{ quarter: 'asc' }, { parteB: { codCtaB: 'asc' } }, { createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  public async updateMovement(scope: AccountingScope, id: string, data: Prisma.LalurParteBMovementUpdateInput, tx?: Prisma.TransactionClient): Promise<LalurParteBMovement> {
    const { userId, unitId } = accountingScopeWhere(scope);
    return (tx ?? prisma).lalurParteBMovement.update({ where: { id, userId, unitId }, data });
  }

  public async countLiveMovementsByParteB(scope: AccountingScope, parteBId: string, tx?: Prisma.TransactionClient): Promise<number> {
    return (tx ?? prisma).lalurParteBMovement.count({
      where: { ...accountingScopeWhere(scope), deletedAt: null, OR: [{ parteBId }, { contrapartidaId: parteBId }] },
    });
  }

  // ── Parte B closings (C1) + balances (M500) ────────────────────────────────
  public async findClosing(scope: AccountingScope, year: number, quarter: string, tx?: Prisma.TransactionClient): Promise<LalurClosingWithBalances | null> {
    return (tx ?? prisma).lalurParteBClosing.findFirst({ where: { ...accountingScopeWhere(scope), year, quarter }, include: CLOSING_INCLUDE });
  }

  public async findClosingsForYear(scope: AccountingScope, year: number, tx?: Prisma.TransactionClient): Promise<LalurClosingWithBalances[]> {
    return (tx ?? prisma).lalurParteBClosing.findMany({
      where: { ...accountingScopeWhere(scope), year },
      include: CLOSING_INCLUDE,
      orderBy: { quarter: 'asc' },
    });
  }

  public async existsClosingBefore(scope: AccountingScope, year: number, tx?: Prisma.TransactionClient): Promise<boolean> {
    const n = await (tx ?? prisma).lalurParteBClosing.count({ where: { ...accountingScopeWhere(scope), year: { lt: year } } });
    return n > 0;
  }

  public async createClosing(
    data: { userId: string; unitId: string; year: number; quarter: string; balancesSha256: string; closedById: string | null },
    balances: CreateLalurParteBBalanceData[],
    tx: Prisma.TransactionClient,
  ): Promise<LalurClosingWithBalances> {
    return tx.lalurParteBClosing.create({
      data: { ...data, balances: { create: balances } },
      include: CLOSING_INCLUDE,
    });
  }

  public async deleteClosing(id: string, tx: Prisma.TransactionClient): Promise<void> {
    await tx.lalurParteBClosing.delete({ where: { id } }); // balances: onDelete Cascade
  }

  public async updateEntry(scope: AccountingScope, id: string, data: Prisma.LalurEntryUpdateInput, tx?: Prisma.TransactionClient): Promise<LalurEntry> {
    const { userId, unitId } = accountingScopeWhere(scope);
    return (tx ?? prisma).lalurEntry.update({ where: { id, userId, unitId }, data });
  }

  public async countLiveEntriesByParteB(scope: AccountingScope, parteBId: string, tx?: Prisma.TransactionClient): Promise<number> {
    return (tx ?? prisma).lalurEntry.count({ where: { ...accountingScopeWhere(scope), parteBId, deletedAt: null } });
  }

  // ── Parte B ────────────────────────────────────────────────────────────────
  public async createParteB(data: CreateLalurParteBAccountData, tx?: Prisma.TransactionClient): Promise<LalurParteBAccount> {
    return (tx ?? prisma).lalurParteBAccount.create({ data });
  }

  public async findParteBById(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<LalurParteBAccount | null> {
    return (tx ?? prisma).lalurParteBAccount.findFirst({ where: { id, ...accountingScopeWhere(scope) } });
  }

  public async findManyParteB(scope: AccountingScope, filter: { codTributo?: string; includeArchived: boolean }, tx?: Prisma.TransactionClient): Promise<LalurParteBAccount[]> {
    return (tx ?? prisma).lalurParteBAccount.findMany({
      where: {
        ...accountingScopeWhere(scope),
        ...(filter.codTributo ? { codTributo: filter.codTributo } : {}),
        ...(filter.includeArchived ? {} : { deletedAt: null }),
      },
      orderBy: [{ codTributo: 'asc' }, { codCtaB: 'asc' }],
    });
  }

  public async updateParteB(scope: AccountingScope, id: string, data: Prisma.LalurParteBAccountUpdateInput, tx?: Prisma.TransactionClient): Promise<LalurParteBAccount> {
    const { userId, unitId } = accountingScopeWhere(scope);
    return (tx ?? prisma).lalurParteBAccount.update({ where: { id, userId, unitId }, data });
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
