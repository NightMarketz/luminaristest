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
    const completeContext = {
      job: JOB,
      event: 'cli_complete',
      total: summary.total,
      synced: summary.synced,
      idempotentHits: summary.idempotentHits,
      failed: summary.failed,
      blocked,
      durationMs: Date.now() - startedAtMs,
    };
    logger.info(JOB, completeContext);
    // Operator-facing structured line on stdout.
    process.stdout.write(`${JSON.stringify({ job: JOB, ...summary })}\n`);
    // Alert criterion mirrors the scheduler (F-W2C-2: `blocked>0 || failed>0`), not the exit
    // code below — the exit code stays failed-only (blocked is a deliberate, deterministic
    // skip, not a retry-worthy failure), but the alert is about "something needs a human", which
    // blocked rows also signal.
    if (blocked > 0 || summary.failed > 0) {
      sendAlertWebhook({
        ...completeContext,
        source: 'accounting_sync_reconcile',
        event: 'reconcile_summary',
        timestamp: new Date().toISOString(),
      });
    }
    // Exit code stays failed-only: `blocked` is a deliberate, deterministic skip (not a retry-worthy
    // failure), so it must not flip the CLI's exit code — only surface it in the summary above.
    return summary.failed === 0 ? 0 : 1;
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
