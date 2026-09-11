import type { AccountingContact, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';

/** Dados para criar um contato. Escalares apenas (sem objeto de relação). */
export interface CreateAccountingContactData {
  userId: string;
  unitId: string;
  name: string;
  email: string;
  /** J930 campo 03 (IDENT_CPF_CNPJ) — 11 dígitos, DV validado pelo DTO. */
  cpf: string;
  /** J930 campo 08 (FONE) — só dígitos; opcional no manual. */
  phone: string | null;
  /** J930 campo 06 (IND_CRC) — inscrição no CRC, já normalizada pelo DTO. */
  crcNumber: string;
  /** J930 campo 09 (UF_CRC) — sigla da UF, validada contra a Tabela de UF. */
  crcUf: string;
  /** J930 campo 10 (NUM_SEQ_CRC) — certidão UF/AAAA/NÚMERO; opcional no manual. */
  crcCertificate: string | null;
  /** J930 campo 11 (DT_CRC) — validade da certidão; opcional no manual. */
  crcCertificateValidUntil: Date | null;
  createdById: string | null;
}

/**
 * Contrato do repositório do cadastro de contadores (`accounting_contacts`). Único lugar com
 * `prisma.accountingContact.*` (item 2 do BRIEF).
 *
 * Tenancy em dois níveis via AccountingScope (ownerUserId + unitId): `findById` SEMPRE carrega o
 * where do escopo, então id de outro tenant resolve `null` — e o service traduz isso em
 * `NotFoundError`, nunca `ForbiddenError` (D8/ACC-CD-4: 403 confirmaria a existência da linha).
 * Mesmo padrão de `findJobById` em `IDataExchangeRepository`.
 *
 * Soft-delete: as leituras filtram `deletedAt: null`. NÃO existe `delete` neste contrato —
 * arquivar é `update({deletedAt})`, e um contato arquivado continua referenciado por entregas
 * históricas (a FK do log é `Restrict`).
 *
 * 1:N por escopo (F-CD5-a): não há chave de negócio única — dois contadores vivos no mesmo
 * `(userId, unitId)` são válidos por decisão, não por descuido.
 */
export interface IAccountingContactRepository {
  create(
    data: CreateAccountingContactData,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingContact>;

  /** Point lookup escopado — `null` quando o id não é deste escopo (cross-tenant → null). */
  findById(
    scope: AccountingScope,
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingContact | null>;

  /** Catálogo vivo do escopo (nunca arquivados), ordenado por nome. */
  findManyByUnit(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<AccountingContact[]>;

  update(
    scope: AccountingScope,
    id: string,
    data: Prisma.AccountingContactUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingContact>;

  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
