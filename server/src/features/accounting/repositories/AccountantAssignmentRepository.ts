import prisma from '../../../lib/prisma';
import type { AccountantAssignment, Prisma } from 'generated/prisma';
import { ConflictError } from '../../../lib/errors';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import type { ActiveAccountant } from '../policies/IAccountingPolicy';
import type { AssignmentStatus } from '../models/ledgerStatus';
import type {
  IAccountantAssignmentRepository,
  NewAssignment,
  TransitionPatch,
} from './IAccountantAssignmentRepository';

function toActive(a: AccountantAssignment): ActiveAccountant {
  return {
    id: a.id,
    ownerUserId: a.userId,
    unitId: a.unitId,
    accountantUserId: a.accountantUserId,
    crcNumber: a.crcNumber,
  };
}

/**
 * Repositório Prisma da atribuição do contador. Único lugar com `prisma.accountantAssignment.*`.
 * Wrapper fino: política, auditoria e regra moram no service. Os slots (`activeSlot`/`pendingSlot`) são
 * derivados do status AQUI, para nenhum caller esquecer de devolvê-los a NULL na saída de estado.
 */
export class AccountantAssignmentRepository implements IAccountantAssignmentRepository {
  public async findActive(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<ActiveAccountant | null> {
    const a = await (tx ?? prisma).accountantAssignment.findFirst({
      where: { ...accountingScopeWhere(scope), status: 'ACTIVE', deletedAt: null },
    });
    return a ? toActive(a) : null;
  }

  public async findPending(
    scope: AccountingScope,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountantAssignment | null> {
    return (tx ?? prisma).accountantAssignment.findFirst({
      where: { ...accountingScopeWhere(scope), status: 'PENDING', deletedAt: null },
    });
  }

  public async findActiveForAccountant(accountantUserId: string, unitId: string): Promise<ActiveAccountant | null> {
    const a = await prisma.accountantAssignment.findFirst({
      where: { accountantUserId, unitId, status: 'ACTIVE', deletedAt: null },
    });
    return a ? toActive(a) : null;
  }

  public async findById(id: string, tx?: Prisma.TransactionClient): Promise<AccountantAssignment | null> {
    return (tx ?? prisma).accountantAssignment.findFirst({ where: { id, deletedAt: null } });
  }

  public async listByScope(scope: AccountingScope): Promise<AccountantAssignment[]> {
    return prisma.accountantAssignment.findMany({
      where: { ...accountingScopeWhere(scope), deletedAt: null },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  public async listLiveForAccountant(
    accountantUserId: string,
  ): Promise<Array<AccountantAssignment & { ownerEmail: string }>> {
    const rows = await prisma.accountantAssignment.findMany({
      where: { accountantUserId, status: { in: ['PENDING', 'ACTIVE'] }, deletedAt: null },
      include: { user: { select: { email: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return rows.map(({ user, ...a }) => ({ ...a, ownerEmail: user.email }));
  }

  public async create(data: NewAssignment, tx: Prisma.TransactionClient): Promise<AccountantAssignment> {
    return tx.accountantAssignment.create({
      data: { ...data, status: 'PENDING', pendingSlot: 'PENDING', activeSlot: null },
    });
  }

  public async transition(
    id: string,
    from: AssignmentStatus,
    to: AssignmentStatus,
    patch: TransitionPatch,
    tx: Prisma.TransactionClient,
  ): Promise<AccountantAssignment> {
    const { count } = await tx.accountantAssignment.updateMany({
      where: { id, status: from, deletedAt: null },
      data: {
        ...patch,
        status: to,
        activeSlot: to === 'ACTIVE' ? 'ACTIVE' : null,
        pendingSlot: to === 'PENDING' ? 'PENDING' : null,
      },
    });
    if (count === 0) {
      throw new ConflictError(
        `A atribuição '${id}' mudou de estado (esperado ${from}) — recarregue e tente de novo.`,
        'ASSIGNMENT_STATUS_CHANGED',
      );
    }
    return tx.accountantAssignment.findUniqueOrThrow({ where: { id } });
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
