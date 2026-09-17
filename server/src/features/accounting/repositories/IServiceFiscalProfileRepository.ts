import type { Prisma, ServiceFiscalProfile } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';

export interface ServiceFiscalProfileData {
  cTribNac: string;
  cTribMun?: string | null;
  cNBS?: string | null;
  cIndOp: string;
  cLocPrestacao?: string | null;
  xDescServ?: string | null;
}

/**
 * BE-INCR-DFE (nó X10b, BRIEF item 2/5) — único lugar com `prisma.serviceFiscalProfile.*`. `tx?` em todos.
 * Soft-delete com rename-on-delete do `serviceRef` (`deleted:<id>:<ref>`) — libera o @@unique para
 * re-criar (memória unique-de-idempotencia-x-soft-delete; precedente LalurService.deletedLalurCodigo).
 */
export interface IServiceFiscalProfileRepository {
  findByServiceRef(scope: AccountingScope, serviceRef: string, tx?: Prisma.TransactionClient): Promise<ServiceFiscalProfile | null>;
  findManyByServiceRefs(scope: AccountingScope, serviceRefs: string[], tx?: Prisma.TransactionClient): Promise<ServiceFiscalProfile[]>;
  listByScope(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<ServiceFiscalProfile[]>;
  upsert(scope: AccountingScope, serviceRef: string, data: ServiceFiscalProfileData, tx?: Prisma.TransactionClient): Promise<ServiceFiscalProfile>;
  softDelete(scope: AccountingScope, serviceRef: string, tx?: Prisma.TransactionClient): Promise<number>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
