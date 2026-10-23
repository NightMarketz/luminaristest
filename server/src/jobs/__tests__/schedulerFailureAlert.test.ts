/**
 * Nó OBS, item 10 (F-OBS-7 a): each of the 5 schedulers that used to fail only into the log now also
 * fires the remote alert, with its own `source`. The run fn, log and alert are injected — no timer, no DB.
 */
import { CollectionChargePollScheduler } from '../CollectionChargePollScheduler';
import { DfePollScheduler } from '../DfePollScheduler';
import { LegalParamsRecalcScheduler } from '../LegalParamsRecalcScheduler';
import { MpReleaseReportScheduler } from '../MpReleaseReportScheduler';
import { PtaxRateScheduler } from '../PtaxRateScheduler';

const boom = () => Promise.reject(new Error('upstream down'));
const silentLog = () => ({ event: jest.fn() });

const cases: { source: string; build: (alert: jest.Mock) => { runOnce(): Promise<unknown> } }[] = [
  { source: 'collection_charge_poll', build: (alert) => new CollectionChargePollScheduler({ poll: boom, log: silentLog(), alert }) },
  { source: 'dfe_poll', build: (alert) => new DfePollScheduler({ poll: boom, log: silentLog(), alert }) },
  { source: 'legal_params_recalc', build: (alert) => new LegalParamsRecalcScheduler({ run: boom, log: silentLog(), alert }) },
  { source: 'mp_release_report', build: (alert) => new MpReleaseReportScheduler({ fetch: boom, log: silentLog(), alert }) },
  { source: 'ptax_rate', build: (alert) => new PtaxRateScheduler({ sync: boom, log: silentLog(), alert }) },
];

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
