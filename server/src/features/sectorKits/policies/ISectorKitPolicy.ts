import type { BindingScope } from '../../accountingBinding/repositories/IAccountingBindingRepository';

/** Policy do kit de setor (BE-INCR-KIT-SETOR, PR-2). O PR-3 acrescenta `canManageKit` (item 23). */
export interface ISectorKitPolicy {
  canInstallKit(scope: BindingScope): boolean;
  /** PR-K3 (7e/7f): ler as sugestões fiscais por serviço — a mesma regra do `canReadFiscalProfile` do accounting. */
  canReadServiceFiscalSuggestions(scope: BindingScope): boolean;
  /** PR-6 (item 50): ler o rastro evento → fato → lançamento — só leitura, mesma regra de leitura do razão. */
  canReadKitTrace(scope: BindingScope): boolean;
}
