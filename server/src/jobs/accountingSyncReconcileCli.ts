/**
 * accountingSyncReconcileCli — thin manual-reprocess entry point for the AccountingSync
 * reconciliation job (Incremento B.1). It does NOT duplicate reconciliation logic: it
 * invokes the existing `runAccountingSyncReconcile()`, prints the structured summary,
 * and maps the result to a process exit code (0 when failed=0, non-zero otherwise).
 *
 * Run (compiled): `npm run accounting:reconcile` (→ node dist/jobs/accountingSyncReconcileCli.js).
 */
import prisma from '../lib/prisma';
import logger from '../lib/logger';
import { sendAlertWebhook } from '../lib/alertWebhook';
import { runAccountingSyncReconcile } from './accountingSyncReconcile.job';

const JOB = 'accounting_sync_reconcile';

/**
 * Runs one reconciliation pass and returns the intended exit code.
 * Always disconnects Prisma in `finally`. Never calls process.exit (testable).
 */
export async function runCli(): Promise<number> {
  const startedAtMs = Date.now();
  try {
    const summary = await runAccountingSyncReconcile();
    const blocked = summary.blocked ?? 0;
    const pendingWriteFailed = summary.pendingWriteFailed ?? 0;
    const completeContext = {
      job: JOB,
      event: 'cli_complete',
      total: summary.total,
      synced: summary.synced,
      idempotentHits: summary.idempotentHits,
      failed: summary.failed,
      blocked,
      pendingWriteFailed,
      durationMs: Date.now() - startedAtMs,
    };
    logger.info(JOB, completeContext);
    // Operator-facing structured line on stdout.
    process.stdout.write(`${JSON.stringify({ job: JOB, ...summary })}\n`);
    // Alert criterion mirrors the scheduler (F-W2C-2: `blocked>0 || failed>0`), plus
    // `pendingWriteFailed>0` (pós-review achado 4): the one case where an item ends up with NO
    // trace anywhere (watermark held by Fork 5-b) must not fail silently either.
    if (blocked > 0 || summary.failed > 0 || pendingWriteFailed > 0) {
      sendAlertWebhook({
        ...completeContext,
        source: 'accounting_sync_reconcile',
        event: 'reconcile_summary',
        timestamp: new Date().toISOString(),
      });
    }
    // Exit code stays failed-only for `blocked` (a deliberate, deterministic skip, not a
    // retry-worthy failure) but now also flips non-zero on `pendingWriteFailed` (pós-review
    // achado 4): unlike `blocked`, a pending-write failure leaves the item with no row anywhere,
    // so an operator running this CLI manually needs a non-zero exit, not just the alert.
    return summary.failed === 0 && pendingWriteFailed === 0 ? 0 : 1;
  } catch (error) {
    logger.error(JOB, {
      job: JOB,
      event: 'cli_failed',
      errorName: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startedAtMs,
    });
    return 1;
  } finally {
    await prisma.$disconnect().catch(() => {
      /* best-effort disconnect */
    });
  }
}

// Only self-execute when run directly (not when imported by a test).
if (require.main === module) {
  void runCli().then((code) => process.exit(code));
}
