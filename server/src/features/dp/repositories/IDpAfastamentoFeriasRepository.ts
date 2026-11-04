import type { DpAfastamento, DpFeriasImplantacao, Prisma } from 'generated/prisma';

type Tx = Prisma.TransactionClient;

export interface DpAfastamentoData {
  motivo: string;
  inicio: string;
  fim: string | null;
  observacao: string | null;
}
export interface DpFeriasImplantacaoData {
  aquisitivoInicio: string;
  diasGozados: number;
  fonte: string;
}

/**
 * Afastamento e implantação de férias do vínculo (itens 56 e 58). Sem `userId`: a posse vem do vínculo, que o serviço
 * resolve antes pelo `IDpVinculoRepository.findVinculo` (Tier-0). Linha viva = `deletedAt: null`; apagar é soft-delete.
 */
export interface IDpAfastamentoFeriasRepository {
  listAfastamentos(vinculoId: string, tx?: Tx): Promise<DpAfastamento[]>;
  findAfastamento(vinculoId: string, id: string, tx: Tx): Promise<DpAfastamento | null>;
  createAfastamento(vinculoId: string, data: DpAfastamentoData, tx: Tx): Promise<DpAfastamento>;
  updateAfastamento(id: string, data: Partial<DpAfastamentoData>, tx: Tx): Promise<DpAfastamento>;
  deleteAfastamento(id: string, tx: Tx): Promise<DpAfastamento>;

  listImplantacoes(vinculoId: string, tx?: Tx): Promise<DpFeriasImplantacao[]>;
  findImplantacao(vinculoId: string, id: string, tx: Tx): Promise<DpFeriasImplantacao | null>;
  findImplantacaoPorAquisitivo(vinculoId: string, aquisitivoInicio: string, tx: Tx): Promise<DpFeriasImplantacao | null>;
  createImplantacao(vinculoId: string, informadoPorId: string, data: DpFeriasImplantacaoData, tx: Tx): Promise<DpFeriasImplantacao>;
  updateImplantacao(id: string, data: Partial<Omit<DpFeriasImplantacaoData, 'aquisitivoInicio'>>, tx: Tx): Promise<DpFeriasImplantacao>;
  deleteImplantacao(id: string, tx: Tx): Promise<DpFeriasImplantacao>;

  runTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T>;
}
