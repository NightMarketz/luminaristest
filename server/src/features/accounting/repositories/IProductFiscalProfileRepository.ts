import type { Prisma, ProductFiscalProfile } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';

export interface ProductFiscalProfileData {
  ncm: string;
  cest?: string | null;
  origem: number;
  cfopPadrao: string;
  csosn?: string | null;
  cstIcms?: string | null;
  uCom: string;
  cEan: string;
  cstPis: string;
  cstCofins: string;
  ibsCbsCst?: string | null;
  ibsCbsClassTrib?: string | null;
  xProd?: string | null;
}

/**
 * BE-INCR-NFCE (nó X10a, item 10) — único lugar com `prisma.productFiscalProfile.*`. `tx?` em todos. O perfil é do DONO
 * (F-NFCE-3 b: sem unitId) — o filtro é `scope.ownerUserId`, e duas unidades do mesmo dono leem a mesma linha. Soft-delete
 * com rename-on-delete do `productRef` (`deleted:<id>:<ref>`), como o ServiceFiscalProfile.
 */
export interface IProductFiscalProfileRepository {
  findByProductRef(scope: AccountingScope, productRef: string, tx?: Prisma.TransactionClient): Promise<ProductFiscalProfile | null>;
  findManyByProductRefs(scope: AccountingScope, productRefs: string[], tx?: Prisma.TransactionClient): Promise<ProductFiscalProfile[]>;
  listByOwner(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<ProductFiscalProfile[]>;
  upsert(scope: AccountingScope, productRef: string, data: ProductFiscalProfileData, tx?: Prisma.TransactionClient): Promise<ProductFiscalProfile>;
  softDelete(scope: AccountingScope, productRef: string, tx?: Prisma.TransactionClient): Promise<number>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
