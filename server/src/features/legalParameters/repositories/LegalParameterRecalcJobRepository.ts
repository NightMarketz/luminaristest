import prisma from '../../../lib/prisma';
import type { LegalParameterRecalcJob, Prisma } from 'generated/prisma';
import type { ILegalParameterRecalcJobRepository, LegalParameterRecalcEvento, RecalcResumo } from './ILegalParameterRecalcJobRepository';

/** Repositório Prisma da fila de recálculo. Zero regra de negócio. */
export class LegalParameterRecalcJobRepository implements ILegalParameterRecalcJobRepository {
  public async create(legalParameterId: string, evento: LegalParameterRecalcEvento, tx: Prisma.TransactionClient): Promise<LegalParameterRecalcJob> {
    return tx.legalParameterRecalcJob.create({ data: { legalParameterId, evento, status: 'PENDING' } });
  }

  public async findPending(limit: number): Promise<LegalParameterRecalcJob[]> {
    return prisma.legalParameterRecalcJob.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' }, take: limit });
  }

  public async markDone(id: string, resumo: RecalcResumo, at: Date): Promise<void> {
    await prisma.legalParameterRecalcJob.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: 'DONE', resumo: resumo as unknown as Prisma.InputJsonValue, processedAt: at, ultimoErro: null, tentativas: { increment: 1 } },
    });
  }

  public async markFailedAttempt(id: string, erro: string): Promise<void> {
    await prisma.legalParameterRecalcJob.updateMany({ where: { id, status: 'PENDING' }, data: { ultimoErro: erro.slice(0, 1000), tentativas: { increment: 1 } } });
  }
}
