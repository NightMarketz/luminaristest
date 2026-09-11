import type { Receivable, ReceivableReceipt, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';

/** A Receivable with its receipt children eagerly loaded (used by the cancel/remaining guards). */
export type ReceivableWithReceipts = Receivable & { receipts: ReceivableReceipt[] };

/** Data to create a Receivable row. Scalars only (no relation objects). */
export interface CreateReceivableData {
  userId: string;
  unitId: string;
  customerName: string;
  customerRef: string | null;
  // NOT NULL since SEC-A1-5: every receivable carries a catalog identity. The service resolves it from
  // a body-supplied id or mints it from customerName — it never hands a null down here.
  counterpartyId: string;
  documentNumber: string | null;
  description: string;
  issueDate: Date;
  dueDate: Date;
  amountCents: number;
  revenueAccountId: string;
  status: string;
  createdById: string | null;
}

/** Data to create a ReceivableReceipt row. */
export interface CreateReceiptData {
  userId: string;
  unitId: string;
  receivableId: string;
  amountCents: number;
  method: string;
  receivedAt: Date;
  receivedByUserId: string | null;
  status: string;
}

/**
 * Repository contract for Contas a Receber (`receivables` + `receivable_receipts`). Two-level tenancy
 * via AccountingScope (ownerUserId + unitId). Every method takes an optional `tx` so the service can
 * propagate the transaction (ACC-012). `claimForReceipt` is the atomic double-receipt race gate (D4)
 * — the ONLY correct place to serialize concurrent receipts, since PostingService.postEntry opens its
 * own root tx and cannot enclose this transition. MIRROR of IPayableRepository.
 */
export interface IReceivableRepository {
  create(data: CreateReceivableData, tx?: Prisma.TransactionClient): Promise<Receivable>;

  findById(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<Receivable | null>;

  findByIdWithReceipts(
    scope: AccountingScope,
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ReceivableWithReceipts | null>;

  /**
   * Lista paginada do subrazão. Espelho literal do AP (F6): filtros opcionais em AND que NUNCA
   * substituem a base do `where` — escopo + `deletedAt: null` seguem aplicados sob qualquer
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
  ): Promise<{ receivables: ReceivableWithReceipts[]; total: number }>;

  /** All non-deleted receivables in scope (reconcile re-drive input). */
  findAllActive(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<Receivable[]>;

  /**
   * Idempotency finder for externally-keyed receivables (CRM seam, ADR-CRM-AR-SEAM): every row
   * whose documentNumber matches EXACTLY or in rename-on-delete tombstone form
   * (`deleted:<id>:<doc>`), deliberately NOT filtering deletedAt. The CALLER classifies the rows
   * (live / human cancel / machine compensation) — a user cancel must never be resurrected while
   * a compensated FAILED creation must stay retryable (review H1).
   */
  findAllByDocumentNumber(
    scope: AccountingScope,
    documentNumber: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Receivable[]>;

  /**
   * All "em aberto" receivables in scope for the aging report (INCR-AGING): non-deleted rows whose
   * status ∈ RECEIVABLE_OUTSTANDING_STATUSES (`OPEN`/`RECEIVING`). Read-only; excludes RECEIVED/CANCELLED
   * and soft-deleted. Ordered by dueDate ASC for a deterministic drill. MIRROR of findOutstanding (AP).
   */
  findOutstanding(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<Receivable[]>;

  /**
   * Sum-CAS of BE-INCR-PARTIAL-SETTLEMENT (ADR §3, corrected form) — MIRROR of AP `claimForPayment`:
   * ONE `updateMany` where status ∈ {OPEN, PARTIALLY_RECEIVED} AND `receivedCents <= amountCents − newCents`
   * → status='RECEIVING', `receivedCents += newCents`. `amountCents` is the literal read BEFORE the call
   * (immutable after create). Returns 1 = won the race AND the balance carries the receipt; 0 = lost
   * the race OR the receipt would overshoot the balance.
   */
  claimForReceipt(
    scope: AccountingScope,
    id: string,
    amountCents: number,
    newCents: number,
    tx?: Prisma.TransactionClient,
  ): Promise<number>;

  /**
   * Atomically finalize a receipt: `RECEIVING → RECEIVED` when `receivedCents >= amountCents`, else
   * `RECEIVING → PARTIALLY_RECEIVED` (F-PS2 → a). Returns the row count (1 = this caller performed the
   * transition, 0 = someone already finalized it) — the exactly-once gate for the
   * `receivable.settlement_registered` domain audit (authoritative-gate-inside-tx). Must run inside the tx.
   */
  finalizeIfReceiving(
    scope: AccountingScope,
    id: string,
    amountCents: number,
    tx?: Prisma.TransactionClient,
  ): Promise<number>;

  /**
   * Atomically give a cancelled receipt's cents back to the balance (F-PS3 → a) — MIRROR of AP
   * `releaseSettlement`: status ∈ {PARTIALLY_RECEIVED, RECEIVED} AND `receivedCents >= cents` →
   * `receivedCents −= cents`. 0 = a receipt is in flight or the balance could not carry it. Must run inside the tx.
   */
  releaseSettlement(
    scope: AccountingScope,
    id: string,
    cents: number,
    tx?: Prisma.TransactionClient,
  ): Promise<number>;

  updateReceivable(
    scope: AccountingScope,
    id: string,
    data: Prisma.ReceivableUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Receivable>;

  createReceipt(data: CreateReceiptData, tx?: Prisma.TransactionClient): Promise<ReceivableReceipt>;

  findReceiptById(
    scope: AccountingScope,
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ReceivableReceipt | null>;

  /** The single ACTIVE receipt of a receivable, if any (cancel guard + reconcile). */
  findActiveReceipt(
    scope: AccountingScope,
    receivableId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ReceivableReceipt | null>;

  /** All ACTIVE receipts in scope (reconcile re-drive input). */
  findAllActiveReceipts(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<ReceivableReceipt[]>;

  updateReceipt(
    scope: AccountingScope,
    id: string,
    data: Prisma.ReceivableReceiptUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<ReceivableReceipt>;

  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
