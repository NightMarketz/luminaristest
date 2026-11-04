import prisma from '../../../lib/prisma';
import type { DpModuloAtivacao, Prisma } from 'generated/prisma';
import type { DpModuloAtivacaoCreate, IDpModuloAtivacaoRepository } from './IDpModuloAtivacaoRepository';

/** Prisma-backed `dp_modulo_ativacoes` (BE-INCR-DP-F0-F1 PR-1, item 12). Soft-delete; linha viva = `deletedAt: null`. */
export class DpModuloAtivacaoRepository implements IDpModuloAtivacaoRepository {
  private db(tx?: Prisma.TransactionClient) {
    return tx ?? prisma;
  }

  public async list(ownerUserId: string, tx?: Prisma.TransactionClient): Promise<DpModuloAtivacao[]> {
    return this.db(tx).dpModuloAtivacao.findMany({
      where: { userId: ownerUserId, deletedAt: null },
      orderBy: [{ moduleKey: 'asc' }, { competenciaInicio: 'asc' }],
    });
  }

  public async findById(ownerUserId: string, id: string, tx?: Prisma.TransactionClient): Promise<DpModuloAtivacao | null> {
    return this.db(tx).dpModuloAtivacao.findFirst({ where: { id, userId: ownerUserId, deletedAt: null } });
  }

  public async create(
    ownerUserId: string,
    actorUserId: string,
    data: DpModuloAtivacaoCreate,
    tx?: Prisma.TransactionClient,
  ): Promise<DpModuloAtivacao> {
    return this.db(tx).dpModuloAtivacao.create({ data: { userId: ownerUserId, createdById: actorUserId, ...data } });
  }

  public async end(
    id: string,
    actorUserId: string,
    competenciaFim: string,
    motivoFim: string,
    tx?: Prisma.TransactionClient,
  ): Promise<DpModuloAtivacao> {
    return this.db(tx).dpModuloAtivacao.update({ where: { id }, data: { competenciaFim, motivoFim, endedById: actorUserId } });
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
