import type { Request, Response, NextFunction } from 'express';
import { requestContext } from '../lib/requestContext';
import { appendAccessLog, parseClientPort, CLIENT_PORT_HEADER } from '../lib/accessLog';

/**
 * accessLogMiddleware — nó OBS, Fase B, item 11. Writes one access-log record per AUTHENTICATED request
 * when the response finishes. Mounted right after `requestContextMiddleware`: it keeps the same context
 * object, and `authMiddleware` fills `userId` on it later, so a request whose token was never validated
 * leaves no record. The route comes from the context, already without query.
 */
export function accessLogMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ctx = requestContext.get();
  const timestamp = new Date().toISOString();

  res.on('finish', () => {
    if (!ctx?.userId) return;
    appendAccessLog({
      timestamp,
      ip: req.ip ?? '',
      port: parseClientPort(req.headers[CLIENT_PORT_HEADER]),
      userId: ctx.userId,
      method: ctx.method,
      route: ctx.route,
      requestId: ctx.requestId,
    });
  });

  next();
}
