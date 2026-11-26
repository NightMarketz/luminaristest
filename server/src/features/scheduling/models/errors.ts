/**
 * Códigos de erro da escala (BE-INCR-ESCALA-BASE §3.4, em inglês — R1). 400 com o código no `code` e no `details.reason`,
 * no molde do `dpValidationError`.
 */
import { ValidationError } from '../../../lib/errors';

export const SCHEDULING_ERROR_CODES = [
  'OUTSIDE_AVAILABILITY',
  'OVERRIDE_REASON_REQUIRED',
  'SCHEDULE_OVERLAP',
  'SCHEDULE_TARGET_REQUIRED',
  'EXCEPTION_READ_ONLY',
  'RANGE_TOO_LARGE',
] as const;
export type SchedulingErrorCode = (typeof SCHEDULING_ERROR_CODES)[number];

export function schedulingError(code: SchedulingErrorCode, message: string, extra: Record<string, unknown> = {}): ValidationError {
  return new ValidationError(message, { reason: code, ...extra }, code);
}
