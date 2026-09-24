import type { CompanyFiscalProfile, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';

/** Colunas graváveis do perfil da empresa (X13, BRIEF §4.1) — sem ecfRecibo/regimeTravadoEm (PR-2, F-XP-5 a). */
export interface CompanyFiscalProfileData {
  regime: string;
  grandePorte: boolean | null;
  inativa: boolean;
  aporteInvestidorAnjo: boolean | null;
  livroCaixaSemEscrituracao: boolean | null;
  distribuicaoAcimaBase: boolean | null;
  declarante: Prisma.InputJsonValue | typeof Prisma.DbNull;
  ecdIndNire: string | null;
  ecdNire: string | null;
  ecdNumOrd: string | null;
  ecdNatLivr: string | null;
  ecfIndAliqCsll: string | null;
  ecfIndRecReceita: string | null;
  contadorContactId: string | null;
  representanteLegalSignerId: string | null;
}

/**
 * BE-INCR-FISCAL-OBLIGATION-PROFILE (nó X13, BRIEF item 6) — único lugar com `prisma.companyFiscalProfile.*`.
 * Chave = (scope.ownerUserId, ano): instância = CNPJ raiz (R8); o `unitId` do escopo NÃO entra no where.
 */
export interface ICompanyFiscalProfileRepository {
  findByYear(scope: AccountingScope, ano: number, tx?: Prisma.TransactionClient): Promise<CompanyFiscalProfile | null>;
  upsert(scope: AccountingScope, ano: number, data: CompanyFiscalProfileData, tx?: Prisma.TransactionClient): Promise<CompanyFiscalProfile>;
  softDelete(scope: AccountingScope, ano: number, tx?: Prisma.TransactionClient): Promise<number>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
