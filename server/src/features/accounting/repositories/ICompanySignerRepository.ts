import type { CompanySigner, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';

export interface CompanySignerData {
  nome: string;
  cpf: string;
  qualifEcd: string;
  qualifEcf: string;
  email: string;
  fone: string;
}

/**
 * BE-INCR-FISCAL-OBLIGATION-PROFILE (nó X13, BRIEF item 8) — único lugar com `prisma.companySigner.*`. Tenancy pelo
 * dono (instância = CNPJ raiz, R8): `findById` de outro dono devolve `null` (→ 404, nunca 403).
 */
export interface ICompanySignerRepository {
  list(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<CompanySigner[]>;
  findById(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<CompanySigner | null>;
  create(scope: AccountingScope, data: CompanySignerData, tx?: Prisma.TransactionClient): Promise<CompanySigner>;
  update(scope: AccountingScope, id: string, data: CompanySignerData, tx?: Prisma.TransactionClient): Promise<CompanySigner>;
  softDelete(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<CompanySigner>;
  /** Perfis vivos que apontam para o signatário como representante legal. */
  countLiveProfileRefs(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<number>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
