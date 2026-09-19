import type { FixedAssetClass, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';

export interface CreateFixedAssetClassData {
  userId: string;
  unitId: string;
  code: string;
  name: string;
  depreciable: boolean;
  costAccountId: string;
  accumulatedDepreciationAccountId: string | null;
}

export interface UpdateFixedAssetClassData {
  code?: string;
  name?: string;
  depreciable?: boolean;
  costAccountId?: string;
  accumulatedDepreciationAccountId?: string | null;
}

/**
 * Repositório de `FixedAssetClass` (BE-INCR-FIXED-ASSETS, nó C8, item 1). Único lugar com
 * `prisma.fixedAssetClass.*`. Soft-delete bloqueado com ativo vivo é regra do SERVIÇO (precisa
 * consultar `IFixedAssetRepository`) — este contrato só sabe escrever a própria linha.
 */
export interface IFixedAssetClassRepository {
  create(data: CreateFixedAssetClassData, tx?: Prisma.TransactionClient): Promise<FixedAssetClass>;

  /** Point lookup escopado — `null` quando o id não é deste escopo (cross-tenant → null, D11). */
  findById(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<FixedAssetClass | null>;

  /** Catálogo vivo do escopo (nunca soft-deleted), ordenado por code. */
  findManyByUnit(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<FixedAssetClass[]>;

  update(
    scope: AccountingScope,
    id: string,
    data: UpdateFixedAssetClassData,
    tx?: Prisma.TransactionClient,
  ): Promise<FixedAssetClass>;

  /** Soft-delete (`deletedAt`) — o serviço já garantiu que não há ativo vivo na classe. */
  softDelete(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<FixedAssetClass>;

  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
