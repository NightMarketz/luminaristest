import prisma from '../../../lib/prisma';
import type { DpLancamento, DpOutraRemuneracao, Prisma } from 'generated/prisma';
import type { DpLancamentoData, DpOutraRemuneracaoData, IDpLancamentoRepository } from './IDpLancamentoRepository';

type Tx = Prisma.TransactionClient;
const vivo = { deletedAt: null };
const morto = () => ({ deletedAt: new Date() });

/** Prisma-backed lançamentos e outras remunerações do DP (BE-INCR-DP-F2 PR-1, itens 16 e 77). */
export class DpLancamentoRepository implements IDpLancamentoRepository {
  private db(tx?: Tx) {
    return tx ?? prisma;
  }

  // ── lançamento ──
  public async listLancamentos(vinculoId: string, competencia: string | null, tx?: Tx): Promise<DpLancamento[]> {
    return this.db(tx).dpLancamento.findMany({
      where: { vinculoId, ...(competencia ? { competencia } : {}), ...vivo },
      orderBy: [{ competencia: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
  }
  public async findLancamento(vinculoId: string, id: string, tx: Tx): Promise<DpLancamento | null> {
    return tx.dpLancamento.findFirst({ where: { id, vinculoId, ...vivo } });
  }
  public async createLancamento(vinculoId: string, informadoPorId: string, data: DpLancamentoData, tx: Tx): Promise<DpLancamento> {
    return tx.dpLancamento.create({ data: { vinculoId, informadoPorId, ...data } });
  }
  public async updateLancamento(id: string, data: Partial<DpLancamentoData>, tx: Tx): Promise<DpLancamento> {
    return tx.dpLancamento.update({ where: { id }, data });
  }
  public async deleteLancamento(id: string, tx: Tx): Promise<DpLancamento> {
    return tx.dpLancamento.update({ where: { id }, data: morto() });
  }

  // ── outra remuneração ──
  public async listOutrasRemuneracoes(vinculoId: string, tx?: Tx): Promise<DpOutraRemuneracao[]> {
    return this.db(tx).dpOutraRemuneracao.findMany({ where: { vinculoId, ...vivo }, orderBy: [{ competencia: 'asc' }, { id: 'asc' }] });
  }
  public async findOutraRemuneracao(vinculoId: string, id: string, tx: Tx): Promise<DpOutraRemuneracao | null> {
    return tx.dpOutraRemuneracao.findFirst({ where: { id, vinculoId, ...vivo } });
  }
  public async findOutraRemuneracaoPorCompetencia(vinculoId: string, competencia: string, tx: Tx): Promise<DpOutraRemuneracao | null> {
    return tx.dpOutraRemuneracao.findFirst({ where: { vinculoId, competencia, ...vivo } });
  }
  public async createOutraRemuneracao(vinculoId: string, informadoPorId: string, data: DpOutraRemuneracaoData, tx: Tx): Promise<DpOutraRemuneracao> {
    return tx.dpOutraRemuneracao.create({ data: { vinculoId, informadoPorId, ...data } });
  }
  public async updateOutraRemuneracao(id: string, data: Partial<DpOutraRemuneracaoData>, tx: Tx): Promise<DpOutraRemuneracao> {
    return tx.dpOutraRemuneracao.update({ where: { id }, data });
  }
  public async deleteOutraRemuneracao(id: string, tx: Tx): Promise<DpOutraRemuneracao> {
    return tx.dpOutraRemuneracao.update({ where: { id }, data: morto() });
  }

  public async runTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
