/**
 * ReceivableService — contas a receber (AR). FIRST-CLASS PRISMA.
 *
 * atomicUntil: postEntry
 *   commit 1 — razão: postEntry(sourceType='ar.receivable', sourceId=receivableId) no reconhecimento; postEntry(sourceType='ar.receipt', sourceId=receiptId) no recebimento; gate de período dentro da tx
 *              teste: ReceivableService.test.ts › "books D 1.1.5 / C revenueAccount keyed sourceType=ar.receivable, sourceId=receivableId"
 *              teste: ReceivableService.test.ts › "books D method-account / C 1.1.5 keyed sourceType=ar.receipt, sourceId=receiptId (NOT receivableId)"
 *   commit 2 — subrazão: CAS OPEN → RECEIVING (claimForReceipt) ANTES do post; finalize RECEIVING → RECEIVED/PARTIALLY_RECEIVED + settlementEntryId, runTransaction próprio
 *              teste: ReceivableService.test.ts › "TOCTOU: two parallel receipts → exactly one succeeds (claimForReceipt CAS)"
 *              teste: ReceivableService.test.ts › "does NOT revert the claim after a successful post (never revert over a booked ledger)"
 *   reconcile — reconcileReceivables(): read-first, reposta só o que falta e finaliza RECEIVING preso
 *              teste: ReceivableService.test.ts › "re-posts a missing receipt AND finalizes a RECEIVING receivable"
 *              teste: ReceivableService.test.ts › "does NOT re-post when the recognition already exists (idempotent)"
 *   estorno — cancelReceipt/cancelReceivable: reverseEntry (commit 1, idempotente) e DEPOIS a tx do subrazão (commit 2). Crash entre os dois =
 *              razão estornado + recibo ACTIVE/título OPEN: reconcileReceivables() re-dirige a direção REVERSA (lê o lançamento Reversed e conclui
 *              a tx do subrazão; nunca finaliza como recebido o recibo cujo lançamento já está estornado)
 *              teste: SubledgerReversalAtomicity.integration.test.ts › "razão estornado + recibo ACTIVE → reconcileReceivables conclui o estorno (recibo CANCELLED, título reaberto, 1 auditoria, sem 2º estorno)"
 *              teste: SubledgerReversalAtomicity.integration.test.ts › "o estorno já está no razão e o período dele FECHOU → repetir cancelReceipt conclui (a idempotência do reverseEntry vem ANTES do gate de período)"
 *              teste: SubledgerReversalAtomicity.integration.test.ts › "reconhecimento estornado + título OPEN → reconcileReceivables conclui o cancelamento (CANCELLED, deletedAt, chave de negócio liberada)"
 *   fora da tx — nada
 */
import { AppError, ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../../lib/errors';
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
  PROVIDER_BALANCE_METHOD,
  RECEIPT_REVERSAL_INVARIANT_CODE,
  RECEIPT_CANCEL_PENDING_SOURCE_TYPE,
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
import type { ICollectionChargeRepository } from '../repositories/ICollectionChargeRepository';
import { RECEIVABLE_HAS_LIVE_CHARGE, describeCharge } from '../models/CollectionCharge.model';
import { SPLIT_ACCOUNT_NOT_CONFIGURED, SPLIT_IBS_CBS_KIND } from '../models/BankSettlement.model';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { PostEntryInput } from '../dtos/PostingDto';
import { syncSkipErrorCode } from '../sync/AccountingSyncPort';
import type { ReconcilePendingRecorder } from './reconcilePendingRecorder';
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

/** Lançamento já estornado no razão (commit 1 de um cancelamento feito). `findBySource` devolve também os `Reversed`. */
function isReversedEntry(entry: { status: string; reversedById: string | null }): boolean {
  return entry.status === 'Reversed' || entry.reversedById != null;
}

/** Motivo gravado quando é o reconcile (não um DTO) quem conclui o estorno que o razão já tem. */
const RECONCILE_REVERSAL_REASON = 'Reconciliação: estorno já lançado no razão, subrazão concluído';

/**
 * Códigos que o reconcile do AR conta como BLOCKED (determinísticos, sem o que retentar) além da lista das pontes
 * (`syncSkipErrorCode`): o invariante do subrazão violado com o razão já estornado, e a cobrança viva no provedor.
 */
const RECONCILE_BLOCKED_CODES: readonly string[] = [RECEIPT_REVERSAL_INVARIANT_CODE, RECEIVABLE_HAS_LIVE_CHARGE];
function reconcileBlockedCode(error: unknown): string | null {
  const bridge = syncSkipErrorCode(error);
  if (bridge) return bridge;
  return error instanceof AppError && RECONCILE_BLOCKED_CODES.includes(error.errorCode) ? error.errorCode : null;
}

export class ReceivableService {
  constructor(
    private readonly receivableRepo: IReceivableRepository,
    private readonly accountRepo: IAccountRepository,
    private readonly posting: PostingService,
    private readonly auditService: AuditService,
    private readonly policy: IAccountingPolicy,
    private readonly counterpartyRepo: ICounterpartyRepository,
    private readonly collectionChargeRepo: Pick<ICollectionChargeRepository, 'findLiveByReceivable'>,
    // OPTIONAL (BE-INCR-CANCELAMENTO-CANCELLING PR-0, F-AR-1 a / 9d3e): grava o BLOCKED determinístico do estorno do recebimento na bandeja do
    // reconcile e alerta na 1ª captura. Ausente = comportamento anterior (só log). `cancelReceivable` NÃO ganha `CANCELLING` (F-AR-1 a).
    private readonly pendingRecorder?: ReconcilePendingRecorder,
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
    /**
     * P3-9 (F-PP-7 a / F-PPB-3 a): só o F7 passa a conta da `PaymentAccount` (método `ProviderBalance`). Não é campo
     * de DTO — recibo avulso com `ProviderBalance` cai no 400 `provider_balance_requires_payment_account`.
     * IBS-CBS-2027 PR-4 (EMENDA PR-4, dono 22/10): `kind = 'SPLIT_IBS_CBS'` — recibo SEM caixa do split payment; a conta
     * de débito (IBS|CBS a recolher do perfil fiscal) é obrigatória e vence o mapa do método. Também só o F7 passa.
     */
    options: { debitAccountId?: string; kind?: typeof SPLIT_IBS_CBS_KIND } = {},
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
    const split = options.kind === SPLIT_IBS_CBS_KIND;
    if (split && !options.debitAccountId) {
      throw new ValidationError(`${SPLIT_ACCOUNT_NOT_CONFIGURED}: recibo de split exige a conta de IBS/CBS a recolher.`);
    }
    const debitAccountId = dto.method === PROVIDER_BALANCE_METHOD || split ? options.debitAccountId ?? null : null;
    const debitCode = await this.resolveReceiptDebitCode(scope, dto.method, debitAccountId);

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
        debitAccountId,
        ...(split ? { kind: SPLIT_IBS_CBS_KIND } : {}),
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

    // BE-INCR-PAYMENT-PROVIDER PR-2 (P2-13, F-PPB-7 a): título com cobrança viva no provedor não cancela. Checado
    // ANTES do reverseEntry, sem lançar nada (decisão F5 a do dono, 10/10 — efeito irreversível nunca antes do gate),
    // e re-checado dentro da tx do cancelamento. Nenhuma chamada ao provedor aqui.
    await this.assertNoLiveCharge(scope, receivableId);

    // Reverse the recognition if it exists (a dangling create may have none).
    const recognition = await this.posting.findEntryBySource(scope, AR_RECEIVABLE_SOURCE_TYPE, receivableId);
    let reversalEntryId: string | null = null;
    if (recognition) {
      const { reversal } = await this.posting.reverseEntry(scope, {
        unitId: scope.unitId,
        lancamentoId: recognition.id,
        reversalPostingDate: dto.reversalDate,
        reason: dto.reason || `Cancelamento da conta a receber ${receivableId}`,
        automaticWriter: true,
      });
      reversalEntryId = reversal.id;
    }

    return this.completeReceivableCancellation(scope, receivable, reversalEntryId, dto.reason);
  }

  /**
   * COMMIT 2 do cancelamento do título (subrazão): CANCELLED + rename-on-delete + auditoria numa tx. Compartilhado por
   * `cancelReceivable` e pelo re-drive do reconcile (reconhecimento já estornado no razão, título ainda OPEN).
   */
  private async completeReceivableCancellation(
    scope: AccountingScope,
    receivable: Pick<Receivable, 'id' | 'documentNumber'>,
    reversalEntryId: string | null,
    reason: string | undefined,
  ): Promise<Receivable> {
    const receivableId = receivable.id;
    return this.receivableRepo.runTransaction(async (tx) => {
      await this.assertNoLiveCharge(scope, receivableId, tx);
      const cancelled = await this.receivableRepo.updateReceivable(
        scope,
        receivableId,
        {
          status: 'CANCELLED',
          deletedAt: new Date(),
          cancelledById: scope.actorUserId,
          cancelReason: reason ?? null,
          documentNumber: deletedDocumentNumber(receivableId, receivable.documentNumber),
        },
        tx,
      );
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: 'receivable.cancelled',
        targetType: 'receivable',
        targetId: receivableId,
        payload: { receivableId, reversalEntryId, reason },
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
        reason: dto.reason || `Cancelamento do recebimento ${receiptId} da conta a receber ${receivableId}`,
        automaticWriter: true,
      });
      reversalEntryId = reversal.id;
    }

    // Reversal in PostingService's own tx (commit 1); balance + status in ONE tx (commit 2, shared with the reconcile re-drive).
    return (await this.completeReceiptCancellation(scope, receipt, reversalEntryId, dto.reason)).receipt;
  }

  /**
   * COMMIT 2 do estorno do recebimento (subrazão): flip ACTIVE→CANCELLED + devolução do saldo + status + auditoria numa tx.
   * Compartilhado por `cancelReceipt` e pelo re-drive do reconcile (lançamento já `Reversed`, recibo ainda ACTIVE).
   * Invariante violado com o razão JÁ estornado (`released === 0`, "Estorno inconsistente") ⇒ erro com código próprio
   * (`RECEIPT_REVERSAL_INVARIANT_CODE`): a tx desfaz tudo e o reconcile conta como BLOCKED, em vez de retentar para sempre.
   */
  private async completeReceiptCancellation(
    scope: AccountingScope,
    receipt: ReceivableReceipt,
    reversalEntryId: string | null,
    reason: string | undefined,
  ): Promise<{ receipt: ReceivableReceipt; completed: boolean }> {
    const receiptId = receipt.id;
    const receivableId = receipt.receivableId;
    const cents = centsFromDb(receipt.amountCents);
    return this.receivableRepo.runTransaction(async (tx) => {
      // Authoritative idempotency gate INSIDE the tx (review #307 F8) — mirror of AP cancelPayment.
      const flipped = await this.receivableRepo.cancelReceiptIfActive(scope, receiptId, tx);
      if (flipped === 0) {
        const already = await this.receivableRepo.findReceiptById(scope, receiptId, tx);
        if (!already) throw new NotFoundError(`Recebimento '${receiptId}' não foi encontrado.`);
        await this.pendingRecorder?.resolve(scope, RECEIPT_CANCEL_PENDING_SOURCE_TYPE, receiptId, tx);
        return { receipt: already, completed: false };
      }
      const cancelled = { ...receipt, status: 'CANCELLED' };
      const released = await this.receivableRepo.releaseSettlement(scope, receivableId, cents, tx);
      if (released === 0) {
        throw new ValidationError(
          'Não foi possível estornar o recebimento: o saldo recebido não comporta o estorno (invariante violado).',
          null,
          RECEIPT_REVERSAL_INVARIANT_CODE,
        );
      }
      const row = await this.receivableRepo.findById(scope, receivableId, tx);
      if (!row) throw new NotFoundError(`Conta a receber '${receivableId}' não foi encontrada.`);
      if (row.status !== 'RECEIVING') {
        const status = receivableStatusForBalance(centsFromDb(row.receivedCents), centsFromDb(row.amountCents));
        if (status === 'RECEIVED') {
          throw new ValidationError(
            'Estorno inconsistente: o saldo continuaria integralmente recebido após o estorno.',
            null,
            RECEIPT_REVERSAL_INVARIANT_CODE,
          );
        }
        await this.receivableRepo.updateReceivable(scope, receivableId, { status }, tx);
      } else if (centsFromDb(row.receivedCents) === 0) {
        // RECEIVING é de um recibo em trânsito, e o claim soma os centavos DELE em receivedCents na mesma CAS: saldo 0 ⇒
        // não há recibo em trânsito (era este, preso por um crash). Sem isto o título ficaria RECEIVING para sempre.
        await this.receivableRepo.updateReceivable(scope, receivableId, { status: 'OPEN' }, tx);
      }
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: 'receivable.settlement_cancelled',
        targetType: 'receivable',
        targetId: receivableId,
        payload: { receivableId, receiptId, reversalEntryId, reason },
      });
      // CANCELLING PR-0 (0.6, F-AR-1 a): concluir por qualquer caminho fecha a pendência `receipt.cancel` na mesma tx.
      await this.pendingRecorder?.resolve(scope, RECEIPT_CANCEL_PENDING_SOURCE_TYPE, receiptId, tx);
      return { receipt: cancelled, completed: true };
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
  ): Promise<{ recognitionsPosted: number; receiptsPosted: number; finalized: number; reversalsCompleted: number; blocked: number; failed: number }> {
    if (!this.policy.canManageReceivable(scope)) {
      throw new ForbiddenError('Você não tem permissão para reconciliar contas a receber.');
    }
    let recognitionsPosted = 0;
    let receiptsPosted = 0;
    let finalized = 0;
    let reversalsCompleted = 0;
    let blocked = 0;
    let failed = 0;

    // 1. Every live, non-cancelled receivable must carry its recognition entry.
    const receivables = await this.receivableRepo.findAllActive(scope);
    for (const receivable of receivables) {
      if (receivable.status === 'CANCELLED') continue;
      const recognition = await this.posting.findEntryBySource(scope, AR_RECEIVABLE_SOURCE_TYPE, receivable.id);
      if (recognition) {
        // DIREÇÃO REVERSA (Onda 2.1): reconhecimento já estornado (commit 1 de um cancelReceivable) e título ainda OPEN ⇒ conclui o
        // cancelamento. Título com recebimento ativo não é desfeito às cegas (receita estornada com caixa recebido): BLOCKED.
        if (isReversedEntry(recognition) && receivable.status === 'OPEN') {
          try {
            if (await this.receivableRepo.findActiveReceipt(scope, receivable.id)) {
              blocked += 1;
              logger.warn('AR reconcile: recognition is reversed but the receivable still has an ACTIVE receipt — blocked', { receivableId: receivable.id });
              continue;
            }
            await this.completeReceivableCancellation(scope, receivable, recognition.reversedById, RECONCILE_REVERSAL_REASON);
            reversalsCompleted += 1;
          } catch (error) {
            const blockedCode = reconcileBlockedCode(error);
            if (blockedCode) {
              blocked += 1;
              logger.warn('AR reconcile: receivable cancellation re-drive blocked', { receivableId: receivable.id, code: blockedCode });
            } else {
              failed += 1;
              logger.warn('AR reconcile: receivable cancellation re-drive failed', { receivableId: receivable.id, error });
            }
          }
        }
        continue;
      }
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
        const skipCode = reconcileBlockedCode(error);
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
        // DIREÇÃO REVERSA (Onda 2.1): o razão já estornou o recebimento (commit 1 de um cancelReceipt) e o recibo segue ACTIVE ⇒ conclui o
        // estorno no subrazão. NUNCA cai no finalize abaixo: finalizar como recebido um lançamento Reversed reabriria a divergência.
        if (settlement && isReversedEntry(settlement)) {
          const done = await this.completeReceiptCancellation(scope, receipt, settlement.reversedById, RECONCILE_REVERSAL_REASON);
          if (done.completed) reversalsCompleted += 1;
          continue;
        }
        if (!settlement) {
          const receivable = await this.receivableRepo.findByIdWithReceipts(scope, receipt.receivableId);
          if (!receivable) continue;
          const debitCode = await this.resolveReceiptDebitCode(scope, receipt.method, receipt.debitAccountId);
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
        const skipCode = reconcileBlockedCode(error);
        if (skipCode) {
          blocked += 1;
          logger.warn('AR reconcile: receipt re-drive blocked — deterministic non-retriable code', {
            receiptId: receipt.id, code: skipCode,
          });
          // CANCELLING PR-0 (F-AR-1 a, 9d3e): o invariante do estorno do recebimento fica gravado na bandeja e alerta na 1ª captura.
          if (skipCode === RECEIPT_REVERSAL_INVARIANT_CODE) {
            await this.pendingRecorder?.record(scope, {
              sourceType: RECEIPT_CANCEL_PENDING_SOURCE_TYPE,
              sourceId: receipt.id,
              reasonCode: RECEIPT_REVERSAL_INVARIANT_CODE,
              reasonDetail: error instanceof Error ? error.message : String(error),
              alert: 'permanent',
            });
          }
        } else {
          failed += 1;
          logger.warn('AR reconcile: receipt re-drive failed', { receiptId: receipt.id, error });
        }
      }
    }

    logger.info('AR reconcile pass complete', { recognitionsPosted, receiptsPosted, finalized, reversalsCompleted, blocked, failed });
    return { recognitionsPosted, receiptsPosted, finalized, reversalsCompleted, blocked, failed };
  }

  /**
   * Re-drive de UM recebimento ativo cujo lançamento já foi estornado (o que o `retryOneReconcilePendingItem` chama para `receipt.cancel`).
   * `completed` = concluído agora OU nada a concluir (recibo já cancelado / lançamento não estornado: a pendência é obsoleta). O BLOCKED
   * determinístico (`RECEIPT_REVERSAL_INVARIANT_CODE`) sobe como erro (o `rescan` o trata como "continua pendente").
   */
  async redriveReceiptCancellation(scope: AccountingScope, receiptId: string): Promise<{ outcome: 'completed' }> {
    if (!this.policy.canManageReceivable(scope)) {
      throw new ForbiddenError('Você não tem permissão para reconciliar contas a receber.');
    }
    const receipt = await this.receivableRepo.findReceiptById(scope, receiptId);
    if (!receipt || receipt.status !== 'ACTIVE') return { outcome: 'completed' };
    const settlement = await this.posting.findEntryBySource(scope, AR_RECEIPT_SOURCE_TYPE, receiptId);
    if (!settlement || !isReversedEntry(settlement)) return { outcome: 'completed' };
    await this.completeReceiptCancellation(scope, receipt, settlement.reversedById, RECONCILE_REVERSAL_REASON);
    return { outcome: 'completed' };
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
  /**
   * P3-9 (F-PPB-3 a): conta de débito do recibo — `debitAccountId` gravado (ProviderBalance) vence o mapa fechado;
   * `null` mantém o mapa de hoje (legado). Usado no registro E no re-post do reconcile (mesma conta nos dois).
   */
  private async resolveReceiptDebitCode(scope: AccountingScope, method: string, debitAccountId: string | null): Promise<string> {
    if (debitAccountId === null) return resolveReceiptMethodAccount(method);
    const account = await this.accountRepo.findById(scope, debitAccountId);
    if (!account || account.deletedAt || !account.acceptsEntries) {
      const rotulo = account ? [account.code, account.name].filter(Boolean).join(' — ') || debitAccountId : debitAccountId;
      throw new ValidationError(`provider_balance_requires_payment_account: a conta '${rotulo}' da conta de provedor não é folha ativa do escopo.`);
    }
    return account.code;
  }

  private async assertNoLiveCharge(scope: AccountingScope, receivableId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const live = await this.collectionChargeRepo.findLiveByReceivable(scope, receivableId, tx);
    if (live) {
      throw new ConflictError(
        `${RECEIVABLE_HAS_LIVE_CHARGE}: o título tem a cobrança '${describeCharge(live)}' (${live.status}) no provedor; cancele-a antes.`,
        RECEIVABLE_HAS_LIVE_CHARGE,
      );
    }
  }

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
      automaticWriter: true,
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
      automaticWriter: true,
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
      automaticWriter: true,
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
      automaticWriter: true,
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
        // INV F-11.2: devolução e status por CAS sobre RECEIVING — o título que saiu de RECEIVING não é tocado.
        if ((await this.receivableRepo.releaseClaim(scope, receivableId, claimedCents, tx)) === 0) {
          throw new ValidationError('Não foi possível desfazer o recebimento: o título não está mais em recebimento ou o saldo não comporta a devolução.');
        }
        const row = await this.receivableRepo.findById(scope, receivableId, tx);
        if (!row) return;
        const status = receivableStatusForBalance(centsFromDb(row.receivedCents), centsFromDb(row.amountCents));
        if ((await this.receivableRepo.resolveRevertedClaim(scope, receivableId, status, tx)) === 0) {
          throw new ValidationError('Não foi possível desfazer o recebimento: o título não está mais em recebimento.');
        }
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
