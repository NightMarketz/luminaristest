import type { Counterparty, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';

/**
 * Data to create a Counterparty row. Scalars only (no relation objects). `nameNormalized` is NOT
 * derived here — the CALLER (service / resolution) computes it via `normalizeCounterpartyName(name)`
 * (BRIEF-W2-A comp. 6) so the repository stays a thin Prisma wrapper with no normalization logic of
 * its own. `taxId` is optional and pre-normalized to digits-only by the caller too (comp. 3).
 */
export interface CreateCounterpartyData {
  userId: string;
  unitId: string;
  type: string;
  name: string;
  nameNormalized: string;
  ref: string | null;
  taxId?: string | null;
  createdById: string | null;
}

/**
 * Repository contract for the counterparty catalog (`counterparties`). Two-level tenancy via
 * AccountingScope (ownerUserId + unitId). `findById` is the SCOPED resolver the AP/AR create paths
 * call to re-scope a body-supplied counterpartyId (SEC-A1-1 — the DTO can't know the scope, so the
 * service, not Zod, proves the counterparty belongs to this tenant). Soft-archive: reads default to
 * `deletedAt: null` unless includeArchived. Every write accepts an optional tx so the audit + write
 * commit atomically (T8).
 */
export interface ICounterpartyRepository {
  create(data: CreateCounterpartyData, tx?: Prisma.TransactionClient): Promise<Counterparty>;

  /** Scoped point lookup — returns null when the id is not in this scope (cross-tenant → null). */
  findById(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<Counterparty | null>;

  /**
   * Scoped lookup by the BUSINESS key `[userId, unitId, type, nameNormalized]` — the find half of the
   * find-or-create that keeps `counterpartyId` NOT NULL (SEC-A1-5 / F-NN1(a)). `name` is normalized
   * INSIDE the implementation via `normalizeCounterpartyName` before the comparison (BRIEF-W2-A comp.
   * 7 — F1(b)): " Padaria X" and "padaria x" resolve to the SAME identity. Reads only LIVE rows
   * (`deletedAt: null`): an archived counterparty had its name mangled to `deleted:<id>:<name>`
   * (SEC-A1-4), so the original name is free and MUST mint a new identity instead of resurrecting the
   * archived one. Scope-carrying like every other read — two tenants named "ACME" never cross
   * (SEC-A1-2).
   */
  findByName(
    scope: AccountingScope,
    type: string,
    name: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Counterparty | null>;

  findManyByUnit(
    scope: AccountingScope,
    params: { type?: string; includeArchived: boolean },
    tx?: Prisma.TransactionClient,
  ): Promise<Counterparty[]>;

  update(
    scope: AccountingScope,
    id: string,
    data: Prisma.CounterpartyUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Counterparty>;

  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
