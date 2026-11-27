/**
 * BE-INCR-ESCALA-BASE item 41 — a passada diária do `SchedulingHolidaySyncScheduler` (`syncHolidaysForAllOwners`):
 * ano corrente e o seguinte, por dono; um dono que falha não impede os outros, e a rodada falha no fim (alerta).
 * O caso de alerta do scheduler está em `schedulerFailureAlert.test.ts` (F-OBS-14).
 */
import type { UserContext } from '../../lib/authUtils';
import { syncHolidaysForAllOwners } from '../SchedulingHolidaySyncScheduler';

const ctx = (id: string) => ({ id, userId: id }) as UserContext;
const log = () => ({ event: jest.fn() });

describe('syncHolidaysForAllOwners (item 41)', () => {
  it('gera o ano corrente e o seguinte de cada dono e soma o resumo', async () => {
    const sync = jest.fn(async (_u: UserContext, _i: { year: number }) => ({ created: 2, skipped: 1, deletedByUser: 0 }));
    const out = await syncHolidaysForAllOwners({
      owners: async () => ['a', 'b'],
      contextOf: async (id) => ctx(id),
      sync,
      log: log(),
      now: () => new Date('2027-06-15T12:00:00Z'),
    });
    expect(sync.mock.calls.map(([u, i]) => [u.userId, i.year])).toEqual([
      ['a', 2027],
      ['a', 2028],
      ['b', 2027],
      ['b', 2028],
    ]);
    expect(out).toEqual({ owners: 2, created: 8, skipped: 4, deletedByUser: 0, failed: 0, years: [2027, 2028] });
  });

  it('dono sem usuário (tabela órfã) é pulado', async () => {
    const sync = jest.fn(async () => ({ created: 0, skipped: 0, deletedByUser: 0 }));
    const out = await syncHolidaysForAllOwners({ owners: async () => ['gone'], contextOf: async () => null, sync, log: log() });
    expect(sync).not.toHaveBeenCalled();
    expect(out.owners).toBe(0);
  });

  it('um dono que falha não impede o seguinte; a rodada lança no fim e o log leva só o id', async () => {
    const l = log();
    const sync = jest.fn(async (u: UserContext) => {
      if (u.userId === 'a') throw new Error('calendário fora');
      return { created: 1, skipped: 0, deletedByUser: 0 };
    });
    await expect(
      syncHolidaysForAllOwners({ owners: async () => ['a', 'b'], contextOf: async (id) => ctx(id), sync, log: l, now: () => new Date('2027-01-01T00:00:00Z') }),
    ).rejects.toThrow(/1 de 2 dono\(s\) falharam/);
    expect(sync.mock.calls.filter(([u]) => u.userId === 'b')).toHaveLength(2);
    expect(l.event).toHaveBeenCalledWith('error', 'job.reconcile_item_failed', 'scheduling_holiday_sync', expect.objectContaining({ userId: 'a', error: 'calendário fora' }));
  });
});
