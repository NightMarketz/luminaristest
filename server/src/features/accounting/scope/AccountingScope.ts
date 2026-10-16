/**
 * AccountingScope — per-request resolved accounting context.
 *
 * Separates the logical data owner (ownerUserId) from the actor performing the
 * operation (actorUserId). Today they are always the same user; the split avoids a
 * tenancy refactor when a unit needs to be shared between users — only
 * resolveAccountingScopeInternal() changes, not every table. Controllers HTTP resolvem pelo
 * AccountingScopeResolver (valida o unitId contra `units`, nó I6); a função síncrona é só dos chamadores
 * internos, cujo unitId vem de linha já gravada.
 *
 * ledgerCode, baseCurrencyCode, and timeZone are domain constants for now. Including
 * them in the scope means the future multi-ledger/currency work slots in cleanly.
 */
export interface AccountingScope {
  /** Logical owner of the accounting data — maps to userId in DB rows. */
  ownerUserId: string;
  /** User performing the action — used for authorship (createdById, postedById). */
  actorUserId: string;
  /** Business unit scoped string (a DynamicTable row id used as plain scope key). */
  unitId: string;
  /** Single implicit ledger — no Ledger table yet. */
  ledgerCode: 'DEFAULT';
  /** Base currency code for this scope. */
  baseCurrencyCode: 'BRL';
  /** Locale time zone for period resolution. */
  timeZone: 'America/Sao_Paulo';
  /** Marca do resolver: a linha de `units` está soft-deleted (só aparece com access 'read'; F-I6-4 b, nó I6). */
  unitDeleted?: true;
}

/** Returns a Prisma-compatible { userId, unitId } where-clause derived from a scope. */
export function accountingScopeWhere(scope: AccountingScope): { userId: string; unitId: string } {
  return { userId: scope.ownerUserId, unitId: scope.unitId };
}
