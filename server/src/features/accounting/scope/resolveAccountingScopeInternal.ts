import type { AccountingScope } from './AccountingScope';

/**
 * Resolves an AccountingScope from an authenticated user and a unitId.
 * Today owner === actor === logged-in user.
 *
 * BE-INCR-SCOPE-UNIT-GUARD (nó I6, F-I6-1 d): NÃO valida o unitId — é só dos chamadores internos (jobs, bridges,
 * serviços cujo unitId vem de linha já gravada). Controller HTTP usa o `AccountingScopeResolver`; a regra
 * `I6-controller-not-internal-scope` do check:arch barra o import a partir de `src/controllers/`.
 */
export function resolveAccountingScopeInternal(
  user: { userId: string },
  unitId: string,
): AccountingScope {
  // Sem checagem de unidade aqui: o unitId dos controllers HTTP é validado pelo AccountingScopeResolver (nó I6).
  // ponytail: membership check (unidade compartilhada entre usuários) entra quando unidade for compartilhada
  return {
    ownerUserId: user.userId,
    actorUserId: user.userId,
    unitId,
    ledgerCode: 'DEFAULT',
    baseCurrencyCode: 'BRL',
    timeZone: 'America/Sao_Paulo',
  };
}
