import prisma from '../../../lib/prisma';
import type { LegalParameterRecalcJob, Prisma } from 'generated/prisma';
import type { ILegalParameterRecalcJobRepository, LegalParameterRecalcEvento, RecalcJobFiltro, RecalcResumo } from './ILegalParameterRecalcJobRepository';

const whereDe = (f: RecalcJobFiltro): Prisma.LegalParameterRecalcJobWhereInput => ({
  ...(f.status ? { status: f.status } : {}),
  ...(f.legalParameterId ? { legalParameterId: f.legalParameterId } : {}),
});

/** Repositório Prisma da fila de recálculo. Zero regra de negócio. */
export class LegalParameterRecalcJobRepository implements ILegalParameterRecalcJobRepository {
  public async create(legalParameterId: string, evento: LegalParameterRecalcEvento, tx: Prisma.TransactionClient): Promise<LegalParameterRecalcJob> {
    return tx.legalParameterRecalcJob.create({ data: { legalParameterId, evento, status: 'PENDING' } });
  }

  public async findPending(limit: number): Promise<LegalParameterRecalcJob[]> {
    return prisma.legalParameterRecalcJob.findMany({ where: { status: 'PENDING' }, orderBy: [{ tentativas: 'asc' }, { createdAt: 'asc' }], take: limit });
  }

  public async markDone(id: string, resumo: RecalcResumo, at: Date): Promise<void> {
    await prisma.legalParameterRecalcJob.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: 'DONE', resumo: resumo as unknown as Prisma.InputJsonValue, processedAt: at, ultimoErro: null, tentativas: { increment: 1 } },
    });
  }

  public async findMany(filtro: RecalcJobFiltro, skip: number, take: number): Promise<LegalParameterRecalcJob[]> {
    return prisma.legalParameterRecalcJob.findMany({ where: whereDe(filtro), orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip, take });
  }

  public async count(filtro: RecalcJobFiltro): Promise<number> {
    return prisma.legalParameterRecalcJob.count({ where: whereDe(filtro) });
  }

  public async markFailedAttempt(id: string, erro: string): Promise<void> {
    await prisma.legalParameterRecalcJob.updateMany({ where: { id, status: 'PENDING' }, data: { ultimoErro: erro.slice(0, 1000), tentativas: { increment: 1 } } });
  }
}
