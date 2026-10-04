import prisma from '../../../lib/prisma';
import type { Prisma, TaxAssessment } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import type { CreateTaxAssessmentData, ITaxAssessmentRepository, TaxAssessmentFilter } from './ITaxAssessmentRepository';

/** Prisma-backed `tax_assessments` (X7 Fase A). Soft-delete; ordem determinística (período, tributo, confirmação). */
export class TaxAssessmentRepository implements ITaxAssessmentRepository {
  private db(tx?: Prisma.TransactionClient) {
    return tx ?? prisma;
  }

  public async create(scope: AccountingScope, data: CreateTaxAssessmentData, tx?: Prisma.TransactionClient): Promise<TaxAssessment> {
    return this.db(tx).taxAssessment.create({
      data: { ...data, userId: scope.ownerUserId, status: 'CONFIRMED', confirmedById: scope.actorUserId },
    });
  }

  public async findById(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<TaxAssessment | null> {
    return this.db(tx).taxAssessment.findFirst({ where: { id, userId: scope.ownerUserId, deletedAt: null } });
  }

  public async findMany(scope: AccountingScope, filter: TaxAssessmentFilter, tx?: Prisma.TransactionClient): Promise<TaxAssessment[]> {
    return this.db(tx).taxAssessment.findMany({
      where: {
        userId: scope.ownerUserId,
        deletedAt: null,
        anoCalendario: filter.anoCalendario,
        ...(filter.periodo ? { periodo: filter.periodo } : {}),
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.tributo ? { tributo: filter.tributo } : {}),
      },
      orderBy: [{ periodo: 'asc' }, { tributo: 'asc' }, { confirmedAt: 'asc' }, { id: 'asc' }],
    });
  }

  public async markSuperseded(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<boolean> {
    const r = await this.db(tx).taxAssessment.updateMany({
      where: { id, userId: scope.ownerUserId, status: 'CONFIRMED', deletedAt: null },
      data: { status: 'SUPERSEDED' },
    });
    return r.count === 1;
  }

  public async findOtherUnitsWithMovement(scope: AccountingScope, from: Date, to: Date, ledgerStatuses: readonly string[]): Promise<string[]> {
    const rows = await prisma.journalEntry.findMany({
      where: { userId: scope.ownerUserId, unitId: { not: scope.unitId }, status: { in: [...ledgerStatuses] }, date: { gte: from, lte: to } },
      select: { unitId: true },
      distinct: ['unitId'],
      orderBy: { unitId: 'asc' },
    });
    return rows.map((r) => r.unitId);
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
