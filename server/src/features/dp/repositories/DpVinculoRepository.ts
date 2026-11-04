import prisma from '../../../lib/prisma';
import type { DpTrabalhador, DpVinculo, DpVinculoVersao, Prisma } from 'generated/prisma';
import type { DpTrabalhadorData, DpVersaoData, DpVinculoCompleto, DpVinculoData, IDpVinculoRepository } from './IDpVinculoRepository';

type Tx = Prisma.TransactionClient;
const vivo = { deletedAt: null };
const morto = () => ({ deletedAt: new Date() });

/** Prisma-backed trabalhador, vínculo e versões do DP (BE-INCR-DP-F0-F1 PR-4, itens 37–48). */
export class DpVinculoRepository implements IDpVinculoRepository {
  private db(tx?: Tx) {
    return tx ?? prisma;
  }

  // ── trabalhador ──
  public async listTrabalhadores(ownerUserId: string, limit: number): Promise<DpTrabalhador[]> {
    return prisma.dpTrabalhador.findMany({ where: { userId: ownerUserId, ...vivo }, orderBy: [{ nome: 'asc' }, { id: 'asc' }], take: limit });
  }
  public async findTrabalhador(ownerUserId: string, id: string, tx?: Tx): Promise<DpTrabalhador | null> {
    return this.db(tx).dpTrabalhador.findFirst({ where: { id, userId: ownerUserId, ...vivo } });
  }
  public async findTrabalhadorPorCpf(ownerUserId: string, cpf: string, tx: Tx): Promise<DpTrabalhador | null> {
    return tx.dpTrabalhador.findFirst({ where: { userId: ownerUserId, cpf, ...vivo } });
  }
  public async createTrabalhador(ownerUserId: string, createdById: string, data: DpTrabalhadorData, tx: Tx): Promise<DpTrabalhador> {
    // Item 37: o F1 só grava DIGITADA (F-DP-12); IMPORTADA_ESOCIAL nasce com a importação.
    return tx.dpTrabalhador.create({ data: { userId: ownerUserId, createdById, origem: 'DIGITADA', ...data } });
  }
  public async updateTrabalhador(id: string, data: Partial<DpTrabalhadorData>, tx: Tx): Promise<DpTrabalhador> {
    return tx.dpTrabalhador.update({ where: { id }, data });
  }
  public async deleteTrabalhador(id: string, tx: Tx): Promise<DpTrabalhador> {
    return tx.dpTrabalhador.update({ where: { id }, data: morto() });
  }
  public async countVinculosVivos(trabalhadorId: string, tx: Tx): Promise<number> {
    return tx.dpVinculo.count({ where: { trabalhadorId, ...vivo } });
  }

  // ── vínculo ──
  public async listVinculos(ownerUserId: string, limit: number): Promise<DpVinculo[]> {
    return prisma.dpVinculo.findMany({ where: { userId: ownerUserId, ...vivo }, orderBy: [{ matricula: 'asc' }, { id: 'asc' }], take: limit });
  }
  public async findVinculo(ownerUserId: string, id: string, tx?: Tx): Promise<DpVinculo | null> {
    return this.db(tx).dpVinculo.findFirst({ where: { id, userId: ownerUserId, ...vivo } });
  }
  public async findVinculoCompleto(ownerUserId: string, id: string, tx?: Tx): Promise<DpVinculoCompleto | null> {
    return this.db(tx).dpVinculo.findFirst({
      where: { id, userId: ownerUserId, ...vivo },
      include: {
        versoes: { orderBy: { vigenteDesde: 'asc' }, include: { lotacao: true, cargo: true, jornada: true, sindicato: true } },
      },
    });
  }
  public async findVinculoPorMatricula(ownerUserId: string, matricula: string, tx: Tx): Promise<DpVinculo | null> {
    return tx.dpVinculo.findFirst({ where: { userId: ownerUserId, matricula, ...vivo } });
  }
  public async createVinculo(ownerUserId: string, data: DpVinculoData, tx: Tx): Promise<DpVinculo> {
    return tx.dpVinculo.create({ data: { userId: ownerUserId, origem: 'DIGITADA', ...data } });
  }
  public async deleteVinculo(id: string, tx: Tx): Promise<DpVinculo> {
    return tx.dpVinculo.update({ where: { id }, data: morto() });
  }

  // ── versão ──
  public async listVersoes(vinculoId: string, tx?: Tx): Promise<DpVinculoVersao[]> {
    return this.db(tx).dpVinculoVersao.findMany({ where: { vinculoId }, orderBy: { vigenteDesde: 'asc' } });
  }
  public async findVersao(vinculoId: string, id: string, tx: Tx): Promise<DpVinculoVersao | null> {
    return tx.dpVinculoVersao.findFirst({ where: { id, vinculoId } });
  }
  public async createVersao(vinculoId: string, data: DpVersaoData, tx: Tx): Promise<DpVinculoVersao> {
    return tx.dpVinculoVersao.create({ data: { vinculoId, ...data } });
  }
  public async updateVersao(id: string, data: Partial<DpVersaoData>, tx: Tx): Promise<DpVinculoVersao> {
    return tx.dpVinculoVersao.update({ where: { id }, data });
  }

  public async runTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
