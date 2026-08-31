/**
 * accountingSyncReconcile — durability backbone for AccountingSync (Incremento B).
 *
 * The live triggers (CRM controller / DynamicTable controllers, post-commit) are best-effort:
 * if the accounting effect fails after the source fact commits, it is missing. This job
 * re-drives every pending source fact idempotently. It is a HARD requirement — without it a
 * failed post is lost.
 *
 * CRM pass (ADR-CRM-AR-SEAM): a `Won` opportunity no longer posts directly to the ledger — it
 * creates a Contas a Receber via CrmReceivableBridge (recognition D 1.1.5 / C 3.1; settlement
 * is the human-registered receipt in the AR module). The bridge owns both idempotency guards
 * (legacy direct entry + tombstone-aware receivable lookup).
 *
 * Each core `reconcile*(deps)` is pure over injected collaborators (unit-tested);
 * `runAccountingSyncReconcile()` is the thin production wiring.
 *
 * TRAILING WATERMARK (BRIEF-W2-F, F6): every DynamicTable listing below used to scan the
 * source table's ENTIRE lifetime population every tick (no time filter at all) — the only
 * thing making that affordable is idempotency (`hasExistingEntry`/`findMovement`/status
 * checks), not a filter on novelty. `withReconcileWatermark` narrows each listing to rows
 * touched since a persisted `watermarkAt`, WITHOUT weakening the "never skip an eligible row"
 * invariant:
 *   - the watermark is the START of the run minus `OVERLAP_MS`, never the newest `updatedAt`
 *     SEEN among the rows read. A "max value seen" cursor is unsafe here: SQLite runs with
 *     `PRAGMA busy_timeout = 5000` (server/src/lib/prisma.ts) — a write can queue up to 5s
 *     behind a lock before it commits, so a later-committing write can carry an EARLIER
 *     `updatedAt` than one that raced ahead of it and already advanced the cursor. Filtering
 *     by "run start minus a safety margin" instead makes that ordering irrelevant: as long as
 *     `OVERLAP_MS` covers the worst-case commit-vs-timestamp skew, every row is caught by
 *     SOME tick's window before the watermark can pass it;
 *   - the new watermark is persisted ONLY after every pass below has returned without an
 *     unhandled exception (see `withReconcileWatermark`) — a round that dies partway leaves
 *     the watermark untouched, so the next run re-scans the same window instead of silently
 *     losing whatever the dead round didn't reach.
 * Absent watermark (first run post-deploy, or the row was never created) = EPOCH = full scan,
 * byte-identical to the pre-watermark behavior.
 *
 * KNOWN RESIDUAL (flagged during BRIEF-W2-F implementation, not one of its ratified forks):
 * an item that fails in isolation (`summary.failed++`, batch continues — see each pass' catch
 * block) keeps re-surfacing every tick under the OLD unbounded scan. Under the watermark, it
 * only re-surfaces while its row's `updatedAt` is still inside `[watermarkAt, now]` — roughly
 * `OVERLAP_MS` after the row was last written, it silently drops out of every future scan
 * unless something else touches that row again. This does not violate the invariant the BRIEF
 * closes (no row is skipped BEFORE it is ever seen once), but it does change a
 * previously-infinite retry into a time-boxed one for a row that failed and was never
 * re-touched — worth a human decision (periodic full rescan? exempt failed items from the
 * watermark filter?) once real failure-recurrence data exists. Out of this BRIEF's authorized
 * scope (F6 = the watermark only) — implemented as specified, not redesigned.
 *
 * F-W2F-3 (accepted by the owner, 2026-08-30): the window-with-overlap design closes the
 * delayed-commit-under-contention failure mode above, but it assumes no write EXTERNAL to
 * this process (a direct DB import, an admin script, a future read replica) ever sets
 * `updatedAt` to a moment BEFORE the watermark at the instant that write becomes visible here.
 * Today that assumption holds only by the ABSENCE of any `$executeRaw` against
 * `dynamic_table_data` in this codebase — it is not enforced by a schema constraint.
 */

import prisma from '../lib/prisma';
import { logger } from '../lib/logger';
import { getFactory } from '../lib/factory';
import { resolveAccountingScope } from '../features/accounting/scope/AccountingScope';
import type { AccountingScope } from '../features/accounting/scope/AccountingScope';
import { LEDGER_STATUSES } from '../features/accounting/models/ledgerStatus';
import {
  buildSaleFinalizedEvent,
  buildSaleCogsEvent,
  buildSaleReturnedEvent,
  buildSaleSettledEvent,
  buildSalePackageSoldEvent,
} from '../features/accounting/sync/AccountingSyncPort';
import type {
  CrmBridgeOutcome,
  WonOpportunityFact,
} from '../features/accounting/sync/bridges/CrmReceivableBridge';
import type { AccountingEvent, SyncResult } from '../features/accounting/sync/AccountingSyncPort';
import { syncSkipErrorCode } from '../features/accounting/sync/AccountingSyncPort';
import { JournalEntryRepository } from '../features/accounting/repositories/JournalEntryRepository';
import { PackageBalanceRepository } from '../features/packages/repositories/PackageBalanceRepository';
import { loadSalePackageInfo } from '../features/accounting/sync/bridges/saleItems';
import type { ProductLine } from '../features/accounting/sync/bridges/saleItems';
import { JobWatermarkRepository } from './JobWatermarkRepository';

/** A `Won` opportunity normalized from its DynamicTable row, with its owning tenant. */
export interface WonOpportunity {
  /** Tenant that owns the source table — becomes owner AND actor in the re-drive. */
  ownerUserId: string;
  opportunityId: string;
  unitId: string;
  amount: number;
  occurredAt: string;
  label: string;
  /** Scoped ref to the CRM account row (relation id), when present. */
  accountRef?: string;
}

export interface CrmReceivableReconcileDeps {
  listWonOpportunities: () => Promise<WonOpportunity[]>;
  /** CrmReceivableBridge.bookWonOpportunity — owns money guards + both idempotency guards. */
  book: (scope: AccountingScope, fact: WonOpportunityFact) => Promise<CrmBridgeOutcome>;
}

export interface ReconcileSummary {
  total: number;
  synced: number;
  idempotentHits: number;
  failed: number;
  /**
   * Deliberately deferred items (NOT failures):
   *  - settlement pass (Incremento D / D1): sales Finalized+Paid whose opening entry is not yet
   *    booked — left for a later run once it exists;
   *  - ANY sync pass (Council 1.5): events rejected by a skip-listed deterministic code —
   *    ACCOUNTING_PERIOD_NOT_OPEN (defers until the period reopens) or MAX_CENTS_EXCEEDED
   *    (POISON: can never succeed until the source amount is fixed; classifying it here keeps
   *    the re-drive from looping it as a retriable failure every cycle).
   * Optional so passes without occurrences keep their exact 4-field summary unchanged.
   */
  blocked?: number;
}

/**
 * Shared poison/defer classifier for the sync passes (Council 1.5). Returns the skip-listed
 * code (period-closed / MAX_CENTS) or null. On a hit the pass counts the item as BLOCKED and
 * warns — the batch continues and the item is never spun as a retriable failure.
 */
function classifyBlockedSyncError(error: unknown): string | null {
  return syncSkipErrorCode(error);
}

// ───────────────────────────────────────────────────────────────────────────
// Trailing watermark (BRIEF-W2-F, F6) — see the module docstring for the design rationale.
// ───────────────────────────────────────────────────────────────────────────

/** Single global cursor row (F-W2F-2: no per-tenant/per-pass split — all 8 passes always run
 *  together, sequentially, in the same tick, so a finer-grained cursor would add complexity
 *  with no observed benefit). */
export const RECONCILE_WATERMARK_JOB = 'accounting_sync_reconcile';

/**
 * Overlap margin (F-W2F-1): 180x SQLite's documented `busy_timeout` ceiling (5000ms, see
 * `server/src/lib/prisma.ts`) — a generous but UNMEASURED starting point (no real production
 * lock-contention data backs this number), named + exported so it is trivial to retune once
 * that data exists. Do not inline this value at any call site.
 */
export const OVERLAP_MS = 15 * 60 * 1000; // 15 minutes

/** Watermark used when no row has ever been persisted (first run post-deploy) — makes
 *  `updatedAt >= EPOCH` match every row, i.e. a full scan identical to the pre-watermark
 *  behavior. Exported for tests. */
export const RECONCILE_WATERMARK_EPOCH = new Date(0);

export interface ReconcileWatermarkDeps {
  /** Reads the persisted watermark; `null` when absent (first run, or the row was never created). */
  getWatermark: () => Promise<Date | null>;
  /** Persists the new watermark. Called ONLY when `runPasses` resolves without throwing. */
  setWatermark: (watermarkAt: Date) => Promise<void>;
  /** Injectable clock (returns the run's start instant) for deterministic tests. */
  now: () => Date;
}

/**
 * Wraps one reconciliation round with the trailing watermark. Reads the persisted watermark
 * (EPOCH on the first run), runs `runPasses(watermarkAt)`, and — ONLY if it resolves without
 * throwing — advances the watermark to `runStartAt - OVERLAP_MS`. The new value is always
 * `>=` the previous one by construction of the process's monotonic clock, so no `max(...)`
 * clamp against the prior watermark is needed.
 *
 * GUARD: if `runPasses` throws (a whole-round failure — not the per-item fault isolation each
 * pass already does internally), `setWatermark` is never called: the watermark stays exactly
 * where it was, so the NEXT run re-scans the same `[watermarkAt, now]` window instead of
 * silently skipping whatever the failed round never reached.
 */
export async function withReconcileWatermark(
  deps: ReconcileWatermarkDeps,
  runPasses: (updatedAtFrom: Date) => Promise<ReconcileSummary>,
): Promise<ReconcileSummary> {
  const watermarkAt = (await deps.getWatermark()) ?? RECONCILE_WATERMARK_EPOCH;
  const runStartAt = deps.now();
  const summary = await runPasses(watermarkAt);
  await deps.setWatermark(new Date(runStartAt.getTime() - OVERLAP_MS));
  return summary;
}

/**
 * Re-drive every Won opportunity lacking its Contas a Receber (ADR-CRM-AR-SEAM). The bridge is
 * the idempotency authority (legacy direct entry / existing-or-tombstoned receivable both count
 * as idempotent hits). Deterministic skip-listed codes (period-closed — incl. the bridge's R2
 * preflight — / MAX_CENTS poison) classify as BLOCKED. Fault-isolated: an isolated failure is
 * logged and the batch continues.
 */
export async function reconcileCrmReceivables(
  deps: CrmReceivableReconcileDeps,
): Promise<ReconcileSummary> {
  const opportunities = await deps.listWonOpportunities();
  const summary: ReconcileSummary = {
    total: opportunities.length,
    synced: 0,
    idempotentHits: 0,
    failed: 0,
  };

  for (const opp of opportunities) {
    try {
      if (!opp.unitId) {
        throw new Error(`Oportunidade '${opp.opportunityId}' sem unitId — não reconciliável.`);
      }
      // Owner-as-actor: no HTTP user in a job. The scope is built from the SOURCE
      // record's tenant + unit only — never crossing tenants or units.
      const scope = resolveAccountingScope({ userId: opp.ownerUserId }, opp.unitId);
      const result = await deps.book(scope, {
        opportunityId: opp.opportunityId,
        unitId: opp.unitId,
        amount: opp.amount,
        occurredAt: opp.occurredAt,
        label: opp.label,
        accountRef: opp.accountRef,
      });

      if (result.outcome === 'created') {
        summary.synced++;
        logger.info('Reconcile created CRM receivable', {
          opportunityId: opp.opportunityId,
          receivableId: result.receivableId,
        });
      } else {
        // 'already_booked' (live or user-cancelled tombstone) or 'legacy_entry'.
        summary.idempotentHits++;
      }
    } catch (error) {
      // Poison/defer (Council 1.5): a skip-listed deterministic code is BLOCKED, not failed —
      // MAX_CENTS_EXCEEDED would otherwise re-fail identically every cycle (poison loop).
      const skipCode = classifyBlockedSyncError(error);
      if (skipCode) {
        summary.blocked = (summary.blocked ?? 0) + 1;
        logger.warn('Reconcile blocked for opportunity — deterministic non-retriable code, skipping', {
          opportunityId: opp.opportunityId,
          code: skipCode,
          error: error instanceof Error ? error.message : String(error),
        });
        continue;
      }
      // Isolated failure must NOT stop the batch.
      // Durable, greppable per-item signal (Bloco A — observabilidade). A persistent failure
      // (e.g. Won sem unitId) re-surfaces every cycle; `failedSoFar` makes a stuck item visible.
      const reason = error instanceof Error ? error.message : String(error);
      summary.failed++;
      logger.error('Reconcile failed for opportunity — continuing', {
        event: 'reconcile_item_failed',
        sourceType: 'crm.opportunity.won',
        sourceId: opp.opportunityId,
        opportunityId: opp.opportunityId,
        unitId: opp.unitId,
        failedSoFar: summary.failed,
        reason,
      });
      continue;
    }
  }

  logger.info('CRM receivables reconcile complete', { ...summary });
  return summary;
}

// ───────────────────────────────────────────────────────────────────────────
// Sale finalized pass (Incremento C, ADR-C01) — re-drive every Finalized sale
// that has no journal entry yet. Same durability contract as the CRM pass: the
// live trigger (DynamicTable controller, post-commit) is best-effort; this job is
// the safety net (and the only coverage for a sale born Finalized via create).
// ───────────────────────────────────────────────────────────────────────────

/** A `Finalized` sale normalized from its DynamicTable row, with its owning tenant. */
export interface FinalizedSale {
  /** Tenant that owns the source table — becomes owner AND actor in the re-drive. */
  ownerUserId: string;
  saleId: string;
  unitId: string;
  amount: number;
  currency: string;
  occurredAt: string;
  /** True for an all-Package sale — recognizes NO revenue (Incremento G P6); skip here. */
  isAllPackage?: boolean;
  /** Per-nature subtotals for the revenue split (ADR-INCR-REVENUE-SPLIT) — same source as the
   *  live bridge, so a re-driven sale books identically. Omitted → mapper falls back to 3.1. */
  revenueByNature?: { serviceReais: number; productReais: number };
}

export interface SaleReconcileDeps {
  listFinalizedSales: () => Promise<FinalizedSale[]>;
  hasExistingEntry: (
    scope: AccountingScope,
    sourceType: string,
    sourceId: string,
  ) => Promise<boolean>;
  sync: (scope: AccountingScope, event: AccountingEvent) => Promise<SyncResult>;
}

/**
 * Re-drive every Finalized sale lacking a journal entry. Idempotent and
 * fault-isolated: an isolated failure is logged and the batch continues. Mirrors the
 * per-source pass shape (see reconcileCrmReceivables); kept as a separate core so each
 * source stays independently testable.
 */
export async function reconcileSaleSales(deps: SaleReconcileDeps): Promise<ReconcileSummary> {
  const sales = await deps.listFinalizedSales();
  const summary: ReconcileSummary = {
    total: sales.length,
    synced: 0,
    idempotentHits: 0,
    failed: 0,
  };

  for (const sale of sales) {
    try {
      if (!sale.unitId) {
        throw new Error(`Venda '${sale.saleId}' sem unitId — não reconciliável.`);
      }
      // Anti-revenue gate (Incremento G P6): an all-Package sale recognizes NO revenue — its
      // origin (C 2.1.1) is handled by the package-origin pass. Skip without sync.
      if (sale.isAllPackage) {
        logger.info('Reconcile skipped revenue for all-Package sale', { saleId: sale.saleId });
        continue;
      }
      // Owner-as-actor: no HTTP user in a job. The scope is built from the SOURCE
      // record's tenant + unit only — never crossing tenants or units.
      const scope = resolveAccountingScope({ userId: sale.ownerUserId }, sale.unitId);
      const event = buildSaleFinalizedEvent({
        saleId: sale.saleId,
        unitId: sale.unitId,
        amount: sale.amount,
        currency: sale.currency,
        occurredAt: sale.occurredAt,
        label: `Venda ${sale.saleId}`,
        revenueByNature: sale.revenueByNature,
      });

      // Classify already-booked sales (idempotent hit). sync() remains the authority
      // even if a race slips past this check — postEntry dedupes.
      const exists = await deps.hasExistingEntry(scope, event.sourceType, event.sourceId);
      if (exists) {
        summary.idempotentHits++;
        continue;
      }

      const result = await deps.sync(scope, event);
      summary.synced++;
      logger.info('Reconcile booked sale', {
        saleId: sale.saleId,
        entryId: result.entryId,
      });
    } catch (error) {
      // Poison/defer (Council 1.5): skip-listed deterministic code → BLOCKED, not failed.
      const skipCode = classifyBlockedSyncError(error);
      if (skipCode) {
        summary.blocked = (summary.blocked ?? 0) + 1;
        logger.warn('Reconcile blocked for sale — deterministic non-retriable code, skipping', {
          saleId: sale.saleId,
          code: skipCode,
          error: error instanceof Error ? error.message : String(error),
        });
        continue;
      }
      // Isolated failure must NOT stop the batch.
      // Durable, greppable per-item signal (Bloco A — observabilidade). A persistent failure
      // (e.g. venda sem unitId) re-surfaces every cycle; `failedSoFar` makes a stuck item visible.
      const reason = error instanceof Error ? error.message : String(error);
      summary.failed++;
      logger.error('Reconcile failed for sale — continuing', {
        event: 'reconcile_item_failed',
        sourceType: 'sale.finalized',
        sourceId: sale.saleId,
        saleId: sale.saleId,
        unitId: sale.unitId,
        failedSoFar: summary.failed,
        reason,
      });
      continue;
    }
  }

  logger.info('Sale finalized reconcile complete', { ...summary });
  return summary;
}

// ───────────────────────────────────────────────────────────────────────────
// Sale reversals pass (Incremento D) — the durability net for the post-commit
// SaleReversalBridge. Same contract as the finalize passes: the live trigger
// (SalesCancellationService, post-commit) is best-effort; these passes re-drive any
// transition whose accounting effect failed, idempotently.
//
//  • reconcileSaleCancellations: status Cancelled whose 'sale.finalized' entry is
//    still 'Posted' (not 'Reversed') → re-fire reverseEntry.
//  • reconcileSaleReturns: status Returned with no 'sale.returned' entry → re-fire sync.
// ───────────────────────────────────────────────────────────────────────────

/** A `Cancelled` sale normalized from its DynamicTable row, with its owning tenant. */
export interface CancelledSale {
  ownerUserId: string;
  saleId: string;
  unitId: string;
}

export interface SaleCancellationReconcileDeps {
  listCancelledSales: () => Promise<CancelledSale[]>;
  /** Locate an entry by source within the scope (returns its id + status, or null). */
  findEntry: (
    scope: AccountingScope,
    sourceType: string,
    sourceId: string,
  ) => Promise<{ id: string; status: string } | null>;
  /** Reverse a posted entry (idempotent in PostingService). */
  reverse: (scope: AccountingScope, unitId: string, entryId: string) => Promise<void>;
}

/**
 * Re-drive every Cancelled sale whose revenue (and, when present, settlement) entry is
 * still Posted. reverseEntry is the idempotency authority, so a sale already reversed is a
 * no-op classified as an idempotent hit. Fault-isolated: an isolated failure is logged and the
 * batch continues.
 */
export async function reconcileSaleCancellations(
  deps: SaleCancellationReconcileDeps,
): Promise<ReconcileSummary> {
  const sales = await deps.listCancelledSales();
  const summary: ReconcileSummary = { total: sales.length, synced: 0, idempotentHits: 0, failed: 0 };

  for (const sale of sales) {
    try {
      if (!sale.unitId) {
        throw new Error(`Venda '${sale.saleId}' sem unitId — não reconciliável.`);
      }
      const scope = resolveAccountingScope({ userId: sale.ownerUserId }, sale.unitId);

      let didReverse = false;
      // Revenue + (adaptive D2-Q4) settlement: reverse each that is still Posted.
      for (const sourceType of ['sale.finalized', 'sale.settled']) {
        const entry = await deps.findEntry(scope, sourceType, sale.saleId);
        if (entry && entry.status === 'Posted') {
          await deps.reverse(scope, sale.unitId, entry.id);
          didReverse = true;
        } else if (entry && entry.status === 'Reconciled') {
          // INCR4-B: a bank-reconciled entry blocks the reversal — surface it as a
          // FAILURE (never an idempotent hit): the pending estorno would otherwise
          // be silently masked until someone unmatches.
          throw new Error(
            `Entry '${entry.id}' (${sourceType}) está conciliado — desfaça a conciliação (unmatch) antes de estornar.`,
          );
        }
      }

      if (didReverse) {
        summary.synced++;
        logger.info('Reconcile reversed cancelled sale', { saleId: sale.saleId });
      } else {
        // Nothing Posted to reverse (already reversed, or never booked) — idempotent.
        summary.idempotentHits++;
      }
    } catch (error) {
      // Poison/defer (Council 1.5): the reversal path can hit the period gate too — BLOCKED.
      const skipCode = classifyBlockedSyncError(error);
      if (skipCode) {
        summary.blocked = (summary.blocked ?? 0) + 1;
        logger.warn('Reconcile blocked for cancelled sale — deterministic non-retriable code, skipping', {
          saleId: sale.saleId,
          code: skipCode,
          error: error instanceof Error ? error.message : String(error),
        });
        continue;
      }
      summary.failed++;
      logger.error('Reconcile failed for cancelled sale — continuing', {
        saleId: sale.saleId,
        error: error instanceof Error ? error.message : String(error),
      });
      continue;
    }
  }

  logger.info('Sale cancellations reconcile complete', { ...summary });
  return summary;
}

/** A `Returned` sale normalized from its DynamicTable row, with its owning tenant. */
export interface ReturnedSale {
  ownerUserId: string;
  saleId: string;
  unitId: string;
  amount: number;
  currency: string;
  occurredAt: string;
}

export interface SaleReturnReconcileDeps {
  listReturnedSales: () => Promise<ReturnedSale[]>;
  hasExistingEntry: (
    scope: AccountingScope,
    sourceType: string,
    sourceId: string,
  ) => Promise<boolean>;
  sync: (scope: AccountingScope, event: AccountingEvent) => Promise<SyncResult>;
}

/**
 * Re-drive every Returned sale lacking a 'sale.returned' contra-revenue entry.
 * Mirrors reconcileSaleSales (sync of a new entry, not a reversal). Idempotent and
 * fault-isolated.
 */
export async function reconcileSaleReturns(deps: SaleReturnReconcileDeps): Promise<ReconcileSummary> {
  const sales = await deps.listReturnedSales();
  const summary: ReconcileSummary = { total: sales.length, synced: 0, idempotentHits: 0, failed: 0 };

  for (const sale of sales) {
    try {
      if (!sale.unitId) {
        throw new Error(`Venda '${sale.saleId}' sem unitId — não reconciliável.`);
      }
      const scope = resolveAccountingScope({ userId: sale.ownerUserId }, sale.unitId);
      const event = buildSaleReturnedEvent({
        saleId: sale.saleId,
        unitId: sale.unitId,
        amount: sale.amount,
        currency: sale.currency,
        occurredAt: sale.occurredAt,
        label: `Devolução ${sale.saleId}`,
      });

      // Classify already-booked returns (idempotent hit). sync() remains the authority even if
      // a race slips past this check — postEntry dedupes on (sourceType, sourceId).
      const exists = await deps.hasExistingEntry(scope, event.sourceType, event.sourceId);
      if (exists) {
        summary.idempotentHits++;
        continue;
      }

      const result = await deps.sync(scope, event);
      summary.synced++;
      logger.info('Reconcile booked sale return', { saleId: sale.saleId, entryId: result.entryId });
    } catch (error) {
      // Poison/defer (Council 1.5): skip-listed deterministic code → BLOCKED, not failed.
      const skipCode = classifyBlockedSyncError(error);
      if (skipCode) {
        summary.blocked = (summary.blocked ?? 0) + 1;
        logger.warn('Reconcile blocked for sale return — deterministic non-retriable code, skipping', {
          saleId: sale.saleId,
          code: skipCode,
          error: error instanceof Error ? error.message : String(error),
        });
        continue;
      }
      summary.failed++;
      logger.error('Reconcile failed for sale return — continuing', {
        saleId: sale.saleId,
        error: error instanceof Error ? error.message : String(error),
      });
      continue;
    }
  }

  logger.info('Sale returns reconcile complete', { ...summary });
  return summary;
}

/** A `Finalized` + `Paid` sale normalized from its DynamicTable row, with its owning tenant. */
export interface SettledSale {
  ownerUserId: string;
  saleId: string;
  unitId: string;
  amount: number;
  currency: string;
  occurredAt: string;
  paymentMethod: string;
  /** True for an all-Package sale — its A Receber opening is 'sale.package.sold', not revenue. */
  isAllPackage?: boolean;
}

export interface SaleSettlementReconcileDeps {
  listSettledSales: () => Promise<SettledSale[]>;
  hasExistingEntry: (
    scope: AccountingScope,
    sourceType: string,
    sourceId: string,
  ) => Promise<boolean>;
  sync: (scope: AccountingScope, event: AccountingEvent) => Promise<SyncResult>;
}

/**
 * Re-drive every Finalized+Paid sale lacking a 'sale.settled' entry — the durability
 * net for the post-commit SaleSettlementBridge (and the only coverage for a sale born
 * Finalized+Paid). Mirrors reconcileSaleSales (sync of a new entry, not a reversal).
 *
 * ORDERING: the settlement clears A Receber, which only exists if the revenue entry was booked. A
 * sale Finalized+Paid whose 'sale.finalized' entry is still missing is counted as BLOCKED
 * (deferred), NOT failed — a later run settles it once the revenue pass has booked the receivable.
 * Idempotent and fault-isolated: an isolated failure is logged and the batch continues.
 */
export async function reconcileSaleSettlements(
  deps: SaleSettlementReconcileDeps,
): Promise<ReconcileSummary> {
  const sales = await deps.listSettledSales();
  const summary: ReconcileSummary = {
    total: sales.length,
    synced: 0,
    idempotentHits: 0,
    failed: 0,
    blocked: 0,
  };

  for (const sale of sales) {
    try {
      if (!sale.unitId) {
        throw new Error(`Venda '${sale.saleId}' sem unitId — não reconciliável.`);
      }
      const scope = resolveAccountingScope({ userId: sale.ownerUserId }, sale.unitId);

      // Already settled? idempotent hit (sync stays the authority even if a race slips past).
      const exists = await deps.hasExistingEntry(scope, 'sale.settled', sale.saleId);
      if (exists) {
        summary.idempotentHits++;
        continue;
      }

      // Ordering gate: without the A Receber opening entry there is nothing to clear — defer
      // (blocked), do NOT fail the batch. The opening is the revenue entry for a normal sale, or
      // the prepaid origin ('sale.package.sold') for an all-Package sale (Incremento G P6).
      const openingSourceType = sale.isAllPackage ? 'sale.package.sold' : 'sale.finalized';
      const hasOpening = await deps.hasExistingEntry(scope, openingSourceType, sale.saleId);
      if (!hasOpening) {
        summary.blocked = (summary.blocked ?? 0) + 1;
        logger.warn('Reconcile settlement blocked — opening entry missing', {
          saleId: sale.saleId,
          openingSourceType,
        });
        continue;
      }

      const event = buildSaleSettledEvent({
        saleId: sale.saleId,
        unitId: sale.unitId,
        amount: sale.amount,
        currency: sale.currency,
        occurredAt: sale.occurredAt,
        paymentMethod: sale.paymentMethod,
        label: `Liquidação ${sale.saleId}`,
      });

      const result = await deps.sync(scope, event);
      summary.synced++;
      logger.info('Reconcile booked sale settlement', {
        saleId: sale.saleId,
        entryId: result.entryId,
      });
    } catch (error) {
      // Poison/defer (Council 1.5): skip-listed deterministic code → BLOCKED, not failed.
      const skipCode = classifyBlockedSyncError(error);
      if (skipCode) {
        summary.blocked = (summary.blocked ?? 0) + 1;
        logger.warn('Reconcile blocked for sale settlement — deterministic non-retriable code, skipping', {
          saleId: sale.saleId,
          code: skipCode,
          error: error instanceof Error ? error.message : String(error),
        });
        continue;
      }
      summary.failed++;
      logger.error('Reconcile failed for sale settlement — continuing', {
        saleId: sale.saleId,
        error: error instanceof Error ? error.message : String(error),
      });
      continue;
    }
  }

  logger.info('Sale settlements reconcile complete', { ...summary });
  return summary;
}

// ───────────────────────────────────────────────────────────────────────────
// Sale CMV pass (INCR-INVENTORY Body 2, Gap 2 crash-recovery) — the durability net
// for the post-commit CMV seam (maybeSyncSaleCogs). The live emission runs the
// subledger baixa (tx1) then posts the razão (tx2, D 4.2 / C 1.1.6); if the process
// crashes between the two commits the baixa is durable but the razão is missing. This
// pass re-drives every Finalized non-package sale with product lines that has no
// 'sale.cogs' entry: recordSaleCogs is READ-FIRST idempotent (a replay returns
// the already-booked cents WITHOUT a second decrement), so re-driving posts the razão
// at most once and never double-baixa's stock.
// ───────────────────────────────────────────────────────────────────────────

/** A `Finalized` non-package sale with product lines needing a CMV entry. */
export interface CogsSale {
  ownerUserId: string;
  saleId: string;
  unitId: string;
  currency: string;
  occurredAt: string;
  /** Product lines for the CMV baixa; a sale with none has no cost to book (skipped upstream). */
  productLines: ProductLine[];
}

export interface SaleCogsReconcileDeps {
  listCogsSales: () => Promise<CogsSale[]>;
  hasExistingEntry: (
    scope: AccountingScope,
    sourceType: string,
    sourceId: string,
  ) => Promise<boolean>;
  /** Re-drive the subledger baixa (read-first idempotent) → total CMV cents (existing on replay). */
  recordSaleCogs: (
    scope: AccountingScope,
    params: { saleId: string; unitId: string; occurredAt: Date; lines: ProductLine[] },
  ) => Promise<{ totalCogsCents: number }>;
  sync: (scope: AccountingScope, event: AccountingEvent) => Promise<SyncResult>;
}

/**
 * Re-drive every Finalized non-package sale (with product lines) lacking a 'sale.cogs' entry:
 * run the read-first idempotent baixa, then post the razão. Idempotent and fault-isolated — an
 * isolated failure (insufficient stock, period closed, posting down) is logged and the batch
 * continues. A zero-cost result posts nothing (counted as an idempotent hit, not a failure).
 */
export async function reconcileSaleCogs(deps: SaleCogsReconcileDeps): Promise<ReconcileSummary> {
  const sales = await deps.listCogsSales();
  const summary: ReconcileSummary = { total: sales.length, synced: 0, idempotentHits: 0, failed: 0 };

  for (const sale of sales) {
    try {
      if (!sale.unitId) {
        throw new Error(`Venda '${sale.saleId}' sem unitId — CMV não reconciliável.`);
      }
      if (sale.productLines.length === 0) {
        // No product lines → no cost of goods; nothing to book.
        summary.idempotentHits++;
        continue;
      }
      const scope = resolveAccountingScope({ userId: sale.ownerUserId }, sale.unitId);

      // Already booked CMV? idempotent hit. sync() stays the authority even if a race slips past
      // this check — postEntry dedupes on ('sale.cogs', saleId).
      const exists = await deps.hasExistingEntry(scope, 'sale.cogs', sale.saleId);
      if (exists) {
        summary.idempotentHits++;
        continue;
      }

      // Re-drive the baixa (tx1). READ-FIRST idempotent: a prior run that baixa'd but crashed before
      // posting returns the SAME cents here with NO second decrement — this is the Gap 2 recovery path.
      const { totalCogsCents } = await deps.recordSaleCogs(scope, {
        saleId: sale.saleId,
        unitId: sale.unitId,
        occurredAt: new Date(sale.occurredAt),
        lines: sale.productLines,
      });
      if (totalCogsCents <= 0) {
        // Zero-cost sale (e.g. every product line valued at 0) — nothing to post.
        summary.idempotentHits++;
        continue;
      }

      const event = buildSaleCogsEvent({
        saleId: sale.saleId,
        unitId: sale.unitId,
        costCents: totalCogsCents,
        currency: sale.currency,
        occurredAt: sale.occurredAt,
        label: `CMV Venda ${sale.saleId}`,
      });
      const result = await deps.sync(scope, event);
      summary.synced++;
      logger.info('Reconcile booked sale CMV', { saleId: sale.saleId, entryId: result.entryId });
    } catch (error) {
      summary.failed++;
      logger.error('Reconcile failed for sale CMV — continuing', {
        saleId: sale.saleId,
        error: error instanceof Error ? error.message : String(error),
      });
      continue;
    }
  }

  logger.info('Sale CMV reconcile complete', { ...summary });
  return summary;
}

// ───────────────────────────────────────────────────────────────────────────
// Prepaid package passes (Incremento G P6) — durability net for the package origin
// (C 2.1.1 + balance credit) and consumption (balance debit), plus a warn-only
// balance↔2.1.1 reconciliation. All idempotent, fault-isolated, never autocorrecting.
// ───────────────────────────────────────────────────────────────────────────

/** An all-Package `Finalized` sale, with its single distinct package and owning tenant. */
export interface PackageOriginSale {
  ownerUserId: string;
  saleId: string;
  unitId: string;
  amount: number;
  currency: string;
  occurredAt: string;
  customerId: string;
  /** The single distinct packageId for the sale ('' when not exactly one — credit is skipped). */
  packageId: string;
}

export interface SalePackageOriginReconcileDeps {
  listPackageSales: () => Promise<PackageOriginSale[]>;
  hasExistingEntry: (scope: AccountingScope, sourceType: string, sourceId: string) => Promise<boolean>;
  sync: (scope: AccountingScope, event: AccountingEvent) => Promise<SyncResult>;
  hasCreditMovement: (scope: AccountingScope, saleId: string) => Promise<boolean>;
  creditBalance: (
    scope: AccountingScope,
    cmd: { customerId: string; packageId: string; saleId: string; amountCents: number },
  ) => Promise<void>;
}

/**
 * Re-drive every all-Package Finalized sale: book its 'sale.package.sold' origin (D 1.1.2 /
 * C 2.1.1) if missing, AND credit the prepaid balance if the credit movement is missing. Both
 * idempotent; fault-isolated. The credit needs a customerId and exactly one packageId — without
 * them it is skipped (warn), never inferred.
 */
export async function reconcileSalePackageOrigin(
  deps: SalePackageOriginReconcileDeps,
): Promise<ReconcileSummary> {
  const sales = await deps.listPackageSales();
  const summary: ReconcileSummary = { total: sales.length, synced: 0, idempotentHits: 0, failed: 0 };

  for (const sale of sales) {
    try {
      if (!sale.unitId) {
        throw new Error(`Venda de pacote '${sale.saleId}' sem unitId — não reconciliável.`);
      }
      const scope = resolveAccountingScope({ userId: sale.ownerUserId }, sale.unitId);

      // (1) Origin posting (C 2.1.1) — idempotent on (sourceType, sourceId).
      const hasOrigin = await deps.hasExistingEntry(scope, 'sale.package.sold', sale.saleId);
      if (hasOrigin) {
        summary.idempotentHits++;
      } else {
        const event = buildSalePackageSoldEvent({
          saleId: sale.saleId,
          unitId: sale.unitId,
          amount: sale.amount,
          currency: sale.currency,
          occurredAt: sale.occurredAt,
          label: `Pacote pré-pago — Venda ${sale.saleId}`,
        });
        const result = await deps.sync(scope, event);
        summary.synced++;
        logger.info('Reconcile booked package origin', { saleId: sale.saleId, entryId: result.entryId });
      }

      // (2) Balance credit — idempotent per (saleId,'credit'). Needs customer + single package.
      if (sale.customerId && sale.packageId && Number.isFinite(sale.amount)) {
        const hasCredit = await deps.hasCreditMovement(scope, sale.saleId);
        if (!hasCredit) {
          await deps.creditBalance(scope, {
            customerId: sale.customerId,
            packageId: sale.packageId,
            saleId: sale.saleId,
            amountCents: Math.round(sale.amount * 100),
          });
          logger.info('Reconcile credited package balance', { saleId: sale.saleId });
        }
      } else {
        logger.warn('Reconcile package credit skipped — missing customerId/packageId', {
          saleId: sale.saleId,
        });
      }
    } catch (error) {
      // Poison/defer (Council 1.5): skip-listed deterministic code → BLOCKED, not failed.
      const skipCode = classifyBlockedSyncError(error);
      if (skipCode) {
        summary.blocked = (summary.blocked ?? 0) + 1;
        logger.warn('Reconcile blocked for package origin — deterministic non-retriable code, skipping', {
          saleId: sale.saleId,
          code: skipCode,
          error: error instanceof Error ? error.message : String(error),
        });
        continue;
      }
      summary.failed++;
      logger.error('Reconcile failed for package origin — continuing', {
        saleId: sale.saleId,
        error: error instanceof Error ? error.message : String(error),
      });
      continue;
    }
  }

  logger.info('Sale package origin reconcile complete', { ...summary });
  return summary;
}

/** A `Finalized` + `Paid` Package-Balance sale (a consumption), with its owning tenant. */
export interface PackageConsumptionSale {
  ownerUserId: string;
  saleId: string;
  unitId: string;
  amount: number;
  customerId: string;
  /** The package the sale was paid from — persisted at payment time, NEVER inferred. */
  paidWithPackageId: string;
}

export interface SalePackageConsumptionReconcileDeps {
  listPackageConsumptions: () => Promise<PackageConsumptionSale[]>;
  hasDebitMovement: (scope: AccountingScope, saleId: string) => Promise<boolean>;
  debitBalance: (
    scope: AccountingScope,
    cmd: { customerId: string; packageId: string; saleId: string; amountCents: number },
  ) => Promise<void>;
}

/**
 * Re-drive the balance debit for every Finalized+Paid Package-Balance sale whose debit movement is
 * missing. The package is read from the persisted paidWithPackageId — if absent, the sale is BLOCKED
 * (blocked_missing_paid_with_package_id), never inferred. Idempotent per (saleId,'debit'); the
 * atomic decrement keeps balanceCents >= 0, so an insufficient balance fails this item (logged) and
 * the batch continues — it never produces a negative balance.
 */
export async function reconcileSalePackageConsumption(
  deps: SalePackageConsumptionReconcileDeps,
): Promise<ReconcileSummary> {
  const sales = await deps.listPackageConsumptions();
  const summary: ReconcileSummary = { total: sales.length, synced: 0, idempotentHits: 0, failed: 0, blocked: 0 };

  for (const sale of sales) {
    try {
      if (!sale.unitId) {
        throw new Error(`Consumo '${sale.saleId}' sem unitId — não reconciliável.`);
      }
      const scope = resolveAccountingScope({ userId: sale.ownerUserId }, sale.unitId);

      if (!sale.paidWithPackageId || !sale.customerId) {
        summary.blocked = (summary.blocked ?? 0) + 1;
        logger.warn('Reconcile debit blocked — blocked_missing_paid_with_package_id', {
          saleId: sale.saleId,
        });
        continue;
      }

      const hasDebit = await deps.hasDebitMovement(scope, sale.saleId);
      if (hasDebit) {
        summary.idempotentHits++;
        continue;
      }

      await deps.debitBalance(scope, {
        customerId: sale.customerId,
        packageId: sale.paidWithPackageId,
        saleId: sale.saleId,
        amountCents: Math.round(sale.amount * 100),
      });
      summary.synced++;
      logger.info('Reconcile debited package balance', { saleId: sale.saleId });
    } catch (error) {
      // Insufficient (the atomic decrement refuses, never going negative) or transient — fail this
      // item, never autocorrect, continue the batch.
      summary.failed++;
      logger.error('Reconcile failed for package consumption — continuing', {
        saleId: sale.saleId,
        error: error instanceof Error ? error.message : String(error),
      });
      continue;
    }
  }

  logger.info('Sale package consumption reconcile complete', { ...summary });
  return summary;
}

/** A per-(tenant,unit) prepaid-balance total to compare against the 2.1.1 liability. */
export interface PackageBalanceSum {
  ownerUserId: string;
  unitId: string;
  balanceCents: number;
}

export interface PackageBalanceVsLiabilityDeps {
  listBalanceSums: () => Promise<PackageBalanceSum[]>;
  /** Current 2.1.1 'Pacotes Pré-pagos' liability balance in cents for the scope. */
  getLiabilityCents: (scope: AccountingScope) => Promise<number>;
}

/**
 * WARN-ONLY reconciliation: compare Σ(CustomerPackageBalance.balanceCents) against the 2.1.1
 * liability per (tenant, unit). A divergence is logged for a human to investigate — this pass
 * NEVER writes anything (no autocorrection). Returns the divergence count.
 */
export async function reconcilePackageBalanceVsLiability(
  deps: PackageBalanceVsLiabilityDeps,
): Promise<{ checked: number; divergences: number }> {
  const rows = await deps.listBalanceSums();
  let divergences = 0;

  for (const row of rows) {
    try {
      const scope = resolveAccountingScope({ userId: row.ownerUserId }, row.unitId);
      const liabilityCents = await deps.getLiabilityCents(scope);
      if (liabilityCents !== row.balanceCents) {
        divergences++;
        logger.warn('Package balance ↔ 2.1.1 divergence (warn-only, not autocorrected)', {
          ownerUserId: row.ownerUserId,
          unitId: row.unitId,
          balanceCents: row.balanceCents,
          liabilityCents,
        });
      }
    } catch (error) {
      logger.error('Package balance ↔ 2.1.1 check failed — continuing', {
        ownerUserId: row.ownerUserId,
        unitId: row.unitId,
        error: error instanceof Error ? error.message : String(error),
      });
      continue;
    }
  }

  logger.info('Package balance ↔ 2.1.1 reconcile complete', { checked: rows.length, divergences });
  return { checked: rows.length, divergences };
}

/** Sum two summaries into one (the job runs CRM + sale passes and reports the total). */
function mergeSummaries(a: ReconcileSummary, b: ReconcileSummary): ReconcileSummary {
  return {
    total: a.total + b.total,
    synced: a.synced + b.synced,
    idempotentHits: a.idempotentHits + b.idempotentHits,
    failed: a.failed + b.failed,
    blocked: (a.blocked ?? 0) + (b.blocked ?? 0),
  };
}

/** Production wiring: assemble real collaborators and run BOTH reconciliation passes. */
export async function runAccountingSyncReconcile(): Promise<ReconcileSummary> {
  const factory = getFactory();
  const dtRepo = factory.getDynamicTableRepository();
  const sync = factory.getAccountingSyncService();
  const posting = factory.getPostingService();
  const journalRepo = new JournalEntryRepository();
  const watermarkRepo = new JobWatermarkRepository();

  // Everything below is the body of ONE reconciliation round, closed over `updatedAtFrom` (the
  // trailing watermark — see the module docstring and `withReconcileWatermark`). It is invoked
  // by `withReconcileWatermark` below, which only persists the advanced watermark if this
  // resolves without throwing.
  const runPasses = async (updatedAtFrom: Date): Promise<ReconcileSummary> => {
    const hasExistingEntry = (scope: AccountingScope, sourceType: string, sourceId: string) =>
      journalRepo.findBySource(scope, sourceType, sourceId).then((entry) => entry != null);
    const doSync = (scope: AccountingScope, event: AccountingEvent) => sync.sync(scope, event);

    // For the cancellations pass: locate an entry (id + status) and reverse it via PostingService.
    const findEntry = (scope: AccountingScope, sourceType: string, sourceId: string) =>
      journalRepo
        .findBySource(scope, sourceType, sourceId)
        .then((entry) => (entry ? { id: entry.id, status: entry.status } : null));
    const reverse = async (scope: AccountingScope, unitId: string, entryId: string) => {
      await posting.reverseEntry(scope, {
        unitId,
        lancamentoId: entryId,
        reversalPostingDate: new Date().toISOString(),
      });
    };

    /** Normalize the sale `sales` rows of a given status across every tenant, since the watermark. */
    const listSalesByStatus = async (status: string) => {
      const tables = await prisma.dynamicTable.findMany({
        where: { internalName: 'sales' },
        select: { id: true, userId: true },
      });
      const out: Array<{ ownerUserId: string; row: { id: string; data: Record<string, unknown> } }> = [];
      for (const table of tables) {
        const rows = await dtRepo.findRowsByFieldValueSince(table.id, 'status', status, updatedAtFrom);
        for (const row of rows) {
          out.push({ ownerUserId: table.userId, row: { id: row.id, data: row.data as Record<string, unknown> } });
        }
      }
      return out;
    };

    // Prepaid package collaborators (Incremento G P6). PackageBalanceRepository is instantiated here
    // (same pattern as JournalEntryRepository) — features/packages is reused, not modified.
    const pkgRepo = new PackageBalanceRepository();
    const pkgService = factory.getPackageBalanceService();
    const hasCreditMovement = (scope: AccountingScope, saleId: string) =>
      pkgRepo.findMovement(scope, saleId, 'credit').then((m) => m != null);
    const hasDebitMovement = (scope: AccountingScope, saleId: string) =>
      pkgRepo.findMovement(scope, saleId, 'debit').then((m) => m != null);
    const creditBalance = (
      scope: AccountingScope,
      cmd: { customerId: string; packageId: string; saleId: string; amountCents: number },
    ) => pkgService.creditFromSale(scope, cmd);
    const debitBalance = (
      scope: AccountingScope,
      cmd: { customerId: string; packageId: string; saleId: string; amountCents: number },
    ) => pkgService.debitForConsumption(scope, cmd);

    // Classify every Finalized sale ONCE (all-Package routing + single packageId), reused by the
    // revenue pass (skip all-Package), the package-origin pass and the settlement ordering gate.
    const classifiedFinalized = await (async () => {
      const found = await listSalesByStatus('Finalized');
      const out: Array<{
        ownerUserId: string;
        row: { id: string; data: Record<string, unknown> };
        isAllPackage: boolean;
        packageId: string;
        revenueByNature: { serviceReais: number; productReais: number };
        productLines: ProductLine[];
      }> = [];
      for (const { ownerUserId, row } of found) {
        const info = await loadSalePackageInfo(ownerUserId, row.id);
        out.push({
          ownerUserId,
          row,
          isAllPackage: info.kind === 'Package',
          packageId: info.packageIds.length === 1 ? info.packageIds[0] : '',
          revenueByNature: info.revenueByNature,
          productLines: info.productLines,
        });
      }
      return out;
    })();

    const crm = await reconcileCrmReceivables({
      listWonOpportunities: async () => {
        // Cross-tenant discovery: every crmOpportunities table (each owned by a userId).
        const tables = await prisma.dynamicTable.findMany({
          where: { internalName: 'crmOpportunities' },
          select: { id: true, userId: true },
        });
        const out: WonOpportunity[] = [];
        for (const table of tables) {
          const rows = await dtRepo.findRowsByFieldValueSince(table.id, 'status', 'Won', updatedAtFrom);
          for (const row of rows) {
            const data = row.data as Record<string, unknown>;
            out.push({
              ownerUserId: table.userId,
              opportunityId: row.id,
              unitId: typeof data.unitId === 'string' ? data.unitId : '',
              amount: typeof data.amount === 'number' ? data.amount : NaN,
              occurredAt:
                typeof data.closedAt === 'string' ? data.closedAt : new Date().toISOString(),
              label: typeof data.name === 'string' ? data.name : `Oportunidade ${row.id}`,
              accountRef: typeof data.accountId === 'string' ? data.accountId : undefined,
            });
          }
        }
        return out;
      },
      book: (scope, fact) => factory.getCrmReceivableBridge().bookWonOpportunity(scope, fact),
    });

    const sale = await reconcileSaleSales({
      listFinalizedSales: async () =>
        classifiedFinalized.map(({ ownerUserId, row, isAllPackage, revenueByNature }) => ({
          ownerUserId,
          saleId: row.id,
          unitId: typeof row.data.unitId === 'string' ? row.data.unitId : '',
          amount: typeof row.data.totalAmount === 'number' ? row.data.totalAmount : NaN,
          currency: typeof row.data.currency === 'string' ? row.data.currency : 'BRL',
          occurredAt: typeof row.data.date === 'string' ? row.data.date : new Date().toISOString(),
          isAllPackage,
          revenueByNature,
        })),
      hasExistingEntry,
      sync: doSync,
    });

    const cancellations = await reconcileSaleCancellations({
      listCancelledSales: async () => {
        const found = await listSalesByStatus('Cancelled');
        return found.map(({ ownerUserId, row }) => ({
          ownerUserId,
          saleId: row.id,
          unitId: typeof row.data.unitId === 'string' ? row.data.unitId : '',
        }));
      },
      findEntry,
      reverse,
    });

    const returns = await reconcileSaleReturns({
      listReturnedSales: async () => {
        const found = await listSalesByStatus('Returned');
        return found.map(({ ownerUserId, row }) => ({
          ownerUserId,
          saleId: row.id,
          unitId: typeof row.data.unitId === 'string' ? row.data.unitId : '',
          amount: typeof row.data.totalAmount === 'number' ? row.data.totalAmount : NaN,
          currency: typeof row.data.currency === 'string' ? row.data.currency : 'BRL',
          occurredAt:
            typeof row.data.returnedAt === 'string'
              ? row.data.returnedAt
              : typeof row.data.date === 'string'
                ? row.data.date
                : new Date().toISOString(),
        }));
      },
      hasExistingEntry,
      sync: doSync,
    });

    const settlements = await reconcileSaleSettlements({
      listSettledSales: async () =>
        classifiedFinalized
          .filter(({ row }) => row.data.paymentStatus === 'Paid')
          .map(({ ownerUserId, row, isAllPackage }) => ({
            ownerUserId,
            saleId: row.id,
            unitId: typeof row.data.unitId === 'string' ? row.data.unitId : '',
            amount: typeof row.data.totalAmount === 'number' ? row.data.totalAmount : NaN,
            currency: typeof row.data.currency === 'string' ? row.data.currency : 'BRL',
            occurredAt:
              typeof row.data.paidAt === 'string'
                ? row.data.paidAt
                : typeof row.data.date === 'string'
                  ? row.data.date
                  : new Date().toISOString(),
            paymentMethod: typeof row.data.paymentMethod === 'string' ? row.data.paymentMethod : '',
            isAllPackage,
          })),
      hasExistingEntry,
      sync: doSync,
    });

    // Sale CMV (INCR-INVENTORY Body 2) — re-drive the cost-of-goods razão for every Finalized
    // non-package sale with product lines whose 'sale.cogs' entry is missing (Gap 2 recovery).
    const cogs = await reconcileSaleCogs({
      listCogsSales: async () =>
        classifiedFinalized
          .filter(({ isAllPackage, productLines }) => !isAllPackage && productLines.length > 0)
          .map(({ ownerUserId, row, productLines }) => ({
            ownerUserId,
            saleId: row.id,
            unitId: typeof row.data.unitId === 'string' ? row.data.unitId : '',
            currency: typeof row.data.currency === 'string' ? row.data.currency : 'BRL',
            occurredAt: typeof row.data.date === 'string' ? row.data.date : new Date().toISOString(),
            productLines,
          })),
      hasExistingEntry,
      recordSaleCogs: (scope, params) => factory.getInventoryService().recordSaleCogs(scope, params),
      sync: doSync,
    });

    // Package origin (C 2.1.1 + balance credit) for every all-Package Finalized sale.
    const packageOrigin = await reconcileSalePackageOrigin({
      listPackageSales: async () =>
        classifiedFinalized
          .filter(({ isAllPackage }) => isAllPackage)
          .map(({ ownerUserId, row, packageId }) => ({
            ownerUserId,
            saleId: row.id,
            unitId: typeof row.data.unitId === 'string' ? row.data.unitId : '',
            amount: typeof row.data.totalAmount === 'number' ? row.data.totalAmount : NaN,
            currency: typeof row.data.currency === 'string' ? row.data.currency : 'BRL',
            occurredAt: typeof row.data.date === 'string' ? row.data.date : new Date().toISOString(),
            customerId: typeof row.data.customerId === 'string' ? row.data.customerId : '',
            packageId,
          })),
      hasExistingEntry,
      sync: doSync,
      hasCreditMovement,
      creditBalance,
    });

    // Package consumption (balance debit) for every Finalized+Paid Package-Balance sale.
    const packageConsumption = await reconcileSalePackageConsumption({
      listPackageConsumptions: async () =>
        classifiedFinalized
          .filter(
            ({ row }) => row.data.paymentStatus === 'Paid' && row.data.paymentMethod === 'Package Balance',
          )
          .map(({ ownerUserId, row }) => ({
            ownerUserId,
            saleId: row.id,
            unitId: typeof row.data.unitId === 'string' ? row.data.unitId : '',
            amount: typeof row.data.totalAmount === 'number' ? row.data.totalAmount : NaN,
            customerId: typeof row.data.customerId === 'string' ? row.data.customerId : '',
            paidWithPackageId:
              typeof row.data.paidWithPackageId === 'string' ? row.data.paidWithPackageId : '',
          })),
      hasDebitMovement,
      debitBalance,
    });

    // Warn-only: prepaid balance Σ vs 2.1.1 liability per (tenant, unit). Never autocorrects.
    await reconcilePackageBalanceVsLiability({
      listBalanceSums: async () => {
        const grouped = await prisma.customerPackageBalance.groupBy({
          by: ['userId', 'unitId'],
          where: { deletedAt: null },
          _sum: { balanceCents: true },
        });
        return grouped.map((g) => ({
          ownerUserId: g.userId,
          unitId: g.unitId,
          balanceCents: g._sum.balanceCents ?? 0,
        }));
      },
      getLiabilityCents: async (scope: AccountingScope) => {
        const account = await prisma.account.findFirst({
          where: { userId: scope.ownerUserId, unitId: scope.unitId, code: '2.1.1', deletedAt: null },
          select: { id: true },
        });
        if (!account) return 0;
        const agg = await prisma.posting.aggregate({
          // Same ledger-status class as the reports (see LEDGER_STATUSES JSDoc): including
          // 'Reconciled' keeps the liability balance stable once a package entry is bank-reconciled.
          where: { accountId: account.id, entry: { status: { in: LEDGER_STATUSES } } },
          _sum: { debitCents: true, creditCents: true },
        });
        // 2.1.1 is a liability (credit-normal): balance = Σcredit − Σdebit.
        return (agg._sum.creditCents ?? 0) - (agg._sum.debitCents ?? 0);
      },
    });

    return [crm, sale, cancellations, returns, settlements, cogs, packageOrigin, packageConsumption].reduce(
      mergeSummaries,
    );
  };

  return withReconcileWatermark(
    {
      getWatermark: () => watermarkRepo.get(RECONCILE_WATERMARK_JOB),
      setWatermark: (watermarkAt) => watermarkRepo.set(RECONCILE_WATERMARK_JOB, watermarkAt),
      now: () => new Date(),
    },
    runPasses,
  );
}
