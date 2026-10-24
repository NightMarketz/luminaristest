/**
 * Nó OBS, item 10 (F-OBS-7 a): each scheduler fires the remote alert when its pass throws, with its own `source`.
 * The run fn, log and alert are injected — no timer, no DB.
 *
 * ADR-OBSERVABILIDADE item 7 (F-OBS-14 a; OBS-R11): the case table is checked against the `jobs/*Scheduler.ts` on
 * disk, so a new scheduler without a case turns this suite red instead of slipping in without an alert test.
 * Item 7b: `AccountingSyncScheduler` used to alert only on a bad summary, never on a thrown pass (A9).
 */
import fs from 'fs';
import path from 'path';
import { AccountingSyncScheduler } from '../AccountingSyncScheduler';
import { CollectionChargePollScheduler } from '../CollectionChargePollScheduler';
import { DfePollScheduler } from '../DfePollScheduler';
import { LegalParamsRecalcScheduler } from '../LegalParamsRecalcScheduler';
import { MpReleaseReportScheduler } from '../MpReleaseReportScheduler';
import { PtaxRateScheduler } from '../PtaxRateScheduler';

const boom = () => Promise.reject(new Error('upstream down'));
const silentLog = () => ({ event: jest.fn() });

const cases: { file: string; source: string; build: (alert: jest.Mock) => { runOnce(): Promise<unknown> } }[] = [
  { file: 'AccountingSyncScheduler.ts', source: 'accounting_sync_reconcile', build: (alert) => new AccountingSyncScheduler({ reconcile: boom, log: silentLog(), alert }) },
  { file: 'CollectionChargePollScheduler.ts', source: 'collection_charge_poll', build: (alert) => new CollectionChargePollScheduler({ poll: boom, log: silentLog(), alert }) },
  { file: 'DfePollScheduler.ts', source: 'dfe_poll', build: (alert) => new DfePollScheduler({ poll: boom, log: silentLog(), alert }) },
  { file: 'LegalParamsRecalcScheduler.ts', source: 'legal_params_recalc', build: (alert) => new LegalParamsRecalcScheduler({ run: boom, log: silentLog(), alert }) },
  { file: 'MpReleaseReportScheduler.ts', source: 'mp_release_report', build: (alert) => new MpReleaseReportScheduler({ fetch: boom, log: silentLog(), alert }) },
  { file: 'PtaxRateScheduler.ts', source: 'ptax_rate', build: (alert) => new PtaxRateScheduler({ sync: boom, log: silentLog(), alert }) },
];

it('every jobs/*Scheduler.ts on disk has a failure-alert case below', () => {
  const onDisk = fs.readdirSync(path.resolve(__dirname, '..')).filter((f) => /Scheduler\.ts$/.test(f)).sort();
  expect(onDisk).toEqual(cases.map((c) => c.file).sort());
});

describe.each(cases)('$source — alert on failure', ({ source, build }) => {
  it('fires job_failed with the error message and still rethrows', async () => {
    const alert = jest.fn();
    await expect(build(alert).runOnce()).rejects.toThrow('upstream down');
    expect(alert).toHaveBeenCalledTimes(1);
    expect(alert).toHaveBeenCalledWith(
      expect.objectContaining({ source, event: 'job_failed', error: 'upstream down', timestamp: expect.any(String) }),
    );
  });
});
