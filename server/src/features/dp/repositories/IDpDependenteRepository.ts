import type { DpDependente, Prisma } from 'generated/prisma';

type Tx = Prisma.TransactionClient;

export interface DpDependenteData {
  nome: string;
  cpf: string | null;
  nascimento: string;
  tipo: string;
  deduzIrrf: boolean;
  salarioFamilia: boolean;
  invalido: boolean;
  vigenteDesde: string;
  vigenteAte: string | null;
}

/**
 * Dependentes do trabalhador (BE-INCR-DP-F2 item 13). Sem `userId`: a posse vem do trabalhador, que o serviço resolve
 * antes pelo `IDpVinculoRepository.findTrabalhador` (Tier-0). Linha viva = `deletedAt: null`; apagar é soft-delete.
 */
export interface IDpDependenteRepository {
  list(trabalhadorId: string, tx?: Tx): Promise<DpDependente[]>;
  find(trabalhadorId: string, id: string, tx: Tx): Promise<DpDependente | null>;
  create(trabalhadorId: string, data: DpDependenteData, tx: Tx): Promise<DpDependente>;
  update(id: string, data: Partial<DpDependenteData>, tx: Tx): Promise<DpDependente>;
  delete(id: string, tx: Tx): Promise<DpDependente>;
  runTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T>;
}
