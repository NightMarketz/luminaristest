import { ForbiddenError } from '../../../../lib/errors';
import { resolveAccountingScope } from '../../scope/AccountingScope';
import type { ReconcilePendingItem } from 'generated/prisma';
import type { IReconcilePendingRepository } from '../../repositories/IReconcilePendingRepository';
import type { IAccountingPolicy } from '../../policies/IAccountingPolicy';
import type { AuditService } from '../AuditService';

// The service calls `retryOneReconcilePendingItem` directly (system-actor job core, reused —
// not re-injected as a collaborator, mirroring how the job itself instantiates its repos
// directly). Mock the job module so the unit suite drives `rescan()` deterministically.
const retryMock = jest.fn();
jest.mock('../../../../jobs/accountingSyncReconcile.job', () => ({
  retryOneReconcilePendingItem: (...args: unknown[]) => retryMock(...args),
}));

import { ReconcilePendingService } from '../ReconcilePendingService';

const scope = resolveAccountingScope({ userId: 'owner-1' }, 'unit-1');

function pendingRow(over: Partial<ReconcilePendingItem> = {}): ReconcilePendingItem {
  return {
    id: 'rpi-1',
    userId: 'owner-1',
    unitId: 'unit-1',
    sourceType: 'sale.finalized',
    sourceId: 'sale-1',
    reasonCode: 'FAILED',
    reasonDetail: 'boom',
    firstSeenAt: new Date('2026-09-01T00:00:00.000Z'),
    lastSeenAt: new Date('2026-09-01T00:00:00.000Z'),
    resolvedAt: null,
    attempts: 1,
    ...over,
  } as ReconcilePendingItem;
}

interface Opts {
  canRead?: boolean;
  canManage?: boolean;
  findManyResult?: { items: ReconcilePendingItem[]; hasMore: boolean };
  findUnresolvedResult?: ReconcilePendingItem[];
}

function build(opts: Opts = {}) {
  const resolvePending = jest.fn(async () => 1);
  const bumpAttempts = jest.fn(async () => 1);
  const runTransaction = jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({}));
  const auditAppend = jest.fn(async (_tx: unknown, _scope: unknown, _input: unknown) => {});

  const repo = {
    upsertPending: jest.fn(),
    resolvePending,
    bumpAttempts,
    findById: jest.fn(),
    findManyByUnit: jest.fn(async () => opts.findManyResult ?? { items: [], hasMore: false }),
    findUnresolved: jest.fn(async () => opts.findUnresolvedResult ?? []),
    runTransaction,
  } as unknown as IReconcilePendingRepository;
  const policy: IAccountingPolicy = {
    canReadReconcilePending: () => opts.canRead ?? true,
    canManageReconcilePending: () => opts.canManage ?? true,
  } as unknown as IAccountingPolicy;
  const auditService = { append: auditAppend } as unknown as AuditService;

  const service = new ReconcilePendingService(repo, policy, auditService);
  return { service, repo, resolvePending, bumpAttempts, runTransaction, auditAppend };
}

describe('ReconcilePendingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    retryMock.mockReset();
  });

  describe('list', () => {
    it('policy-first: canReadReconcilePending=false throws ForbiddenError BEFORE touching the repo', async () => {
      const { service, repo } = build({ canRead: false });
      await expect(
        service.list(scope, { unitId: 'unit-1', includeResolved: false, limit: 50 }),
      ).rejects.toThrow(ForbiddenError);
      expect(repo.findManyByUnit).not.toHaveBeenCalled();
    });

    it('maps rows to the view shape (ISO dates, resolvedAt null) and nextCursor=null when hasMore=false', async () => {
      const { service } = build({ findManyResult: { items: [pendingRow()], hasMore: false } });
      const result = await service.list(scope, { unitId: 'unit-1', includeResolved: false, limit: 50 });
      expect(result.items).toEqual([
        {
          id: 'rpi-1',
          sourceType: 'sale.finalized',
          sourceId: 'sale-1',
          reasonCode: 'FAILED',
          reasonDetail: 'boom',
          firstSeenAt: '2026-09-01T00:00:00.000Z',
          lastSeenAt: '2026-09-01T00:00:00.000Z',
          resolvedAt: null,
          attempts: 1,
        },
      ]);
      expect(result.nextCursor).toBeNull();
    });

    it('nextCursor = id of the LAST item when hasMore=true (keyset pagination)', async () => {
      const rows = [pendingRow({ id: 'a' }), pendingRow({ id: 'b', sourceId: 'sale-2' })];
      const { service } = build({ findManyResult: { items: rows, hasMore: true } });
      const result = await service.list(scope, { unitId: 'unit-1', includeResolved: false, limit: 2 });
      expect(result.nextCursor).toBe('b');
    });
  });

  describe('rescan', () => {
    it('policy-first: canManageReconcilePending=false throws ForbiddenError BEFORE touching the repo', async () => {
      const { service, repo } = build({ canManage: false });
      await expect(service.rescan(scope, { unitId: 'unit-1' })).rejects.toThrow(ForbiddenError);
      expect(repo.findUnresolved).not.toHaveBeenCalled();
    });

    it('resolved outcome: resolves the row + appends the audit event, IN the same tx (Fork 4-a)', async () => {
      const row = pendingRow();
      retryMock.mockResolvedValueOnce({ outcome: 'resolved' });
      const { service, resolvePending, auditAppend, bumpAttempts } = build({
        findUnresolvedResult: [row],
      });

      const result = await service.rescan(scope, { unitId: 'unit-1' });

      expect(result).toEqual({ attempted: 1, resolved: 1, stillPending: 0 });
      expect(resolvePending).toHaveBeenCalledWith(scope, 'sale.finalized', 'sale-1', {});
      expect(auditAppend).toHaveBeenCalledTimes(1);
      const auditInput = auditAppend.mock.calls[0]?.[2] as { payload: unknown };
      expect(auditInput).toEqual(
        expect.objectContaining({
          eventType: 'reconcile_pending.rescanned',
          targetType: 'ReconcilePendingItem',
          targetId: 'rpi-1',
        }),
      );
      // No PII / free-text reasonDetail leaks into the audit payload.
      expect(auditInput.payload).toEqual({ pendingId: 'rpi-1', sourceType: 'sale.finalized', outcome: 'resolved' });
      expect(bumpAttempts).not.toHaveBeenCalled();
    });

    it('still_pending outcome: bumps attempts, does NOT resolve nor audit (item 7 — poison stays pending)', async () => {
      const row = pendingRow({ reasonCode: 'MAX_CENTS_EXCEEDED' });
      retryMock.mockResolvedValueOnce({ outcome: 'still_pending' });
      const { service, resolvePending, auditAppend, bumpAttempts } = build({
        findUnresolvedResult: [row],
      });

      const result = await service.rescan(scope, { unitId: 'unit-1' });

      expect(result).toEqual({ attempted: 1, resolved: 0, stillPending: 1 });
      expect(resolvePending).not.toHaveBeenCalled();
      expect(auditAppend).not.toHaveBeenCalled();
      expect(bumpAttempts).toHaveBeenCalledWith(scope, 'sale.finalized', 'sale-1');
    });

    it('a retry that THROWS stays pending and NEVER propagates (checklist item 6: "nenhuma exceção sobe")', async () => {
      const row = pendingRow();
      retryMock.mockRejectedValueOnce(new Error('ledger genuinely down'));
      const { service, bumpAttempts } = build({ findUnresolvedResult: [row] });

      await expect(service.rescan(scope, { unitId: 'unit-1' })).resolves.toEqual({
        attempted: 1,
        resolved: 0,
        stillPending: 1,
      });
      expect(bumpAttempts).toHaveBeenCalledWith(scope, 'sale.finalized', 'sale-1');
    });

    it('re-runs SÓ the ids subset when given (never a fresh full scope scan)', async () => {
      const { service, repo } = build({ findUnresolvedResult: [] });
      await service.rescan(scope, { unitId: 'unit-1', ids: ['a', 'b'] });
      expect(repo.findUnresolved).toHaveBeenCalledWith(scope, ['a', 'b']);
    });
  });
});
