import type { DpCargo, DpJornada, DpLotacao, DpSindicato, DpTrabalhador, DpVinculo, DpVinculoVersao, Prisma } from 'generated/prisma';

type Tx = Prisma.TransactionClient;

export interface DpTrabalhadorData {
  cpf: string;
  nome: string;
  nascimento: string;
  pcd: boolean;
  employeeRef: string | null;
  partnerId: string | null;
}
export interface DpVinculoData {
  trabalhadorId: string;
  unitId: string;
  matricula: string;
  categoria: string;
  dataInicio: string;
  dataTermino: string | null;
}
export interface DpVersaoData {
  vigenteDesde: string;
  vigenteAte: string | null;
  lotacaoId: string;
  cargoId: string | null;
  jornadaId: string | null;
  sindicatoId: string | null;
  salarioCents: bigint;
  unidadeSalario: string;
}

export type DpVersaoResolvida = DpVinculoVersao & {
  lotacao: DpLotacao;
  cargo: DpCargo | null;
  jornada: DpJornada | null;
  sindicato: DpSindicato | null;
};
/** Item 47 — vínculo com todas as versões e os cadastros que cada uma referencia. */
export type DpVinculoCompleto = DpVinculo & { versoes: DpVersaoResolvida[] };

/**
 * Trabalhador, vínculo e versões do DP (itens 37–48). Tudo por instância (`userId` = dono); linha viva = `deletedAt: null`;
 * apagar trabalhador e vínculo é soft-delete. A versão não tem `userId` nem `deletedAt`: a posse vem do vínculo, que o
 * serviço resolve antes, e a correção é no lugar (F-DP-8 → b).
 */
export interface IDpVinculoRepository {
  listTrabalhadores(ownerUserId: string, limit: number): Promise<DpTrabalhador[]>;
  findTrabalhador(ownerUserId: string, id: string, tx?: Tx): Promise<DpTrabalhador | null>;
  findTrabalhadorPorCpf(ownerUserId: string, cpf: string, tx: Tx): Promise<DpTrabalhador | null>;
  createTrabalhador(ownerUserId: string, createdById: string, data: DpTrabalhadorData, tx: Tx): Promise<DpTrabalhador>;
  updateTrabalhador(id: string, data: Partial<DpTrabalhadorData>, tx: Tx): Promise<DpTrabalhador>;
  deleteTrabalhador(id: string, tx: Tx): Promise<DpTrabalhador>;
  /** Item 48 — vínculos vivos do trabalhador. */
  countVinculosVivos(trabalhadorId: string, tx: Tx): Promise<number>;

  listVinculos(ownerUserId: string, limit: number): Promise<DpVinculo[]>;
  findVinculo(ownerUserId: string, id: string, tx?: Tx): Promise<DpVinculo | null>;
  findVinculoCompleto(ownerUserId: string, id: string, tx?: Tx): Promise<DpVinculoCompleto | null>;
  findVinculoPorMatricula(ownerUserId: string, matricula: string, tx: Tx): Promise<DpVinculo | null>;
  createVinculo(ownerUserId: string, data: DpVinculoData, tx: Tx): Promise<DpVinculo>;
  deleteVinculo(id: string, tx: Tx): Promise<DpVinculo>;

  listVersoes(vinculoId: string, tx?: Tx): Promise<DpVinculoVersao[]>;
  findVersao(vinculoId: string, id: string, tx: Tx): Promise<DpVinculoVersao | null>;
  createVersao(vinculoId: string, data: DpVersaoData, tx: Tx): Promise<DpVinculoVersao>;
  updateVersao(id: string, data: Partial<DpVersaoData>, tx: Tx): Promise<DpVinculoVersao>;

  runTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T>;
}
