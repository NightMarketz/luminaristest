const runAccountingSyncReconcile = jest.fn();
const disconnect = jest.fn(async () => {});

jest.mock('../accountingSyncReconcile.job', () => ({
  __esModule: true,
  runAccountingSyncReconcile: (...a: unknown[]) => runAccountingSyncReconcile(...a),
}));
jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: { $disconnect: () => disconnect() },
}));
jest.mock('../../lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
const sendAlertWebhook = jest.fn();
jest.mock('../../lib/alertWebhook', () => ({
  __esModule: true,
  sendAlertWebhook: (...a: unknown[]) => sendAlertWebhook(...a),
}));

import { runCli } from '../accountingSyncReconcileCli';

describe('accountingSyncReconcileCli.runCli', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });
  afterEach(() => jest.restoreAllMocks());

  it('returns exit code 0 when failed=0 and disconnects Prisma', async () => {
    runAccountingSyncReconcile.mockResolvedValueOnce({ total: 2, synced: 2, idempotentHits: 0, failed: 0 });
    const code = await runCli();
    expect(code).toBe(0);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('returns a non-zero exit code when failed>0', async () => {
    runAccountingSyncReconcile.mockResolvedValueOnce({ total: 3, synced: 2, idempotentHits: 0, failed: 1 });
    expect(await runCli()).toBe(1);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('returns a non-zero exit code and still disconnects Prisma when the job throws', async () => {
    runAccountingSyncReconcile.mockRejectedValueOnce(new Error('db down'));
    expect(await runCli()).toBe(1);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('does not duplicate reconciliation logic — delegates to runAccountingSyncReconcile once', async () => {
    runAccountingSyncReconcile.mockResolvedValueOnce({ total: 0, synced: 0, idempotentHits: 0, failed: 0 });
    await runCli();
    expect(runAccountingSyncReconcile).toHaveBeenCalledTimes(1);
  });

  it('includes blocked in the cli_complete structured log and exits 0 (deliberate skip, not a failure) (A3)', async () => {
    runAccountingSyncReconcile.mockResolvedValueOnce({ total: 3, synced: 1, idempotentHits: 0, failed: 0, blocked: 2 });
    const code = await runCli();
    expect(code).toBe(0);

    const logger = jest.requireMock('../../lib/logger').default as { info: jest.Mock };
    const complete = logger.info.mock.calls.find((c) => c[1]?.event === 'cli_complete')?.[1];
    expect(complete).toMatchObject({ blocked: 2 });

    const written = (process.stdout.write as jest.Mock).mock.calls[0][0] as string;
    expect(JSON.parse(written)).toMatchObject({ blocked: 2 });
  });

  describe('durationMs (BRIEF-W2-D, layer 1)', () => {
    it('includes a numeric durationMs in the cli_complete structured log', async () => {
      runAccountingSyncReconcile.mockResolvedValueOnce({ total: 1, synced: 1, idempotentHits: 0, failed: 0 });
      await runCli();

      const logger = jest.requireMock('../../lib/logger').default as { info: jest.Mock };
      const complete = logger.info.mock.calls.find((c) => c[1]?.event === 'cli_complete')?.[1];
      expect(typeof complete.durationMs).toBe('number');
      expect(complete.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('includes a numeric durationMs in the cli_failed structured log', async () => {
      runAccountingSyncReconcile.mockRejectedValueOnce(new Error('db down'));
      await runCli();

      const logger = jest.requireMock('../../lib/logger').default as { error: jest.Mock };
      const failed = logger.error.mock.calls.find((c) => c[1]?.event === 'cli_failed')?.[1];
      expect(typeof failed.durationMs).toBe('number');
      expect(failed.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('alert webhook (F-W2C-2 — same criterion as the scheduler: blocked>0 || failed>0)', () => {
    it('does not call the webhook when failed=0 and blocked=0', async () => {
      runAccountingSyncReconcile.mockResolvedValueOnce({ total: 2, synced: 2, idempotentHits: 0, failed: 0 });
      await runCli();
      expect(sendAlertWebhook).not.toHaveBeenCalled();
    });

    it('calls the webhook with the reconcile_summary payload when failed>0', async () => {
      runAccountingSyncReconcile.mockResolvedValueOnce({ total: 3, synced: 2, idempotentHits: 0, failed: 1 });
      await runCli();

      expect(sendAlertWebhook).toHaveBeenCalledTimes(1);
      expect(sendAlertWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'accounting_sync_reconcile',
          event: 'reconcile_summary',
          job: 'accounting_sync_reconcile',
          failed: 1,
          blocked: 0,
        }),
      );
    });

    it('calls the webhook when blocked>0 even though failed=0 and the exit code stays 0 — alert criterion is NOT the exit code', async () => {
      runAccountingSyncReconcile.mockResolvedValueOnce({ total: 3, synced: 1, idempotentHits: 0, failed: 0, blocked: 2 });
      const code = await runCli();

      expect(code).toBe(0);
      expect(sendAlertWebhook).toHaveBeenCalledTimes(1);
      expect(sendAlertWebhook).toHaveBeenCalledWith(expect.objectContaining({ blocked: 2, failed: 0 }));
    });

    it('does not call the webhook when the job throws (no summary to report)', async () => {
      runAccountingSyncReconcile.mockRejectedValueOnce(new Error('db down'));
      await runCli();
      expect(sendAlertWebhook).not.toHaveBeenCalled();
    });
  });
});
