import type { DpCargo, DpConvencaoColetiva, DpConvencaoParametro, DpJornada, DpLotacao, DpSindicato, Prisma } from 'generated/prisma';

type Tx = Prisma.TransactionClient;

export interface DpLotacaoData { unitId: string; codigo: string; descricao: string }
export interface DpCargoData { nome: string; cbo: string }
/** BE-INCR-DP-F2 item 68: + a escala (`diasTrabalho` na forma canônica SEG..DOM; `minutosPorDia`). */
export interface DpJornadaData { nome: string; minutosSemanais: number; tipoJornada: string; descricao: string | null; diasTrabalho: string; minutosPorDia: number | null }
export interface DpSindicatoData { cnpj: string; nome: string }
export interface DpConvencaoData { sindicatoId: string; identificacao: string; vigenteDesde: string; vigenteAte: string | null; fonte: string }
export interface DpConvencaoParametroData {
  chave: string;
  discriminador: string | null;
  valorInt: bigint;
  clausula: string;
  vigenteDesde: string;
  vigenteAte: string | null;
}

/**
 * Cadastros de estrutura do DP (itens 28–33). Tudo por instância (`userId` = dono); linha viva = `deletedAt: null`;
 * apagar é soft-delete. O parâmetro não tem `userId`: a posse vem da convenção, que o serviço resolve antes.
 */
export interface IDpCadastroRepository {
  listLotacoes(ownerUserId: string, limit: number): Promise<DpLotacao[]>;
  findLotacao(ownerUserId: string, id: string, tx?: Tx): Promise<DpLotacao | null>;
  findLotacaoPorCodigo(ownerUserId: string, codigo: string, tx: Tx): Promise<DpLotacao | null>;
  createLotacao(ownerUserId: string, data: DpLotacaoData, tx: Tx): Promise<DpLotacao>;
  updateLotacao(id: string, data: Partial<DpLotacaoData>, tx: Tx): Promise<DpLotacao>;
  deleteLotacao(id: string, tx: Tx): Promise<DpLotacao>;

  listCargos(ownerUserId: string, limit: number): Promise<DpCargo[]>;
  findCargo(ownerUserId: string, id: string, tx?: Tx): Promise<DpCargo | null>;
  createCargo(ownerUserId: string, data: DpCargoData, tx: Tx): Promise<DpCargo>;
  updateCargo(id: string, data: Partial<DpCargoData>, tx: Tx): Promise<DpCargo>;
  deleteCargo(id: string, tx: Tx): Promise<DpCargo>;

  listJornadas(ownerUserId: string, limit: number): Promise<DpJornada[]>;
  findJornada(ownerUserId: string, id: string, tx?: Tx): Promise<DpJornada | null>;
  createJornada(ownerUserId: string, data: DpJornadaData, tx: Tx): Promise<DpJornada>;
  updateJornada(id: string, data: Partial<DpJornadaData>, tx: Tx): Promise<DpJornada>;
  deleteJornada(id: string, tx: Tx): Promise<DpJornada>;
  /** Item 30 (D-5) — alguma versão de vínculo (vivo ou apagado: a versão não se apaga) referencia a jornada (trava `minutosSemanais`/`tipoJornada`). */
  jornadaEmUso(jornadaId: string, tx: Tx): Promise<boolean>;

  listSindicatos(ownerUserId: string, limit: number): Promise<DpSindicato[]>;
  findSindicato(ownerUserId: string, id: string, tx?: Tx): Promise<DpSindicato | null>;
  findSindicatoPorCnpj(ownerUserId: string, cnpj: string, tx: Tx): Promise<DpSindicato | null>;
  createSindicato(ownerUserId: string, data: DpSindicatoData, tx: Tx): Promise<DpSindicato>;
  updateSindicato(id: string, data: Partial<DpSindicatoData>, tx: Tx): Promise<DpSindicato>;
  deleteSindicato(id: string, tx: Tx): Promise<DpSindicato>;

  listConvencoes(ownerUserId: string, limit: number): Promise<DpConvencaoColetiva[]>;
  findConvencao(ownerUserId: string, id: string, tx?: Tx): Promise<DpConvencaoColetiva | null>;
  createConvencao(ownerUserId: string, data: DpConvencaoData, tx: Tx): Promise<DpConvencaoColetiva>;
  updateConvencao(id: string, data: Partial<Omit<DpConvencaoData, 'sindicatoId'>>, tx: Tx): Promise<DpConvencaoColetiva>;
  deleteConvencao(id: string, tx: Tx): Promise<DpConvencaoColetiva>;

  listParametros(convencaoId: string, tx?: Tx): Promise<DpConvencaoParametro[]>;
  findParametro(convencaoId: string, id: string, tx?: Tx): Promise<DpConvencaoParametro | null>;
  createParametro(convencaoId: string, data: DpConvencaoParametroData, tx: Tx): Promise<DpConvencaoParametro>;
  updateParametro(id: string, data: Partial<Omit<DpConvencaoParametroData, 'chave' | 'discriminador'>>, tx: Tx): Promise<DpConvencaoParametro>;
  deleteParametro(id: string, tx: Tx): Promise<DpConvencaoParametro>;

  runTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T>;
}
