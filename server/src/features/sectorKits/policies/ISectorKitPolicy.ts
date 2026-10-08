import type { BindingScope } from '../../accountingBinding/repositories/IAccountingBindingRepository';

/** Policy do kit de setor (BE-INCR-KIT-SETOR, PR-2). O PR-3 acrescenta `canManageKit` (item 23). */
export interface ISectorKitPolicy {
  canInstallKit(scope: BindingScope): boolean;
}
