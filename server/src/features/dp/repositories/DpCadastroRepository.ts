import prisma from '../../../lib/prisma';
import type { DpCargo, DpConvencaoColetiva, DpConvencaoParametro, DpJornada, DpLotacao, DpSindicato, Prisma } from 'generated/prisma';
import type {
  DpCargoData,
  DpConvencaoData,
  DpConvencaoParametroData,
  DpJornadaData,
  DpLotacaoData,
  DpSindicatoData,
  IDpCadastroRepository,
} from './IDpCadastroRepository';

type Tx = Prisma.TransactionClient;
const vivo = { deletedAt: null };
const morto = () => ({ deletedAt: new Date() });

/** Prisma-backed cadastros de estrutura do DP (BE-INCR-DP-F0-F1 PR-3, itens 28–33). Soft-delete. */
export class DpCadastroRepository implements IDpCadastroRepository {
  private db(tx?: Tx) {
    return tx ?? prisma;
  }

  // ── lotação ──
  public async listLotacoes(ownerUserId: string, limit: number): Promise<DpLotacao[]> {
    return prisma.dpLotacao.findMany({ where: { userId: ownerUserId, ...vivo }, orderBy: { codigo: 'asc' }, take: limit });
  }
  public async findLotacao(ownerUserId: string, id: string, tx?: Tx): Promise<DpLotacao | null> {
    return this.db(tx).dpLotacao.findFirst({ where: { id, userId: ownerUserId, ...vivo } });
  }
  public async findLotacaoPorCodigo(ownerUserId: string, codigo: string, tx: Tx): Promise<DpLotacao | null> {
    return tx.dpLotacao.findFirst({ where: { userId: ownerUserId, codigo, ...vivo } });
  }
  public async createLotacao(ownerUserId: string, data: DpLotacaoData, tx: Tx): Promise<DpLotacao> {
    return tx.dpLotacao.create({ data: { userId: ownerUserId, ...data } });
  }
  public async updateLotacao(id: string, data: Partial<DpLotacaoData>, tx: Tx): Promise<DpLotacao> {
    return tx.dpLotacao.update({ where: { id }, data });
  }
  public async deleteLotacao(id: string, tx: Tx): Promise<DpLotacao> {
    return tx.dpLotacao.update({ where: { id }, data: morto() });
  }

  // ── cargo ──
  public async listCargos(ownerUserId: string, limit: number): Promise<DpCargo[]> {
    return prisma.dpCargo.findMany({ where: { userId: ownerUserId, ...vivo }, orderBy: { nome: 'asc' }, take: limit });
  }
  public async findCargo(ownerUserId: string, id: string, tx?: Tx): Promise<DpCargo | null> {
    return this.db(tx).dpCargo.findFirst({ where: { id, userId: ownerUserId, ...vivo } });
  }
  public async createCargo(ownerUserId: string, data: DpCargoData, tx: Tx): Promise<DpCargo> {
    return tx.dpCargo.create({ data: { userId: ownerUserId, ...data } });
  }
  public async updateCargo(id: string, data: Partial<DpCargoData>, tx: Tx): Promise<DpCargo> {
    return tx.dpCargo.update({ where: { id }, data });
  }
  public async deleteCargo(id: string, tx: Tx): Promise<DpCargo> {
    return tx.dpCargo.update({ where: { id }, data: morto() });
  }

  // ── jornada ──
  public async listJornadas(ownerUserId: string, limit: number): Promise<DpJornada[]> {
    return prisma.dpJornada.findMany({ where: { userId: ownerUserId, ...vivo }, orderBy: { nome: 'asc' }, take: limit });
  }
  public async findJornada(ownerUserId: string, id: string, tx?: Tx): Promise<DpJornada | null> {
    return this.db(tx).dpJornada.findFirst({ where: { id, userId: ownerUserId, ...vivo } });
  }
  public async createJornada(ownerUserId: string, data: DpJornadaData, tx: Tx): Promise<DpJornada> {
    return tx.dpJornada.create({ data: { userId: ownerUserId, ...data } });
  }
  public async updateJornada(id: string, data: Partial<DpJornadaData>, tx: Tx): Promise<DpJornada> {
    return tx.dpJornada.update({ where: { id }, data });
  }
  public async deleteJornada(id: string, tx: Tx): Promise<DpJornada> {
    return tx.dpJornada.update({ where: { id }, data: morto() });
  }

  // ── sindicato ──
  public async listSindicatos(ownerUserId: string, limit: number): Promise<DpSindicato[]> {
    return prisma.dpSindicato.findMany({ where: { userId: ownerUserId, ...vivo }, orderBy: { nome: 'asc' }, take: limit });
  }
  public async findSindicato(ownerUserId: string, id: string, tx?: Tx): Promise<DpSindicato | null> {
    return this.db(tx).dpSindicato.findFirst({ where: { id, userId: ownerUserId, ...vivo } });
  }
  public async findSindicatoPorCnpj(ownerUserId: string, cnpj: string, tx: Tx): Promise<DpSindicato | null> {
    return tx.dpSindicato.findFirst({ where: { userId: ownerUserId, cnpj, ...vivo } });
  }
  public async createSindicato(ownerUserId: string, data: DpSindicatoData, tx: Tx): Promise<DpSindicato> {
    return tx.dpSindicato.create({ data: { userId: ownerUserId, ...data } });
  }
  public async updateSindicato(id: string, data: Partial<DpSindicatoData>, tx: Tx): Promise<DpSindicato> {
    return tx.dpSindicato.update({ where: { id }, data });
  }
  public async deleteSindicato(id: string, tx: Tx): Promise<DpSindicato> {
    return tx.dpSindicato.update({ where: { id }, data: morto() });
  }

  // ── convenção ──
  public async listConvencoes(ownerUserId: string, limit: number): Promise<DpConvencaoColetiva[]> {
    return prisma.dpConvencaoColetiva.findMany({
      where: { userId: ownerUserId, ...vivo },
      orderBy: [{ vigenteDesde: 'desc' }, { id: 'asc' }],
      take: limit,
    });
  }
  public async findConvencao(ownerUserId: string, id: string, tx?: Tx): Promise<DpConvencaoColetiva | null> {
    return this.db(tx).dpConvencaoColetiva.findFirst({ where: { id, userId: ownerUserId, ...vivo } });
  }
  public async createConvencao(ownerUserId: string, data: DpConvencaoData, tx: Tx): Promise<DpConvencaoColetiva> {
    return tx.dpConvencaoColetiva.create({ data: { userId: ownerUserId, ...data } });
  }
  public async updateConvencao(id: string, data: Partial<Omit<DpConvencaoData, 'sindicatoId'>>, tx: Tx): Promise<DpConvencaoColetiva> {
    return tx.dpConvencaoColetiva.update({ where: { id }, data });
  }
  public async deleteConvencao(id: string, tx: Tx): Promise<DpConvencaoColetiva> {
    return tx.dpConvencaoColetiva.update({ where: { id }, data: morto() });
  }

  // ── parâmetro da convenção ──
  public async listParametros(convencaoId: string, tx?: Tx): Promise<DpConvencaoParametro[]> {
    return this.db(tx).dpConvencaoParametro.findMany({
      where: { convencaoId, ...vivo },
      orderBy: [{ chave: 'asc' }, { discriminador: 'asc' }, { vigenteDesde: 'asc' }],
    });
  }
  public async findParametro(convencaoId: string, id: string, tx?: Tx): Promise<DpConvencaoParametro | null> {
    return this.db(tx).dpConvencaoParametro.findFirst({ where: { id, convencaoId, ...vivo } });
  }
  public async createParametro(convencaoId: string, data: DpConvencaoParametroData, tx: Tx): Promise<DpConvencaoParametro> {
    return tx.dpConvencaoParametro.create({ data: { convencaoId, ...data } });
  }
  public async updateParametro(
    id: string,
    data: Partial<Omit<DpConvencaoParametroData, 'chave' | 'discriminador'>>,
    tx: Tx,
  ): Promise<DpConvencaoParametro> {
    return tx.dpConvencaoParametro.update({ where: { id }, data });
  }
  public async deleteParametro(id: string, tx: Tx): Promise<DpConvencaoParametro> {
    return tx.dpConvencaoParametro.update({ where: { id }, data: morto() });
  }

  public async runTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
