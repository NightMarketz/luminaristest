import prisma from '../../../lib/prisma';
import type { DpAfastamento, DpFeriasImplantacao, Prisma } from 'generated/prisma';
import type { DpAfastamentoData, DpFeriasImplantacaoData, IDpAfastamentoFeriasRepository } from './IDpAfastamentoFeriasRepository';

type Tx = Prisma.TransactionClient;
const vivo = { deletedAt: null };
const morto = () => ({ deletedAt: new Date() });

/** Prisma-backed afastamento e implantação de férias do DP (BE-INCR-DP-F0-F1 PR-6, itens 56 e 58). */
export class DpAfastamentoFeriasRepository implements IDpAfastamentoFeriasRepository {
  private db(tx?: Tx) {
    return tx ?? prisma;
  }

  // ── afastamento ──
  public async listAfastamentos(vinculoId: string, tx?: Tx): Promise<DpAfastamento[]> {
    return this.db(tx).dpAfastamento.findMany({ where: { vinculoId, ...vivo }, orderBy: [{ inicio: 'asc' }, { id: 'asc' }] });
  }
  public async findAfastamento(vinculoId: string, id: string, tx: Tx): Promise<DpAfastamento | null> {
    return tx.dpAfastamento.findFirst({ where: { id, vinculoId, ...vivo } });
  }
  public async createAfastamento(vinculoId: string, data: DpAfastamentoData, tx: Tx): Promise<DpAfastamento> {
    return tx.dpAfastamento.create({ data: { vinculoId, ...data } });
  }
  public async updateAfastamento(id: string, data: Partial<DpAfastamentoData>, tx: Tx): Promise<DpAfastamento> {
    return tx.dpAfastamento.update({ where: { id }, data });
  }
  public async deleteAfastamento(id: string, tx: Tx): Promise<DpAfastamento> {
    return tx.dpAfastamento.update({ where: { id }, data: morto() });
  }

  // ── implantação de férias ──
  public async listImplantacoes(vinculoId: string, tx?: Tx): Promise<DpFeriasImplantacao[]> {
    return this.db(tx).dpFeriasImplantacao.findMany({ where: { vinculoId, ...vivo }, orderBy: [{ aquisitivoInicio: 'asc' }, { id: 'asc' }] });
  }
  public async findImplantacao(vinculoId: string, id: string, tx: Tx): Promise<DpFeriasImplantacao | null> {
    return tx.dpFeriasImplantacao.findFirst({ where: { id, vinculoId, ...vivo } });
  }
  public async findImplantacaoPorAquisitivo(vinculoId: string, aquisitivoInicio: string, tx: Tx): Promise<DpFeriasImplantacao | null> {
    return tx.dpFeriasImplantacao.findFirst({ where: { vinculoId, aquisitivoInicio, ...vivo } });
  }
  public async createImplantacao(vinculoId: string, informadoPorId: string, data: DpFeriasImplantacaoData, tx: Tx): Promise<DpFeriasImplantacao> {
    return tx.dpFeriasImplantacao.create({ data: { vinculoId, informadoPorId, ...data } });
  }
  public async updateImplantacao(id: string, data: Partial<Omit<DpFeriasImplantacaoData, 'aquisitivoInicio'>>, tx: Tx): Promise<DpFeriasImplantacao> {
    return tx.dpFeriasImplantacao.update({ where: { id }, data });
  }
  public async deleteImplantacao(id: string, tx: Tx): Promise<DpFeriasImplantacao> {
    return tx.dpFeriasImplantacao.update({ where: { id }, data: morto() });
  }

  public async runTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
