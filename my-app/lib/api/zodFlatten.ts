/** Zod `.flatten()` shape returned by controllers on safeParse-fail 400s. */
export type ZodFlatten = { formErrors?: string[]; fieldErrors?: Record<string, string[]> };

export function isZodFlatten(v: unknown): v is ZodFlatten {
  return typeof v === 'object' && v !== null && ('fieldErrors' in v || 'formErrors' in v);
}

/**
 * Turn a Zod `.flatten()` object into "campo: erro; campo: erro" instead of the
 * `String(obj)` → "[object Object]" the toast used to show. Returns `empty`
 * (default: a generic pt-BR hint) when the flatten carries no readable messages,
 * so callers with a translated fallback (accounting `resolveError`) can pass it.
 */
export function humanizeZodFlatten(
  err: ZodFlatten,
  empty = 'Verifique os campos e tente novamente.'
): string {
  const parts: string[] = [];
  for (const [field, msgs] of Object.entries(err.fieldErrors || {})) {
    if (msgs && msgs.length) parts.push(`${field}: ${msgs.join(', ')}`);
  }
  if (err.formErrors && err.formErrors.length) parts.push(...err.formErrors);
  return parts.length ? parts.join('; ') : empty;
}
