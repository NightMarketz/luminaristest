import type { Partner, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import type { OutraParticipacao } from '../dtos/PartnerDto';

export interface PartnerData {
  nome: string;
  taxId: string;
  tipoPessoa: 'PF' | 'PJ';
  residenteBrasil: boolean;
  participacaoBp: number;
  entradaEm: string;
  saidaEm: string | null;
  /** EFICIENCIA-FISCAL PR-4 item 20: participações informadas em outras empresas; null = não informado. */
  outrasParticipacoes: OutraParticipacao[] | null;
}

/**
 * BE-INCR-IRRF-DISTRIBUICAO PR-1 (itens 1–3) — único lugar com `prisma.partner.*`. Tenancy pelo dono (PJ = CNPJ raiz,
 * R8): `findById` de outro dono devolve `null` (→ 404, nunca 403).
 */
export interface IPartnerRepository {
  list(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<Partner[]>;
  findById(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<Partner | null>;
  /** Vigências vivas do mesmo `taxId` na PJ — o gate de sobreposição (item 2) roda sobre elas, dentro da tx. */
  listByTaxId(scope: AccountingScope, taxId: string, tx?: Prisma.TransactionClient): Promise<Partner[]>;
  create(scope: AccountingScope, data: PartnerData, tx?: Prisma.TransactionClient): Promise<Partner>;
  update(scope: AccountingScope, id: string, data: PartnerData, tx?: Prisma.TransactionClient): Promise<Partner>;
  softDelete(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<Partner>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
