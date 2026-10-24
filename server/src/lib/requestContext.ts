import { AsyncLocalStorage } from 'async_hooks';

/**
 * requestContext — per-request identity carried across `await` without threading it through every call
 * (nó OBS, item 1 of PRE-ADR-OBSERVABILIDADE §5). `formatLog` reads it so every existing `logger.*` call
 * gains requestId/userId/route for free; this module is the ONLY read point.
 *
 * The context object is mutable on purpose: the request middleware creates it before auth runs, and
 * `authMiddleware` fills `userId` in later — same object, so no second `run()` is needed.
 */
export interface RequestContext {
  /** UUID v4, or a validated inbound `x-request-id`. */
  requestId: string;
  method: string;
  /** Path without query string — never the raw URL (F-OBS-3). */
  route: string;
  /** Set only after the token is validated. */
  userId?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export const requestContext = {
  run<T>(ctx: RequestContext, fn: () => T): T {
    return storage.run(ctx, fn);
  },

  /** `undefined` outside a request (jobs, boot, CLIs). */
  get(): RequestContext | undefined {
    return storage.getStore();
  },
};
