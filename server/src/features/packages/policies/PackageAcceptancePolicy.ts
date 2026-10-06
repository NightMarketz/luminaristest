import type { AccountingScope } from '../../accounting/scope/AccountingScope';
import type { IPackageAcceptancePolicy } from './IPackageAcceptancePolicy';

/**
 * Any authenticated user operates within their OWN userId silo (Contract §2) — same stance as
 * `PackageBalancePolicy`: a wrong unitId only creates a separate sub-partition under that same userId.
 */
export class PackageAcceptancePolicy implements IPackageAcceptancePolicy {
  canRecord(scope: AccountingScope): boolean {
    return !!scope.actorUserId;
  }

  canRead(scope: AccountingScope): boolean {
    return !!scope.actorUserId;
  }
}
