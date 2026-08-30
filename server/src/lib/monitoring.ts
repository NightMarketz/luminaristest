import { logger } from './logger';

export interface MetricOptions {
  success: boolean;
  /**
   * Warn threshold in ms (BRIEF-W2-D, F4). Optional and backward-compatible: when omitted the
   * log-level decision is exactly what it was before this field existed (`success` alone decides
   * info vs warn) — none of the 7 pre-existing call sites (VectorRepository, DocumentProcessingService)
   * pass it, so their behavior is byte-for-byte unchanged.
   *
   * When provided, a call that took LONGER than this threshold logs at `warn` even though it
   * succeeded — logger.ts only persists `warn`/`error` to the NDJSON sink (info is console-only),
   * so without this a slow-but-successful run would never survive to disk.
   */
  warnThresholdMs?: number;
  /** Extra context forwarded to the log entry (e.g. ids, counts). */
  [key: string]: unknown;
}

export class Metrics {
  private static instance: Metrics;
  private constructor() {}

  public static getInstance(): Metrics {
    if (!Metrics.instance) {
      Metrics.instance = new Metrics();
    }
    return Metrics.instance;
  }

  startTimer(metricName: string): (options: MetricOptions) => void {
    const startTime = Date.now();

    return (options: MetricOptions) => {
      const duration = Date.now() - startTime;

      const isSlow = options.warnThresholdMs != null && duration > options.warnThresholdMs;
      const logLevel = !options.success || isSlow ? 'warn' : 'info';
      const status = options.success ? 'success' : 'failure';

      const { warnThresholdMs: _warnThresholdMs, ...rest } = options;
      logger[logLevel](`Metric: ${metricName}`, {
        ...rest,
        duration,
        status,
        metricName
      });
    };
  }
}

export const metrics = Metrics.getInstance();