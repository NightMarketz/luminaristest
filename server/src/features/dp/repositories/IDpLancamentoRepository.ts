import type { DpLancamento, DpOutraRemuneracao, Prisma } from 'generated/prisma';

type Tx = Prisma.TransactionClient;

export interface DpLancamentoData {
  competencia: string;
  rubrica: string;
  quantidadeMin: number | null;
  valorCents: bigint | null;
  origem: string;
  moduloKey: string | null;
  observacao: string | null;
}
export interface DpOutraRemuneracaoData {
  competencia: string;
  remuneracaoCents: bigint;
  contribuicaoCents: bigint;
  ordem: string;
  categoriaOutraFonte: string;
  cnpjOutroEmpregador: string;
  documento: string;
}

/**
 * Lançamentos informados e remunerações em outra empresa do vínculo (BE-INCR-DP-F2 itens 16 e 77). Sem `userId`: a
 * posse vem do vínculo, que o serviço resolve antes pelo `IDpVinculoRepository.findVinculo` (Tier-0). Linha viva =
 * `deletedAt: null`; apagar é soft-delete.
 */
export interface IDpLancamentoRepository {
  listLancamentos(vinculoId: string, competencia: string | null, tx?: Tx): Promise<DpLancamento[]>;
  findLancamento(vinculoId: string, id: string, tx: Tx): Promise<DpLancamento | null>;
  createLancamento(vinculoId: string, informadoPorId: string, data: DpLancamentoData, tx: Tx): Promise<DpLancamento>;
  updateLancamento(id: string, data: Partial<DpLancamentoData>, tx: Tx): Promise<DpLancamento>;
  deleteLancamento(id: string, tx: Tx): Promise<DpLancamento>;

  listOutrasRemuneracoes(vinculoId: string, tx?: Tx): Promise<DpOutraRemuneracao[]>;
  findOutraRemuneracao(vinculoId: string, id: string, tx: Tx): Promise<DpOutraRemuneracao | null>;
  findOutraRemuneracaoPorCompetencia(vinculoId: string, competencia: string, tx: Tx): Promise<DpOutraRemuneracao | null>;
  createOutraRemuneracao(vinculoId: string, informadoPorId: string, data: DpOutraRemuneracaoData, tx: Tx): Promise<DpOutraRemuneracao>;
  updateOutraRemuneracao(id: string, data: Partial<DpOutraRemuneracaoData>, tx: Tx): Promise<DpOutraRemuneracao>;
  deleteOutraRemuneracao(id: string, tx: Tx): Promise<DpOutraRemuneracao>;

  runTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T>;
}
