import type { AccountingReview, AccountingReviewFinding, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';

export type AccountingReviewWithFindings = AccountingReview & { findings: AccountingReviewFinding[] };

export interface CreateReviewData {
  userId: string;
  unitId: string;
  year: number;
  ecdJobId: string | null;
  ecfJobId: string | null;
  status: string;
  reviewerUserId: string;
}

export interface CreateFindingData {
  reviewId: string;
  userId: string;
  unitId: string;
  register: string;
  locator: string;
  description: string;
  severity: string;
  createdById: string;
}

export interface ListReviewsFilter {
  year?: number;
  status?: string;
}

/**
 * Contrato do repositório da revisão profissional (`accounting_reviews` + `accounting_review_findings`).
 * Único lugar com `prisma.accountingReview*.*` (BE-INCR-REVIEW-LAYER, item 15). SEM delete de
 * propósito (item 11: trilha legal). `findOpenByJobs` é a metade de LEITURA do gate F-C11-5 — o
 * `@@unique([ecdJobId, ecfJobId])` fecha o par cheio, mas o SQLite trata NULL como distinto, então
 * a leitura DENTRO da tx é a autoridade para pares com um job só.
 */
export interface IAccountingReviewRepository {
  create(data: CreateReviewData, tx?: Prisma.TransactionClient): Promise<AccountingReview>;

  /** Point lookup escopado, com achados — `null` quando o id não é deste escopo. */
  findById(
    scope: AccountingScope,
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingReviewWithFindings | null>;

  /** Revisão (qualquer status) pelo par exato de jobs — leitura da chave de unicidade. */
  findByJobs(
    scope: AccountingScope,
    ecdJobId: string | null,
    ecfJobId: string | null,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingReview | null>;

  /** Revisões que referenciam este par (por job individual) — usada pelo gate da entrega (item 14). */
  findByAnyJob(
    scope: AccountingScope,
    ecdJobId: string,
    ecfJobId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingReview[]>;

  list(scope: AccountingScope, filter: ListReviewsFilter): Promise<AccountingReview[]>;

  update(
    scope: AccountingScope,
    id: string,
    data: Prisma.AccountingReviewUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingReview>;

  createFinding(data: CreateFindingData, tx?: Prisma.TransactionClient): Promise<AccountingReviewFinding>;

  findFindingById(
    scope: AccountingScope,
    reviewId: string,
    findingId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingReviewFinding | null>;

  updateFinding(
    scope: AccountingScope,
    findingId: string,
    data: Prisma.AccountingReviewFindingUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingReviewFinding>;

  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
