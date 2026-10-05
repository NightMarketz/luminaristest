import type { AccountingScope } from '../../accounting/scope/AccountingScope';

/**
 * Authorization contract for the package-validity acceptance (FE-INCR-PACOTE-VALIDADE). Actor = scope.actorUserId;
 * unitId is a user-owned sub-partition (Contract §2). Append-only evidence: there is no update/delete permission.
 */
export interface IPackageAcceptancePolicy {
  /** Can register an acceptance (the single write). */
  canRecord(scope: AccountingScope): boolean;

  /** Can read acceptances, the notice and the receipt PDF. */
  canRead(scope: AccountingScope): boolean;
}
