import type { Prisma, SimplesCreditoIncobravel } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';

export interface SimplesCreditoIncobravelData {
  saleId: string;
  valorCents: bigint;
  meioCobranca: string;
  data: string;
  evidencia: string;
}

/** BE-INCR-SIMPLES-CAIXA PR-3 (item 20) — único lugar com `prisma.simplesCreditoIncobravel`. Soft-delete. */
export interface ISimplesCreditoIncobravelRepository {
  create(scope: AccountingScope, data: SimplesCreditoIncobravelData, tx: Prisma.TransactionClient): Promise<SimplesCreditoIncobravel>;
  findById(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<SimplesCreditoIncobravel | null>;
  softDelete(scope: AccountingScope, id: string, tx: Prisma.TransactionClient): Promise<void>;
  /** Σ dos incobráveis ativos (não removidos) por venda. */
  somaAtivaPorVenda(scope: AccountingScope, saleIds: readonly string[], tx?: Prisma.TransactionClient): Promise<Map<string, bigint>>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
