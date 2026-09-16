import prisma from '../../../lib/prisma';
import type { AccountingReview, AccountingReviewFinding, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import type {
  AccountingReviewWithFindings,
  CreateFindingData,
  CreateReviewData,
  IAccountingReviewRepository,
  ListReviewsFilter,
} from './IAccountingReviewRepository';

/**
 * Repositório Prisma da revisão profissional. Único lugar com `prisma.accountingReview*.*`.
 * Wrapper fino — gates (status OPEN, staleness, período do acerto) e auditoria moram no service.
 * Sem `delete` de propósito (item 11).
 */
export class AccountingReviewRepository implements IAccountingReviewRepository {
  public async create(data: CreateReviewData, tx?: Prisma.TransactionClient): Promise<AccountingReview> {
    return (tx ?? prisma).accountingReview.create({ data });
  }

  public async findById(
    scope: AccountingScope,
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingReviewWithFindings | null> {
    return (tx ?? prisma).accountingReview.findFirst({
      where: { id, ...accountingScopeWhere(scope) },
      include: { findings: { orderBy: { createdAt: 'asc' } } },
    });
  }

  public async findByJobs(
    scope: AccountingScope,
    ecdJobId: string | null,
    ecfJobId: string | null,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingReview | null> {
    return (tx ?? prisma).accountingReview.findFirst({
      where: { ...accountingScopeWhere(scope), ecdJobId, ecfJobId },
    });
  }

  public async list(scope: AccountingScope, filter: ListReviewsFilter): Promise<AccountingReview[]> {
    return prisma.accountingReview.findMany({
      where: { ...accountingScopeWhere(scope), year: filter.year, status: filter.status },
      orderBy: { openedAt: 'desc' },
    });
  }

  public async update(
    scope: AccountingScope,
    id: string,
    data: Prisma.AccountingReviewUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingReview> {
    const { userId, unitId } = accountingScopeWhere(scope);
    return (tx ?? prisma).accountingReview.update({ where: { id, userId, unitId }, data });
  }

  public async createFinding(
    data: CreateFindingData,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingReviewFinding> {
    return (tx ?? prisma).accountingReviewFinding.create({ data });
  }

  public async findFindingById(
    scope: AccountingScope,
    reviewId: string,
    findingId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingReviewFinding | null> {
    return (tx ?? prisma).accountingReviewFinding.findFirst({
      where: { id: findingId, reviewId, ...accountingScopeWhere(scope) },
    });
  }

  public async updateFinding(
    scope: AccountingScope,
    findingId: string,
    data: Prisma.AccountingReviewFindingUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingReviewFinding> {
    const { userId, unitId } = accountingScopeWhere(scope);
    return (tx ?? prisma).accountingReviewFinding.update({ where: { id: findingId, userId, unitId }, data });
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
