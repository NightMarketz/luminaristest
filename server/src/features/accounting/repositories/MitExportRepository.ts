import prisma from '../../../lib/prisma';
import type { MitExport, Prisma } from 'generated/prisma';
import type { CreateMitExportData, IMitExportRepository } from './IMitExportRepository';

/** Repositório Prisma de `mit_exports`. Zero regra de negócio (ver o contrato). */
export class MitExportRepository implements IMitExportRepository {
  public async create(data: CreateMitExportData, tx?: Prisma.TransactionClient): Promise<MitExport> {
    return (tx ?? prisma).mitExport.create({ data });
  }

  public async findByYear(ownerUserId: string, anoCalendario: number, tx?: Prisma.TransactionClient): Promise<MitExport[]> {
    return (tx ?? prisma).mitExport.findMany({
      where: { userId: ownerUserId, anoCalendario },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
