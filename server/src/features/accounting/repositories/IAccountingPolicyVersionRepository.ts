import type { AccountingPolicyVersion, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import type { PolicyTarget } from '../models/AccountingPolicyVersion.model';
import type { PolicyVersionStatus } from '../models/ledgerStatus';

export interface NewPolicyVersion {
  userId: string;
  unitId: string;
  target: PolicyTarget;
  version: number;
  status: 'PROPOSED' | 'APPLIED';
  payload: Prisma.InputJsonValue; // SEM unitId (item 7.2)
  proposedById: string | null;
  decidedById?: string;
  decidedAt?: Date;
}

/** Campos que uma transição pode gravar além do status/slot (o repo deriva o slot do `to`). */
export interface PolicyVersionPatch {
  decidedById?: string;
  decidedAt?: Date;
  assignmentId?: string;
  decisionReason?: string;
  supersededById?: string;
}

/**
 * Repositório da versão de política (BE-INCR-ACCOUNTING-POLICY-VERSION, BRIEF item 3, §4.2).
 * Toda leitura filtra `deletedAt: null`; toda escrita recebe `tx`.
 */
export interface IAccountingPolicyVersionRepository {
  findById(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<AccountingPolicyVersion | null>;
  findPending(scope: AccountingScope, target: PolicyTarget, tx?: Prisma.TransactionClient): Promise<AccountingPolicyVersion | null>;
  /** Histórico do escopo, mais novo primeiro. */
  list(scope: AccountingScope, filter: { target?: PolicyTarget; status?: PolicyVersionStatus }): Promise<AccountingPolicyVersion[]>;
  /** `max(version) + 1` do alvo, lido na tx. */
  nextVersion(scope: AccountingScope, target: PolicyTarget, tx: Prisma.TransactionClient): Promise<number>;
  create(data: NewPolicyVersion, tx: Prisma.TransactionClient): Promise<AccountingPolicyVersion>;
  /** CAS: where { id, status: from } — 0 linhas → ConflictError('POLICY_VERSION_STATUS_CHANGED'). */
  transition(
    id: string,
    from: PolicyVersionStatus,
    to: PolicyVersionStatus,
    patch: PolicyVersionPatch,
    tx: Prisma.TransactionClient,
  ): Promise<AccountingPolicyVersion>;
  /** Grava a view do alvo depois da aplicação (§4.3) — só em linha APPLIED. */
  setAppliedSnapshot(id: string, snapshot: Prisma.InputJsonValue, tx: Prisma.TransactionClient): Promise<AccountingPolicyVersion>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
