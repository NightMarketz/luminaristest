/**
 * Unit tests for handleApiError — the centralized error→HTTP mapping (pure, no DB/HTTP).
 *
 * This is the single source of truth for status/code mapping, used by every controller catch AND by
 * the global Express error handler in app.ts. Locks the contract, especially the Prisma P2025 → 404
 * mapping added so update/delete races return 404 (not 500) even where not caught locally.
 */
import { handleApiError } from '../apiUtils';
import { AppError, ValidationError, NotFoundError, ForbiddenError } from '../errors';
import { ZodError, z } from 'zod';
import { logger } from '../logger';

/** Minimal Express `res` double capturing status + json. */
function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as { status: jest.Mock; json: jest.Mock };
}

const bodyOf = (res: { json: jest.Mock }) => res.json.mock.calls[0][0];

describe('handleApiError', () => {
  it('maps a ZodError to 400 VALIDATION_ERROR with issue details', () => {
    const res = mockRes();
    const err = z.object({ a: z.string() }).safeParse({});
    handleApiError((err as { error: ZodError }).error, res as any);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(bodyOf(res).code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(bodyOf(res).details)).toBe(true);
  });

  it('maps an AppError to its own status and code', () => {
    const res = mockRes();
    handleApiError(new ForbiddenError('nope'), res as any);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(bodyOf(res).code).toBe('FORBIDDEN');
  });

  it('includes ValidationError details when present', () => {
    const res = mockRes();
    handleApiError(new ValidationError('bad', { field: ['required'] }), res as any);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(bodyOf(res).details).toEqual({ field: ['required'] });
  });

  it('maps Prisma P2002 to 409 CONFLICT with the offending fields', () => {
    const res = mockRes();
    handleApiError({ code: 'P2002', meta: { target: ['email'] } }, res as any);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(bodyOf(res).code).toBe('CONFLICT');
    expect(bodyOf(res).details).toEqual({ fields: ['email'] });
  });

  it('maps Prisma P2025 to 404 NOT_FOUND (the new central mapping)', () => {
    const res = mockRes();
    handleApiError({ code: 'P2025', meta: {} }, res as any);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(bodyOf(res).code).toBe('NOT_FOUND');
  });

  it('maps an unknown error to 500 without leaking internals (non-development)', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const res = mockRes();
      handleApiError(new Error('secret stack detail'), res as any);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(bodyOf(res).code).toBe('INTERNAL_SERVER_ERROR');
      expect(bodyOf(res).details).toBeUndefined();
      expect(JSON.stringify(bodyOf(res))).not.toContain('secret stack detail');
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it('confirms NotFoundError still maps to 404 (AppError path)', () => {
    const res = mockRes();
    handleApiError(new NotFoundError('gone'), res as any);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

/** Nó OBS, item 6 (F-OBS-2 c): the log level follows the classified status, and a 4xx never carries the error. */
describe('handleApiError log level', () => {
  let spies: Record<'error' | 'warn' | 'info', jest.SpyInstance>;
  beforeEach(() => {
    spies = {
      error: jest.spyOn(logger, 'error').mockImplementation(() => {}),
      warn: jest.spyOn(logger, 'warn').mockImplementation(() => {}),
      info: jest.spyOn(logger, 'info').mockImplementation(() => {}),
    };
  });
  afterEach(() => Object.values(spies).forEach((s) => s.mockRestore()));

  it('an unknown error (500) is logged as error, with the error', () => {
    const err = new Error('db is gone');
    handleApiError(err, mockRes() as any);
    expect(spies.error).toHaveBeenCalledWith('[API Error Handler]', { statusCode: 500, code: 'INTERNAL_SERVER_ERROR', error: err });
  });

  it('a ZodError (400) is info with code and status only — never an error line', () => {
    const parsed = z.object({ a: z.string() }).safeParse({});
    handleApiError((parsed as { error: ZodError }).error, mockRes() as any);
    expect(spies.error).not.toHaveBeenCalled();
    expect(spies.info).toHaveBeenCalledWith('[API Error Handler]', { statusCode: 400, code: 'VALIDATION_ERROR' });
  });

  it('a 403 is warn with code and status only', () => {
    handleApiError(new ForbiddenError('nope'), mockRes() as any);
    expect(spies.error).not.toHaveBeenCalled();
    expect(spies.warn).toHaveBeenCalledWith('[API Error Handler]', { statusCode: 403, code: 'FORBIDDEN' });
  });

  it('a 404 is info', () => {
    handleApiError(new NotFoundError('gone'), mockRes() as any);
    expect(spies.info).toHaveBeenCalledWith('[API Error Handler]', { statusCode: 404, code: expect.any(String) });
    expect(spies.error).not.toHaveBeenCalled();
  });
});
