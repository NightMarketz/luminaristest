/**
 * `JSON.stringify` (and therefore Express's `res.json()`) throws `TypeError: Do not know how to
 * serialize a BigInt` the instant a raw `bigint` reaches it — and after BE-INCR-MONEY-BIGINT
 * (F-W2B-1/F2) every `*Cents` column read straight off Prisma IS a `bigint`. Every accounting
 * service that does arithmetic/comparisons on a `*Cents` value already converts at its own read
 * boundary (`centsFromDb`, `features/accounting/models/money.ts`) — that conversion is what keeps
 * business logic correct. This replacer is the LAST-RESORT net at the actual wire boundary: a
 * plain CRUD passthrough (a controller returning a raw `Payable`/`BankStatementLine`/... straight
 * from a repository) has no arithmetic site to hang a conversion off, so without this net it would
 * reach `res.json()` un-converted and 500 with an opaque serialization error instead of the real
 * response.
 *
 * Wired once via `app.set('json replacer', jsonBigintReplacer)` (see `app.ts`) — Express passes
 * this straight to the SAME `JSON.stringify` call it already performs, so there is no second
 * tree-walk/clone of the response body, only the substitution below during that one pass.
 *
 * F-W2B-3: converts to `number` (never `string` — diverges from the `AuditEvent.seq` precedent,
 * see `money.ts` for the full rationale) and throws LOUD instead of silently truncating if a
 * value ever exceeds `Number.MAX_SAFE_INTEGER`. That throw propagates out of `JSON.stringify`
 * inside `res.json()`, which every controller already calls from within its try/catch —
 * `handleApiError` maps it to a 500 exactly like any other unexpected error.
 */
export function jsonBigintReplacer(key: string, value: unknown): unknown {
  if (typeof value !== 'bigint') return value;
  const asNumber = Number(value);
  if (!Number.isSafeInteger(asNumber)) {
    throw new Error(
      `Response field '${key}' (bigint ${value.toString()}) exceeds Number.MAX_SAFE_INTEGER at the JSON boundary (F-W2B-3)`,
    );
  }
  return asNumber;
}
