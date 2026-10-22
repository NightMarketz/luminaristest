import prisma from '../../../lib/prisma';
import type { ConsumptionTaxAssessment, Prisma } from 'generated/prisma';
import type { CreateConsumptionTaxAssessmentData, IConsumptionTaxAssessmentRepository } from './IConsumptionTaxAssessmentRepository';

/** Repositório Prisma de `consumption_tax_assessments`. Zero regra de negócio (ver o contrato). */
export class ConsumptionTaxAssessmentRepository implements IConsumptionTaxAssessmentRepository {
  public async create(data: CreateConsumptionTaxAssessmentData, tx?: Prisma.TransactionClient): Promise<ConsumptionTaxAssessment> {
    return (tx ?? prisma).consumptionTaxAssessment.create({ data });
  }

  public async findById(ownerUserId: string, id: string, tx?: Prisma.TransactionClient): Promise<ConsumptionTaxAssessment | null> {
    return (tx ?? prisma).consumptionTaxAssessment.findFirst({ where: { id, userId: ownerUserId, deletedAt: null } });
  }

  public async findSuperseded(ownerUserId: string, anoCalendario: number, mes: number, tributo: string): Promise<ConsumptionTaxAssessment[]> {
    return prisma.consumptionTaxAssessment.findMany({ where: { userId: ownerUserId, anoCalendario, mes, tributo, status: 'SUPERSEDED', deletedAt: null } });
  }

  public async setProvisaoEntryId(ownerUserId: string, id: string, entryId: string): Promise<boolean> {
    const r = await prisma.consumptionTaxAssessment.updateMany({ where: { id, userId: ownerUserId, deletedAt: null, provisaoEntryId: null }, data: { provisaoEntryId: entryId } });
    return r.count === 1;
  }

  public async findMany(ownerUserId: string, anoCalendario: number, tx?: Prisma.TransactionClient): Promise<ConsumptionTaxAssessment[]> {
    return (tx ?? prisma).consumptionTaxAssessment.findMany({
      where: { userId: ownerUserId, anoCalendario, deletedAt: null },
      orderBy: [{ mes: 'asc' }, { tributo: 'asc' }, { confirmedAt: 'asc' }],
    });
  }

  public async findConfirmedFrom(ownerUserId: string, tributo: string, anoCalendario: number, mes: number, tx?: Prisma.TransactionClient): Promise<ConsumptionTaxAssessment[]> {
    return (tx ?? prisma).consumptionTaxAssessment.findMany({
      where: {
        userId: ownerUserId,
        tributo,
        status: 'CONFIRMED',
        deletedAt: null,
        OR: [{ anoCalendario, mes: { gte: mes } }, { anoCalendario: { gt: anoCalendario } }],
      },
      orderBy: [{ anoCalendario: 'asc' }, { mes: 'asc' }],
    });
  }

  public async markSuperseded(ownerUserId: string, ids: string[], tx: Prisma.TransactionClient): Promise<number> {
    if (ids.length === 0) return 0;
    const r = await tx.consumptionTaxAssessment.updateMany({
      where: { id: { in: ids }, userId: ownerUserId, status: 'CONFIRMED', deletedAt: null },
      data: { status: 'SUPERSEDED' },
    });
    return r.count;
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
