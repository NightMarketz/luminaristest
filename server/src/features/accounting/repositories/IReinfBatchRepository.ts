import type { Prisma, ReinfBatch } from 'generated/prisma';
import type { ReinfBatchEvento } from '../dtos/ReinfDto';

/** Dados para gravar um lote da EFD-Reinf gerado (BE-INCR-EFD-REINF PR-1, item 10). Sem XML nem CPF/CNPJ (D8). */
export interface CreateReinfBatchData {
  userId: string;
  competencia: string;
  tpAmb: number;
  eventos: ReinfBatchEvento[];
  sha256: string;
  geradoPorId: string;
}

/**
 * Contrato do repositório de `reinf_batches` (nó EFD-REINF, item 10; §5.2). Único lugar com `prisma.reinfBatch.*`. A chave é
 * a PJ (`ownerUserId`, R8). Imutável por construção: só `create` (o CAS de status é do PR-4). Sem `delete`: registro de
 * entrega (molde `MitExport`).
 */
export interface IReinfBatchRepository {
  create(data: CreateReinfBatchData, tx?: Prisma.TransactionClient): Promise<ReinfBatch>;
  /** Lotes da competência, mais recentes primeiro. */
  findByCompetencia(ownerUserId: string, competencia: string, tx?: Prisma.TransactionClient): Promise<ReinfBatch[]>;
  /** Todos os lotes da PJ, mais recentes primeiro (R-1000: inclusão × alteração — lacuna D). */
  findByOwner(ownerUserId: string, tx?: Prisma.TransactionClient): Promise<ReinfBatch[]>;
  findById(ownerUserId: string, id: string): Promise<ReinfBatch | null>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
