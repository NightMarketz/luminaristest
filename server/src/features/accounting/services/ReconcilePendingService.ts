import { ForbiddenError } from '../../../lib/errors';
import { logger } from '../../../lib/logger';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IReconcilePendingRepository } from '../repositories/IReconcilePendingRepository';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { AuditService } from './AuditService';
import { retryOneReconcilePendingItem } from '../../../jobs/accountingSyncReconcile.job';
import type {
  ListReconcilePendingQueryInput,
  RescanReconcilePendingInput,
  ReconcilePendingListView,
  RescanReconcilePendingResult,
  ReconcilePendingReasonCodeValue,
} from '../dtos/ReconcilePendingDto';

/**
 * ReconcilePendingService — BE-INCR-RECONCILE-PENDING (nó C7). FIRST-CLASS PRISMA, HTTP-facing
 * half of the pending-items table (Fork 3-b): list (read) and rescan (command). The WRITE path
 * that populates the table (`reportPending`/`reportResolved`, Fork 2-b) is wired directly in
 * `accountingSyncReconcile.job.ts`'s production closure — a system-actor job, not an HTTP
 * operation, so it bypasses this Service/Policy exactly like `JournalEntryRepository` is
 * instantiated directly there today (no actor to Policy-check against).
 */
export class ReconcilePendingService {
  constructor(
    private readonly repo: IReconcilePendingRepository,
    private readonly policy: IAccountingPolicy,
    private readonly auditService: AuditService,
  ) {}

  /** GET /api/reconcile-pending — keyset-paginated listing (checklist item 8). */
  async list(
    scope: AccountingScope,
    query: ListReconcilePendingQueryInput,
  ): Promise<ReconcilePendingListView> {
    if (!this.policy.canReadReconcilePending(scope)) throw new ForbiddenError();

    const { items, hasMore } = await this.repo.findManyByUnit(scope, {
      reasonCode: query.reasonCode,
      includeResolved: query.includeResolved,
      cursor: query.cursor,
      limit: query.limit,
    });

    return {
      items: items.map((item) => ({
        id: item.id,
        sourceType: item.sourceType,
        sourceId: item.sourceId,
        reasonCode: item.reasonCode as ReconcilePendingReasonCodeValue,
        reasonDetail: item.reasonDetail,
        firstSeenAt: item.firstSeenAt.toISOString(),
        lastSeenAt: item.lastSeenAt.toISOString(),
        resolvedAt: item.resolvedAt ? item.resolvedAt.toISOString() : null,
        attempts: item.attempts,
      })),
      nextCursor: hasMore ? items[items.length - 1].id : null,
    };
  }

  /**
   * POST /api/reconcile-pending/rescan (checklist item 6/7) — re-executes SÓ the unresolved
   * items of the scope (or the `ids` subset), reusing `retryOneReconcilePendingItem` (which
   * reuses the SAME `book`/`sync`/`reverse` collaborators as the bulk job — Fork 2-c's "no
   * parallel reimplementation" holds here too). A poison item (`MAX_CENTS_EXCEEDED`) is retried
   * like any other — idempotent, no extra cost — and simply stays pending (item 7).
   */
  async rescan(
    scope: AccountingScope,
    input: RescanReconcilePendingInput,
  ): Promise<RescanReconcilePendingResult> {
    if (!this.policy.canManageReconcilePending(scope)) throw new ForbiddenError();

    const targets = await this.repo.findUnresolved(scope, input.ids);
    let resolved = 0;

    for (const item of targets) {
      try {
        const outcome = await retryOneReconcilePendingItem(scope, {
          sourceType: item.sourceType,
          sourceId: item.sourceId,
        });

        if (outcome.outcome === 'resolved') {
          // Fork 4: audits ONLY because Fork 3 = (b) HTTP route — a human actor is behind this
          // call (unlike the bulk job, a system actor with no AuditService today). Same tx as
          // the resolve write (ACC-019/020 in-tx pattern).
          await this.repo.runTransaction(async (tx) => {
            await this.repo.resolvePending(scope, item.sourceType, item.sourceId, tx);
            await this.auditService.append(tx, scope, {
              actorUserId: scope.actorUserId,
              eventType: 'reconcile_pending.rescanned',
              targetType: 'ReconcilePendingItem',
              targetId: item.id,
              payload: {
                pendingId: item.id,
                sourceType: item.sourceType,
                outcome: 'resolved',
              },
            });
          });
          resolved++;
        } else {
          // Still pending (item 7 — e.g. MAX_CENTS_EXCEEDED still exceeding): bump attempts so
          // the retry is visible, WITHOUT re-describing the failure (reasonCode/reasonDetail stay
          // as the bulk job last captured them) and WITHOUT an audit event (nothing changed for a
          // human to trail — Fork 4 only fires on a resolve).
          await this.repo.bumpAttempts(scope, item.sourceType, item.sourceId);
        }
      } catch (error) {
        // Isolated failure must NOT stop the rescan (mirrors every bulk pass' own invariant) —
        // an exception from the retry (e.g. the ledger genuinely rejects it again) still counts
        // as "still pending", never propagates out of the command (checklist item 6: "nenhuma
        // exceção sobe").
        logger.warn('Reconcile pending rescan: retry failed for item — stays pending', {
          pendingId: item.id,
          sourceType: item.sourceType,
          sourceId: item.sourceId,
          error: error instanceof Error ? error.message : String(error),
        });
        await this.repo.bumpAttempts(scope, item.sourceType, item.sourceId);
      }
    }

    return { attempted: targets.length, resolved, stillPending: targets.length - resolved };
  }
}
