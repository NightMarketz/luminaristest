import { describe, it, expect } from 'vitest';
import { resolveError, resolveErrorWithCode } from '../resolveError';

const FALLBACK = 'Ocorreu um erro.';

describe('resolveErrorWithCode (canonical accounting error resolver)', () => {
  it('extracts the server `error` string (standard controller error body)', () => {
    expect(resolveErrorWithCode({ success: false, error: 'Período fechado.', status: 409 }, FALLBACK))
      .toEqual({ message: 'Período fechado.', code: undefined });
  });

  it('prefers `message` over `error` when both are strings (global 500 handler shape)', () => {
    expect(
      resolveErrorWithCode(
        { error: 'Internal server error', message: 'SQLITE_BUSY: database is locked', status: 500 },
        FALLBACK
      ).message
    ).toBe('SQLITE_BUSY: database is locked');
  });

  it('carries a string `code` through (AP/AR branching)', () => {
    expect(
      resolveErrorWithCode({ error: 'Período fechado.', code: 'PERIOD_CLOSED', status: 409 }, FALLBACK)
    ).toEqual({ message: 'Período fechado.', code: 'PERIOD_CLOSED' });
  });

  it('ignores a non-string `code`', () => {
    expect(resolveErrorWithCode({ error: 'x', code: 42 }, FALLBACK).code).toBeUndefined();
  });

  it('humanizes a flattened Zod 400 `error` — same "campo: msg" text as the apiClient toast', () => {
    const zod400 = {
      success: false,
      error: { formErrors: [], fieldErrors: { signers: ['0930.IND_CRC falta o dígito verificador'] } },
      status: 400,
    };
    expect(resolveErrorWithCode(zod400, FALLBACK)).toEqual({
      message: 'signers: 0930.IND_CRC falta o dígito verificador',
      code: undefined,
    });
  });

  it('joins fieldErrors and formErrors of a Zod flatten', () => {
    const err = { error: { formErrors: ['Body inválido'], fieldErrors: { date: ['Invalid', 'Required'] } } };
    expect(resolveError(err, FALLBACK)).toBe('date: Invalid, Required; Body inválido');
  });

  it("falls back to the caller's (translated) fallback on an EMPTY Zod flatten", () => {
    expect(resolveError({ error: { formErrors: [], fieldErrors: {} } }, FALLBACK)).toBe(FALLBACK);
  });

  it('keeps string precedence: `message` wins over a Zod flatten `error`', () => {
    const err = { message: 'Mais específico', error: { formErrors: [], fieldErrors: { x: ['y'] } } };
    expect(resolveError(err, FALLBACK)).toBe('Mais específico');
  });

  it('carries `code` alongside a humanized Zod flatten', () => {
    const err = { error: { fieldErrors: { a: ['b'] } }, code: 'VALIDATION' };
    expect(resolveErrorWithCode(err, FALLBACK)).toEqual({ message: 'a: b', code: 'VALIDATION' });
  });

  it('falls back when `error` is a non-flatten object — never "[object Object]"', () => {
    expect(resolveErrorWithCode({ error: { foo: 1 }, status: 400 }, FALLBACK)).toEqual({
      message: FALLBACK,
      code: undefined,
    });
  });

  it('falls back on null / undefined / primitive throws', () => {
    expect(resolveErrorWithCode(null, FALLBACK).message).toBe(FALLBACK);
    expect(resolveErrorWithCode(undefined, FALLBACK).message).toBe(FALLBACK);
    expect(resolveErrorWithCode('boom', FALLBACK).message).toBe(FALLBACK);
  });
});

describe('resolveError (string wrapper)', () => {
  it('returns just the message', () => {
    expect(resolveError({ error: 'Falhou.' }, FALLBACK)).toBe('Falhou.');
    expect(resolveError({}, FALLBACK)).toBe(FALLBACK);
  });
});
