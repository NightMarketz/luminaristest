import type { AccountingScope } from '../../accounting/scope/AccountingScope';

/** Policy do DP (item 14): só decisões boolean, sem acesso a dado. */
export interface IDpPolicy {
  canRead(scope: AccountingScope): boolean;
  canManage(scope: AccountingScope): boolean;
}
