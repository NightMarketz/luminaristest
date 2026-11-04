import type { DpModuloAtivacao, Prisma } from 'generated/prisma';

export interface DpModuloAtivacaoCreate {
  moduleKey: string;
  competenciaInicio: string;
  motivo: string;
}

/** `dp_modulo_ativacoes` (item 12): por instância (`userId`), linha viva = `deletedAt: null`. */
export interface IDpModuloAtivacaoRepository {
  list(ownerUserId: string, tx?: Prisma.TransactionClient): Promise<DpModuloAtivacao[]>;
  findById(ownerUserId: string, id: string, tx?: Prisma.TransactionClient): Promise<DpModuloAtivacao | null>;
  create(ownerUserId: string, actorUserId: string, data: DpModuloAtivacaoCreate, tx?: Prisma.TransactionClient): Promise<DpModuloAtivacao>;
  end(id: string, actorUserId: string, competenciaFim: string, motivoFim: string, tx?: Prisma.TransactionClient): Promise<DpModuloAtivacao>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
