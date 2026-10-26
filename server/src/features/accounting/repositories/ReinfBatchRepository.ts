import prisma from '../../../lib/prisma';
import type { Prisma, ReinfBatch } from 'generated/prisma';
import type { CreateReinfBatchData, IReinfBatchRepository } from './IReinfBatchRepository';

/** Repositório Prisma de `reinf_batches`. Zero regra de negócio (ver o contrato). */
export class ReinfBatchRepository implements IReinfBatchRepository {
  public async create(data: CreateReinfBatchData, tx?: Prisma.TransactionClient): Promise<ReinfBatch> {
    return (tx ?? prisma).reinfBatch.create({ data: { ...data, eventos: data.eventos as Prisma.InputJsonValue, status: 'GERADO' } });
  }

  public async findByCompetencia(ownerUserId: string, competencia: string, tx?: Prisma.TransactionClient): Promise<ReinfBatch[]> {
    return (tx ?? prisma).reinfBatch.findMany({ where: { userId: ownerUserId, competencia }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
  }

  public async findByOwner(ownerUserId: string, tx?: Prisma.TransactionClient): Promise<ReinfBatch[]> {
    return (tx ?? prisma).reinfBatch.findMany({ where: { userId: ownerUserId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
  }

  public async findById(ownerUserId: string, id: string): Promise<ReinfBatch | null> {
    return prisma.reinfBatch.findFirst({ where: { id, userId: ownerUserId } });
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
