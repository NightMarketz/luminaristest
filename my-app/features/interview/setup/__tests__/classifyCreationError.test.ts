import { describe, it, expect } from 'vitest';
import { classifyCreationError } from '../classifyCreationError';

// W7 item 4 (F-W7-2 a): a classificação decide se o "Tentar novamente" existe.
describe('classifyCreationError', () => {
  it.each([
    [null, null, 'retryable'],
    [500, null, 'retryable'],
    [502, { errorCode: 'X' }, 'retryable'],
    [500, { errorCode: 'ONBOARDING_ROLLED_BACK' }, 'retryable'],
    [500, { errorCode: 'ONBOARDING_ROLLBACK_FAILED' }, 'partial'],
    [403, { errorCode: 'ONBOARDING_ROLLBACK_FAILED' }, 'already-provisioned'],
    [400, null, 'invalid'],
  ] as const)('status %s, corpo %j ⇒ %s', (status, body, kind) => {
    expect(classifyCreationError(status, body)).toBe(kind);
  });
});
