import type { Prisma } from 'generated/prisma';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../lib/errors';
import { logger } from '../../../lib/logger';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IBankSettlementRepository, BankSettlementItemWithLine } from '../repositories/IBankSettlementRepository';
import type { IReconciliationRepository } from '../repositories/IReconciliationRepository';
import type { IPostingRepository } from '../repositories/IPostingRepository';
import type { IPayableRepository } from '../repositories/IPayableRepository';
import type { IReceivableRepository } from '../repositories/IReceivableRepository';
import type { IAccountRepository } from '../repositories/IAccountRepository';
import type { IAccountingPeriodRepository } from '../repositories/IAccountingPeriodRepository';
import type { AuditService } from './AuditService';
import type { ReconciliationService } from './ReconciliationService';
import type { PayableService } from './PayableService';
import type { ReceivableService } from './ReceivableService';
import type { PostingService } from './PostingService';
import { centsFromDb } from '../models/money';
import { dateOnlyFromDayNumber, toUtcDayNumber } from '../models/dates';
import { resolvePaymentMethodAccount } from '../models/Payable.model';
import {
  BANK_CHARGE_SOURCE_TYPE,
  BANK_SETTLEMENT_CONFIRMED,
  BANK_SETTLEMENT_FAILED,
  BANK_SETTLEMENT_REJECTED,
  BANK_SETTLEMENT_SCANNED,
  pickCandidate,
  type BankSettlementStep,
  type BankSettlementTitleType,
} from '../models/BankSettlement.model';
import type {
  ConfirmBankSettlementInput,
  ListBankSettlementsQueryInput,
  RejectBankSettlementInput,
  ScanBankSettlementsInput,
} from '../dtos/BankSettlementDto';

export interface ScanSummary {
  created: number;
  skippedExisting: number;
  ambiguous: number;
  none: number;
  stale: number;
}

export interface BankSettlementItemView {
  id: string;
  origin: string;
  status: string;
  titleType: string;
  titleId: string;
  proposedCents: number;
  chargeCents: number;
  line: { id: string; date: string; amountCents: number; description: string; externalRef: string | null };
  title: { openCents: number; dueDate: string; counterpartyName: string; status: string } | null;
  settlementId: string | null;
  chargeEntryId: string | null;
  reason: string | null;
  failedStep: string | null;
  confirmedAt: string | null;
}

const toDateOnly = (d: Date): string => dateOnlyFromDayNumber(toUtcDayNumber(d));

/**
 * BE-INCR-BANK-SETTLEMENT (nó F7). O item PROPÕE; só `confirm` humano produz efeito (resposta 20).
 * Encargo = |linha| − saldo, lançado à parte como `bank.charge` (resposta 22, F-F7-2 a). Tabela irmã de
 * `reconcile_pending_items` (R9): nenhum uso de `ReconcilePendingService`/`canManageReconcilePending`.
 *
 * `confirm` (F-F7-4 a): CAS `PENDING → CONFIRMING` fecha a corrida; pré-cheque autoritativo em leitura
 * transacional ANTES de qualquer efeito (classe `efeito-irreversivel-antes-do-gate-autoritativo`); depois
 * etapas idempotentes com estado gravado no item — (i) baixa pelo AP/AR (protocolo claim→book→finalize
 * deles, NÃO reaberto), (ii) encargo, (iii) `manualMatch` dos legs de banco, (iv) `CONFIRMED`. Falha em
 * (ii)/(iii) → `FAILED` com os ids das etapas feitas preservados; `retry` retoma do primeiro passo sem id.
 */
export class BankSettlementService {
  constructor(
    private readonly repo: IBankSettlementRepository,
    private readonly reconciliationRepo: IReconciliationRepository,
    private readonly postingRepo: IPostingRepository,
    private readonly payableRepo: IPayableRepository,
    private readonly receivableRepo: IReceivableRepository,
    private readonly accountRepo: IAccountRepository,
    private readonly periodRepo: IAccountingPeriodRepository,
    private readonly policy: IAccountingPolicy,
    private readonly reconciliation: ReconciliationService,
    private readonly payables: PayableService,
    private readonly receivables: ReceivableService,
    private readonly posting: PostingService,
    private readonly auditService: AuditService,
  ) {}

  // ── Scan (itens 2, 3, 10) ─────────────────────────────────────────────────────────────────────

  async scan(scope: AccountingScope, input: ScanBankSettlementsInput): Promise<ScanSummary> {
    if (!this.policy.canReadBankSettlement(scope)) {
      throw new ForbiddenError('Você não tem permissão para varrer baixas bancárias.');
    }
    const statement = await this.reconciliationRepo.findStatementById(scope, input.statementId);
    if (!statement || statement.deletedAt) throw new NotFoundError('Extrato não encontrado.');

    const summary: ScanSummary = { created: 0, skippedExisting: 0, ambiguous: 0, none: 0, stale: 0 };
    const [payables, receivables] = await Promise.all([
      this.repo.findSettleableTitles(scope, 'PAYABLE'),
      this.repo.findSettleableTitles(scope, 'RECEIVABLE'),
    ]);
    const settleableIds = new Set([...payables, ...receivables].map((t) => `${t.titleType}:${t.id}`));

    // Item 10 — stale: PENDING cuja linha saiu de UNMATCHED ou cujo título deixou de ser liquidável.
    const pending = await this.repo.findPendingByStatement(scope, input.statementId);
    for (const item of pending) {
      const line = await this.reconciliationRepo.findLineById(scope, item.statementLineId);
      const lineGone = !line || line.status !== 'UNMATCHED';
      const titleGone = !settleableIds.has(`${item.titleType}:${item.titleId}`);
      if (lineGone || titleGone) {
        await this.repo.update(scope, item.id, {
          status: 'STALE',
          reason: lineGone ? 'line_not_unmatched' : 'title_not_open',
        });
        summary.stale += 1;
      }
    }

    const lines = await this.reconciliationRepo.findLinesByStatement(scope, input.statementId, 'UNMATCHED');
    for (const line of lines) {
      const amountCents = centsFromDb(line.amountCents);
      const titleType: BankSettlementTitleType = amountCents < 0 ? 'PAYABLE' : 'RECEIVABLE';
      const result = pickCandidate(
        { amountCents, date: line.date, externalRef: line.externalRef },
        titleType === 'PAYABLE' ? payables : receivables,
      );
      if (result.outcome === 'none') {
        summary.none += 1;
        continue;
      }
      if (result.outcome === 'ambiguous') {
        summary.ambiguous += 1;
        continue;
      }
      const title = result.title!;
      // Idempotência (item 2): item vivo (PENDING/CONFIRMING/CONFIRMED/FAILED) na linha → não gera outro;
      // REJECTED só bloqueia o MESMO título.
      const existing = await this.repo.findByLine(scope, line.id);
      const blocking = existing.find(
        (e) => (e.status !== 'REJECTED' && e.status !== 'STALE') || (e.status === 'REJECTED' && e.titleType === title.titleType && e.titleId === title.id),
      );
      if (blocking) {
        summary.skippedExisting += 1;
        continue;
      }
      const stale = existing.find((e) => e.status === 'STALE' && e.titleType === title.titleType && e.titleId === title.id);
      if (stale) {
        // Mesmo (linha, título) já existe como STALE — a @@unique impede 2ª linha; volta a PENDING com os valores re-avaliados.
        await this.repo.update(scope, stale.id, { status: 'PENDING', reason: null });
        summary.created += 1;
        continue;
      }
      await this.repo.create(scope, {
        origin: 'STATEMENT_LINE',
        statementLineId: line.id,
        titleType: title.titleType,
        titleId: title.id,
        proposedCents: result.proposedCents!,
        chargeCents: result.chargeCents!,
      });
      summary.created += 1;
    }

    await this.repo.runTransaction(async (tx) => {
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: BANK_SETTLEMENT_SCANNED,
        targetType: 'bank_statement',
        targetId: input.statementId,
        payload: {
          statementId: input.statementId,
          created: String(summary.created),
          skippedExisting: String(summary.skippedExisting),
          ambiguous: String(summary.ambiguous),
          none: String(summary.none),
          stale: String(summary.stale),
        },
      });
    });
    return summary;
  }

  // ── List (item 4) ─────────────────────────────────────────────────────────────────────────────

  async list(
    scope: AccountingScope,
    query: ListBankSettlementsQueryInput,
  ): Promise<{ items: BankSettlementItemView[]; total: number; page: number; limit: number }> {
    if (!this.policy.canReadBankSettlement(scope)) {
      throw new ForbiddenError('Você não tem permissão para ler baixas bancárias.');
    }
    const { items, total } = await this.repo.findMany(scope, query);
    const views: BankSettlementItemView[] = [];
    for (const item of items) views.push(await this.toView(scope, item));
    return { items: views, total, page: query.page, limit: query.limit };
  }

  private async toView(scope: AccountingScope, item: BankSettlementItemWithLine): Promise<BankSettlementItemView> {
    // Saldo aberto RECALCULADO na leitura, nunca persistido (item 4).
    const title = await this.repo.findTitle(scope, item.titleType as BankSettlementTitleType, item.titleId);
    return {
      id: item.id,
      origin: item.origin,
      status: item.status,
      titleType: item.titleType,
      titleId: item.titleId,
      proposedCents: centsFromDb(item.proposedCents),
      chargeCents: centsFromDb(item.chargeCents),
      line: {
        id: item.statementLine.id,
        date: toDateOnly(item.statementLine.date),
        amountCents: centsFromDb(item.statementLine.amountCents),
        description: item.statementLine.description,
        externalRef: item.statementLine.externalRef,
      },
      title: title
        ? { openCents: title.openCents, dueDate: toDateOnly(title.dueDate), counterpartyName: title.counterpartyName, status: title.status }
        : null,
      settlementId: item.settlementId,
      chargeEntryId: item.chargeEntryId,
      reason: item.reason,
      failedStep: item.failedStep,
      confirmedAt: item.confirmedAt ? item.confirmedAt.toISOString() : null,
    };
  }

  // ── Reject (item 5) ───────────────────────────────────────────────────────────────────────────

  async reject(scope: AccountingScope, id: string, input: RejectBankSettlementInput): Promise<BankSettlementItemView> {
    const item = await this.requireItem(scope, id);
    this.assertCanManage(scope, item.titleType as BankSettlementTitleType);
    return this.repo.runTransaction(async (tx) => {
      const won = await this.repo.compareAndSetStatus(scope, id, 'PENDING', 'REJECTED', tx);
      if (won === 0) throw new ValidationError(`Item não está PENDING (status atual: ${item.status}).`);
      await this.repo.update(scope, id, { reason: input.reason }, tx);
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: BANK_SETTLEMENT_REJECTED,
        targetType: 'bank_settlement_item',
        targetId: id,
        payload: { itemId: id, reason: input.reason },
      });
      const fresh = await this.repo.findById(scope, id, tx);
      return this.toView(scope, fresh!);
    });
  }

  // ── Confirm (itens 6, 7, 8) e retry (item 9) ──────────────────────────────────────────────────

  async confirm(scope: AccountingScope, id: string, input: ConfirmBankSettlementInput): Promise<BankSettlementItemView> {
    const item = await this.requireItem(scope, id);
    this.assertCanManage(scope, item.titleType as BankSettlementTitleType);
    // CAS primeiro (item 15: 2 confirms concorrentes → 1 efeito). Perdedor = 400, sem efeito.
    const won = await this.repo.compareAndSetStatus(scope, id, 'PENDING', 'CONFIRMING');
    if (won === 0) throw new ValidationError(`Item não está PENDING (status atual: ${item.status}).`);
    return this.runConfirm(scope, id, input.method, 'PENDING');
  }

  async retry(scope: AccountingScope, id: string, method: string): Promise<BankSettlementItemView> {
    const item = await this.requireItem(scope, id);
    this.assertCanManage(scope, item.titleType as BankSettlementTitleType);
    const won = await this.repo.compareAndSetStatus(scope, id, 'FAILED', 'CONFIRMING');
    if (won === 0) throw new ValidationError(`retry só de FAILED (status atual: ${item.status}).`);
    return this.runConfirm(scope, id, method, 'FAILED');
  }

  /**
   * Pré-cheque autoritativo (item 6) em leitura transacional; qualquer falha devolve o item ao estado
   * anterior (`releaseTo`) e responde 400 SEM efeito. Depois, as etapas (item 7) fora de tx — o AP/AR
   * tem protocolo próprio que não aceita `tx` externa (F-F7-4 a, verificado no BRIEF).
   */
  private async runConfirm(scope: AccountingScope, id: string, method: string, releaseTo: 'PENDING' | 'FAILED'): Promise<BankSettlementItemView> {
    let ctx: Awaited<ReturnType<BankSettlementService['precheck']>>;
    try {
      ctx = await this.repo.runTransaction((tx) => this.precheck(scope, id, method, tx));
    } catch (error) {
      await this.repo.compareAndSetStatus(scope, id, 'CONFIRMING', releaseTo);
      throw error;
    }

    const item = ctx.item;
    const titleType = item.titleType as BankSettlementTitleType;
    const proposedCents = centsFromDb(item.proposedCents);
    const chargeCents = centsFromDb(item.chargeCents);
    const lineDate = toDateOnly(item.statementLine.date);
    let settlementId = item.settlementId;
    let chargeEntryId = item.chargeEntryId;
    let step: BankSettlementStep = 'SETTLE';

    try {
      // (i) baixa pelo AP/AR — idempotente por id gravado.
      if (!settlementId) {
        const settlement =
          titleType === 'PAYABLE'
            ? await this.payables.registerPayment(scope, item.titleId, { unitId: scope.unitId, method, paidAt: lineDate, amountCents: proposedCents })
            : await this.receivables.registerReceipt(scope, item.titleId, { unitId: scope.unitId, method, receivedAt: lineDate, amountCents: proposedCents });
        settlementId = settlement.id;
        await this.repo.update(scope, id, { settlementId });
      }

      // (ii) encargo `bank.charge` (item 8) — idempotente por (sourceType, sourceId = item.id) no PostingService.
      step = 'CHARGE';
      if (chargeCents > 0 && !chargeEntryId) {
        const entry = await this.posting.postEntry(scope, {
          unitId: scope.unitId,
          date: lineDate,
          description: `Encargo bancário — ${titleType} ${item.titleId}`,
          sourceType: BANK_CHARGE_SOURCE_TYPE,
          sourceId: item.id,
          lines:
            titleType === 'PAYABLE'
              ? [
                  { accountCode: ctx.chargeAccountCode!, debitCents: chargeCents, creditCents: 0 },
                  { accountCode: ctx.bankAccountCode, debitCents: 0, creditCents: chargeCents },
                ]
              : [
                  { accountCode: ctx.bankAccountCode, debitCents: chargeCents, creditCents: 0 },
                  { accountCode: ctx.chargeAccountCode!, debitCents: 0, creditCents: chargeCents },
                ],
        });
        chargeEntryId = entry.id;
        await this.repo.update(scope, id, { chargeEntryId });
      }

      // (iii) conciliação: legs de banco da baixa (+ do encargo) fecham |linha| exato no gate do manualMatch.
      step = 'MATCH';
      const bankPostingIds = await this.bankLegPostingIds(scope, ctx.bankAccountId, settlementId, titleType, chargeEntryId);
      const freshLine = await this.reconciliationRepo.findLineById(scope, item.statementLineId);
      const alreadyMatched =
        freshLine?.status === 'MATCHED' &&
        (await this.reconciliationRepo.findActiveMatchesByLine(scope, item.statementLineId)).every((m) => bankPostingIds.includes(m.postingId));
      if (!alreadyMatched) {
        await this.reconciliation.manualMatch(scope, { statementLineId: item.statementLineId, postingIds: bankPostingIds });
      }

      // (iv)
      const confirmedAt = new Date();
      await this.repo.runTransaction(async (tx) => {
        await this.repo.update(scope, id, { status: 'CONFIRMED', confirmedById: scope.actorUserId, confirmedAt, reason: null, failedStep: null }, tx);
        await this.auditService.append(tx, scope, {
          actorUserId: scope.actorUserId,
          eventType: BANK_SETTLEMENT_CONFIRMED,
          targetType: 'bank_settlement_item',
          targetId: id,
          payload: {
            itemId: id,
            titleType,
            titleId: item.titleId,
            proposedCents: String(proposedCents),
            chargeCents: String(chargeCents),
            settlementId,
            chargeEntryId: chargeEntryId ?? '',
          },
        });
      });
    } catch (error) {
      const failReason = error instanceof Error ? error.message : String(error);
      logger.warn('bank settlement confirm failed — ids preserved, retry available', { itemId: id, step, failReason });
      await this.repo.runTransaction(async (tx) => {
        await this.repo.update(scope, id, { status: 'FAILED', failedStep: step, reason: failReason, settlementId, chargeEntryId }, tx);
        await this.auditService.append(tx, scope, {
          actorUserId: scope.actorUserId,
          eventType: BANK_SETTLEMENT_FAILED,
          targetType: 'bank_settlement_item',
          targetId: id,
          payload: { itemId: id, step, failReason },
        });
      });
      throw error;
    }
    const fresh = await this.repo.findById(scope, id);
    return this.toView(scope, fresh!);
  }

  private async precheck(scope: AccountingScope, id: string, method: string, tx: Prisma.TransactionClient) {
    const item = await this.repo.findById(scope, id, tx);
    if (!item) throw new NotFoundError('Item de baixa não encontrado.');
    if (item.status !== 'CONFIRMING') throw new ValidationError(`Item não está em confirmação (status atual: ${item.status}).`);

    const line = await this.reconciliationRepo.findLineById(scope, item.statementLineId, tx);
    if (!line) throw new NotFoundError('Linha de extrato não encontrada.');
    const activeMatches = await this.reconciliationRepo.findActiveMatchesByLine(scope, line.id, tx);
    // Retry após (iii) bem-sucedido: a linha já está MATCHED com os NOSSOS postings — não é stale.
    const resumingAfterMatch = item.settlementId !== null && line.status === 'MATCHED';
    if (!resumingAfterMatch && (line.status !== 'UNMATCHED' || activeMatches.length > 0)) {
      throw new ValidationError('line_not_unmatched: a linha já foi conciliada por outro caminho.');
    }
    const statement = await this.reconciliationRepo.findStatementById(scope, line.statementId, tx);
    if (!statement || statement.deletedAt) throw new ValidationError('statement_inactive: o extrato não está ativo.');

    const titleType = item.titleType as BankSettlementTitleType;
    const title = await this.repo.findTitle(scope, titleType, item.titleId, tx);
    const proposedCents = centsFromDb(item.proposedCents);
    // Saldo RE-LIDO (item 6): na retomada após (i), a baixa já foi debitada do saldo — não exigir de novo.
    if (!item.settlementId) {
      const settleable = titleType === 'PAYABLE' ? ['OPEN', 'PARTIALLY_PAID'] : ['OPEN', 'PARTIALLY_RECEIVED'];
      if (!title || !settleable.includes(title.status)) throw new ValidationError('title_not_open: o título não está aberto para baixa.');
      if (title.openCents < proposedCents) {
        throw new ValidationError(`title_balance: saldo aberto (${title.openCents}) menor que a baixa proposta (${proposedCents}).`);
      }
    }

    // F-F7-3 (a): a conta do método TEM de ser a conta do extrato.
    const bankAccountCode = resolvePaymentMethodAccount(method);
    const bankAccount = await this.accountRepo.findByCode(scope, bankAccountCode, tx);
    if (!bankAccount || bankAccount.id !== statement.glAccountId) {
      throw new ValidationError(`method_account_mismatch: '${method}' resolve para ${bankAccountCode}, que não é a conta deste extrato.`);
    }

    // Encargo (item 8): conta configurada + período da linha aberto — senão 400 nomeado, sem efeito.
    let chargeAccountCode: string | undefined;
    if (centsFromDb(item.chargeCents) > 0) {
      const settings = await this.repo.getSettings(scope, tx);
      const chargeAccountId = titleType === 'PAYABLE' ? settings?.bankChargeExpenseAccountId : settings?.bankChargeIncomeAccountId;
      if (!chargeAccountId) {
        throw new ValidationError(
          `charge_account_not_configured: conta de encargo ${titleType === 'PAYABLE' ? 'pago' : 'recebido'} não configurada (PUT /api/accounting/settings — códigos são pendência do contador).`,
        );
      }
      const chargeAccount = await this.accountRepo.findById(scope, chargeAccountId, tx);
      if (!chargeAccount || chargeAccount.deletedAt) throw new ValidationError('charge_account_not_configured: a conta de encargo configurada não existe mais.');
      chargeAccountCode = chargeAccount.code;
      const day = toDateOnly(line.date);
      const period = await this.periodRepo.findByYearMonth(scope, Number(day.slice(0, 4)), Number(day.slice(5, 7)), tx);
      if (!period || period.status !== 'OPEN') throw new ValidationError(`period_not_open: período ${day.slice(0, 7)} não está aberto para o encargo.`);
    }

    return { item, line, statement, bankAccountId: statement.glAccountId, bankAccountCode, chargeAccountCode };
  }

  /** Postings do lado do banco: o da baixa (entry do pagamento/recebimento) e, se houver, o do encargo. */
  private async bankLegPostingIds(
    scope: AccountingScope,
    bankAccountId: string,
    settlementId: string,
    titleType: BankSettlementTitleType,
    chargeEntryId: string | null,
  ): Promise<string[]> {
    const settlementEntryId =
      titleType === 'PAYABLE'
        ? (await this.payableRepo.findPaymentById(scope, settlementId))?.entryId
        : (await this.receivableRepo.findReceiptById(scope, settlementId))?.entryId;
    if (!settlementEntryId) throw new ValidationError('settlement_entry_missing: a baixa ainda não tem lançamento (reconcile do AP/AR pendente).');
    const ids: string[] = [];
    for (const entryId of [settlementEntryId, chargeEntryId].filter((e): e is string => !!e)) {
      const postings = await this.postingRepo.findByEntryId(scope, entryId);
      const leg = postings.find((p) => p.accountId === bankAccountId);
      if (!leg) throw new ValidationError(`bank_leg_missing: lançamento ${entryId} não tem posting na conta do extrato.`);
      ids.push(leg.id);
    }
    return ids;
  }

  private async requireItem(scope: AccountingScope, id: string): Promise<BankSettlementItemWithLine> {
    const item = await this.repo.findById(scope, id);
    if (!item) throw new NotFoundError('Item de baixa não encontrado.');
    return item;
  }

  private assertCanManage(scope: AccountingScope, titleType: BankSettlementTitleType): void {
    if (!this.policy.canManageBankSettlement(scope, titleType)) {
      throw new ForbiddenError('Você não tem permissão para confirmar/rejeitar baixas bancárias deste tipo.');
    }
  }
}
