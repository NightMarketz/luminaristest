import type { ReferentialMapping, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';

/** Input for setting (upserting) a referential mapping of one account in one version. */
export interface SetReferentialMappingInput {
  accountId: string;
  referentialCode: string;
  label: string;
  mappingVersion: string;
  /** Actor stamped on create (AccountingScope.actorUserId). */
  createdById: string | null;
}

/**
 * Contract for referential-mapping data access (BE-INCR-9 / ADR-INCR9). First-class
 * Prisma (NOT DynamicTable). Only place with prisma.referentialMapping.* access.
 * Every read/write is scoped via AccountingScope (userId + unitId). No soft-delete
 * (D5) — unset is a real delete; the change trail lives in AuditEvent. Every write
 * accepts a tx handle so the service composes the in-tx gate + write + audit
 * atomically (ACC-012).
 */
export interface IReferentialMappingRepository {
  /**
   * Upserts the mapping of (accountId, mappingVersion) within the scope. Idempotent
   * on the @@unique([userId,unitId,accountId,mappingVersion]) key: an existing row
   * is updated (referentialCode/label refreshed), a new pair is created.
   */
  upsert(
    scope: AccountingScope,
    data: SetReferentialMappingInput,
    tx?: Prisma.TransactionClient,
  ): Promise<ReferentialMapping>;

  /**
   * Hard-deletes the mapping of (accountId, mappingVersion) within the scope.
   * Returns the affected-row count (0 = no mapping existed for that pair).
   */
  deleteByAccountVersion(
    scope: AccountingScope,
    accountId: string,
    mappingVersion: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number>;

  /**
   * Point lookup escopado por id — BE-INCR-REVIEW-LAYER (C11, item 4): o ponteiro DATA_EDIT
   * `referential_mapping` só é aceito se o alvo existe no escopo. Leitura pura, aditiva.
   */
  findById(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<ReferentialMapping | null>;

  /** Finds the mapping of (accountId, mappingVersion) within the scope, or null. */
  findByAccountAndVersion(
    scope: AccountingScope,
    accountId: string,
    mappingVersion: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ReferentialMapping | null>;

  /** Lists all mappings of a version within the scope, ordered by account code join is done in the service. */
  findManyByVersion(
    scope: AccountingScope,
    mappingVersion: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ReferentialMapping[]>;

  /** Runs fn inside a DB transaction (the only tx entry point for the service). */
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
