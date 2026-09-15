import type { FiscalProfile, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';

export interface FiscalProfileData {
  regimeTributario: string;
  icmsContribuinte: boolean;
  pisCofinsRegime: string;
  pisCofinsCreditExcludesIcms: boolean;
  pisCofinsCreditIncludesIpi: boolean;
  pisCofinsCreditFromSimplesSupplier: boolean;
  icmsRecuperavelAccountId?: string | null;
  pisCofinsRecuperavelAccountId?: string | null;
  partnerAccountRef?: string | null;
}

/** BE-INCR-NFE-COST-REGIME (nó X6, item 2) — único lugar com `prisma.fiscalProfile.*`. `tx?` em todos. */
export interface IFiscalProfileRepository {
  findByScope(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<FiscalProfile | null>;
  upsert(scope: AccountingScope, data: FiscalProfileData, tx?: Prisma.TransactionClient): Promise<FiscalProfile>;
  softDelete(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<number>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
