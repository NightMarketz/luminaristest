import type { Request, Response, NextFunction } from 'express';
import { metrics } from '../lib/monitoring';
import { HTTP_WARN_THRESHOLD_MS } from '../lib/reportThresholds';

/**
 * httpTimingMiddleware — BRIEF-W2-D (F4, layer 2). Measures the WHOLE request lifecycle from
 * this middleware's own position onward (mounted right after compression(), before json() —
 * see app.ts and F-W2D-2): body parsing, authMiddleware, and the route handler are all inside
 * the window. Extends the canonical `Metrics.startTimer` (server/src/lib/monitoring.ts) with
 * its new `warnThresholdMs` — no new dependency, `res.on('finish', ...)` is the same
 * `Date.now()`-based pattern the class already used.
 *
 * `res.on('finish')` fires for every response that leaves Express — 2xx, 4xx, 5xx, and even a
 * response produced by the centralized error handler — so a slow request is measured
 * regardless of its outcome. `success` is always `true` here: this middleware reports on
 * DURATION, not on HTTP outcome (the error handler / controller error logging already covers
 * failure reporting) — only `warnThresholdMs` decides the log level.
 */
export function httpTimingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const endTimer = metrics.startTimer('http_request');

  res.on('finish', () => {
    endTimer({
      success: true,
      warnThresholdMs: HTTP_WARN_THRESHOLD_MS,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
    });
  });

  next();
}
