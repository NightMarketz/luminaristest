import type { BindingScope } from '../../accountingBinding/repositories/IAccountingBindingRepository';

/** Policy do kit de setor (BE-INCR-KIT-SETOR, PR-2 e PR-3). */
export interface ISectorKitPolicy {
  canInstallKit(scope: BindingScope): boolean;
  /**
   * PR-3, item 23: ler e mudar o ajuste papel→conta. Hoje = a regra de `canCompile` do `AccountingBindingPolicy`
   * (o ajuste recompila o binding); quando a GOV-CONTADOR entregar o papel de contador responsável, passa a
   * aceitá-lo também.
   */
  canManageKit(scope: BindingScope): boolean;
  /** PR-K3 (7e/7f): ler as sugestões fiscais por serviço — a mesma regra do `canReadFiscalProfile` do accounting. */
  canReadServiceFiscalSuggestions(scope: BindingScope): boolean;
}
