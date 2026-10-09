import prisma from '../../../lib/prisma';
import type { PaymentAccount, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import type { CreatePaymentAccountData, IPaymentAccountRepository } from './IPaymentAccountRepository';

/** Repositório Prisma de `payment_accounts`. Zero regra de negócio (ver o contrato). */
export class PaymentAccountRepository implements IPaymentAccountRepository {
  public async create(data: CreatePaymentAccountData, tx?: Prisma.TransactionClient): Promise<PaymentAccount> {
    return (tx ?? prisma).paymentAccount.create({ data });
  }

  public async findById(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<PaymentAccount | null> {
    return (tx ?? prisma).paymentAccount.findFirst({ where: { id, ...accountingScopeWhere(scope), deletedAt: null } });
  }

  public async findByIdAnyScope(id: string, tx?: Prisma.TransactionClient): Promise<PaymentAccount | null> {
    return (tx ?? prisma).paymentAccount.findFirst({ where: { id, deletedAt: null } });
  }

  public async findActive(scope: AccountingScope, provider: string, tx?: Prisma.TransactionClient): Promise<PaymentAccount | null> {
    return (tx ?? prisma).paymentAccount.findFirst({
      where: { ...accountingScopeWhere(scope), provider, status: 'ACTIVE', deletedAt: null },
    });
  }

  public async findManyByUnit(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<PaymentAccount[]> {
    return (tx ?? prisma).paymentAccount.findMany({
      where: { ...accountingScopeWhere(scope), deletedAt: null },
      orderBy: [{ createdAt: 'asc' }],
    });
  }

  public async findOtherActive(
    scope: AccountingScope,
    provider: string,
    excludeId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentAccount | null> {
    return (tx ?? prisma).paymentAccount.findFirst({
      where: { ...accountingScopeWhere(scope), provider, status: 'ACTIVE', deletedAt: null, id: { not: excludeId } },
    });
  }

  public async findByGlAccount(
    scope: AccountingScope,
    provider: string,
    glAccountId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentAccount[]> {
    return (tx ?? prisma).paymentAccount.findMany({
      where: { ...accountingScopeWhere(scope), provider, glAccountId, deletedAt: null },
      orderBy: [{ createdAt: 'asc' }],
    });
  }

  public async findAllActiveAnyScope(provider: string): Promise<PaymentAccount[]> {
    return prisma.paymentAccount.findMany({ where: { provider, status: 'ACTIVE', deletedAt: null }, orderBy: [{ createdAt: 'asc' }] });
  }

  public async userExists(userId: string): Promise<boolean> {
    return (await prisma.user.count({ where: { id: userId } })) > 0;
  }

  public async update(
    scope: AccountingScope,
    id: string,
    data: Prisma.PaymentAccountUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentAccount> {
    const { userId, unitId } = accountingScopeWhere(scope);
    // Escopo no `where` do próprio update (mesmo padrão de AccountingContactRepository.update).
    return (tx ?? prisma).paymentAccount.update({ where: { id, userId, unitId }, data });
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
