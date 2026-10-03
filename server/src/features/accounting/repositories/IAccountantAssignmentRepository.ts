import type { AccountantAssignment, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import type { ActiveAccountant } from '../policies/IAccountingPolicy';
import type { AssignmentStatus } from '../models/ledgerStatus';

export interface NewAssignment {
  userId: string;
  unitId: string;
  accountantUserId: string;
  accountingContactId: string;
  crcNumber: string;
  crcUf: string;
  createdById: string;
}

/** Campos que uma transição pode gravar além do status/slots (o repo deriva os slots do `to`). */
export interface TransitionPatch {
  activeFrom?: Date;
  activeUntil?: Date;
  endedById?: string;
  endReason?: string;
}

/**
 * Repositório da atribuição do contador responsável (BE-INCR-ACCOUNTANT-GOVERNANCE, BRIEF item 3, §4.2).
 * Toda leitura filtra `deletedAt: null`; toda escrita recebe `tx`.
 */
export interface IAccountantAssignmentRepository {
  findActive(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<ActiveAccountant | null>;
  findPending(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<AccountantAssignment | null>;
  /** ACTIVE do par (contador, dono) naquele `unitId` — o par identifica a atribuição (um contador atende N donos). */
  findActiveForPair(accountantUserId: string, ownerUserId: string, unitId: string): Promise<ActiveAccountant | null>;
  findById(id: string, tx?: Prisma.TransactionClient): Promise<AccountantAssignment | null>;
  listByScope(scope: AccountingScope): Promise<AccountantAssignment[]>;
  listLiveForAccountant(accountantUserId: string): Promise<Array<AccountantAssignment & { ownerEmail: string }>>;
  create(data: NewAssignment, tx: Prisma.TransactionClient): Promise<AccountantAssignment>;
  /** CAS: where { id, status: from } — 0 linhas → ConflictError('ASSIGNMENT_STATUS_CHANGED'). */
  transition(
    id: string,
    from: AssignmentStatus,
    to: AssignmentStatus,
    patch: TransitionPatch,
    tx: Prisma.TransactionClient,
  ): Promise<AccountantAssignment>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
