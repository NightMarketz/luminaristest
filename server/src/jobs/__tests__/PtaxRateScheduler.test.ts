/**
 * BE-INCR-CRM-REPORT-BUILDER PR-1 — item 23: o agendador da PTAX (molde de DfePollScheduler). Sem timer em teste.
 */
import { PtaxRateScheduler } from '../PtaxRateScheduler';
import type { PtaxSyncSummary } from '../../features/fx/services/PtaxSyncService';

const log = () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() });
const summary = (failed: number): PtaxSyncSummary => ({ calls: 2, saved: 2 - failed, failed, currencies: [] });

describe('PtaxRateScheduler', () => {
  it('falha do BCB numa moeda → warn com o resumo, sem lançar', async () => {
    const l = log();
    const s = new PtaxRateScheduler({ sync: async () => summary(1), log: l });
    await expect(s.runOnce()).resolves.toMatchObject({ failed: 1 });
    expect(l.warn).toHaveBeenCalledWith('ptax_rate_sync', expect.objectContaining({ event: 'complete', failed: 1 }));
  });

  it('sem falha → info', async () => {
    const l = log();
    await new PtaxRateScheduler({ sync: async () => summary(0), log: l }).runOnce();
    expect(l.info).toHaveBeenCalledWith('ptax_rate_sync', expect.objectContaining({ event: 'complete', failed: 0 }));
  });

  it('erro inesperado (ex.: banco) é logado como failed; o tick do start() engole', async () => {
    const l = log();
    const s = new PtaxRateScheduler({ sync: async () => { throw new Error('db'); }, log: l });
    await expect(s.runOnce()).rejects.toThrow('db');
    expect(l.error).toHaveBeenCalledWith('ptax_rate_sync', expect.objectContaining({ event: 'failed', error: 'db' }));
  });

  it('lock: execução concorrente é pulada', async () => {
    let release!: () => void;
    const s = new PtaxRateScheduler({ sync: () => new Promise((r) => { release = () => r(summary(0)); }), log: log() });
    const first = s.runOnce();
    await expect(s.runOnce()).resolves.toEqual({ skipped: 'lock' });
    release();
    await first;
  });

  it('não agenda timer sob NODE_ENV=test', () => {
    const l = log();
    new PtaxRateScheduler({ sync: async () => summary(0), log: l }).start();
    expect(l.info).toHaveBeenCalledWith('ptax_rate_sync', expect.objectContaining({ reason: 'disabled_in_test' }));
  });
});
