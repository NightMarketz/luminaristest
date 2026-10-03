import { AccountantRequiredError, ForbiddenError, ValidationError } from '../../../lib/errors';
import logger from '../../../lib/logger';
import type { AccountingPeriod } from 'generated/prisma';
import type { IAccountingPeriodRepository } from '../repositories/IAccountingPeriodRepository';
import type { ActiveAccountant, IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IAccountantAssignmentRepository } from '../repositories/IAccountantAssignmentRepository';
import type { IPostingRepository } from '../repositories/IPostingRepository';
import type { AuditService } from './AuditService';
import type { AccountingScope } from '../scope/AccountingScope';

/**
 * PeriodService — accounting period state machine.
 *
 * Legal transitions:
 *   FUTURE → OPEN   (open)
 *   OPEN   → SOFT_CLOSED (softClose)
 *   OPEN   → HARD_CLOSED (hardClose)
 *   SOFT_CLOSED → OPEN  (reopen)
 *   SOFT_CLOSED → HARD_CLOSED (hardClose)
 *   HARD_CLOSED = terminal (never reopens)
 *
 * Every transition writes an AccountingPeriodTransition row in the same tx (via repo).
 * Posting gates live in PostingService, not here.
 *
 * Reabertura (BE-INCR-ACCOUNTANT-GOVERNANCE, BRIEF item 10): os DOIS caminhos que levam SOFT_CLOSED → OPEN
 * (`reopenPeriod` e `openPeriod` a partir de SOFT_CLOSED) passam por `canReopenPeriod(scope, active)` em dois
 * níveis — preflight fora da tx e releitura da atribuição ACTIVE com `tx` dentro do `runTransaction`, antes do
 * `setStatus` (que é CAS no status, item 11). `openPeriod` a partir de FUTURE segue em `canClosePeriod`.
 */
export class PeriodService {
  constructor(
    private readonly periodRepo: IAccountingPeriodRepository,
    private readonly policy: IAccountingPolicy,
    private readonly postingRepo: IPostingRepository,
    private readonly auditService: AuditService,
    private readonly assignmentRepo: IAccountantAssignmentRepository,
  ) {}

  /** Item 10: gate da reabertura — mesmo predicado no preflight e na releitura com `tx`. */
  private assertCanReopen(scope: AccountingScope, active: ActiveAccountant | null): void {
    if (!this.policy.canReopenPeriod(scope, active)) {
      throw active
        ? new AccountantRequiredError('reabrir o período')
        : new ForbiddenError('Você não tem permissão para reabrir períodos contábeis.');
    }
  }

  /** Idempotently create 12 FUTURE periods for the given fiscal year. */
  async seedYear(scope: AccountingScope, year: number): Promise<AccountingPeriod[]> {
    if (!this.policy.canClosePeriod(scope)) {
      throw new ForbiddenError('Você não tem permissão para gerenciar períodos contábeis.');
    }
    const periods = await this.postingRepo.runTransaction((tx) =>
      this.periodRepo.seedYear(scope, year, tx),
    );
    logger.info('Accounting periods seeded', { year, count: periods.length });
    return periods;
  }

  /** Open a FUTURE or SOFT_CLOSED period → OPEN. */
  async openPeriod(scope: AccountingScope, periodId: string): Promise<AccountingPeriod> {
    if (!this.policy.canClosePeriod(scope)) {
      throw new ForbiddenError('Você não tem permissão para gerenciar períodos contábeis.');
    }
    const period = await this.periodRepo.findById(scope, periodId);
    if (!period) {
      throw new ValidationError(`Período '${periodId}' não encontrado.`);
    }
    if (period.status !== 'FUTURE' && period.status !== 'SOFT_CLOSED') {
      throw new ValidationError(
        `Período ${period.year}/${String(period.month).padStart(2, '0')} não pode ser aberto — status atual: ${period.status}.`,
      );
    }
    const fromStatus = period.status;
    const isReopen = fromStatus === 'SOFT_CLOSED';
    if (isReopen) this.assertCanReopen(scope, await this.assignmentRepo.findActive(scope));
    return this.postingRepo.runTransaction(async (tx) => {
      // GATE AUTORITATIVO — a atribuição pode ter mudado entre o preflight e a tx.
      const active = await this.assignmentRepo.findActive(scope, tx);
      if (isReopen) this.assertCanReopen(scope, active);
      const updated = await this.periodRepo.setStatus(scope, period.year, period.month, 'OPEN', scope.actorUserId, undefined, tx, fromStatus);
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType:   'period.opened',
        targetType:  'accounting_period',
        targetId:    period.id,
        payload:     { year: period.year, month: period.month, fromStatus, toStatus: 'OPEN', ...(active ? { assignmentId: active.id } : {}) },
      });
      return updated;
    });
  }

  /** Close an OPEN period softly → SOFT_CLOSED (can be reopened). */
  async softClosePeriod(
    scope: AccountingScope,
    periodId: string,
    reason?: string,
  ): Promise<AccountingPeriod> {
    if (!this.policy.canClosePeriod(scope)) {
      throw new ForbiddenError('Você não tem permissão para gerenciar períodos contábeis.');
    }
    const period = await this.periodRepo.findById(scope, periodId);
    if (!period) {
      throw new ValidationError(`Período '${periodId}' não encontrado.`);
    }
    if (period.status !== 'OPEN') {
      throw new ValidationError(
        `Período ${period.year}/${String(period.month).padStart(2, '0')} não pode ser fechado (soft) — status atual: ${period.status}.`,
      );
    }
    const fromStatus = period.status;
    return this.postingRepo.runTransaction(async (tx) => {
      const updated = await this.periodRepo.setStatus(scope, period.year, period.month, 'SOFT_CLOSED', scope.actorUserId, reason, tx, fromStatus);
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType:   'period.soft_closed',
        targetType:  'accounting_period',
        targetId:    period.id,
        payload:     { year: period.year, month: period.month, fromStatus, toStatus: 'SOFT_CLOSED', reason },
      });
      return updated;
    });
  }

  /** Permanently close a period → HARD_CLOSED (terminal, never reopens). */
  async hardClosePeriod(
    scope: AccountingScope,
    periodId: string,
    reason?: string,
  ): Promise<AccountingPeriod> {
    if (!this.policy.canClosePeriod(scope)) {
      throw new ForbiddenError('Você não tem permissão para gerenciar períodos contábeis.');
    }
    const period = await this.periodRepo.findById(scope, periodId);
    if (!period) {
      throw new ValidationError(`Período '${periodId}' não encontrado.`);
    }
    if (period.status !== 'OPEN' && period.status !== 'SOFT_CLOSED') {
      throw new ValidationError(
        `Período ${period.year}/${String(period.month).padStart(2, '0')} não pode ser fechado definitivamente — status atual: ${period.status}.`,
      );
    }
    const fromStatus = period.status;
    return this.postingRepo.runTransaction(async (tx) => {
      const updated = await this.periodRepo.setStatus(scope, period.year, period.month, 'HARD_CLOSED', scope.actorUserId, reason, tx, fromStatus);
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType:   'period.hard_closed',
        targetType:  'accounting_period',
        targetId:    period.id,
        payload:     { year: period.year, month: period.month, fromStatus, toStatus: 'HARD_CLOSED', reason },
      });
      return updated;
    });
  }

  /** Reopen a SOFT_CLOSED period → OPEN. HARD_CLOSED is terminal — throws. */
  async reopenPeriod(
    scope: AccountingScope,
    periodId: string,
    reason?: string,
  ): Promise<AccountingPeriod> {
    this.assertCanReopen(scope, await this.assignmentRepo.findActive(scope));
    const period = await this.periodRepo.findById(scope, periodId);
    if (!period) {
      throw new ValidationError(`Período '${periodId}' não encontrado.`);
    }
    if (period.status === 'HARD_CLOSED') {
      throw new ValidationError(
        `Período ${period.year}/${String(period.month).padStart(2, '0')} está definitivamente fechado e não pode ser reaberto.`,
      );
    }
    if (period.status !== 'SOFT_CLOSED') {
      throw new ValidationError(
        `Período ${period.year}/${String(period.month).padStart(2, '0')} não pode ser reaberto — status atual: ${period.status}.`,
      );
    }
    const fromStatus = period.status;
    return this.postingRepo.runTransaction(async (tx) => {
      // GATE AUTORITATIVO — a atribuição pode ter mudado entre o preflight e a tx.
      const active = await this.assignmentRepo.findActive(scope, tx);
      this.assertCanReopen(scope, active);
      const updated = await this.periodRepo.setStatus(scope, period.year, period.month, 'OPEN', scope.actorUserId, reason, tx, fromStatus);
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType:   'period.reopened',
        targetType:  'accounting_period',
        targetId:    period.id,
        payload:     { year: period.year, month: period.month, fromStatus, toStatus: 'OPEN', reason, ...(active ? { assignmentId: active.id } : {}) },
      });
      return updated;
    });
  }

  /** List all periods for a fiscal year. */
  async listPeriods(scope: AccountingScope, year: number): Promise<AccountingPeriod[]> {
    if (!this.policy.canRead(scope)) {
      throw new ForbiddenError('Você não tem permissão para listar períodos contábeis.');
    }
    return this.periodRepo.list(scope, year);
  }
}
