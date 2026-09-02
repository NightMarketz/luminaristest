import type { IDynamicTableRepository } from '../../dynamicTables/repositories/IDynamicTableRepository';
import type { AccountingScope } from '../scope/AccountingScope';

/**
 * Port fino de existência de produto no catálogo operacional (DynamicTable `products`) do tenant.
 * BE-INCR-INVENTORY-TIEOUT (LAC-E, F-E2 ratificado): `inventoryProductRef` é string livre no DTO
 * (validação de existência é assíncrona, então mora no serviço) — um typo criaria uma camada de
 * custo órfã que o CMV da venda nunca encontraria. O port pertence ao mundo accounting e LÊ o
 * mundo DynamicTable (direção permitida pelo Contrato §2.1 — o proibido é o inverso: serviço
 * Prisma dentro do motor).
 */
export interface IProductRefLookup {
  /** true ⟺ a linha `productRef` existe (viva) na tabela `products` do dono do escopo. */
  productExists(scope: AccountingScope, productRef: string): Promise<boolean>;
}

/** Implementação sobre o repositório de DynamicTables (injetada pela Factory). */
export class DynamicTableProductRefLookup implements IProductRefLookup {
  constructor(private readonly repo: IDynamicTableRepository) {}

  async productExists(scope: AccountingScope, productRef: string): Promise<boolean> {
    const table = await this.repo.findTableByInternalName(scope.ownerUserId, 'products');
    if (!table) return false;
    // Guarda cross-tenant (espelho de RegisterPaymentService): a linha precisa pertencer à
    // tabela `products` DESTE dono — findDataById é global por id.
    const row = await this.repo.findDataById(productRef);
    return row != null && row.dynamicTableId === table.id;
  }
}
