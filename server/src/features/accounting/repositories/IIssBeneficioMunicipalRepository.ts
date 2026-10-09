import type { IssBeneficioMunicipal, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';

export interface IssBeneficioMunicipalData {
  codMun: string;
  cTribNacPrefixos: string[];
  tipo: string;
  reducaoBpPorFaixa: number[] | null;
  legislacao: string;
  vigenteDesde: string;
  vigenteAte: string | null;
}

/** SIMPLES-PISO-ANEXO-XI bloco 1 (BRIEF item 1) — único lugar com `prisma.issBeneficioMunicipal.*`. `tx?` em todos. */
export interface IIssBeneficioMunicipalRepository {
  findById(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<IssBeneficioMunicipal | null>;
  listByScope(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<IssBeneficioMunicipal[]>;
  create(scope: AccountingScope, data: IssBeneficioMunicipalData, tx?: Prisma.TransactionClient): Promise<IssBeneficioMunicipal>;
  update(scope: AccountingScope, id: string, data: IssBeneficioMunicipalData, tx?: Prisma.TransactionClient): Promise<IssBeneficioMunicipal>;
  softDelete(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<void>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
