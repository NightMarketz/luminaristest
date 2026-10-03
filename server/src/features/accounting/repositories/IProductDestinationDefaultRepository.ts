import type { Prisma, ProductDestinationDefault } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import type { ProductDestinationDefaultValue } from '../models/itemDestination';

/**
 * ITEM-DESTINATION PR-2 (BRIEF item 16, F-ID-2 a) — único lugar com `prisma.productDestinationDefault.*`. `tx?` em
 * todos. Soft-delete por `deletedAt`; o `upsert` REVIVE a linha apagada (zera `deletedAt`) — com o `@@unique`, uma
 * 2ª linha daria P2002 (memória unique-de-idempotencia-x-soft-delete).
 */
export interface IProductDestinationDefaultRepository {
  /** Uma query por unidade + `productRef`s (item 9) — só linhas vivas. */
  findManyByProductRefs(scope: AccountingScope, productRefs: string[], tx?: Prisma.TransactionClient): Promise<ProductDestinationDefault[]>;
  findByProductRef(scope: AccountingScope, productRef: string, tx?: Prisma.TransactionClient): Promise<ProductDestinationDefault | null>;
  list(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<ProductDestinationDefault[]>;
  upsert(scope: AccountingScope, productRef: string, destination: ProductDestinationDefaultValue, tx?: Prisma.TransactionClient): Promise<ProductDestinationDefault>;
  /** Retorna quantas linhas vivas apagou (0 ou 1). */
  softDelete(scope: AccountingScope, productRef: string, tx?: Prisma.TransactionClient): Promise<number>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
