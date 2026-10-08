import prisma from '../../../lib/prisma';
import type { LegalParameter, Prisma } from 'generated/prisma';
import type { CreateLegalParameterData, ILegalParameterRepository } from './ILegalParameterRepository';

/** Repositório Prisma de `legal_parameters`. Zero regra de negócio (ver o contrato). */
export class LegalParameterRepository implements ILegalParameterRepository {
  public async create(data: CreateLegalParameterData, tx?: Prisma.TransactionClient): Promise<LegalParameter> {
    return (tx ?? prisma).legalParameter.create({ data: { ...data, status: 'DRAFT' } });
  }

  public async findById(id: string, tx?: Prisma.TransactionClient): Promise<LegalParameter | null> {
    return (tx ?? prisma).legalParameter.findUnique({ where: { id } });
  }

  public async findMany(filter: { tabela?: string; status?: string }, tx?: Prisma.TransactionClient): Promise<LegalParameter[]> {
    return (tx ?? prisma).legalParameter.findMany({
      where: { ...(filter.tabela ? { tabela: filter.tabela } : {}), ...(filter.status ? { status: filter.status } : {}) },
      orderBy: [{ tabela: 'asc' }, { chave: 'asc' }, { vigenteDesde: 'desc' }, { createdAt: 'desc' }],
    });
  }

  public async findByIds(ids: readonly string[]): Promise<LegalParameter[]> {
    return ids.length === 0 ? [] : prisma.legalParameter.findMany({ where: { id: { in: [...ids] } } });
  }

  public async findPublished(tabelas: readonly string[], tx?: Prisma.TransactionClient): Promise<LegalParameter[]> {
    return (tx ?? prisma).legalParameter.findMany({ where: { tabela: { in: [...tabelas] }, status: 'PUBLISHED' } });
  }

  public async markPublished(id: string, actorId: string, at: Date, tx: Prisma.TransactionClient): Promise<boolean> {
    const r = await tx.legalParameter.updateMany({ where: { id, status: 'DRAFT' }, data: { status: 'PUBLISHED', publishedById: actorId, publishedAt: at } });
    return r.count === 1;
  }

  public async markRevoked(id: string, actorId: string, at: Date, tx: Prisma.TransactionClient): Promise<boolean> {
    const r = await tx.legalParameter.updateMany({ where: { id, status: 'PUBLISHED' }, data: { status: 'REVOKED', revokedById: actorId, revokedAt: at } });
    return r.count === 1;
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
