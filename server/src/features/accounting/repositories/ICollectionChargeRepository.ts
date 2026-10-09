import type { CollectionCharge, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';

export interface CreateCollectionChargeData {
  userId: string;
  unitId: string;
  paymentAccountId: string;
  receivableId: string;
  counterpartyId: string | null;
  kind: string;
  amountCents: bigint;
  expiresAt: Date;
  status: string;
  payerSnapshotJson: string;
  createdById: string | null;
}

/**
 * Contrato do repositório de `collection_charges` (BE-INCR-PAYMENT-PROVIDER PR-2). Único lugar com
 * `prisma.collectionCharge.*`. Tenancy via AccountingScope nas leituras de usuário; as leituras SEM escopo
 * (`…AnyScope`, `findPollable`) servem só ao webhook público e ao job, que derivam o escopo da própria linha.
 * Transição de status = CAS (`casStatus`): `updateMany where { id, status: from }` — a contagem 0 diz que outro
 * caminho já transicionou (P2-6). Wrapper fino: nenhuma regra de negócio aqui.
 */
export interface ICollectionChargeRepository {
  create(data: CreateCollectionChargeData, tx?: Prisma.TransactionClient): Promise<CollectionCharge>;
  findById(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<CollectionCharge | null>;
  findByIdAnyScope(id: string, tx?: Prisma.TransactionClient): Promise<CollectionCharge | null>;
  findByProviderRefAnyScope(
    paymentAccountId: string,
    providerRef: string,
    tx?: Prisma.TransactionClient,
  ): Promise<CollectionCharge | null>;
  /** F5 PR-3 (P3-6): cobrança do escopo E da conta do extrato, por `id` (= EXTERNAL_REFERENCE) ou `providerPaymentRef` (SOURCE_ID). */
  findForReleaseLine(
    scope: AccountingScope,
    paymentAccountId: string,
    key: { id: string } | { providerPaymentRef: string },
    tx?: Prisma.TransactionClient,
  ): Promise<CollectionCharge | null>;
  findLiveByReceivable(
    scope: AccountingScope,
    receivableId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<CollectionCharge | null>;
  findManyByReceivable(scope: AccountingScope, receivableId: string): Promise<CollectionCharge[]>;
  findLastByCounterparty(scope: AccountingScope, counterpartyId: string): Promise<CollectionCharge | null>;
  /** PENDING (inclusive vencidas) + CREATING com `updatedAt` anterior a `staleBefore` (P2-3/P2-9). */
  findPollable(staleBefore: Date): Promise<CollectionCharge[]>;
  /** CAS: aplica `data` só se o status atual for `from`. Devolve quantas linhas mudaram (0 ou 1). */
  casStatus(id: string, from: string, data: Prisma.CollectionChargeUncheckedUpdateInput, tx?: Prisma.TransactionClient): Promise<number>;
  /** `declarante.nome` do perfil fiscal mais recente da PJ — para a descrição enviada ao MP (F9). */
  findCompanyName(userId: string): Promise<string | null>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
