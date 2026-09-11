import prisma from '../../../lib/prisma';
import type { AccountingContact, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import type {
  CreateAccountingContactData,
  IAccountingContactRepository,
} from './IAccountingContactRepository';

/**
 * Repositório Prisma do cadastro de contadores. Único lugar com `prisma.accountingContact.*`.
 * Wrapper fino: zero regra de negócio — política, auditoria e tradução de erro moram no service.
 */
export class AccountingContactRepository implements IAccountingContactRepository {
  public async create(
    data: CreateAccountingContactData,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingContact> {
    return (tx ?? prisma).accountingContact.create({ data });
  }

  public async findById(
    scope: AccountingScope,
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingContact | null> {
    return (tx ?? prisma).accountingContact.findFirst({
      where: { id, ...accountingScopeWhere(scope), deletedAt: null },
    });
  }

  public async findManyByUnit(
    scope: AccountingScope,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingContact[]> {
    return (tx ?? prisma).accountingContact.findMany({
      where: { ...accountingScopeWhere(scope), deletedAt: null },
      orderBy: [{ name: 'asc' }],
    });
  }

  public async update(
    scope: AccountingScope,
    id: string,
    data: Prisma.AccountingContactUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingContact> {
    const { userId, unitId } = accountingScopeWhere(scope);
    // Escopo no `where` do próprio update (extended-where do Prisma, mesmo padrão de
    // `CounterpartyRepository.update`): uma linha de outro tenant nunca é escrita, mesmo se um
    // caller futuro esquecer o `findById` antes.
    return (tx ?? prisma).accountingContact.update({ where: { id, userId, unitId }, data });
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
