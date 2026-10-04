import type { CustomerPackageBalance, PackageBalanceMovement, Prisma } from 'generated/prisma';
// Increment G reuses the accounting tenancy scope (ADR-G01 §7.1): same (userId, unitId)
// security axes, no need for a near-duplicate PackageScope.
import type { AccountingScope } from '../../accounting/scope/AccountingScope';

/**
 * A balance movement is one credit (package-sale origin), one debit (consumption) or one expiry
 * (BE-INCR-PACOTE-VALIDADE item 7: the remaining balance released when the validity ends — its
 * `saleId` column carries the movement key `expiry:<balanceId>:<expiresOn>`, not a sale id).
 */
export type PackageMovementKind = 'credit' | 'debit' | 'expiry';

/** Input for appending one balance movement (idempotency key is userId+unitId+saleId+kind). */
export interface CreateMovementInput {
  userId: string;
  unitId: string;
  customerId: string;
  packageId: string;
  saleId: string;
  kind: PackageMovementKind;
  deltaCents: number;
}

/**
 * Contract for prepaid-package balance data access. First-class Prisma. Money is
 * INTEGER CENTS. The balanceCents >= 0 invariant is enforced at the DB layer by
 * `tryDecrement` (a conditional `gte` updateMany), so a debit can never drive the
 * balance negative even under concurrency — no read-modify-write race window.
 */
export interface IPackageBalanceRepository {
  /** The live balance for one customer × package, or null if none exists yet. */
  findBalance(
    scope: AccountingScope,
    customerId: string,
    packageId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<CustomerPackageBalance | null>;

  /** One live balance by id under the scope, or null. */
  findBalanceById(
    scope: AccountingScope,
    balanceId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<CustomerPackageBalance | null>;

  /**
   * All live balances under the scope, optionally filtered to one customer and/or to the ones whose
   * validity ends on or before `expiresOnOrBefore` (date-only at UTC midnight — F-PV-11 a).
   */
  listBalances(
    scope: AccountingScope,
    filter?: { customerId?: string; expiresOnOrBefore?: Date },
  ): Promise<CustomerPackageBalance[]>;

  /**
   * Creates the balance row at `amountCents` if absent, else atomically increments it. `expiresAt` is
   * written on both paths — the caller (the service, inside the same tx as the credit movement) has
   * already applied the junction rule (F-PV-2 a).
   */
  upsertCredit(
    scope: AccountingScope,
    customerId: string,
    packageId: string,
    amountCents: number,
    expiresAt: Date | null,
    tx?: Prisma.TransactionClient,
  ): Promise<void>;

  /**
   * Atomically decrements the balance ONLY if it currently holds at least `amountCents`
   * (conditional `gte` guard). Returns true when applied, false when the balance is
   * missing or insufficient — the caller turns false into a domain error.
   */
  tryDecrement(
    scope: AccountingScope,
    customerId: string,
    packageId: string,
    amountCents: number,
    tx?: Prisma.TransactionClient,
  ): Promise<boolean>;

  /** Looks up an existing movement by its idempotency key, or null. */
  findMovement(
    scope: AccountingScope,
    saleId: string,
    kind: PackageMovementKind,
    tx?: Prisma.TransactionClient,
  ): Promise<PackageBalanceMovement | null>;

  /** The `credit` movements of one customer × package, newest first (guard 9.2 and the 9d anchor). */
  listCreditMovements(
    scope: AccountingScope,
    customerId: string,
    packageId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PackageBalanceMovement[]>;

  /**
   * Job reads, CROSS-TENANT (same stance as `IFiscalDocumentRepository.listPending`: the job sweeps
   * every tenant and rebuilds the scope from the row). Never exposed over HTTP.
   *  - `listExpiryCandidates`: live balances with a validity and something left (item 14).
   *  - `listMovementsOfKind`: every movement of a kind (item 11 re-drive of `expiry`).
   */
  listExpiryCandidates(): Promise<CustomerPackageBalance[]>;
  listMovementsOfKind(kind: PackageMovementKind): Promise<PackageBalanceMovement[]>;


  /** Appends one movement (throws P2002 if the idempotency key already exists). */
  createMovement(
    data: CreateMovementInput,
    tx?: Prisma.TransactionClient,
  ): Promise<PackageBalanceMovement>;

  /**
   * Runs `fn` inside a Prisma transaction. Services compose the movement insert and the
   * balance change atomically through this, without importing the prisma singleton
   * (layer boundary: only repositories touch it).
   */
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
