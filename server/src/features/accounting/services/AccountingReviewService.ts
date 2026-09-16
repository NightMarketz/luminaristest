import { Prisma } from 'generated/prisma';
import type {
  AccountingDataExchangeJob,
  AccountingReview,
  AccountingReviewFinding,
  AuditEvent,
} from 'generated/prisma';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../../lib/errors';
import {
  RESOLUTION_TARGET_AUDIT_TYPE,
  REVIEW_ADJUSTMENT_SOURCE_TYPE,
  REVIEW_FINDING_ADDED,
  REVIEW_FINDING_RESOLVED,
  REVIEW_JOBS_REPLACED,
  REVIEW_OPENED,
  REVIEW_REJECTED,
  REVIEW_SIGNED_OFF,
  adjustmentDescription,
  staleFindings,
  type ResolutionTarget,
} from '../models/AccountingReview.model';
import type {
  AddFindingInput,
  AdjustmentEntryInput,
  ListReviewsQueryInput,
  OpenReviewInput,
  RejectReviewInput,
  ReplaceReviewJobsInput,
  ResolveFindingInput,
  SignOffReviewInput,
} from '../dtos/AccountingReviewDto';
import type {
  AccountingReviewWithFindings,
  IAccountingReviewRepository,
} from '../repositories/IAccountingReviewRepository';
import type { IDataExchangeRepository } from '../repositories/IDataExchangeRepository';
import type { IAccountRepository } from '../repositories/IAccountRepository';
import type { IReferentialMappingRepository } from '../repositories/IReferentialMappingRepository';
import type { ICounterpartyRepository } from '../repositories/ICounterpartyRepository';
import type { IJournalEntryRepository } from '../repositories/IJournalEntryRepository';
import type { IAuditRepository } from '../repositories/IAuditRepository';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { AuditService } from './AuditService';
import type { PostingService } from './PostingService';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';

const ECD_JOB_KIND = 'EXPORT_SPED_ECD';
const ECF_JOB_KINDS = ['EXPORT_SPED_ECF', 'EXPORT_SPED_ECF_REAL'];
const EXPORTED = 'EXPORTED';
const OPEN = 'OPEN';
const SIGNED_OFF = 'SIGNED_OFF';
const REJECTED = 'REJECTED';

/** Achado + trilha do alvo editado (item 13): eventos do `targetId` posteriores ao achado. */
export interface FindingWithTrail {
  finding: AccountingReviewFinding;
  targetAuditEvents: AuditEvent[];
}

export interface ReviewDetail {
  review: AccountingReview;
  findings: FindingWithTrail[];
}

/**
 * AccountingReviewService — revisão profissional editável (BE-INCR-REVIEW-LAYER, nó C11).
 * FIRST-CLASS PRISMA. Forks F-C11-1..6 → (a) (CEDULA-DECISAO-2026-09-16).
 *
 * Invariantes provadas aqui:
 * - **Uma revisão por par de jobs** (F-C11-5): `@@unique([ecdJobId, ecfJobId])` fecha o par cheio;
 *   como o SQLite trata NULL como distinto, a leitura `findByJobs` DENTRO da tx é a autoridade para
 *   pares com um job só — 2ª abertura → 409 `REVIEW_ALREADY_OPEN` com o id existente.
 * - **O arquivo nunca é editado** (F-EDIT-1 b vetado): DATA_EDIT guarda só o PONTEIRO para o dado
 *   que o serviço dono editou (F-C11-2 a); o acerto (c) passa por `PostingService.postEntry`.
 * - **Acerto em 2 commits, não 1** — `postEntry` abre a própria tx raiz e não aceita `tx`
 *   (memória `postentry-tx-raiz-subrazao-2-commits`; precedente estoque/AP/C8 B3). O BRIEF item 5
 *   pede "mesma transação"; o que o repo permite é o padrão sancionado read-first + reconcile:
 *   `sourceId = findingId` torna o `postEntry` idempotente, e a 2ª chamada reconcilia o achado
 *   com o lançamento já existente. Teste assere a SEGUNDA chamada.
 * - **Staleness** (item 8): sign-off só se cada job foi gerado depois da última resolução e nenhum
 *   BLOCKER está aberto — senão 409 `REVIEW_STALE` listando os achados.
 * - **Cross-tenant** → `NotFoundError` (padrão C6).
 */
export class AccountingReviewService {
  constructor(
    private readonly reviewRepo: IAccountingReviewRepository,
    private readonly dataExchangeRepo: IDataExchangeRepository,
    private readonly accountRepo: IAccountRepository,
    private readonly mappingRepo: IReferentialMappingRepository,
    private readonly counterpartyRepo: ICounterpartyRepository,
    private readonly journalEntryRepo: IJournalEntryRepository,
    private readonly auditRepo: IAuditRepository,
    private readonly postingService: PostingService,
    private readonly auditService: AuditService,
    private readonly policy: IAccountingPolicy,
  ) {}

  // ── Ciclo de vida ──────────────────────────────────────────────────────────

  /** Item 1/2: abre a revisão sobre um par (ou um) de jobs EXPORTED do mesmo exercício. */
  async openReview(scope: AccountingScope, dto: OpenReviewInput): Promise<AccountingReview> {
    this.assertCanReview(scope);
    const ecd = dto.ecdJobId ? await this.requireJob(scope, dto.ecdJobId, 'ECD', dto.year) : null;
    const ecf = dto.ecfJobId ? await this.requireJob(scope, dto.ecfJobId, 'ECF', dto.year) : null;
    const { userId, unitId } = accountingScopeWhere(scope);

    return this.reviewRepo.runTransaction(async (tx) => {
      // GATE AUTORITATIVO (F-C11-5): o unique não vê (NULL, x) colidir com (NULL, x) no SQLite.
      const existing = await this.reviewRepo.findByJobs(scope, ecd?.id ?? null, ecf?.id ?? null, tx);
      if (existing) throw this.alreadyOpen(existing);
      try {
        const created = await this.reviewRepo.create(
          {
            userId,
            unitId,
            year: dto.year,
            ecdJobId: ecd?.id ?? null,
            ecfJobId: ecf?.id ?? null,
            status: OPEN,
            reviewerUserId: scope.actorUserId,
          },
          tx,
        );
        await this.auditService.append(tx, scope, {
          actorUserId: scope.actorUserId,
          eventType: REVIEW_OPENED,
          targetType: 'accounting_review',
          targetId: created.id,
          payload: { reviewId: created.id, ecdJobId: created.ecdJobId, ecfJobId: created.ecfJobId, year: created.year },
        });
        return created;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          const winner = await this.reviewRepo.findByJobs(scope, ecd?.id ?? null, ecf?.id ?? null, tx);
          if (winner) throw this.alreadyOpen(winner);
        }
        throw error;
      }
    });
  }

  async listReviews(scope: AccountingScope, query: ListReviewsQueryInput): Promise<AccountingReview[]> {
    if (!this.policy.canRead(scope)) throw new ForbiddenError('Você não tem permissão para ler revisões.');
    return this.reviewRepo.list(scope, { year: query.year, status: query.status });
  }

  /** Item 13: revisão + achados, cada achado resolvido com a trilha do alvo apontado. */
  async getReview(scope: AccountingScope, id: string): Promise<ReviewDetail> {
    if (!this.policy.canRead(scope)) throw new ForbiddenError('Você não tem permissão para ler revisões.');
    const review = await this.requireReview(scope, id);
    const findings: FindingWithTrail[] = [];
    for (const finding of review.findings) {
      let targetAuditEvents: AuditEvent[] = [];
      if (finding.resolutionTargetType && finding.resolutionTargetId) {
        const auditType = RESOLUTION_TARGET_AUDIT_TYPE[finding.resolutionTargetType as ResolutionTarget];
        const all = await this.auditRepo.listByTarget(scope, auditType, finding.resolutionTargetId);
        targetAuditEvents = all.filter((e) => e.createdAt >= finding.createdAt);
      }
      findings.push({ finding, targetAuditEvents });
    }
    const { findings: _omit, ...plain } = review;
    return { review: plain, findings };
  }

  // ── Achados ────────────────────────────────────────────────────────────────

  /** Item 3: achado só em revisão OPEN. `description` fica FORA do payload de auditoria (item 12). */
  async addFinding(scope: AccountingScope, reviewId: string, dto: AddFindingInput): Promise<AccountingReviewFinding> {
    this.assertCanReview(scope);
    const review = await this.requireReview(scope, reviewId);
    this.assertOpen(review);
    const { userId, unitId } = accountingScopeWhere(scope);
    return this.reviewRepo.runTransaction(async (tx) => {
      const finding = await this.reviewRepo.createFinding(
        {
          reviewId: review.id,
          userId,
          unitId,
          register: dto.register,
          locator: dto.locator,
          description: dto.description,
          severity: dto.severity,
          createdById: scope.actorUserId,
        },
        tx,
      );
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: REVIEW_FINDING_ADDED,
        targetType: 'accounting_review',
        targetId: review.id,
        payload: { reviewId: review.id, findingId: finding.id, register: finding.register, severity: finding.severity },
      });
      return finding;
    });
  }

  /** Itens 4 e 7: DATA_EDIT = ponteiro para alvo existente no escopo; NO_ACTION exige nota. */
  async resolveFinding(
    scope: AccountingScope,
    reviewId: string,
    findingId: string,
    dto: ResolveFindingInput,
  ): Promise<AccountingReviewFinding> {
    this.assertCanReview(scope);
    const review = await this.requireReview(scope, reviewId);
    this.assertOpen(review);
    const finding = await this.requireFinding(scope, review.id, findingId);
    if (finding.resolution) {
      throw new ConflictError(`Achado '${finding.id}' já está resolvido (${finding.resolution}).`, 'FINDING_ALREADY_RESOLVED');
    }
    let targetType: string | null = null;
    let targetId: string | null = null;
    let resolutionNote: string | null = null;
    if (dto.resolution === 'DATA_EDIT') {
      await this.assertTargetExists(scope, dto.targetType, dto.targetId);
      targetType = dto.targetType;
      targetId = dto.targetId;
    } else {
      resolutionNote = dto.resolutionNote;
    }
    return this.reviewRepo.runTransaction(async (tx) => {
      const updated = await this.reviewRepo.updateFinding(
        scope,
        finding.id,
        {
          resolution: dto.resolution,
          resolutionTargetType: targetType,
          resolutionTargetId: targetId,
          resolutionNote,
          resolvedById: scope.actorUserId,
          resolvedAt: new Date(),
        },
        tx,
      );
      await this.appendResolved(scope, review.id, updated, tx);
      return updated;
    });
  }

  /**
   * Itens 5/6: lançamento de acerto extemporâneo (F-C11-4 a) via `PostingService.postEntry`,
   * idempotente por `sourceId = findingId`. Dois commits (ver doc da classe); a 2ª chamada devolve o
   * MESMO `entryId` e reconcilia o achado se o 1º commit passou e o 2º não.
   */
  async postAdjustment(
    scope: AccountingScope,
    reviewId: string,
    findingId: string,
    dto: AdjustmentEntryInput,
  ): Promise<{ finding: AccountingReviewFinding; entryId: string }> {
    this.assertCanReview(scope);
    const review = await this.requireReview(scope, reviewId);
    this.assertOpen(review);
    const finding = await this.requireFinding(scope, review.id, findingId);

    // Read-first: achado já fechado por acerto → devolve o mesmo lançamento (idempotência).
    if (finding.resolution === 'ADJUSTMENT_ENTRY' && finding.resolutionTargetId) {
      return { finding, entryId: finding.resolutionTargetId };
    }
    if (finding.resolution) {
      throw new ConflictError(`Achado '${finding.id}' já está resolvido (${finding.resolution}).`, 'FINDING_ALREADY_RESOLVED');
    }

    // Item 6: estorno só quando o achado aponta um lançamento (register='I200', locator=entryId), e
    // só se o acerto ainda não existe — senão a 2ª chamada estornaria de novo.
    const alreadyPosted = await this.journalEntryRepo.findBySource(scope, REVIEW_ADJUSTMENT_SOURCE_TYPE, finding.id);
    const seq = review.findings.findIndex((f) => f.id === finding.id) + 1;
    const entryInput = {
      unitId: dto.unitId,
      date: dto.postingDate,
      description: adjustmentDescription(review.id, seq, dto.description),
      sourceType: REVIEW_ADJUSTMENT_SOURCE_TYPE,
      sourceId: finding.id,
      lines: dto.lines,
    };
    if (dto.reverseOriginal && !alreadyPosted) {
      if (finding.register !== 'I200') {
        throw new ValidationError(`reverseOriginal só se aplica a achado de lançamento (register='I200'); este é '${finding.register}'.`);
      }
      // Review #334 B1 (classe `efeito-irreversivel-antes-do-gate-autoritativo`, F1 #307): o estorno
      // abre tx própria e é irreversível; o corpo do acerto só seria validado pelo postEntry DEPOIS.
      // Pré-cheque do MESMO predicado (período, balanço, contas, dimensões) antes de mutar o razão —
      // corpo inválido devolve 400 com o original intacto. O gate autoritativo segue no postEntry.
      await this.postingService.validateEntry(scope, entryInput);
      await this.postingService.reverseEntry(scope, {
        unitId: dto.unitId,
        lancamentoId: finding.locator,
        reversalPostingDate: dto.postingDate,
        reason: `Estorno — revisão ${review.id}, achado ${finding.id}`,
      });
    }

    // Commit 1 — o razão. Gate de período (F-C11-4 a: OPEN) preflight + autoritativo dentro do postEntry.
    const entry = alreadyPosted ?? (await this.postingService.postEntry(scope, entryInput));

    // Commit 2 — o achado aponta o lançamento (reconcile: roda também quando o commit 1 já existia).
    const updated = await this.reviewRepo.runTransaction(async (tx) => {
      const fresh = await this.reviewRepo.findFindingById(scope, review.id, finding.id, tx);
      if (fresh?.resolution === 'ADJUSTMENT_ENTRY') return fresh;
      const row = await this.reviewRepo.updateFinding(
        scope,
        finding.id,
        {
          resolution: 'ADJUSTMENT_ENTRY',
          resolutionTargetType: 'journal_entry',
          resolutionTargetId: entry.id,
          resolvedById: scope.actorUserId,
          resolvedAt: new Date(),
        },
        tx,
      );
      await this.appendResolved(scope, review.id, row, tx);
      return row;
    });
    return { finding: updated, entryId: entry.id };
  }

  // ── Regeração / fechamento ─────────────────────────────────────────────────

  /** Item 8 + F-C11-6 (a): troca o par pelo job regerado; o par antigo fica só no evento. */
  async replaceJobs(scope: AccountingScope, reviewId: string, dto: ReplaceReviewJobsInput): Promise<AccountingReview> {
    this.assertCanReview(scope);
    const review = await this.requireReview(scope, reviewId);
    this.assertOpen(review);
    const ecd = dto.ecdJobId ? await this.requireJob(scope, dto.ecdJobId, 'ECD', review.year) : null;
    const ecf = dto.ecfJobId ? await this.requireJob(scope, dto.ecfJobId, 'ECF', review.year) : null;
    const nextEcd = ecd?.id ?? review.ecdJobId;
    const nextEcf = ecf?.id ?? review.ecfJobId;
    return this.reviewRepo.runTransaction(async (tx) => {
      const clash = await this.reviewRepo.findByJobs(scope, nextEcd, nextEcf, tx);
      if (clash && clash.id !== review.id) throw this.alreadyOpen(clash);
      const updated = await this.reviewRepo.update(scope, review.id, { ecdJobId: nextEcd, ecfJobId: nextEcf }, tx);
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: REVIEW_JOBS_REPLACED,
        targetType: 'accounting_review',
        targetId: review.id,
        payload: {
          reviewId: review.id,
          fromEcdJobId: review.ecdJobId,
          toEcdJobId: nextEcd,
          fromEcfJobId: review.ecfJobId,
          toEcfJobId: nextEcf,
        },
      });
      return updated;
    });
  }

  /** Itens 8/9: staleness + BLOCKER aberto → 409 `REVIEW_STALE`; senão `SIGNED_OFF`. */
  async signOff(scope: AccountingScope, reviewId: string, dto: SignOffReviewInput): Promise<AccountingReview> {
    if (!this.policy.canSignOffReview(scope)) {
      throw new ForbiddenError('Você não tem permissão para assinar revisões.');
    }
    const review = await this.requireReview(scope, reviewId);
    this.assertOpen(review);
    const jobs: AccountingDataExchangeJob[] = [];
    if (review.ecdJobId) jobs.push(await this.requireJob(scope, review.ecdJobId, 'ECD', review.year));
    if (review.ecfJobId) jobs.push(await this.requireJob(scope, review.ecfJobId, 'ECF', review.year));

    return this.reviewRepo.runTransaction(async (tx) => {
      // GATE AUTORITATIVO — relê achados dentro da tx: um achado adicionado entre a leitura e o
      // sign-off não pode passar.
      const fresh = await this.reviewRepo.findById(scope, review.id, tx);
      if (!fresh) throw new NotFoundError(`Revisão '${review.id}' não foi encontrada.`);
      this.assertOpen(fresh);
      const stale = staleFindings(jobs, fresh.findings);
      if (stale.unresolvedBlockers.length || stale.resolvedAfterGeneration.length) {
        throw new ConflictError(
          `Sign-off bloqueado: ${stale.unresolvedBlockers.length} BLOCKER sem resolução ` +
            `[${stale.unresolvedBlockers.join(', ')}]; ${stale.resolvedAfterGeneration.length} achado(s) ` +
            `resolvido(s) depois da geração [${stale.resolvedAfterGeneration.join(', ')}] — regere e troque os jobs (PATCH /jobs).`,
          'REVIEW_STALE',
        );
      }
      const updated = await this.reviewRepo.update(
        scope,
        review.id,
        {
          status: SIGNED_OFF,
          reviewerName: dto.reviewerName,
          reviewerCrc: dto.reviewerCrc,
          statement: dto.statement,
          closedAt: new Date(),
        },
        tx,
      );
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: REVIEW_SIGNED_OFF,
        targetType: 'accounting_review',
        targetId: review.id,
        payload: { reviewId: review.id, reviewerName: dto.reviewerName, reviewerCrc: dto.reviewerCrc },
      });
      return updated;
    });
  }

  /** Item 10: `REJECTED` — o pacote não deve ser entregue (gate C6, item 14). */
  async reject(scope: AccountingScope, reviewId: string, dto: RejectReviewInput): Promise<AccountingReview> {
    if (!this.policy.canSignOffReview(scope)) {
      throw new ForbiddenError('Você não tem permissão para rejeitar revisões.');
    }
    const review = await this.requireReview(scope, reviewId);
    this.assertOpen(review);
    return this.reviewRepo.runTransaction(async (tx) => {
      const updated = await this.reviewRepo.update(
        scope,
        review.id,
        { status: REJECTED, closeReason: dto.reason, closedAt: new Date() },
        tx,
      );
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: REVIEW_REJECTED,
        targetType: 'accounting_review',
        targetId: review.id,
        payload: { reviewId: review.id, reason: dto.reason },
      });
      return updated;
    });
  }

  // ── Gate da entrega (item 14, F-C11-3 a) — consumido por AccountingDeliveryService ─────────
  /**
   * A entrega do par exige revisão `SIGNED_OFF` para o MESMO par. `REJECTED` → 409
   * `REVIEW_REJECTED`; nenhuma ou só `OPEN` → 409 `REVIEW_REQUIRED`. Recebe `tx` para rodar DENTRO
   * da tx de `confirmDelivery` (gate autoritativo) e também no preflight.
   */
  async assertPairSignedOff(
    scope: AccountingScope,
    ecdJobId: string,
    ecfJobId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const exact = await this.reviewRepo.findByJobs(scope, ecdJobId, ecfJobId, tx);
    if (exact?.status === SIGNED_OFF) return;
    if (exact?.status === REJECTED) {
      throw new ConflictError(
        `A revisão '${exact.id}' deste par foi REJEITADA (${exact.closeReason ?? 'sem motivo'}) — o pacote não deve ser entregue.`,
        'REVIEW_REJECTED',
      );
    }
    throw new ConflictError(
      exact
        ? `A revisão '${exact.id}' deste par ainda está ${exact.status} — assine antes de entregar.`
        : 'Este par de jobs não tem revisão profissional assinada (POST /api/accounting/reviews).',
      'REVIEW_REQUIRED',
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private assertCanReview(scope: AccountingScope): void {
    if (!this.policy.canReviewAccounting(scope)) {
      throw new ForbiddenError('Você não tem permissão para revisar a contabilidade.');
    }
  }

  private assertOpen(review: AccountingReview): void {
    if (review.status !== OPEN) {
      throw new ConflictError(`Revisão '${review.id}' não está OPEN (status=${review.status}).`, 'REVIEW_NOT_OPEN');
    }
  }

  private alreadyOpen(existing: AccountingReview): ConflictError {
    return new ConflictError(
      `Já existe a revisão '${existing.id}' (${existing.status}) para este par de jobs.`,
      'REVIEW_ALREADY_OPEN',
    );
  }

  private async requireReview(scope: AccountingScope, id: string): Promise<AccountingReviewWithFindings> {
    const review = await this.reviewRepo.findById(scope, id);
    if (!review) throw new NotFoundError(`Revisão '${id}' não foi encontrada.`);
    return review;
  }

  private async requireFinding(scope: AccountingScope, reviewId: string, findingId: string): Promise<AccountingReviewFinding> {
    const finding = await this.reviewRepo.findFindingById(scope, reviewId, findingId);
    if (!finding) throw new NotFoundError(`Achado '${findingId}' não foi encontrado nesta revisão.`);
    return finding;
  }

  /**
   * Item 1 + lacuna fechada pelo dono (16/09): job do escopo, do kind certo, `EXPORTED`, com período
   * gravado e `year` batendo com `periodStart` (mesma régua do C6 `resolveJobs`).
   */
  private async requireJob(
    scope: AccountingScope,
    id: string,
    kind: 'ECD' | 'ECF',
    year: number,
  ): Promise<AccountingDataExchangeJob> {
    const job = await this.dataExchangeRepo.findJobById(scope, id);
    if (!job) throw new NotFoundError(`Job da ${kind} '${id}' não foi encontrado.`);
    const kindOk = kind === 'ECD' ? job.kind === ECD_JOB_KIND : ECF_JOB_KINDS.includes(job.kind);
    if (!kindOk) throw new ValidationError(`O job '${id}' não é uma ${kind} (kind=${job.kind}).`);
    if (job.status !== EXPORTED) {
      throw new ValidationError(`O job '${id}' não está EXPORTED (status=${job.status}) — o arquivo ainda não existe.`);
    }
    if (!job.periodStart) {
      throw new ValidationError(`O job '${id}' não tem período gravado — regere o arquivo para revisá-lo.`);
    }
    if (job.periodStart.getUTCFullYear() !== year) {
      throw new ValidationError(
        `O job '${id}' cobre ${job.periodStart.getUTCFullYear()}, não ${year} — a revisão é de um exercício só.`,
      );
    }
    return job;
  }

  /** Item 4: o alvo do ponteiro DATA_EDIT tem de existir no escopo (lookup pelo repositório dono). */
  private async assertTargetExists(scope: AccountingScope, targetType: ResolutionTarget, targetId: string): Promise<void> {
    const found = await (async () => {
      switch (targetType) {
        case 'account': return this.accountRepo.findById(scope, targetId);
        case 'referential_mapping': return this.mappingRepo.findById(scope, targetId);
        case 'counterparty': return this.counterpartyRepo.findById(scope, targetId);
        case 'generation_input': return this.dataExchangeRepo.findJobById(scope, targetId);
        case 'journal_entry': return this.journalEntryRepo.findById(scope, targetId);
      }
    })();
    if (!found) {
      throw new ValidationError(`Alvo ${targetType} '${targetId}' não existe neste escopo.`);
    }
  }

  private async appendResolved(
    scope: AccountingScope,
    reviewId: string,
    finding: AccountingReviewFinding,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await this.auditService.append(tx, scope, {
      actorUserId: scope.actorUserId,
      eventType: REVIEW_FINDING_RESOLVED,
      targetType: 'accounting_review',
      targetId: reviewId,
      payload: {
        reviewId,
        findingId: finding.id,
        resolution: finding.resolution,
        targetType: finding.resolutionTargetType,
        targetId: finding.resolutionTargetId,
      },
    });
  }
}
