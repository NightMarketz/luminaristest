import type { BindingScope } from '../../accountingBinding/repositories/IAccountingBindingRepository';
import type { ISectorKitPolicy } from './ISectorKitPolicy';

/**
 * Mesma regra de `AccountingBindingPolicy.canActivateDefault` (`!!actorUserId`): instalar o kit é o que o
 * `activate-default` faz desde o PR-2 (item 11), então a permissão não pode divergir da da rota.
 */
export class SectorKitPolicy implements ISectorKitPolicy {
  canInstallKit(scope: BindingScope): boolean {
    return !!scope.actorUserId;
  }

  /** Mesma regra de `AccountingBindingPolicy.canCompile` (`!!actorUserId`) — item 23. */
  canManageKit(scope: BindingScope): boolean {
    return !!scope.actorUserId;
  }

  /** Espelho de `AccountingPolicy.canReadFiscalProfile` (= `canRead`, `!!actorUserId`): a sugestão só lê. */
  canReadServiceFiscalSuggestions(scope: BindingScope): boolean {
    return !!scope.actorUserId;
  }
}
