import type { AccountingScope } from '../../accounting/scope/AccountingScope';
import type { IDpPolicy } from './IDpPolicy';

/**
 * BE-INCR-DP-F0-F1 item 14 (D-7) — policy própria do DP, com a regra de hoje do `canManageFiscalProfile` que o
 * `PartnerService` usa (ator do escopo; o dono vem do `AccountingScopeResolver`). Separada para um papel "RH" poder
 * divergir depois: a posse é outra (dado de RH, com salário), embora a regra seja igual hoje (_REUSE-CRITERION).
 */
export class DpPolicy implements IDpPolicy {
  canRead(scope: AccountingScope): boolean {
    return !!scope.actorUserId;
  }

  canManage(scope: AccountingScope): boolean {
    return !!scope.actorUserId;
  }
}
