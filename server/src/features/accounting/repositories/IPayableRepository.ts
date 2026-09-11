import type { Payable, PayablePayment, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';

/** A Payable with its payment children eagerly loaded (used by the cancel/remaining guards). */
export type PayableWithPayments = Payable & { payments: PayablePayment[] };

/** Data to create a Payable row. Scalars only (no relation objects). */
export interface CreatePayableData {
  userId: string;
  unitId: string;
  supplierName: string;
  supplierRef: string | null;
  // NOT NULL since SEC-A1-5: every payable carries a catalog identity. The service resolves it from a
  // body-supplied id or mints it from supplierName — it never hands a null down here.
  counterpartyId: string;
  documentNumber: string | null;
  description: string;
  issueDate: Date;
  dueDate: Date;
  amountCents: number;
  // NULLABLE (INCR-INVENTORY D3(b)): an inventory purchase debits 1.1.6 Estoques, not an expense leaf,
  // so it carries expenseAccountId=null and the inventory pair below instead (DTO XOR gate).
  expenseAccountId: string | null;
  inventoryProductRef: string | null;
  inventoryQty: number | null;
  // BE-INCR-NFE F0-1b (F-NFE7→a): true for a multi-item NF-e purchase (debit 1.1.6, SKUs live in the
  // driven StockMovements, not on the row). null/false otherwise. Discriminator that lets
  // isInventoryPurchase() route the debit without a sentinel inventoryProductRef.
  inventoryMultiItem: boolean | null;
  status: string;
  createdById: string | null;
}

/** Data to create a PayablePayment row. */
export interface CreatePaymentData {
  userId: string;
  unitId: string;
  payableId: string;
  amountCents: number;
  method: string;
  paidAt: Date;
  paidByUserId: string | null;
  status: string;
}

/**
 * Repository contract for Contas a Pagar (`payables` + `payable_payments`). Two-level tenancy via
 * AccountingScope (ownerUserId + unitId). Every method takes an optional `tx` so the service can
 * propagate the transaction (ACC-012). `claimForPayment` is the atomic sum-CAS race gate
 * (D4) — the ONLY correct place to serialize concurrent payments, since PostingService.postEntry
 * opens its own root tx and cannot enclose this transition.
 */
export interface IPayableRepository {
  create(data: CreatePayableData, tx?: Prisma.TransactionClient): Promise<Payable>;

  findById(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<Payable | null>;

  /** BE-INCR-NFE-PREVIEW (F-PREV-3 → b): título VIVO desta unidade com este `documentNumber` (a chave de
   *  acesso, no caso da NF-e). Título cancelado tem o número renomeado (`deleted:<id>:<doc>`), logo não casa. */
  findByDocumentNumber(
    scope: AccountingScope,
    documentNumber: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Payable | null>;

  findByIdWithPayments(
    scope: AccountingScope,
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PayableWithPayments | null>;

  /**
   * Lista paginada do subrazão. Os filtros opcionais (BE-INCR-SUBLEDGER-FILTERS §2) são AND entre si
   * e NUNCA substituem a base do `where` — escopo + `deletedAt: null` seguem aplicados sob qualquer
   * combinação (comportamento 6). `total` conta o conjunto FILTRADO (comportamento 7).
   */
  findManyByUnit(
    scope: AccountingScope,
    params: {
      status?: string;
      counterpartyId?: string;
      /** Data-only YYYY-MM-DD, faixa inclusiva nos dois extremos (F4). */
      dueFrom?: string;
      dueTo?: string;
      /** Substring em description OU documentNumber (F2). */
      q?: string;
      /** Vencido: `dueDate < hoje` E status em aberto (F1). Vencer HOJE não conta. */
      overdue?: boolean;
      skip: number;
      limit: number;
    },
  ): Promise<{ payables: PayableWithPayments[]; total: number }>;

  /** All non-deleted payables in scope (reconcile re-drive input). */
  findAllActive(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<Payable[]>;

  /**
   * All "em aberto" payables in scope for the aging report (INCR-AGING): non-deleted rows whose
   * status ∈ PAYABLE_OUTSTANDING_STATUSES (`OPEN`/`PAYING`). Read-only; excludes PAID/CANCELLED and
   * soft-deleted. Ordered by dueDate ASC for a deterministic drill.
   */
  findOutstanding(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<Payable[]>;

  /**
   * Sum-CAS of BE-INCR-PARTIAL-SETTLEMENT (ADR §3, corrected form): ONE `updateMany` where
   * status ∈ {OPEN, PARTIALLY_PAID} AND `paidCents <= amountCents − newCents` → status='PAYING',
   * `paidCents += newCents`. `amountCents` is the value read BEFORE the call (immutable after create —
   * no TOCTOU on it) and enters as a LITERAL: Prisma has no column-to-column filter here. Returns the
   * row count: 1 = won the race AND the balance carries the receipt; 0 = lost the race OR the receipt
   * would overshoot the balance (both collapse into one rejection, as the binary CAS already did).
   */
  claimForPayment(
    scope: AccountingScope,
    id: string,
    amountCents: number,
    newCents: number,
    tx?: Prisma.TransactionClient,
  ): Promise<number>;

  /**
   * Atomically finalize a settlement: `PAYING → PAID` when `paidCents >= amountCents`, else
   * `PAYING → PARTIALLY_PAID` (F-PS2 → a). Two conditional writes on the same `status='PAYING'`
   * predicate, so at most one matches. Returns the row count (1 = this caller performed the transition,
   * 0 = someone already finalized it) — the exactly-once gate for the `payable.settlement_registered`
   * domain audit; both registerPayment and reconcile emit ONLY when this returns 1
   * (authoritative-gate-inside-tx). Must run inside the tx.
   */
  finalizeIfPaying(
    scope: AccountingScope,
    id: string,
    amountCents: number,
    tx?: Prisma.TransactionClient,
  ): Promise<number>;

  /**
   * Atomically give a cancelled receipt's cents back to the balance (F-PS3 → a, any receipt among N):
   * `updateMany` where status ∈ {PARTIALLY_PAID, PAID} AND `paidCents >= cents` → `paidCents −= cents`.
   * Returns the row count: 0 = a settlement is in flight (`PAYING`) or the balance could not carry the
   * decrement (invariant breach) — the caller REJECTS instead of guessing. Status is recomputed by the
   * caller from the row re-read inside the SAME tx. Must run inside the tx.
   */
  releaseSettlement(
    scope: AccountingScope,
    id: string,
    cents: number,
    tx?: Prisma.TransactionClient,
  ): Promise<number>;

  updatePayable(
    scope: AccountingScope,
    id: string,
    data: Prisma.PayableUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Payable>;

  createPayment(data: CreatePaymentData, tx?: Prisma.TransactionClient): Promise<PayablePayment>;

  findPaymentById(
    scope: AccountingScope,
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PayablePayment | null>;

  /** The single ACTIVE payment of a payable, if any (cancel guard + reconcile). */
  findActivePayment(
    scope: AccountingScope,
    payableId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PayablePayment | null>;

  /** All ACTIVE payments in scope (reconcile re-drive input). */
  findAllActivePayments(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<PayablePayment[]>;

  updatePayment(
    scope: AccountingScope,
    id: string,
    data: Prisma.PayablePaymentUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<PayablePayment>;

  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
