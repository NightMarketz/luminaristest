import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingScopeResetPolicy } from './IAccountingScopeResetPolicy';

/** BE-INCR-RESET-CONSISTENTE item 11. Pure boolean decision — no throws, no data access. */
export class AccountingScopeResetPolicy implements IAccountingScopeResetPolicy {
  canPurgeSetup(scope: AccountingScope): boolean {
    return scope.actorUserId === scope.ownerUserId;
  }
}
