/**
 * BE-INCR-ESCALA-BASE item 46 — a passada diária do `SchedulingHrAbsenceReconcileScheduler`: um reconcile por dono, com o
 * dia UTC; o dono que falha não impede os outros, e a rodada falha no fim. O log leva só ids e contagens (sem PII). O caso
 * de alerta do scheduler está em `schedulerFailureAlert.test.ts` (F-OBS-14).
 */
import type { UserContext } from '../../lib/authUtils';
import type { HrAbsenceReconcileResult } from '../../features/scheduling/services/HrAbsenceProjectionService';
import { SchedulingHrAbsenceReconcileScheduler, reconcileHrAbsencesForAllOwners } from '../SchedulingHrAbsenceReconcileScheduler';

const ctx = (id: string) => ({ id, userId: id, email: `${id}@x.co`, name: 'Fulano' }) as UserContext;
const zero: HrAbsenceReconcileResult = { created: 0, updated: 0, deleted: 0, unchanged: 0, skippedNoEmployeeRef: 0, skippedUnitNotLive: 0 };

describe('reconcileHrAbsencesForAllOwners (item 46)', () => {
  it('um reconcile por dono, com o dia UTC, e o resumo somado', async () => {
    const reconcile = jest.fn(async (_u: UserContext, _t: string) => ({ ...zero, created: 1, skippedNoEmployeeRef: 2 }));
    const out = await reconcileHrAbsencesForAllOwners({
      owners: async () => ['a', 'b'],
      contextOf: async (id) => ctx(id),
      reconcile,
      log: { event: jest.fn() },
      now: () => new Date('2027-03-01T02:30:00Z'), // 23:30 do dia 28/02 em São Paulo: o dia da janela é o UTC
    });
    expect(reconcile.mock.calls.map(([u, t]) => [u.userId, t])).toEqual([
      ['a', '2027-03-01'],
      ['b', '2027-03-01'],
    ]);
    expect(out).toMatchObject({ owners: 2, failed: 0, created: 2, skippedNoEmployeeRef: 4, today: '2027-03-01' });
  });

  it('o dono que falha não impede o seguinte; a rodada lança no fim; o log não leva e-mail nem nome', async () => {
    const log = { event: jest.fn() };
    const reconcile = jest.fn(async (u: UserContext) => {
      if (u.userId === 'a') throw new Error('DP fora');
      return zero;
    });
    await expect(reconcileHrAbsencesForAllOwners({ owners: async () => ['a', 'b'], contextOf: async (id) => ctx(id), reconcile, log })).rejects.toThrow(
      /1 de 2 dono\(s\) falharam/,
    );
    expect(reconcile).toHaveBeenCalledTimes(2);
    const logged = JSON.stringify(log.event.mock.calls);
    expect(logged).toContain('"userId":"a"');
    expect(logged).not.toMatch(/@x\.co|Fulano/);
  });
});

describe('SchedulingHrAbsenceReconcileScheduler.runOnce', () => {
  it('vínculo sem pessoa operacional deixa o job.completed em warn', async () => {
    const log = { event: jest.fn() };
    const summary = { ...zero, owners: 1, failed: 0, today: '2027-03-01', skippedNoEmployeeRef: 1 };
    await new SchedulingHrAbsenceReconcileScheduler({ run: async () => summary, log, alert: jest.fn() }).runOnce();
    expect(log.event).toHaveBeenCalledWith('warn', 'job.completed', 'scheduling_hr_absence_reconcile', expect.objectContaining({ skippedNoEmployeeRef: 1 }));
  });
});
