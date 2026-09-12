import type { LalurEntry, LalurParteBAccount, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';

/** Data to create a Parte A / Bloco N line (already validated against the catalog by the service). */
export interface CreateLalurEntryData {
  userId: string;
  unitId: string;
  year: number;
  quarter: string;
  livro: string;
  codigo: string;
  valorCents: bigint;
  indRelacao: string | null;
  histLancamento: string | null;
  parteBId: string | null;
  accountId: string | null;
  createdById: string | null;
}

/** Data to create an M010 account (Parte B). */
export interface CreateLalurParteBAccountData {
  userId: string;
  unitId: string;
  codCtaB: string;
  descricao: string;
  dtCriacao: Date;
  codPbRfb: string;
  dtLimite: Date | null;
  codTributo: string;
  saldoIniCents: bigint;
  indSaldoIni: string;
  cnpjSitEsp: string | null;
  createdById: string | null;
}

export interface LalurEntryFilter {
  year?: number;
  quarter?: string;
  livro?: string;
  includeArchived: boolean;
}

/** A line with its Parte B account and ledger account resolved — what the ECF serializer needs. */
export type LalurEntryWithRelations = LalurEntry & {
  parteB: LalurParteBAccount | null;
  account: { id: string; code: string; nature: string } | null;
};

/**
 * Repository contract for the e-Lalur/e-Lacs store (BE-INCR-SPED-ECF-FASE3B item 11). Only place with
 * `prisma.lalurEntry.*` / `prisma.lalurParteBAccount.*` access. Tenancy is two-level via AccountingScope
 * (ownerUserId + unitId). Both entities soft-archive (deletedAt + rename-on-key, D-M2); reads default to
 * live rows (deletedAt: null) unless includeArchived. Tx-aware so audit + write commit atomically (T8).
 */
export interface ILalurRepository {
  // Entries (Parte A + Bloco N)
  createEntry(data: CreateLalurEntryData, tx?: Prisma.TransactionClient): Promise<LalurEntry>;
  findEntryById(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<LalurEntry | null>;
  findManyEntries(scope: AccountingScope, filter: LalurEntryFilter, tx?: Prisma.TransactionClient): Promise<LalurEntry[]>;
  /** Live lines of a year with parteB + account resolved — the generator's read (item 11: the generator reads the model). */
  findEntriesForYear(scope: AccountingScope, year: number, tx?: Prisma.TransactionClient): Promise<LalurEntryWithRelations[]>;
  updateEntry(scope: AccountingScope, id: string, data: Prisma.LalurEntryUpdateInput, tx?: Prisma.TransactionClient): Promise<LalurEntry>;
  countLiveEntriesByParteB(scope: AccountingScope, parteBId: string, tx?: Prisma.TransactionClient): Promise<number>;

  // Parte B accounts (M010)
  createParteB(data: CreateLalurParteBAccountData, tx?: Prisma.TransactionClient): Promise<LalurParteBAccount>;
  findParteBById(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<LalurParteBAccount | null>;
  findManyParteB(scope: AccountingScope, filter: { codTributo?: string; includeArchived: boolean }, tx?: Prisma.TransactionClient): Promise<LalurParteBAccount[]>;
  updateParteB(scope: AccountingScope, id: string, data: Prisma.LalurParteBAccountUpdateInput, tx?: Prisma.TransactionClient): Promise<LalurParteBAccount>;

  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
