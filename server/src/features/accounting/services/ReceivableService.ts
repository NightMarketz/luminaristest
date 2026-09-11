import { ForbiddenError, NotFoundError, ValidationError } from '../../../lib/errors';
import logger from '../../../lib/logger';
import { Prisma } from 'generated/prisma';
import type { Account, Receivable, ReceivableReceipt } from 'generated/prisma';
import { CLIENTES_A_RECEBER_CODE } from '../fixtures/ChartOfAccountsFixture';
import { centsFromDb } from '../models/money';
import {
  AR_RECEIVABLE_SOURCE_TYPE,
  AR_RECEIPT_SOURCE_TYPE,
  deletedDocumentNumber,
  RECEIVABLE_SETTLEABLE_STATUSES,
  receivableStatusForBalance,
  resolveReceiptMethodAccount,
} from '../models/Receivable.model';
import type {
  CancelReceivableInput,
  CancelReceiptInput,
  CreateReceivableInput,
  ListReceivablesQueryInput,
  RegisterReceiptInput,
} from '../dtos/ReceivableDto';
import type { IReceivableRepository, ReceivableWithReceipts } from '../repositories/IReceivableRepository';
import type { IAccountRepository } from '../repositories/IAccountRepository';
import type { ICounterpartyRepository } from '../repositories/ICounterpartyRepository';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { PostEntryInput } from '../dtos/PostingDto';
import { syncSkipErrorCode } from '../sync/AccountingSyncPort';
import type { AuditService } from './AuditService';
import type { PostingService } from './PostingService';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import { resolveOrCreateCounterpartyId } from './counterpartyResolution';

/**
 * ReceivableService — Contas a Receber (INCR-AR / ADR-INCR-AR). FIRST-CLASS PRISMA. MIRROR of
 * PayableService (a receber × a pagar), inverting every leg.
 *
 * Books the DUAL fato gerador directly through PostingService.postEntry (F0 rota (a), golden ref
 * PayableService/ExerciseClosingService — AR is a module INTERNAL to the accounting world, not a
 * DynamicTable origin, so there is NO AccountingSyncPort/mapper/bridge):
 *   - recognition (competência): D 1.1.5 Clientes a Receber / C revenueAccount (3.x) — sourceType='ar.receivable', sourceId=receivableId
 *   - receipt (data efetiva):     D conta-por-método / C 1.1.5 — sourceType='ar.receipt', sourceId=receiptId
 *
 * Control account = the DEDICATED 1.1.5 (F7), distinct from the sale's 1.1.2, so the subledger
 * ties out to the GL. AR-formal takes MANUAL customer invoices (avulsas) and, since
 * ADR-CRM-AR-SEAM, CRM Won deals fed by CrmReceivableBridge (documentNumber `CRM-<oppId>`) —
 * never sales (those settle via their own sale.settled events on 1.1.2).
 *
 * Key invariants (mirror the AP module):
 * - postEntry opens its OWN root tx (SQLite has no nesting), so the AR-row write and the ledger write
 *   are DIFFERENT transactions. The double-receipt race is closed BEFORE the post by an atomic
 *   OPEN→RECEIVING status CAS (claimForReceipt, D4); a crash between the two txs converges via
 *   reconcileReceivables (the re-drive safety net — mandatory, since with rota (a) this reconcile is
 *   our own code, not the generic AccountingSync registry).
 * - receipt idempotency keys on receiptId, NEVER receivableId (D3) — re-receiving after a reversal
 *   mints a new key instead of returning the reverted entry (T7).
 * - cancel = estorno (reverseEntry) in an open period + row lifecycle flip (ACC-018/T5), never a
 *   destructive edit; rename-on-delete frees the business key (D3).
 */
/** Read shape of a title with its balance (BRIEF §2) — MIRROR of PayableWithBalance. */
export type ReceivableWithBalance = ReceivableWithReceipts & { remainingCents: bigint };

function withBalance(receivable: ReceivableWithReceipts): ReceivableWithBalance {
  return { ...receivable, remainingCents: receivable.amountCents - receivable.receivedCents };
}

export class ReceivableService {
  constructor(
    private readonly receivableRepo: IReceivableRepository,
    private readonly accountRepo: IAccountRepository,
    private readonly posting: PostingService,
    private readonly auditService: AuditService,
    private readonly policy: IAccountingPolicy,
    private readonly counterpartyRepo: ICounterpartyRepository,
  ) {}

  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  async listReceivables(
    scope: AccountingScope,
    params: ListReceivablesQueryInput,
  ): Promise<{ receivables: ReceivableWithBalance[]; total: number }> {
    if (!this.policy.canReadReceivable(scope)) {
      throw new ForbiddenError('Você não tem permissão para listar contas a receber.');
    }
    const skip = (params.page - 1) * params.limit;
    // BE-INCR-SUBLEDGER-FILTERS §2 — espelho do AP (F6): todo filtro do DTO é repassado ao repo.
    const { receivables, total } = await this.receivableRepo.findManyByUnit(scope, {
      status: params.status,
      counterpartyId: params.counterpartyId,
      dueFrom: params.dueFrom,
      dueTo: params.dueTo,
      q: params.q,
      overdue: params.overdue,
      skip,
      limit: params.limit,
    });
    return { receivables: receivables.map(withBalance), total };
  }

  async getReceivable(scope: AccountingScope, id: string): Promise<ReceivableWithBalance> {
    if (!this.policy.canReadReceivable(scope)) {
      throw new ForbiddenError('Você não tem permissão para ler contas a receber.');
    }
    const receivable = await this.receivableRepo.findByIdWithReceipts(scope, id);
    if (!receivable) throw new NotFoundError(`Conta a receber '${id}' não foi encontrada.`);
    return withBalance(receivable);
  }

  // ---------------------------------------------------------------------------
  // Create (recognition)
  // ---------------------------------------------------------------------------

  /**
   * Create a receivable and book its recognition entry (D 1.1.5 / C revenueAccount). The row and the
   * recognition posting live in DIFFERENT txs; on a synchronous posting failure (e.g. the competência
   * period is closed) the row is COMPENSATED (soft-delete + rename) and the error is surfaced, so a
   * failed creation never leaves a dangling receivable. A crash between the two txs is converged by
   * reconcileReceivables.
   */
  async createReceivable(scope: AccountingScope, dto: CreateReceivableInput): Promise<Receivable> {
    if (!this.policy.canManageReceivable(scope)) {
      throw new ForbiddenError('Você não tem permissão para criar contas a receber.');
    }
    const { userId, unitId } = accountingScopeWhere(scope);

    // Revenue-account gate (D4): must be an existing, active, LEAF Revenue account of this scope.
    const revenueAccount = await this.resolveRevenueAccount(scope, dto.revenueAccountId);

    // tx1 — resolve/mint the counterparty, create the row (OPEN) and append receivable.created
    // atomically (ACC-019/ACC-012). The resolution moved INSIDE this tx with SEC-A1-5: it can now
    // WRITE (mint a catalog identity), and a mint that survived a rolled-back receivable would leave
    // an orphan customer in the catalog. Mints receivableId.
    let receivable: Receivable;
    try {
      receivable = await this.receivableRepo.runTransaction(async (tx) => {
        const counterpartyId = await this.resolveOrCreateCounterpartyId(scope, dto, tx);
        const created = await this.receivableRepo.create(
          {
            userId,
            unitId,
            customerName: dto.customerName,
            customerRef: dto.customerRef ?? null,
            counterpartyId,
            documentNumber: dto.documentNumber ?? null,
            description: dto.description,
            issueDate: new Date(dto.issueDate),
            dueDate: new Date(dto.dueDate),
            amountCents: dto.amountCents,
            revenueAccountId: revenueAccount.id,
            status: 'OPEN',
            createdById: scope.actorUserId,
          },
          tx,
        );
        await this.auditService.append(tx, scope, {
          actorUserId: scope.actorUserId,
          eventType: 'receivable.created',
          targetType: 'receivable',
          targetId: created.id,
          payload: {
            receivableId: created.id,
            customerRef: dto.customerRef,
            amountCents: String(dto.amountCents),
            dueDate: dto.dueDate,
            revenueAccountCode: revenueAccount.code,
          },
        });
        return created;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ValidationError(
          'Já existe uma conta a receber em aberto para este cliente e documento.',
        );
      }
      throw error;
    }

    // Recognition posting (SEPARATE tx). Compensate the row on synchronous failure.
    try {
      await this.posting.postEntry(scope, this.buildRecognitionInput(scope, receivable, revenueAccount, dto));
    } catch (error) {
      await this.compensateFailedRecognition(scope, receivable);
      throw error;
    }
    return receivable;
  }

  // ---------------------------------------------------------------------------
  // Register receipt (settlement)
  // ---------------------------------------------------------------------------

  /**
   * Register ONE receipt of a receivable — full or PARTIAL (BE-INCR-PARTIAL-SETTLEMENT, F-PS1 c /
   * F-PS2 a) — MIRROR of PayableService.registerPayment: book the receipt (D conta-por-método / C
   * 1.1.5), add it to the balance cache and move the receivable to RECEIVED or PARTIALLY_RECEIVED. The
   * race is closed by the SUM-CAS (`OPEN|PARTIALLY_RECEIVED → RECEIVING`, `receivedCents += amount`)
   * before any ledger write. Also the service behind the sister route `POST /:id/settlements`.
   */
  async registerReceipt(
    scope: AccountingScope,
    receivableId: string,
    dto: RegisterReceiptInput,
  ): Promise<ReceivableReceipt> {
    if (!this.policy.canManageReceivable(scope)) {
      throw new ForbiddenError('Você não tem permissão para receber contas.');
    }
    const { userId, unitId } = accountingScopeWhere(scope);

    const receivable = await this.receivableRepo.findByIdWithReceipts(scope, receivableId);
    if (!receivable) throw new NotFoundError(`Conta a receber '${receivableId}' não foi encontrada.`);
    // Guard pré-CAS (ADR F-PS2, site 2): OPEN and PARTIALLY_RECEIVED may take another receipt.
    if (!(RECEIVABLE_SETTLEABLE_STATUSES as readonly string[]).includes(receivable.status)) {
      throw new ValidationError(
        `Conta a receber não está aberta para recebimento (status atual: ${receivable.status}).`,
      );
    }

    // Balance guard (BRIEF item 8) — message only; the AUTHORITATIVE check is the sum-CAS below.
    const amountCents = centsFromDb(receivable.amountCents);
    const receivedBefore = centsFromDb(receivable.receivedCents);
    const remaining = amountCents - receivedBefore;
    if (dto.amountCents > remaining) {
      throw new ValidationError(
        `Valor do recebimento (${dto.amountCents} centavos) excede o saldo em aberto (${remaining} centavos).`,
      );
    }

    // Resolve the debit account for the method (closed map — unknown REJECTS, D2) BEFORE the CAS.
    const debitCode = resolveReceiptMethodAccount(dto.method);

    // ATOMIC SUM-CAS (D4 + ADR §3) — OPEN|PARTIALLY_RECEIVED → RECEIVING, receivedCents += amount.
    const claimed = await this.receivableRepo.claimForReceipt(scope, receivableId, amountCents, dto.amountCents);
    if (claimed === 0) {
      throw new ValidationError(
        'A conta já está em recebimento, não está mais aberta ou o saldo não comporta este recebimento.',
      );
    }

    let posted = false;
    let receipt: ReceivableReceipt | undefined;
    try {
      // Mint the receipt row (ACTIVE) — its id is the receipt idempotency key (D3).
      receipt = await this.receivableRepo.createReceipt({
        userId,
        unitId,
        receivableId,
        amountCents: dto.amountCents,
        method: dto.method,
        receivedAt: new Date(dto.receivedAt),
        receivedByUserId: scope.actorUserId,
        status: 'ACTIVE',
      });

      const entry = await this.posting.postEntry(
        scope,
        this.buildReceiptInput(scope, receivable, receipt, debitCode, dto),
      );
      posted = true;

      // Finalize (tx) — link the entry, mark RECEIVED via the atomic RECEIVING→RECEIVED CAS, emit the
      // domain audit ONLY when THIS call performed the transition. The ledger is already committed; if
      // this tx crashes, reconcileReceivables finalizes it. The CAS closes the race with a concurrent
      // reconcile that could finalize between the post above and this tx (else both would emit).
      // Balance after this receipt READ from the row inside the tx (review #307 F3) — mirror of AP.
      await this.receivableRepo.runTransaction(async (tx) => {
        await this.receivableRepo.updateReceipt(scope, receipt!.id, { entryId: entry.id }, tx);
        const flipped = await this.receivableRepo.finalizeIfReceiving(scope, receivableId, amountCents, tx);
        if (flipped === 1) {
          const row = await this.receivableRepo.findById(scope, receivableId, tx);
          const receivedCentsAfter = row ? centsFromDb(row.receivedCents) : receivedBefore + dto.amountCents;
          await this.auditService.append(tx, scope, {
            actorUserId: scope.actorUserId,
            eventType: 'receivable.settlement_registered',
            targetType: 'receivable',
            targetId: receivableId,
            payload: {
              receivableId,
              receiptId: receipt!.id,
              amountCents: String(dto.amountCents),
              method: dto.method,
              entryId: entry.id,
              receivedCentsAfter: String(receivedCentsAfter),
              remainingCents: String(amountCents - receivedCentsAfter),
            },
          });
        }
      });
      return { ...receipt, entryId: entry.id, status: 'ACTIVE' };
    } catch (error) {
      // Only safe to revert BEFORE the ledger commit. After a successful post, the money is booked —
      // leave it RECEIVING for reconcile to finalize (never revert over a real posting).
      if (!posted) {
        await this.revertClaim(scope, receivableId, receipt, dto.amountCents);
      }
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Cancel receivable (reverse recognition — F6)
  // ---------------------------------------------------------------------------

  /**
   * Cancel an OPEN receivable: reverse its recognition (estorno on the reversalDate — its own period
   * gate, T5) and flip the row to CANCELLED (terminal) with rename-on-delete freeing the business key.
   * Re-runnable: reverseEntry is idempotent, so a crash mid-cancel completes on retry.
   */
  async cancelReceivable(
    scope: AccountingScope,
    receivableId: string,
    dto: CancelReceivableInput,
  ): Promise<Receivable> {
    if (!this.policy.canManageReceivable(scope)) {
      throw new ForbiddenError('Você não tem permissão para cancelar contas a receber.');
    }
    const receivable = await this.receivableRepo.findByIdWithReceipts(scope, receivableId);
    if (!receivable) throw new NotFoundError(`Conta a receber '${receivableId}' não foi encontrada.`);
    if (receivable.status === 'CANCELLED') return receivable; // idempotent
    if (receivable.status !== 'OPEN') {
      throw new ValidationError(
        receivable.status === 'RECEIVED'
          ? 'Desfaça o recebimento (cancelar recebimento) antes de cancelar a conta.'
          : receivable.status === 'PARTIALLY_RECEIVED'
            ? 'Desfaça as baixas ativas (cancelar recebimentos) antes de cancelar a conta.'
            : `Conta a receber não pode ser cancelada no status atual (${receivable.status}).`,
      );
    }
    // Defense-in-depth: an OPEN receivable should have no active receipt, but never cancel over one.
    const activeReceipt = await this.receivableRepo.findActiveReceipt(scope, receivableId);
    if (activeReceipt) {
      throw new ValidationError('Desfaça o recebimento ativo antes de cancelar a conta.');
    }

    // Reverse the recognition if it exists (a dangling create may have none).
    const recognition = await this.posting.findEntryBySource(scope, AR_RECEIVABLE_SOURCE_TYPE, receivableId);
    let reversalEntryId: string | null = null;
    if (recognition) {
      const { reversal } = await this.posting.reverseEntry(scope, {
        unitId: scope.unitId,
        lancamentoId: recognition.id,
        reversalPostingDate: dto.reversalDate,
        reason: dto.reason,
      });
      reversalEntryId = reversal.id;
    }

    return this.receivableRepo.runTransaction(async (tx) => {
      const cancelled = await this.receivableRepo.updateReceivable(
        scope,
        receivableId,
        {
          status: 'CANCELLED',
          deletedAt: new Date(),
          cancelledById: scope.actorUserId,
          cancelReason: dto.reason ?? null,
          documentNumber: deletedDocumentNumber(receivableId, receivable.documentNumber),
        },
        tx,
      );
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: 'receivable.cancelled',
        targetType: 'receivable',
        targetId: receivableId,
        payload: { receivableId, reversalEntryId, reason: dto.reason },
      });
      return cancelled;
    });
  }

  // ---------------------------------------------------------------------------
  // Cancel receipt (reverse receipt, reopen)
  // ---------------------------------------------------------------------------

  /**
   * Cancel an active receipt: reverse its receipt entry and reopen the receivable. The receipt + its
   * reversal net to zero on 1.1.5, leaving the recognition's asset standing again.
   */
  async cancelReceipt(
    scope: AccountingScope,
    receivableId: string,
    receiptId: string,
    dto: CancelReceiptInput,
  ): Promise<ReceivableReceipt> {
    if (!this.policy.canManageReceivable(scope)) {
      throw new ForbiddenError('Você não tem permissão para cancelar recebimentos.');
    }
    const receipt = await this.receivableRepo.findReceiptById(scope, receiptId);
    if (!receipt || receipt.receivableId !== receivableId) {
      throw new NotFoundError(`Recebimento '${receiptId}' não foi encontrado.`);
    }
    if (receipt.status === 'CANCELLED') return receipt; // idempotent

    // Review #307 F1 — authoritative check screened BEFORE the reversal (mirror of AP cancelPayment).
    const cents = centsFromDb(receipt.amountCents);
    const current = await this.receivableRepo.findById(scope, receivableId);
    if (!current) throw new NotFoundError(`Conta a receber '${receivableId}' não foi encontrada.`);
    if (centsFromDb(current.receivedCents) < cents) {
      throw new ValidationError(
        'Não foi possível estornar o recebimento: o saldo recebido não comporta o estorno (invariante receivedCents ≥ recibo violado).',
      );
    }

    const settlement = await this.posting.findEntryBySource(scope, AR_RECEIPT_SOURCE_TYPE, receiptId);
    let reversalEntryId: string | null = null;
    if (settlement) {
      const { reversal } = await this.posting.reverseEntry(scope, {
        unitId: scope.unitId,
        lancamentoId: settlement.id,
        reversalPostingDate: dto.reversalDate,
        reason: dto.reason,
      });
      reversalEntryId = reversal.id;
    }

    // Reversal in PostingService's own tx; balance + status in ONE tx here (mirror of AP cancelPayment).
    return this.receivableRepo.runTransaction(async (tx) => {
      const cancelled = await this.receivableRepo.updateReceipt(scope, receiptId, { status: 'CANCELLED' }, tx);
      const released = await this.receivableRepo.releaseSettlement(scope, receivableId, cents, tx);
      if (released === 0) {
        throw new ValidationError(
          'Não foi possível estornar o recebimento: o saldo recebido não comporta o estorno (invariante violado).',
        );
      }
      const row = await this.receivableRepo.findById(scope, receivableId, tx);
      if (!row) throw new NotFoundError(`Conta a receber '${receivableId}' não foi encontrada.`);
      if (row.status !== 'RECEIVING') {
        const status = receivableStatusForBalance(centsFromDb(row.receivedCents), centsFromDb(row.amountCents));
        if (status === 'RECEIVED') {
          throw new ValidationError('Estorno inconsistente: o saldo continuaria integralmente recebido após o estorno.');
        }
        await this.receivableRepo.updateReceivable(scope, receivableId, { status }, tx);
      }
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: 'receivable.settlement_cancelled',
        targetType: 'receivable',
        targetId: receivableId,
        payload: { receivableId, receiptId, reversalEntryId, reason: dto.reason },
      });
      return cancelled;
    });
  }

  // ---------------------------------------------------------------------------
  // Reconcile (re-drive safety net — D4 / ADR §6.2)
  // ---------------------------------------------------------------------------

  /**
   * Re-drive missing recognitions/receipts for the scope. postEntry is idempotent on sourceId, so
   * re-posting is safe; the finalize (entryId + RECEIVED) is applied when a receipt exists but its
   * receivable/receipt never got finalized (crash between the post and the finalize tx). Returns what
   * it repaired. Best-effort per item: one failing receivable does not abort the pass.
   */
  async reconcileReceivables(
    scope: AccountingScope,
  ): Promise<{ recognitionsPosted: number; receiptsPosted: number; finalized: number; blocked: number; failed: number }> {
    if (!this.policy.canManageReceivable(scope)) {
      throw new ForbiddenError('Você não tem permissão para reconciliar contas a receber.');
    }
    let recognitionsPosted = 0;
    let receiptsPosted = 0;
    let finalized = 0;
    let blocked = 0;
    let failed = 0;

    // 1. Every live, non-cancelled receivable must carry its recognition entry.
    const receivables = await this.receivableRepo.findAllActive(scope);
    for (const receivable of receivables) {
      if (receivable.status === 'CANCELLED') continue;
      const recognition = await this.posting.findEntryBySource(scope, AR_RECEIVABLE_SOURCE_TYPE, receivable.id);
      if (recognition) continue;
      try {
        const revenueAccount = await this.accountRepo.findById(scope, receivable.revenueAccountId);
        if (!revenueAccount) {
          logger.warn('AR reconcile: revenue account missing, skipping recognition re-drive', {
            receivableId: receivable.id,
          });
          continue;
        }
        await this.posting.postEntry(scope, this.buildRecognitionInputFromRow(scope, receivable, revenueAccount));
        recognitionsPosted += 1;
      } catch (error) {
        // TRIAGEM-AUDIT-2026-08-15 A4 — MIRROR of PayableService: a skip-listed deterministic code
        // is BLOCKED (never a bug), anything else is a genuinely unexpected FAILURE.
        const skipCode = syncSkipErrorCode(error);
        if (skipCode) {
          blocked += 1;
          logger.warn('AR reconcile: recognition re-drive blocked — deterministic non-retriable code', {
            receivableId: receivable.id, code: skipCode,
          });
        } else {
          failed += 1;
          logger.warn('AR reconcile: recognition re-drive failed', { receivableId: receivable.id, error });
        }
      }
    }

    // 2. Every active receipt must carry its receipt entry AND its receivable must be finalized.
    const receipts = await this.receivableRepo.findAllActiveReceipts(scope);
    for (const receipt of receipts) {
      try {
        let settlement = await this.posting.findEntryBySource(scope, AR_RECEIPT_SOURCE_TYPE, receipt.id);
        if (!settlement) {
          const receivable = await this.receivableRepo.findByIdWithReceipts(scope, receipt.receivableId);
          if (!receivable) continue;
          const debitCode = resolveReceiptMethodAccount(receipt.method);
          settlement = await this.posting.postEntry(
            scope,
            this.buildReceiptInputFromRow(scope, receivable, receipt, debitCode),
          );
          receiptsPosted += 1;
        }
        // Finalize atomically — link the entry, mark RECEIVED, and re-emit the AR-domain audit event
        // that the crashed normal-path finalize tx never wrote. The ledger 'entry.posted' audit already
        // exists (postEntry's own tx), so the hash-chain is intact; this restores the
        // 'receivable.settlement_registered' domain trail. The audit is tied to the RECEIVING→RECEIVED
        // transition, which happens exactly once per receipt (normal path OR here) — so repeated
        // reconcile passes never double-emit (once RECEIVED, needsFinalize is false).
        const receivable = await this.receivableRepo.findById(scope, receipt.receivableId);
        const settlementEntryId = settlement.id;
        const needsEntryLink = receipt.entryId !== settlementEntryId;
        const maybeFinalize = receivable?.status === 'RECEIVING'; // preliminary read — the CAS below is authoritative
        if (needsEntryLink || maybeFinalize) {
          await this.receivableRepo.runTransaction(async (tx) => {
            if (needsEntryLink) {
              await this.receivableRepo.updateReceipt(scope, receipt.id, { entryId: settlementEntryId }, tx);
            }
            // Atomic RECEIVING→RECEIVED|PARTIALLY_RECEIVED by balance: emit + count ONLY when THIS
            // pass performed the transition. Under RECEIVING `receivedCents` already holds this receipt.
            const flipped = receivable
              ? await this.receivableRepo.finalizeIfReceiving(scope, receipt.receivableId, centsFromDb(receivable.amountCents), tx)
              : 0;
            if (flipped === 1) {
              const receivedCentsAfter = centsFromDb(receivable!.receivedCents);
              await this.auditService.append(tx, scope, {
                actorUserId: scope.actorUserId,
                eventType: 'receivable.settlement_registered',
                targetType: 'receivable',
                targetId: receipt.receivableId,
                payload: {
                  receivableId: receipt.receivableId,
                  receiptId: receipt.id,
                  amountCents: String(receipt.amountCents),
                  method: receipt.method,
                  entryId: settlementEntryId,
                  receivedCentsAfter: String(receivedCentsAfter),
                  remainingCents: String(centsFromDb(receivable!.amountCents) - receivedCentsAfter),
                },
              });
              finalized += 1;
            }
          });
        }
      } catch (error) {
        const skipCode = syncSkipErrorCode(error);
        if (skipCode) {
          blocked += 1;
          logger.warn('AR reconcile: receipt re-drive blocked — deterministic non-retriable code', {
            receiptId: receipt.id, code: skipCode,
          });
        } else {
          failed += 1;
          logger.warn('AR reconcile: receipt re-drive failed', { receiptId: receipt.id, error });
        }
      }
    }

    logger.info('AR reconcile pass complete', { recognitionsPosted, receiptsPosted, finalized, blocked, failed });
    return { recognitionsPosted, receiptsPosted, finalized, blocked, failed };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Resolve the CUSTOMER identity this receivable links to — NEVER null (SEC-A1-5 / F-NN1(a)). A
   * body-supplied counterpartyId is re-scoped (SEC-A1-1: a cross-tenant id resolves to null via the
   * scoped findById and is rejected here) and must be a CUSTOMER; with no id, `customerName` finds or
   * mints the catalog identity — which is how `CrmReceivableBridge`, that has no counterpartyId to
   * pass, stops minting NULL rows without a single change of its own. Shared with AP — invariants in
   * `counterpartyResolution.ts`.
   */
  private async resolveOrCreateCounterpartyId(
    scope: AccountingScope,
    dto: CreateReceivableInput,
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    return resolveOrCreateCounterpartyId(
      { counterpartyRepo: this.counterpartyRepo, auditService: this.auditService, policy: this.policy },
      scope,
      'CUSTOMER',
      dto.counterpartyId,
      dto.customerName,
      'A contraparte de uma conta a receber deve ser um cliente (CUSTOMER).',
      tx,
    );
  }

  private async resolveRevenueAccount(scope: AccountingScope, accountId: string): Promise<Account> {
    const account = await this.accountRepo.findById(scope, accountId);
    if (!account) {
      throw new ValidationError('Conta de receita informada não existe nesta unidade.');
    }
    if (account.nature !== 'Revenue') {
      throw new ValidationError('A contrapartida deve ser uma conta de receita (nature=Revenue).');
    }
    if (account.acceptsEntries === false) {
      throw new ValidationError('A conta de receita deve ser analítica (aceita lançamentos).');
    }
    return account;
  }

  private buildRecognitionInput(
    scope: AccountingScope,
    receivable: Receivable,
    revenueAccount: Account,
    dto: CreateReceivableInput,
  ): PostEntryInput {
    return {
      unitId: scope.unitId,
      date: dto.issueDate,
      description: this.recognitionDescription(receivable),
      auditDescription: this.recognitionAuditDescription(receivable),
      sourceType: AR_RECEIVABLE_SOURCE_TYPE,
      sourceId: receivable.id,
      sourceDocument: {
        externalRef: dto.documentNumber,
        documentDate: dto.issueDate,
        attachmentId: dto.attachmentId,
      },
      lines: [
        { accountCode: CLIENTES_A_RECEBER_CODE, debitCents: dto.amountCents, creditCents: 0 },
        { accountCode: revenueAccount.code, debitCents: 0, creditCents: dto.amountCents },
      ],
    };
  }

  /** Recognition input rebuilt from a persisted row (reconcile re-drive). */
  private buildRecognitionInputFromRow(
    scope: AccountingScope,
    receivable: Receivable,
    revenueAccount: Account,
  ): PostEntryInput {
    return {
      unitId: scope.unitId,
      date: this.toDateOnly(receivable.issueDate),
      description: this.recognitionDescription(receivable),
      auditDescription: this.recognitionAuditDescription(receivable),
      sourceType: AR_RECEIVABLE_SOURCE_TYPE,
      sourceId: receivable.id,
      sourceDocument: {
        externalRef: receivable.documentNumber ?? undefined,
        documentDate: this.toDateOnly(receivable.issueDate),
      },
      lines: [
        { accountCode: CLIENTES_A_RECEBER_CODE, debitCents: centsFromDb(receivable.amountCents), creditCents: 0 },
        { accountCode: revenueAccount.code, debitCents: 0, creditCents: centsFromDb(receivable.amountCents) },
      ],
    };
  }

  private buildReceiptInput(
    scope: AccountingScope,
    receivable: Receivable,
    receipt: ReceivableReceipt,
    debitCode: string,
    dto: RegisterReceiptInput,
  ): PostEntryInput {
    return {
      unitId: scope.unitId,
      date: dto.receivedAt,
      description: this.receiptDescription(receivable),
      auditDescription: this.receiptAuditDescription(receivable),
      sourceType: AR_RECEIPT_SOURCE_TYPE,
      sourceId: receipt.id,
      lines: [
        { accountCode: debitCode, debitCents: dto.amountCents, creditCents: 0 },
        { accountCode: CLIENTES_A_RECEBER_CODE, debitCents: 0, creditCents: dto.amountCents },
      ],
    };
  }

  /** Receipt input rebuilt from persisted rows (reconcile re-drive). */
  private buildReceiptInputFromRow(
    scope: AccountingScope,
    receivable: Receivable,
    receipt: ReceivableReceipt,
    debitCode: string,
  ): PostEntryInput {
    return {
      unitId: scope.unitId,
      date: this.toDateOnly(receipt.receivedAt),
      description: this.receiptDescription(receivable),
      auditDescription: this.receiptAuditDescription(receivable),
      sourceType: AR_RECEIPT_SOURCE_TYPE,
      sourceId: receipt.id,
      lines: [
        { accountCode: debitCode, debitCents: centsFromDb(receipt.amountCents), creditCents: 0 },
        { accountCode: CLIENTES_A_RECEBER_CODE, debitCents: 0, creditCents: centsFromDb(receipt.amountCents) },
      ],
    };
  }

  private recognitionDescription(receivable: Receivable): string {
    const doc = receivable.documentNumber ? ` (Fatura ${receivable.documentNumber})` : '';
    return `Contas a receber — ${receivable.customerName}${doc}`;
  }

  private receiptDescription(receivable: Receivable): string {
    const doc = receivable.documentNumber ? ` (Fatura ${receivable.documentNumber})` : '';
    return `Recebimento de cliente — ${receivable.customerName}${doc}`;
  }

  // TRIAGEM-AUDIT-2026-08-15 A2, fork (b) — MIRROR of PayableService: PII-sanitized counterparts fed
  // to PostingService as `auditDescription`. The row/ECD-facing description keeps `customerName`.
  private recognitionAuditDescription(receivable: Receivable): string {
    return `Contas a receber — Fatura ${receivable.documentNumber ?? 's/nº'}`;
  }

  private receiptAuditDescription(receivable: Receivable): string {
    return `Recebimento de cliente — Fatura ${receivable.documentNumber ?? 's/nº'}`;
  }

  /** DateTime → date-only YYYY-MM-DD (UTC, matching how postEntry parses date-only strings). */
  private toDateOnly(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  /** Undo a claimed-but-unposted receipt attempt (safe only before the ledger commit). */
  private async revertClaim(
    scope: AccountingScope,
    receivableId: string,
    receipt: ReceivableReceipt | undefined,
    claimedCents: number,
  ): Promise<void> {
    try {
      await this.receivableRepo.runTransaction(async (tx) => {
        if (receipt) {
          await this.receivableRepo.updateReceipt(scope, receipt.id, { status: 'CANCELLED' }, tx);
        }
        // Status from the row RE-READ after the decrement (review #307 F2) — mirror of AP.
        await this.receivableRepo.updateReceivable(scope, receivableId, { receivedCents: { decrement: claimedCents } }, tx);
        const row = await this.receivableRepo.findById(scope, receivableId, tx);
        if (!row) return;
        const status = receivableStatusForBalance(centsFromDb(row.receivedCents), centsFromDb(row.amountCents));
        await this.receivableRepo.updateReceivable(scope, receivableId, { status }, tx);
      });
    } catch (error) {
      logger.error('AR registerReceipt revert failed — reconcile will reconcile state', {
        receivableId,
        error,
      });
    }
  }

  /** Compensate a receivable whose recognition posting failed synchronously (soft-delete + rename). */
  private async compensateFailedRecognition(scope: AccountingScope, receivable: Receivable): Promise<void> {
    try {
      await this.receivableRepo.updateReceivable(scope, receivable.id, {
        status: 'CANCELLED',
        deletedAt: new Date(),
        documentNumber: deletedDocumentNumber(receivable.id, receivable.documentNumber),
      });
    } catch (error) {
      logger.error('AR createReceivable compensation failed — reconcile will not re-post a cancelled row', {
        receivableId: receivable.id,
        error,
      });
    }
  }
}
