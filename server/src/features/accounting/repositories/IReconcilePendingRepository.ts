import type { Prisma, ReconcilePendingItem } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';

/** Data captured by a reconcile pass when an item fails or is blocked (Fork 2-b, callback). */
export interface ReconcilePendingCapture {
  sourceType: string;
  sourceId: string;
  reasonCode: string; // ReconcilePendingReasonCodeValue (kept as `string` here — the Prisma column is untyped)
  reasonDetail: string;
}

/**
 * Repository contract for `reconcile_pending_items` (BE-INCR-RECONCILE-PENDING, nó C7).
 * Two-level tenancy via AccountingScope (ownerUserId + unitId), mirroring IPayableRepository.
 * Every method takes an optional `tx` so callers can propagate a transaction.
 */
export interface IReconcilePendingRepository {
  /**
   * Upsert-by-identity (checklist item 2): the SAME row is created on first capture, and
   * REOPENED (resolvedAt reset to null, attempts incremented, firstSeenAt preserved) if it had
   * been resolved and the same (sourceType,sourceId) fails/blocks again. Forced by
   * `@@unique([userId,unitId,sourceType,sourceId])` — a second row for the same key would P2002
   * (memória `unique-de-idempotencia-x-soft-delete`), so reopening the existing row is the only
   * representable choice, not a free one.
   */
  upsertPending(
    scope: AccountingScope,
    item: ReconcilePendingCapture,
    tx?: Prisma.TransactionClient,
  ): Promise<ReconcilePendingItem>;

  /**
   * Best-effort resolve (checklist item 5): sets `resolvedAt = now()` on the pending row for this
   * identity, ONLY if one exists and is still unresolved. Returns the row count updated (0 = no
   * matching pending row — a normal, expected outcome for an item that never had one). NEVER
   * throws NotFound.
   */
  resolvePending(
    scope: AccountingScope,
    sourceType: string,
    sourceId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number>;

  /**
   * Bumps `attempts` on a still-unresolved row without changing `reasonCode`/`reasonDetail`
   * (checklist item 6/7: a rescan that STILL fails — e.g. a poison `MAX_CENTS_EXCEEDED` retried
   * again — must show the attempt happened, without the retry path re-describing the failure
   * itself; `retryOneReconcilePendingItem` deliberately returns only resolved/still_pending, not
   * a reason string). No-op (count 0) if the row was resolved concurrently.
   */
  bumpAttempts(
    scope: AccountingScope,
    sourceType: string,
    sourceId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number>;

  /** Read a single pending item by id, scoped. */
  findById(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<ReconcilePendingItem | null>;

  /**
   * Keyset-paginated listing (GET /api/reconcile-pending, Fork 3-b). Ordered by `id` ASC;
   * `cursor` (when given) is the `id` of the last item of the previous page — `WHERE id > cursor`.
   * Returns one extra row internally to compute `hasMore` without a second COUNT query.
   */
  findManyByUnit(
    scope: AccountingScope,
    params: { reasonCode?: string; includeResolved: boolean; cursor?: string; limit: number },
  ): Promise<{ items: ReconcilePendingItem[]; hasMore: boolean }>;

  /**
   * All unresolved pending items in scope, optionally restricted to a subset of ids (rescan
   * command, Fork 3/checklist item 6). Empty/absent `ids` = every unresolved row of the scope.
   */
  findUnresolved(
    scope: AccountingScope,
    ids?: string[],
    tx?: Prisma.TransactionClient,
  ): Promise<ReconcilePendingItem[]>;

  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
