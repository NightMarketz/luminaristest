import { ForbiddenError, NotFoundError, ValidationError } from '../../../lib/errors';
import type { ProductDestinationDefault } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IProductDestinationDefaultRepository } from '../repositories/IProductDestinationDefaultRepository';
import type { IProductRefLookup } from './ProductRefLookup';
import type { AuditService } from './AuditService';
import { ProductDestinationViewSchema, type ProductDestinationView, type UpsertProductDestinationInput } from '../dtos/ProductDestinationDto';

export const PRODUCT_DESTINATION_SET = 'product_destination.set';
export const PRODUCT_DESTINATION_CLEARED = 'product_destination.cleared';

/**
 * ITEM-DESTINATION PR-2 (BRIEF item 17, F-ID-2 a) — destinação PADRÃO por produto, parâmetro fiscal com efeito em
 * crédito: escrita sob `canManageFiscalProfile`, leitura sob `canReadFiscalProfile` (precedente
 * ServiceFiscalProfileService). O default só muda por aqui, nunca pelo import (F-ID-9 a). Eventos de auditoria
 * DENTRO da tx da escrita.
 */
export class ProductDestinationService {
  constructor(
    private readonly repo: IProductDestinationDefaultRepository,
    private readonly productRefLookup: IProductRefLookup,
    private readonly policy: IAccountingPolicy,
    private readonly auditService: AuditService,
  ) {}

  async list(scope: AccountingScope): Promise<ProductDestinationView[]> {
    if (!this.policy.canReadFiscalProfile(scope)) throw new ForbiddenError('Você não tem permissão para ler a destinação padrão dos produtos.');
    const rows = await this.repo.list(scope);
    return rows.map(toView);
  }

  async upsert(scope: AccountingScope, input: UpsertProductDestinationInput): Promise<ProductDestinationView> {
    if (!this.policy.canManageFiscalProfile(scope)) throw new ForbiddenError('Você não tem permissão para alterar a destinação padrão dos produtos.');
    // Reuso da porta do LAC-E: o produto tem de existir na tabela `products` DESTE dono (cross-tenant → 400).
    if (!(await this.productRefLookup.productExists(scope, input.productRef))) {
      throw new ValidationError(`Produto '${input.productRef}' não encontrado no catálogo desta conta.`);
    }
    return this.repo.runTransaction(async (tx) => {
      const row = await this.repo.upsert(scope, input.productRef, input.destination, tx);
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: PRODUCT_DESTINATION_SET,
        targetType: 'product_destination_default',
        targetId: row.id,
        payload: { productRef: row.productRef, destination: row.destination },
      });
      return toView(row);
    });
  }

  async delete(scope: AccountingScope, productRef: string): Promise<void> {
    if (!this.policy.canManageFiscalProfile(scope)) throw new ForbiddenError('Você não tem permissão para alterar a destinação padrão dos produtos.');
    await this.repo.runTransaction(async (tx) => {
      const row = await this.repo.findByProductRef(scope, productRef, tx);
      if (!row) throw new NotFoundError(`Destinação padrão do produto '${productRef}' não cadastrada.`);
      await this.repo.softDelete(scope, productRef, tx);
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: PRODUCT_DESTINATION_CLEARED,
        targetType: 'product_destination_default',
        targetId: row.id,
        payload: { productRef, destination: row.destination },
      });
    });
  }
}

function toView(row: ProductDestinationDefault): ProductDestinationView {
  // A coluna é String no SQLite — o parse do schema de saída falha alto em valor fora do enum.
  return ProductDestinationViewSchema.parse({ productRef: row.productRef, destination: row.destination, updatedAt: row.updatedAt.toISOString() });
}
