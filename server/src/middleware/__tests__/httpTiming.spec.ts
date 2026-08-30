/**
 * httpTimingMiddleware — BRIEF-W2-D (F4, layer 2) unit test. Verifies the middleware wires
 * `Metrics.startTimer('http_request')` with `HTTP_WARN_THRESHOLD_MS` (F-W2D-1/F-W2D-2) and ends
 * the timer on `res.on('finish', ...)`, not before — a fake `res` (EventEmitter-shaped) is
 * enough here; the supertest-driven end-to-end proof that `finish` really fires for both 2xx and
 * 4xx/5xx through the real app lives in `httpTiming.integration.test.ts`.
 */
import { EventEmitter } from 'node:events';
import type { Request, Response } from 'express';
import { httpTimingMiddleware } from '../httpTiming';
import { HTTP_WARN_THRESHOLD_MS } from '../../lib/reportThresholds';

const endTimer = jest.fn();
const startTimer = jest.fn((..._args: unknown[]) => endTimer);
jest.mock('../../lib/monitoring', () => ({
  __esModule: true,
  metrics: { startTimer: (...a: unknown[]) => startTimer(...a) },
}));

function makeRes(statusCode: number): Response {
  const res = new EventEmitter() as unknown as Response;
  (res as unknown as { statusCode: number }).statusCode = statusCode;
  return res;
}

describe('httpTimingMiddleware', () => {
  beforeEach(() => jest.clearAllMocks());

  it('starts the timer immediately and calls next() without waiting for the response', () => {
    const req = { method: 'GET', originalUrl: '/api/x' } as Request;
    const res = makeRes(200);
    const next = jest.fn();

    httpTimingMiddleware(req, res, next);

    expect(startTimer).toHaveBeenCalledWith('http_request');
    expect(next).toHaveBeenCalledTimes(1);
    expect(endTimer).not.toHaveBeenCalled(); // not yet — only on 'finish'
  });

  it('ends the timer on res.finish with success:true, the configured warnThresholdMs, and request context', () => {
    const req = { method: 'POST', originalUrl: '/api/accounting/post' } as Request;
    const res = makeRes(201);
    httpTimingMiddleware(req, res, jest.fn());

    (res as unknown as EventEmitter).emit('finish');

    expect(endTimer).toHaveBeenCalledTimes(1);
    expect(endTimer).toHaveBeenCalledWith({
      success: true,
      warnThresholdMs: HTTP_WARN_THRESHOLD_MS,
      method: 'POST',
      path: '/api/accounting/post',
      statusCode: 201,
    });
  });

  it('still ends the timer on finish for a 4xx/5xx response (duration is reported regardless of outcome)', () => {
    const req = { method: 'GET', originalUrl: '/api/nope' } as Request;
    const res = makeRes(404);
    httpTimingMiddleware(req, res, jest.fn());

    (res as unknown as EventEmitter).emit('finish');

    expect(endTimer).toHaveBeenCalledWith(expect.objectContaining({ success: true, statusCode: 404 }));
  });
});
