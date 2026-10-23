import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { requestContext } from '../lib/requestContext';

/** An inbound id is reused only if it is short and plain — anything else could inject into log lines. */
const INBOUND_REQUEST_ID = /^[A-Za-z0-9-]{8,64}$/;

/**
 * requestContextMiddleware — nó OBS, item 2. Opens the per-request context every later middleware and
 * handler runs inside, and echoes the id back as `X-Request-Id` so a user can quote it when reporting a
 * failure. Mounted before `httpTimingMiddleware` so even the timing line carries the id. `userId` is
 * filled in by `authMiddleware` (item 3).
 */
export function requestContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const inbound = req.headers['x-request-id'];
  const requestId = typeof inbound === 'string' && INBOUND_REQUEST_ID.test(inbound) ? inbound : randomUUID();

  res.setHeader('X-Request-Id', requestId);
  requestContext.run(
    { requestId, method: req.method, route: req.originalUrl.split('?')[0] },
    () => next(),
  );
}
