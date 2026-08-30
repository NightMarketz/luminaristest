/**
 * Unit tests for the Metrics timing helper — the timer computes a duration and routes success→info /
 * failure→warn, forwarding extra context. (A thin log-based helper by design, not a metrics backend.)
 */
import { metrics } from '../monitoring';
import { logger } from '../logger';

describe('metrics.startTimer', () => {
  it('logs success at info with a numeric duration, the metric name, and extra context', () => {
    const spy = jest.spyOn(logger, 'info').mockImplementation(() => {});
    const end = metrics.startTimer('my_op');
    end({ success: true, count: 3 });

    expect(spy).toHaveBeenCalledTimes(1);
    const [msg, ctx] = spy.mock.calls[0] as [string, Record<string, unknown>];
    expect(msg).toContain('my_op');
    expect(ctx.status).toBe('success');
    expect(ctx.metricName).toBe('my_op');
    expect(typeof ctx.duration).toBe('number');
    expect(ctx.count).toBe(3);
    spy.mockRestore();
  });

  it('logs failure at warn', () => {
    const spy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
    metrics.startTimer('op2')({ success: false });

    expect(spy).toHaveBeenCalledTimes(1);
    const ctx = spy.mock.calls[0][1] as Record<string, unknown>;
    expect(ctx.status).toBe('failure');
    spy.mockRestore();
  });

  // BRIEF-W2-D (F4): warnThresholdMs is additive — omitted, log-level decision is unchanged
  // (regression for the 7 pre-existing call sites, none of which pass it).
  describe('warnThresholdMs (BRIEF-W2-D)', () => {
    it('a slow-but-successful call logs at warn when duration exceeds warnThresholdMs', () => {
      jest.useFakeTimers();
      const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
      const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});

      const end = metrics.startTimer('slow_op');
      jest.advanceTimersByTime(1500);
      end({ success: true, warnThresholdMs: 1000 });

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(infoSpy).not.toHaveBeenCalled();
      const ctx = warnSpy.mock.calls[0][1] as Record<string, unknown>;
      expect(ctx.status).toBe('success'); // status still reflects `success`, only log level moved
      expect(ctx.duration).toBe(1500);
      expect(ctx.warnThresholdMs).toBeUndefined(); // internal threshold field is not leaked into the log line

      warnSpy.mockRestore();
      infoSpy.mockRestore();
      jest.useRealTimers();
    });

    it('a fast successful call under warnThresholdMs stays at info (no regression)', () => {
      jest.useFakeTimers();
      const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
      const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});

      const end = metrics.startTimer('fast_op');
      jest.advanceTimersByTime(500);
      end({ success: true, warnThresholdMs: 1000 });

      expect(infoSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).not.toHaveBeenCalled();

      warnSpy.mockRestore();
      infoSpy.mockRestore();
      jest.useRealTimers();
    });

    it('a failure still logs at warn regardless of warnThresholdMs (unchanged precedence)', () => {
      const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
      metrics.startTimer('failing_fast_op')({ success: false, warnThresholdMs: 999999 });

      expect(warnSpy).toHaveBeenCalledTimes(1);
      warnSpy.mockRestore();
    });

    it('omitting warnThresholdMs entirely preserves the pre-BRIEF-W2-D behavior (7 live call sites)', () => {
      jest.useFakeTimers();
      const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});

      const end = metrics.startTimer('no_threshold_op');
      jest.advanceTimersByTime(10_000); // arbitrarily "slow" — no threshold means no warn escalation
      end({ success: true });

      expect(infoSpy).toHaveBeenCalledTimes(1);

      infoSpy.mockRestore();
      jest.useRealTimers();
    });
  });
});
