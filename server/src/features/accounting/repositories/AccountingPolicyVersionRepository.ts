import prisma from '../../../lib/prisma';
import type { AccountingPolicyVersion, Prisma } from 'generated/prisma';
import { ConflictError } from '../../../lib/errors';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import type { PolicyTarget } from '../models/AccountingPolicyVersion.model';
import type { PolicyVersionStatus } from '../models/ledgerStatus';
import type {
  IAccountingPolicyVersionRepository,
  NewPolicyVersion,
  PolicyVersionPatch,
} from './IAccountingPolicyVersionRepository';

/**
 * Repositório Prisma da versão de política. Único lugar com `prisma.accountingPolicyVersion.*`. Wrapper fino:
 * política, auditoria e regra moram no service. O `pendingSlot` é derivado do status AQUI, para nenhum caller
 * esquecer de devolvê-lo a NULL na saída de PROPOSED.
 */
export class AccountingPolicyVersionRepository implements IAccountingPolicyVersionRepository {
  public async findById(
    scope: AccountingScope,
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingPolicyVersion | null> {
    return (tx ?? prisma).accountingPolicyVersion.findFirst({
      where: { ...accountingScopeWhere(scope), id, deletedAt: null },
    });
  }

  public async findPending(
    scope: AccountingScope,
    target: PolicyTarget,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingPolicyVersion | null> {
    return (tx ?? prisma).accountingPolicyVersion.findFirst({
      where: { ...accountingScopeWhere(scope), target, status: 'PROPOSED', deletedAt: null },
    });
  }

  public async list(
    scope: AccountingScope,
    filter: { target?: PolicyTarget; status?: PolicyVersionStatus },
  ): Promise<AccountingPolicyVersion[]> {
    return prisma.accountingPolicyVersion.findMany({
      where: { ...accountingScopeWhere(scope), ...filter, deletedAt: null },
      orderBy: [{ createdAt: 'desc' }, { version: 'desc' }],
    });
  }

  public async nextVersion(scope: AccountingScope, target: PolicyTarget, tx: Prisma.TransactionClient): Promise<number> {
    // Conta também linhas soft-deletadas: o @@unique de (userId, unitId, target, version) não as ignora.
    const agg = await tx.accountingPolicyVersion.aggregate({
      where: { ...accountingScopeWhere(scope), target },
      _max: { version: true },
    });
    return (agg._max.version ?? 0) + 1;
  }

  public async create(data: NewPolicyVersion, tx: Prisma.TransactionClient): Promise<AccountingPolicyVersion> {
    return tx.accountingPolicyVersion.create({
      data: { ...data, pendingSlot: data.status === 'PROPOSED' ? 'PROPOSED' : null },
    });
  }

  public async transition(
    id: string,
    from: PolicyVersionStatus,
    to: PolicyVersionStatus,
    patch: PolicyVersionPatch,
    tx: Prisma.TransactionClient,
  ): Promise<AccountingPolicyVersion> {
    const { count } = await tx.accountingPolicyVersion.updateMany({
      where: { id, status: from, deletedAt: null },
      data: { ...patch, status: to, pendingSlot: to === 'PROPOSED' ? 'PROPOSED' : null },
    });
    if (count === 0) {
      throw new ConflictError(
        `A versão de política '${id}' mudou de estado (esperado ${from}) — recarregue e tente de novo.`,
        'POLICY_VERSION_STATUS_CHANGED',
      );
    }
    return tx.accountingPolicyVersion.findUniqueOrThrow({ where: { id } });
  }

  public async setAppliedSnapshot(
    id: string,
    snapshot: Prisma.InputJsonValue,
    tx: Prisma.TransactionClient,
  ): Promise<AccountingPolicyVersion> {
    return tx.accountingPolicyVersion.update({ where: { id, status: 'APPLIED' }, data: { appliedSnapshot: snapshot } });
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
