import prisma from '../../../lib/prisma';
import type { PackageValidityAcceptance } from 'generated/prisma';
import type { AccountingScope } from '../../accounting/public/accountingScope.types';
import { accountingScopeWhere } from '../../accounting/public/accountingScope';
import type { CreateAcceptanceInput, IPackageAcceptanceRepository } from './IPackageAcceptanceRepository';

/** Prisma-backed append-only acceptance log. Only place with prisma.packageValidityAcceptance.* access. */
export class PackageAcceptanceRepository implements IPackageAcceptanceRepository {
  public async findBySale(scope: AccountingScope, saleId: string): Promise<PackageValidityAcceptance | null> {
    return prisma.packageValidityAcceptance.findFirst({ where: { ...accountingScopeWhere(scope), saleId } });
  }

  public async create(scope: AccountingScope, data: CreateAcceptanceInput): Promise<PackageValidityAcceptance> {
    return prisma.packageValidityAcceptance.create({ data: { ...accountingScopeWhere(scope), ...data } });
  }
}
