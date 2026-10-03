import type { PaymentAccount, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';

/** Dados para criar uma conta de pagamento — nasce sem credencial (`DRAFT`). */
export interface CreatePaymentAccountData {
  userId: string;
  unitId: string;
  provider: string;
  label: string;
  glAccountId: string;
  configJson: string;
  status: string;
  createdById: string | null;
}

/**
 * Contrato do repositório de `payment_accounts` (BE-INCR-PAYMENT-PROVIDER PR-1). Único lugar com
 * `prisma.paymentAccount.*`. Tenancy via AccountingScope: id de outro escopo resolve `null` (o service
 * traduz em 404, nunca 403). Leituras só de linha viva (`deletedAt: null`); não há `delete` — soft-delete
 * é `update({ deletedAt })`. Wrapper fino: política, gate de uma-ativa (P1-4) e cifra moram no service.
 */
export interface IPaymentAccountRepository {
  create(data: CreatePaymentAccountData, tx?: Prisma.TransactionClient): Promise<PaymentAccount>;
  findById(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<PaymentAccount | null>;
  findManyByUnit(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<PaymentAccount[]>;
  /** Outra conta viva `ACTIVE` do mesmo (escopo, provedor), excluindo `excludeId` — o gate do P1-4. */
  findOtherActive(
    scope: AccountingScope,
    provider: string,
    excludeId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentAccount | null>;
  update(
    scope: AccountingScope,
    id: string,
    data: Prisma.PaymentAccountUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentAccount>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
