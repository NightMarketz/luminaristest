import prisma from '../../../lib/prisma';
import type { LalurEntry, LalurParteBAccount, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import type {
  CreateLalurEntryData,
  CreateLalurParteBAccountData,
  ILalurRepository,
  LalurEntryFilter,
  LalurEntryWithRelations,
} from './ILalurRepository';

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
      include: { parteB: true, account: { select: { id: true, code: true, nature: true } } },
      // ordem determinística = arquivo byte-idêntico entre gerações (item 16)
      orderBy: [{ quarter: 'asc' }, { livro: 'asc' }, { codigo: 'asc' }],
    });
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
