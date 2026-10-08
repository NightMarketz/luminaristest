import prisma from '../../../lib/prisma';
import type { Prisma, TaxAssessment } from 'generated/prisma';
import type { CreateTaxAssessmentData, ITaxAssessmentRepository, TaxAssessmentFilter } from './ITaxAssessmentRepository';

/** Repositório Prisma de `tax_assessments`. Zero regra de negócio (ver o contrato). */
export class TaxAssessmentRepository implements ITaxAssessmentRepository {
  public async create(data: CreateTaxAssessmentData, tx?: Prisma.TransactionClient): Promise<TaxAssessment> {
    return (tx ?? prisma).taxAssessment.create({ data });
  }

  public async findById(ownerUserId: string, id: string, tx?: Prisma.TransactionClient): Promise<TaxAssessment | null> {
    return (tx ?? prisma).taxAssessment.findFirst({ where: { id, userId: ownerUserId, deletedAt: null } });
  }

  public async findMany(ownerUserId: string, filter: TaxAssessmentFilter, tx?: Prisma.TransactionClient): Promise<TaxAssessment[]> {
    return (tx ?? prisma).taxAssessment.findMany({
      where: {
        userId: ownerUserId,
        anoCalendario: filter.anoCalendario,
        ...(filter.periodo ? { periodo: filter.periodo } : {}),
        ...(filter.tributo ? { tributo: filter.tributo } : {}),
        ...(filter.status ? { status: filter.status } : {}),
        deletedAt: null,
      },
      orderBy: [{ periodo: 'asc' }, { tributo: 'asc' }, { confirmedAt: 'asc' }],
    });
  }

  public async findConfirmedByYear(ownerUserId: string, anoCalendario: number, tx?: Prisma.TransactionClient): Promise<TaxAssessment[]> {
    return (tx ?? prisma).taxAssessment.findMany({
      where: { userId: ownerUserId, anoCalendario, status: 'CONFIRMED', deletedAt: null },
      orderBy: [{ periodo: 'asc' }, { tributo: 'asc' }],
    });
  }

  public async markSuperseded(ownerUserId: string, ids: string[], tx: Prisma.TransactionClient): Promise<number> {
    if (ids.length === 0) return 0;
    const r = await tx.taxAssessment.updateMany({
      where: { id: { in: ids }, userId: ownerUserId, status: 'CONFIRMED', deletedAt: null },
      data: { status: 'SUPERSEDED' },
    });
    return r.count;
  }

  public async setProvisaoEntryId(ownerUserId: string, id: string, entryId: string): Promise<boolean> {
    const r = await prisma.taxAssessment.updateMany({
      where: { id, userId: ownerUserId, deletedAt: null, provisaoEntryId: null },
      data: { provisaoEntryId: entryId },
    });
    return r.count === 1;
  }

  public async findConfirmedByTributos(tributos: readonly string[]): Promise<TaxAssessment[]> {
    return prisma.taxAssessment.findMany({
      where: { tributo: { in: [...tributos] }, status: 'CONFIRMED', deletedAt: null },
      orderBy: [{ userId: 'asc' }, { anoCalendario: 'asc' }, { periodo: 'asc' }],
    });
  }

  public async findLatestSuperseded(ownerUserId: string, anoCalendario: number, tributo: string, periodo: string): Promise<TaxAssessment | null> {
    return prisma.taxAssessment.findFirst({
      where: { userId: ownerUserId, anoCalendario, tributo, periodo, status: 'SUPERSEDED', deletedAt: null },
      orderBy: { confirmedAt: 'desc' },
    });
  }

  public async setAvisoParametroLegal(ownerUserId: string, id: string, aviso: string): Promise<void> {
    await prisma.taxAssessment.updateMany({ where: { id, userId: ownerUserId, deletedAt: null }, data: { avisoParametroLegal: aviso } });
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
