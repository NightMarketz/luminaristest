import prisma from '../../../lib/prisma';
import type { DpDependente, Prisma } from 'generated/prisma';
import type { DpDependenteData, IDpDependenteRepository } from './IDpDependenteRepository';

type Tx = Prisma.TransactionClient;
const vivo = { deletedAt: null };

/** Prisma-backed dependentes do trabalhador (BE-INCR-DP-F2 PR-1, item 13). */
export class DpDependenteRepository implements IDpDependenteRepository {
  public async list(trabalhadorId: string, tx?: Tx): Promise<DpDependente[]> {
    return (tx ?? prisma).dpDependente.findMany({ where: { trabalhadorId, ...vivo }, orderBy: [{ vigenteDesde: 'asc' }, { id: 'asc' }] });
  }
  public async find(trabalhadorId: string, id: string, tx: Tx): Promise<DpDependente | null> {
    return tx.dpDependente.findFirst({ where: { id, trabalhadorId, ...vivo } });
  }
  public async create(trabalhadorId: string, data: DpDependenteData, tx: Tx): Promise<DpDependente> {
    return tx.dpDependente.create({ data: { trabalhadorId, ...data } });
  }
  public async update(id: string, data: Partial<DpDependenteData>, tx: Tx): Promise<DpDependente> {
    return tx.dpDependente.update({ where: { id }, data });
  }
  public async delete(id: string, tx: Tx): Promise<DpDependente> {
    return tx.dpDependente.update({ where: { id }, data: { deletedAt: new Date() } });
  }
  public async runTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
