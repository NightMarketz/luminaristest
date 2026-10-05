import type { PackageValidityAcceptance } from 'generated/prisma';
import type { AccountingScope } from '../../accounting/scope/AccountingScope';

/** Everything the acceptance row stores besides id/acceptedAt (the DB fills those). Scope axes come from `scope`. */
export interface CreateAcceptanceInput {
  saleId: string;
  customerId: string;
  packageId: string;
  /** date-only at UTC midnight */
  saleDate: Date;
  validityDays: number;
  /** date-only at UTC midnight */
  expiresOn: Date;
  textVersion: string;
  textShown: string;
  textSha256: string;
  acceptedByUserId: string;
}

/**
 * Contract for the append-only acceptance evidence. First-class Prisma. There is NO update and NO delete on purpose:
 * the row is proof, not a record to maintain (BRIEF item 1).
 */
export interface IPackageAcceptanceRepository {
  /** The acceptance of one sale under the scope, or null. */
  findBySale(scope: AccountingScope, saleId: string): Promise<PackageValidityAcceptance | null>;

  /** Appends one acceptance. Throws Prisma P2002 if the sale already has one (`@@unique[userId,unitId,saleId]`). */
  create(scope: AccountingScope, data: CreateAcceptanceInput): Promise<PackageValidityAcceptance>;
}
