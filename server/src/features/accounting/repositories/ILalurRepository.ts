import type {
  LalurEntry,
  LalurParteBAccount,
  LalurParteBBalance,
  LalurParteBClosing,
  LalurParteBMovement,
  LalurProcess,
  Prisma,
} from 'generated/prisma';
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
  /** `deletedAt` incluído: conta arquivada DEPOIS do ajuste é 400 na geração (BRIEF 3C item 19). */
  account: { id: string; code: string; nature: string; deletedAt: Date | null } | null;
  /** M315/M365 — value-objects (C2). */
  processos: LalurProcess[];
  /** M312/M362 — `entryNumber` do lançamento da ECD (I200.NUM_LCTO); null se o lançamento voltou a Draft. */
  journalLinks: Array<{ journalEntryId: string; journalEntry: { entryNumber: number | null } }>;
};

// ─── ECF Fase 3C — Parte B (ADR EMENDA 2026-09-12, 3ª — D-P2) ───────────────────────────────

/** Data to create an M410 movement (`codTributo` already derived from the account by the service). */
export interface CreateLalurParteBMovementData {
  userId: string;
  unitId: string;
  parteBId: string;
  year: number;
  quarter: string;
  codTributo: string;
  valorCents: bigint;
  indicador: string;
  contrapartidaId: string | null;
  historico: string;
  indLanAnt: string;
  origem: string;
  createdById: string | null;
}

export interface LalurMovementFilter {
  year?: number;
  quarter?: string;
  parteBId?: string;
  includeArchived: boolean;
}

/** A movement with both Parte B accounts and its processes resolved — the serializer's read. */
export type LalurMovementWithRelations = LalurParteBMovement & {
  parteB: LalurParteBAccount;
  contrapartida: LalurParteBAccount | null;
  processos: LalurProcess[];
};

/** One materialized M500 row (magnitude + indicador — D-P2). */
export interface CreateLalurParteBBalanceData {
  parteBId: string;
  sdIniCents: bigint;
  indSdIni: string;
  vlParteACents: bigint;
  indVlParteA: string;
  vlParteBCents: bigint;
  indVlParteB: string;
  sdFimCents: bigint;
  indSdFim: string;
}

export type LalurClosingWithBalances = LalurParteBClosing & {
  balances: Array<LalurParteBBalance & { parteB: LalurParteBAccount }>;
};

export interface LalurProcessoData {
  indProc: string;
  numProc: string;
}

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
  /** Live Parte A lines pointing at a ledger account — guard at `Account` soft-delete (BRIEF 3C item 19). */
  countLiveEntriesByAccount(scope: AccountingScope, accountId: string, tx?: Prisma.TransactionClient): Promise<number>;

  // Value-object children (C2): the DTO array REPLACES the set inside the parent's tx.
  replaceEntryProcesses(entryId: string, processos: LalurProcessoData[], tx: Prisma.TransactionClient): Promise<void>;
  replaceMovementProcesses(movementId: string, processos: LalurProcessoData[], tx: Prisma.TransactionClient): Promise<void>;
  replaceEntryJournalLinks(entryId: string, journalEntryIds: string[], tx: Prisma.TransactionClient): Promise<void>;

  // Parte B movements (M410)
  createMovement(data: CreateLalurParteBMovementData, tx?: Prisma.TransactionClient): Promise<LalurParteBMovement>;
  findMovementById(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<LalurParteBMovement | null>;
  findManyMovements(scope: AccountingScope, filter: LalurMovementFilter, tx?: Prisma.TransactionClient): Promise<LalurParteBMovement[]>;
  /** Live movements of a year with both accounts + processes — deterministic order (quarter, codCtaB, createdAt, id). */
  findMovementsForYear(scope: AccountingScope, year: number, tx?: Prisma.TransactionClient): Promise<LalurMovementWithRelations[]>;
  updateMovement(scope: AccountingScope, id: string, data: Prisma.LalurParteBMovementUpdateInput, tx?: Prisma.TransactionClient): Promise<LalurParteBMovement>;
  /** Live movements where the account is COD_CTA_B or COD_CTA_B_CTP — guard at Parte B archive. */
  countLiveMovementsByParteB(scope: AccountingScope, parteBId: string, tx?: Prisma.TransactionClient): Promise<number>;

  // Parte B closings (C1) + materialized balances (M500)
  findClosing(scope: AccountingScope, year: number, quarter: string, tx?: Prisma.TransactionClient): Promise<LalurClosingWithBalances | null>;
  findClosingsForYear(scope: AccountingScope, year: number, tx?: Prisma.TransactionClient): Promise<LalurClosingWithBalances[]>;
  /** Whether ANY closing exists in an exercise strictly before `year` (C3 continuity guard). */
  existsClosingBefore(scope: AccountingScope, year: number, tx?: Prisma.TransactionClient): Promise<boolean>;
  createClosing(
    data: { userId: string; unitId: string; year: number; quarter: string; balancesSha256: string; closedById: string | null },
    balances: CreateLalurParteBBalanceData[],
    tx: Prisma.TransactionClient,
  ): Promise<LalurClosingWithBalances>;
  /** Cascade removes the balances (reopen / refechar). */
  deleteClosing(id: string, tx: Prisma.TransactionClient): Promise<void>;

  // Parte B accounts (M010)
  createParteB(data: CreateLalurParteBAccountData, tx?: Prisma.TransactionClient): Promise<LalurParteBAccount>;
  findParteBById(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<LalurParteBAccount | null>;
  findManyParteB(scope: AccountingScope, filter: { codTributo?: string; includeArchived: boolean }, tx?: Prisma.TransactionClient): Promise<LalurParteBAccount[]>;
  updateParteB(scope: AccountingScope, id: string, data: Prisma.LalurParteBAccountUpdateInput, tx?: Prisma.TransactionClient): Promise<LalurParteBAccount>;

  /** M312/M362 — `journalEntryIds` do DTO resolvidos no escopo: id, entryNumber (null = não postado), date. */
  findJournalEntriesForLinks(scope: AccountingScope, ids: string[], tx?: Prisma.TransactionClient): Promise<Array<{ id: string; entryNumber: number | null; date: Date }>>;

  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
