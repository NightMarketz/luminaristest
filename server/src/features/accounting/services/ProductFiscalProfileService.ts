import { ForbiddenError, NotFoundError } from '../../../lib/errors';
import type { ProductFiscalProfile } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IProductFiscalProfileRepository } from '../repositories/IProductFiscalProfileRepository';
import type { AuditService } from './AuditService';
import type { UpsertProductFiscalProfileInput } from '../dtos/ProductFiscalProfileDto';

export const PRODUCT_FISCAL_PROFILE_UPDATED = 'product_fiscal_profile.updated';
export const PRODUCT_FISCAL_PROFILE_DELETED = 'product_fiscal_profile.deleted';

export interface ProductFiscalProfileView {
  productRef: string;
  ncm: string;
  cest: string | null;
  origem: number;
  cfopPadrao: string;
  csosn: string | null;
  cstIcms: string | null;
  uCom: string;
  cEan: string;
  cstPis: string;
  cstCofins: string;
  ibsCbsCst: string | null;
  ibsCbsClassTrib: string | null;
  /** null => a emissão usa `products.name` (I04). */
  xProd: string | null;
  updatedAt: string;
}

/**
 * BE-INCR-NFCE (nó X10a, item 10; F-NFCE-3 b) — perfil fiscal DO PRODUTO: NCM, origem, CFOP, CSOSN/CST, unidade, GTIN e
 * CST de PIS/COFINS/IBS-CBS por `productRef` (linha `products`). Um perfil por produto para todas as unidades do dono;
 * `upsert` idempotente; `delete` = soft com rename-on-delete. Não lê o preset `products` — a existência da linha é do
 * chamador/FE (regra 3: nó vizinho); a emissão cruza os dois (item 11).
 */
export class ProductFiscalProfileService {
  constructor(
    private readonly repo: IProductFiscalProfileRepository,
    private readonly policy: IAccountingPolicy,
    private readonly auditService: AuditService,
  ) {}

  async list(scope: AccountingScope): Promise<ProductFiscalProfileView[]> {
    if (!this.policy.canReadFiscalProfile(scope)) throw new ForbiddenError('Você não tem permissão para ler o perfil fiscal de produtos.');
    return (await this.repo.listByOwner(scope)).map((r) => this.toView(r));
  }

  async get(scope: AccountingScope, productRef: string): Promise<ProductFiscalProfileView> {
    if (!this.policy.canReadFiscalProfile(scope)) throw new ForbiddenError('Você não tem permissão para ler o perfil fiscal de produtos.');
    const row = await this.repo.findByProductRef(scope, productRef);
    if (!row) throw new NotFoundError(`Perfil fiscal do produto '${productRef}' não cadastrado.`);
    return this.toView(row);
  }

  async upsert(scope: AccountingScope, productRef: string, input: UpsertProductFiscalProfileInput): Promise<ProductFiscalProfileView> {
    if (!this.policy.canManageProductFiscalProfile(scope)) throw new ForbiddenError('Você não tem permissão para alterar o perfil fiscal de produtos.');
    const { unitId: _unitId, ...data } = input;
    return this.repo.runTransaction(async (tx) => {
      const row = await this.repo.upsert(scope, productRef, data, tx);
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: PRODUCT_FISCAL_PROFILE_UPDATED,
        targetType: 'product_fiscal_profile',
        targetId: row.id,
        // códigos apenas (BRIEF item 26: sem PII nem texto livre — xProd fica fora)
        payload: {
          productRef: row.productRef,
          ncm: row.ncm,
          cest: row.cest ?? '',
          origem: String(row.origem),
          cfopPadrao: row.cfopPadrao,
          csosn: row.csosn ?? '',
          cstIcms: row.cstIcms ?? '',
          cstPis: row.cstPis,
          cstCofins: row.cstCofins,
          ibsCbsCst: row.ibsCbsCst ?? '',
          ibsCbsClassTrib: row.ibsCbsClassTrib ?? '',
        },
      });
      return this.toView(row);
    });
  }

  async delete(scope: AccountingScope, productRef: string): Promise<void> {
    if (!this.policy.canManageProductFiscalProfile(scope)) throw new ForbiddenError('Você não tem permissão para alterar o perfil fiscal de produtos.');
    const row = await this.repo.findByProductRef(scope, productRef);
    if (!row) throw new NotFoundError(`Perfil fiscal do produto '${productRef}' não cadastrado.`);
    await this.repo.runTransaction(async (tx) => {
      await this.repo.softDelete(scope, productRef, tx);
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: PRODUCT_FISCAL_PROFILE_DELETED,
        targetType: 'product_fiscal_profile',
        targetId: row.id,
        payload: { productRef, ncm: row.ncm },
      });
    });
  }

  private toView(row: ProductFiscalProfile): ProductFiscalProfileView {
    return {
      productRef: row.productRef,
      ncm: row.ncm,
      cest: row.cest,
      origem: row.origem,
      cfopPadrao: row.cfopPadrao,
      csosn: row.csosn,
      cstIcms: row.cstIcms,
      uCom: row.uCom,
      cEan: row.cEan,
      cstPis: row.cstPis,
      cstCofins: row.cstCofins,
      ibsCbsCst: row.ibsCbsCst,
      ibsCbsClassTrib: row.ibsCbsClassTrib,
      xProd: row.xProd,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
