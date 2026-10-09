import type { CollectionCharge, PaymentAccount, Prisma } from 'generated/prisma';
import { AppError, ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../../lib/errors';
import logger from '../../../lib/logger';
import { loadKeyring, open, type Keyring } from '../../../lib/secretBox';
import { centsFromDb } from '../models/money';
import {
  CollectionProviderError,
  type ChargeResult,
  type CollectionProviderPort,
  type PayerInput,
  type ResolvedAccount,
} from '../collection/CollectionProviderPort';
import {
  CHARGE_ADDRESS_REQUIRED,
  CHARGE_EXPIRY_FIELD_MISMATCH,
  CHARGE_LIVE_EXISTS,
  CHARGE_NOT_PENDING,
  CHARGE_NOTHING_TO_CHARGE,
  CHARGE_RECEIVABLE_NOT_CHARGEABLE,
  CHARGEABLE_RECEIVABLE_STATUSES,
  COLLECTION_CHARGE_CANCELLED,
  COLLECTION_CHARGE_CREATED,
  COLLECTION_CHARGE_FAILED,
  COLLECTION_CHARGE_STATUS_CHANGED,
  DEFAULT_BOLETO_BUSINESS_DAYS,
  DEFAULT_PIX_MINUTES,
  PAYMENT_ACCOUNT_CREDENTIAL_INVALID,
  PAYMENT_ACCOUNT_NOT_ACTIVE,
  PROVIDER_CREDENTIAL_INVALID,
  PROVIDER_UNAVAILABLE,
  STALE_CREATING_MS,
  TERMINAL_CHARGE_STATUSES,
  mapMercadoPagoStatus,
  type CollectionChargeStatus,
} from '../models/CollectionCharge.model';
import type { CreateChargeInputDto } from '../dtos/CollectionChargeDto';
import type { ICollectionChargeRepository } from '../repositories/ICollectionChargeRepository';
import type { IPaymentAccountRepository } from '../repositories/IPaymentAccountRepository';
import type { IReceivableRepository } from '../repositories/IReceivableRepository';
import type { ICounterpartyRepository } from '../repositories/ICounterpartyRepository';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { AuditService } from './AuditService';
import { resolveAccountingScope, type AccountingScope } from '../scope/AccountingScope';

/** Projeção pública. `payer` só no detalhe e só para quem gerencia o título (F9, dono 10/10). Nunca credencial. */
export interface CollectionChargeView {
  id: string;
  unitId: string;
  receivableId: string;
  paymentAccountId: string;
  kind: string;
  amountCents: string;
  expiresAt: string;
  status: string;
  providerRef: string | null;
  providerPaymentRef: string | null;
  providerStatus: string | null;
  providerStatusDetail: string | null;
  paidAt: string | null;
  failReason: string | null;
  instrument: Record<string, string> | null;
  createdAt: string;
  updatedAt: string;
  payer?: PayerInput;
}

export interface CollectionPollSummary {
  scanned: number;
  redriven: number;
  refreshed: number;
  failed: number;
}

/**
 * CollectionChargeService — cobrança por provedor contra um título do AR (BE-INCR-PAYMENT-PROVIDER PR-2, P2-2..P2-15;
 * ADR-INCR-PAYMENT-PROVIDER-COLLECTION PP-D3/PP-D4/PP-D5; decisões do dono de 10/10 em D-2026-10-10-F5-PR2-FORKS).
 *
 * atomicUntil: este serviço NÃO chama `postEntry` — nenhuma transição gera JournalEntry nem ReceivableReceipt
 * (PP-D5, resposta 20: "Contas a pagar e a receber NÃO têm baixa automática"; P2-8). A baixa é do F7 (PR-3).
 *
 * Criação = 2 commits com a chamada externa no meio (P2-2, invariante 5/6):
 *   commit 1 — tx: título cobrável, sem outra viva, saldo RELIDO na tx, conta MP ACTIVE do escopo ⇒ linha CREATING;
 *   chamada — `createCharge` com `X-Idempotency-Key = id:attempt` e `external_reference = id`, FORA da tx;
 *   commit 2 — CAS CREATING → PENDING (+ refs + instrumento). Queda entre a chamada e o commit 2 ⇒ o job reenvia
 *   com a MESMA chave depois de 10 min (F3 a; P2-3) e o MP devolve a mesma ordem.
 *
 * Toda transição posterior é CAS de status DENTRO da tx (P2-6), pela MESMA função para webhook, job e cancelamento
 * (`applyProviderResult`, P2-7). O corpo do webhook nunca transiciona: só a re-consulta (invariante 2).
 */
export class CollectionChargeService {
  constructor(
    private readonly repo: ICollectionChargeRepository,
    private readonly paymentAccountRepo: IPaymentAccountRepository,
    private readonly receivableRepo: IReceivableRepository,
    private readonly counterpartyRepo: ICounterpartyRepository,
    private readonly auditService: AuditService,
    private readonly policy: IAccountingPolicy,
    private readonly providerFor: (provider: string) => CollectionProviderPort,
    private readonly now: () => Date = () => new Date(),
  ) {}

  // ── Comandos ───────────────────────────────────────────────────────────────
  /** POST /api/receivables/:id/charges (P2-2). */
  async create(scope: AccountingScope, receivableId: string, dto: CreateChargeInputDto): Promise<CollectionChargeView> {
    if (!this.policy.canManageReceivable(scope)) {
      throw new ForbiddenError('Você não tem permissão para cobrar contas a receber.');
    }
    // Campo do prazo do tipo errado ⇒ 400, nunca ignorado (BRIEF §4.3; P2-12).
    if (dto.kind === 'BOLETO' && dto.expiresInMinutes !== undefined) {
      throw new ValidationError('expiresInMinutes só vale para PIX.', null, CHARGE_EXPIRY_FIELD_MISMATCH);
    }
    if (dto.kind === 'PIX' && dto.expiresInDays !== undefined) {
      throw new ValidationError('expiresInDays só vale para BOLETO.', null, CHARGE_EXPIRY_FIELD_MISMATCH);
    }
    if (dto.kind === 'BOLETO' && !dto.payer.address) {
      throw new ValidationError('Boleto exige o endereço do pagador (M1).', null, CHARGE_ADDRESS_REQUIRED);
    }
    const keyring = loadKeyring(); // sem chave ⇒ 503 antes de qualquer escrita (P1-2)
    const now = this.now();
    const expiry = computeExpiry(dto, now);

    const { charge, account } = await this.repo.runTransaction(async (tx) => {
      const receivable = await this.receivableRepo.findById(scope, receivableId, tx);
      if (!receivable) throw new NotFoundError(`Conta a receber '${receivableId}' não foi encontrada.`);
      if (!(CHARGEABLE_RECEIVABLE_STATUSES as readonly string[]).includes(receivable.status)) {
        throw new ConflictError(
          `${CHARGE_RECEIVABLE_NOT_CHARGEABLE}: título em ${receivable.status} não pode ser cobrado.`,
          CHARGE_RECEIVABLE_NOT_CHARGEABLE,
        );
      }
      const live = await this.repo.findLiveByReceivable(scope, receivableId, tx);
      if (live) {
        throw new ConflictError(`${CHARGE_LIVE_EXISTS}: o título já tem a cobrança viva '${live.id}' (${live.status}).`, CHARGE_LIVE_EXISTS);
      }
      const balance = centsFromDb(receivable.amountCents) - centsFromDb(receivable.receivedCents);
      if (balance <= 0) {
        throw new ConflictError(`${CHARGE_NOTHING_TO_CHARGE}: o título não tem saldo em aberto.`, CHARGE_NOTHING_TO_CHARGE);
      }
      const acct = await this.paymentAccountRepo.findActive(scope, 'MERCADO_PAGO', tx);
      if (!acct) {
        throw new ConflictError(`${PAYMENT_ACCOUNT_NOT_ACTIVE}: não há conta Mercado Pago ativa nesta unidade.`, PAYMENT_ACCOUNT_NOT_ACTIVE);
      }
      const created = await this.repo.create(
        {
          userId: scope.ownerUserId,
          unitId: scope.unitId,
          paymentAccountId: acct.id,
          receivableId,
          counterpartyId: receivable.counterpartyId,
          kind: dto.kind,
          amountCents: BigInt(balance),
          expiresAt: expiry.expiresAt,
          status: 'CREATING',
          payerSnapshotJson: JSON.stringify(dto.payer),
          createdById: scope.actorUserId,
        },
        tx,
      );
      await this.audit(tx, scope, COLLECTION_CHARGE_CREATED, created.id, {
        receivableId,
        paymentAccountId: acct.id,
        kind: created.kind,
        amountCents: String(balance),
        status: 'CREATING',
      });
      return { charge: created, account: acct };
    });

    const sent = await this.send(charge, account, keyring, expiry.expiresIn);
    return toView(sent, false);
  }

  /** POST /api/collection-charges/:id/cancel (P2-10). Só PENDING; 409 `cannot_cancel_order` ⇒ re-consulta. */
  async cancel(scope: AccountingScope, id: string): Promise<CollectionChargeView> {
    if (!this.policy.canManageReceivable(scope)) {
      throw new ForbiddenError('Você não tem permissão para cancelar cobranças.');
    }
    const charge = await this.require(scope, id);
    if (charge.status !== 'PENDING' || !charge.providerRef) {
      throw new ConflictError(`${CHARGE_NOT_PENDING}: só cobrança PENDING pode ser cancelada (atual: ${charge.status}).`, CHARGE_NOT_PENDING);
    }
    const keyring = loadKeyring();
    const account = await this.requireAccountRow(charge.paymentAccountId);
    const resolved = this.resolve(account, keyring);
    const port = this.providerFor(account.provider);
    let result: ChargeResult;
    try {
      result = await port.cancelCharge(resolved, charge.providerRef, `${charge.id}:cancel`);
    } catch (error) {
      if (error instanceof CollectionProviderError && error.httpStatus === 409) {
        // M7: só action_required/created cancelam — aplica o estado real (se já foi paga, fica PAID).
        const real = await this.callProvider(account, () => port.getCharge(resolved, charge.providerRef!));
        return toView(await this.applyProviderResult(charge.id, real), true);
      }
      throw await this.translateProviderError(account, error);
    }
    const mapped = mapMercadoPagoStatus(result.providerStatus, result.providerStatusDetail);
    if (mapped.status === 'CANCELLED') {
      await this.repo.runTransaction(async (tx) => {
        const n = await this.repo.casStatus(
          charge.id,
          'PENDING',
          {
            status: 'CANCELLED',
            cancelledById: scope.actorUserId,
            providerStatus: result.providerStatus,
            providerStatusDetail: result.providerStatusDetail,
          },
          tx,
        );
        if (n === 1) {
          await this.audit(tx, scope, COLLECTION_CHARGE_CANCELLED, charge.id, {
            fromStatus: 'PENDING',
            toStatus: 'CANCELLED',
            providerStatus: result.providerStatus,
          });
        }
      });
      return toView(await this.requireAny(charge.id), true);
    }
    return toView(await this.applyProviderResult(charge.id, result), true);
  }

  /**
   * Webhook público (P2-5). Conta inexistente/inativa/de outro provedor, assinatura, janela ou qualquer falha ⇒ 401
   * e ZERO escrita. Válido ⇒ re-consulta com a credencial da conta e aplica pela mesma função do job.
   */
  async webhookReceived(
    provider: string,
    accountId: string,
    headers: Record<string, string | string[] | undefined>,
    query: Record<string, unknown>,
  ): Promise<{ status: number }> {
    const account = await this.paymentAccountRepo.findByIdAnyScope(accountId);
    if (!account || account.status !== 'ACTIVE' || account.provider !== provider) return { status: 401 };
    let resolved: ResolvedAccount;
    try {
      resolved = this.resolve(account, loadKeyring());
    } catch {
      return { status: 401 };
    }
    const port = this.providerFor(account.provider);
    const verification = port.verifyWebhook({ headers, query }, resolved.credential.webhookSecret, this.now());
    if (!verification.ok) return { status: 401 };

    const charge = await this.repo.findByProviderRefAnyScope(account.id, verification.resourceRef);
    if (!charge) return { status: 200 }; // ordem que não é nossa: nada a acordar, e o MP não deve reenviar
    try {
      const result = await this.callProvider(account, () => port.getCharge(resolved, verification.resourceRef));
      await this.applyProviderResult(charge.id, result);
    } catch (error) {
      logger.error('webhook de cobrança: falha ao re-consultar — fica para o job', {
        collectionChargeId: charge.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return { status: 200 };
  }

  /** Job (P2-9): re-consulta as PENDING e reenvia as CREATING com mais de 10 min (P2-3). */
  async pollPending(): Promise<CollectionPollSummary> {
    const summary: CollectionPollSummary = { scanned: 0, redriven: 0, refreshed: 0, failed: 0 };
    const rows = await this.repo.findPollable(new Date(this.now().getTime() - STALE_CREATING_MS));
    if (rows.length === 0) return summary;
    let keyring: Keyring;
    try {
      keyring = loadKeyring();
    } catch (error) {
      logger.warn('collection_charge_poll: sem chave-mestra — nada re-consultado', {
        error: error instanceof Error ? error.message : String(error),
      });
      summary.failed = rows.length;
      return summary;
    }
    for (const row of rows) {
      summary.scanned += 1;
      try {
        const account = await this.requireAccountRow(row.paymentAccountId);
        if (account.status !== 'ACTIVE') continue;
        if (row.status === 'CREATING' && row.expiresAt.getTime() <= this.now().getTime()) {
          // Venceu antes de chegar ao MP: não reenvia; EXPIRED é terminal (F9: terminal nunca tem baixa automática).
          await this.expireUnsent(row);
        } else if (row.status === 'CREATING') {
          await this.send(row, account, keyring, expiresInFor(row, this.now()));
          summary.redriven += 1;
        } else if (row.providerRef) {
          const resolved = this.resolve(account, keyring);
          const port = this.providerFor(account.provider);
          const result = await this.callProvider(account, () => port.getCharge(resolved, row.providerRef!));
          await this.applyProviderResult(row.id, result);
          summary.refreshed += 1;
        }
      } catch (error) {
        summary.failed += 1;
        logger.warn('collection_charge_poll: falha na cobrança', {
          collectionChargeId: row.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return summary;
  }

  // ── Leituras ───────────────────────────────────────────────────────────────
  /** GET /api/receivables/:id/charges (P2-15) — sem pagador (F9). */
  async listByReceivable(scope: AccountingScope, receivableId: string): Promise<CollectionChargeView[]> {
    if (!this.policy.canReadReceivable(scope)) {
      throw new ForbiddenError('Você não tem permissão para ler cobranças.');
    }
    const receivable = await this.receivableRepo.findById(scope, receivableId);
    if (!receivable) throw new NotFoundError(`Conta a receber '${receivableId}' não foi encontrada.`);
    return (await this.repo.findManyByReceivable(scope, receivableId)).map((c) => toView(c, false));
  }

  /** GET /api/collection-charges/:id (P2-15) — pagador só para quem gerencia o título (F9). */
  async get(scope: AccountingScope, id: string): Promise<CollectionChargeView> {
    if (!this.policy.canReadReceivable(scope)) {
      throw new ForbiddenError('Você não tem permissão para ler cobranças.');
    }
    return toView(await this.require(scope, id), this.policy.canManageReceivable(scope));
  }

  /** GET /api/receivables/:id/charges/payer-suggestion (P2-11). Só leitura, sem audit; PII ⇒ exige gestão (F9). */
  async payerSuggestion(scope: AccountingScope, receivableId: string): Promise<Partial<PayerInput>> {
    if (!this.policy.canManageReceivable(scope)) {
      throw new ForbiddenError('Você não tem permissão para ver os dados do pagador.');
    }
    const receivable = await this.receivableRepo.findById(scope, receivableId);
    if (!receivable) throw new NotFoundError(`Conta a receber '${receivableId}' não foi encontrada.`);
    const last = await this.repo.findLastByCounterparty(scope, receivable.counterpartyId);
    if (last) return JSON.parse(last.payerSnapshotJson) as PayerInput;
    const counterparty = await this.counterpartyRepo.findById(scope, receivable.counterpartyId);
    return counterparty?.taxId ? { identification: { number: counterparty.taxId } } as Partial<PayerInput> : {};
  }

  // ── Internos ───────────────────────────────────────────────────────────────
  /** CREATING cujo `expiresAt` já passou ⇒ CAS para EXPIRED (+ audit na mesma tx), sem chamar o provedor. */
  private async expireUnsent(charge: CollectionCharge): Promise<void> {
    const scope = resolveAccountingScope({ userId: charge.userId }, charge.unitId);
    await this.repo.runTransaction(async (tx) => {
      const n = await this.repo.casStatus(charge.id, 'CREATING', { status: 'EXPIRED' }, tx);
      if (n === 1) {
        await this.audit(tx, scope, COLLECTION_CHARGE_STATUS_CHANGED, charge.id, { from: 'CREATING', to: 'EXPIRED' });
      }
    });
  }

  /** Chamada externa da criação/re-drive (P2-2/P2-3) e o 2º commit. */
  private async send(charge: CollectionCharge, account: PaymentAccount, keyring: Keyring, expiresIn: string): Promise<CollectionCharge> {
    const scope = resolveAccountingScope({ userId: charge.userId }, charge.unitId);
    const resolved = this.resolve(account, keyring);
    const port = this.providerFor(account.provider);
    const receivable = await this.receivableRepo.findById(scope, charge.receivableId);
    const company = await this.repo.findCompanyName(charge.userId);
    // F9 (dono 10/10): número do título + nome da empresa, sem dado pessoal.
    const description = `Título ${receivable?.documentNumber ?? charge.receivableId}${company ? ` — ${company}` : ''}`;
    let result: ChargeResult;
    try {
      result = await port.createCharge(resolved, {
        idempotencyKey: `${charge.id}:${charge.attempt}`,
        externalReference: charge.id,
        kind: charge.kind as 'BOLETO' | 'PIX',
        amountCents: BigInt(centsFromDb(charge.amountCents)),
        expiresIn,
        payer: JSON.parse(charge.payerSnapshotJson) as PayerInput,
        description,
      });
    } catch (error) {
      if (error instanceof CollectionProviderError && isDefinitive(error.httpStatus)) {
        const reason = error.message;
        await this.repo.runTransaction(async (tx) => {
          const n = await this.repo.casStatus(charge.id, 'CREATING', { status: 'FAILED', failReason: reason }, tx);
          if (n === 1) {
            await this.audit(tx, scope, COLLECTION_CHARGE_FAILED, charge.id, { fromStatus: 'CREATING', toStatus: 'FAILED' });
          }
        });
        return this.requireAny(charge.id);
      }
      throw await this.translateProviderError(account, error, charge.id);
    }
    await this.repo.runTransaction(async (tx) => {
      const n = await this.repo.casStatus(
        charge.id,
        'CREATING',
        {
          status: 'PENDING',
          providerRef: result.providerRef,
          providerPaymentRef: result.providerPaymentRef ?? null,
          providerStatus: result.providerStatus,
          providerStatusDetail: result.providerStatusDetail,
          instrumentJson: result.instrument ? JSON.stringify(result.instrument) : null,
        },
        tx,
      );
      if (n === 1) {
        await this.audit(tx, scope, COLLECTION_CHARGE_STATUS_CHANGED, charge.id, {
          from: 'CREATING',
          to: 'PENDING',
          providerStatus: result.providerStatus,
        });
      }
    });
    // A ordem pode já nascer num estado além de PENDING — aplica pela função comum (P2-7).
    return this.applyProviderResult(charge.id, result);
  }

  /**
   * Aplica o estado do provedor (P2-6/P2-7). CAS do status atual DENTRO da tx: a 2ª aplicação do mesmo estado não
   * transiciona nem audita. Terminais (REFUNDED; EXPIRED/CANCELLED/FAILED pela F9) não mudam — o cru é gravado e, se o
   * MP disser `accredited` depois de um terminal, sai um alerta no log (`collection_charge_paid_after_terminal`).
   */
  async applyProviderResult(chargeId: string, result: ChargeResult): Promise<CollectionCharge> {
    const mapped = mapMercadoPagoStatus(result.providerStatus, result.providerStatusDetail);
    if (!mapped.known) {
      logger.warn('collection_charge: status do provedor desconhecido — mantido PENDING', {
        collectionChargeId: chargeId,
        providerStatus: result.providerStatus,
        providerStatusDetail: result.providerStatusDetail,
      });
    }
    await this.repo.runTransaction(async (tx) => {
      const current = await this.repo.findByIdAnyScope(chargeId, tx);
      if (!current || current.status === 'CREATING') return; // CREATING é do fluxo de criação
      const from = current.status as CollectionChargeStatus;
      const raw = { providerStatus: result.providerStatus, providerStatusDetail: result.providerStatusDetail };
      const rawChanged = current.providerStatus !== raw.providerStatus || current.providerStatusDetail !== raw.providerStatusDetail;
      let to: CollectionChargeStatus = mapped.status;
      if (TERMINAL_CHARGE_STATUSES.includes(from)) {
        if (mapped.status === 'PAID' && from !== 'REFUNDED') {
          logger.warn('collection_charge_paid_after_terminal: o provedor diz pago numa cobrança terminal — conciliar à mão', {
            collectionChargeId: chargeId,
            status: from,
            providerStatus: result.providerStatus,
          });
        }
        to = from;
      } else if (to === 'PENDING' && from !== 'PENDING') {
        to = from; // nunca regride de PAID/PARTIALLY_REFUNDED/CHARGED_BACK para PENDING
      }
      if (to === from) {
        if (rawChanged) await this.repo.casStatus(chargeId, from, raw, tx);
        return;
      }
      const n = await this.repo.casStatus(
        chargeId,
        from,
        { status: to, ...raw, ...(to === 'PAID' && !current.paidAt ? { paidAt: this.now() } : {}) },
        tx,
      );
      if (n === 1) {
        const scope = resolveAccountingScope({ userId: current.userId }, current.unitId);
        await this.audit(tx, scope, COLLECTION_CHARGE_STATUS_CHANGED, chargeId, {
          from,
          to,
          providerStatus: result.providerStatus,
        });
      }
    });
    return this.requireAny(chargeId);
  }

  private async callProvider<T>(account: PaymentAccount, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      throw await this.translateProviderError(account, error);
    }
  }

  /** 401 do MP ⇒ conta CREDENTIAL_INVALID (audit) + 502 `provider_credential_invalid` (P2-4); o resto ⇒ 502. */
  private async translateProviderError(account: PaymentAccount, error: unknown, chargeId?: string): Promise<AppError> {
    if (error instanceof CollectionProviderError && error.httpStatus === 401) {
      await this.markCredentialInvalid(account);
      return new AppError('O Mercado Pago recusou a credencial da conta; grave a credencial de novo.', 502, PROVIDER_CREDENTIAL_INVALID);
    }
    if (error instanceof CollectionProviderError) {
      return new AppError(
        `Mercado Pago indisponível (${error.message}).${chargeId ? ` A cobrança '${chargeId}' será reenviada automaticamente.` : ''}`,
        502,
        PROVIDER_UNAVAILABLE,
      );
    }
    return error instanceof AppError ? error : new AppError(error instanceof Error ? error.message : String(error), 500);
  }

  /** Público desde o PR-3: o job do relatório (P3-5) aplica o mesmo P2-4. */
  async markCredentialInvalid(account: PaymentAccount): Promise<void> {
    const scope = resolveAccountingScope({ userId: account.userId }, account.unitId);
    await this.paymentAccountRepo.runTransaction(async (tx) => {
      const fresh = await this.paymentAccountRepo.findById(scope, account.id, tx);
      if (!fresh || fresh.status !== 'ACTIVE') return;
      await this.paymentAccountRepo.update(scope, account.id, { status: 'CREDENTIAL_INVALID' }, tx);
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: PAYMENT_ACCOUNT_CREDENTIAL_INVALID,
        targetType: 'payment_account',
        targetId: account.id,
        payload: { paymentAccountId: account.id, fromStatus: 'ACTIVE', toStatus: 'CREDENTIAL_INVALID' },
      });
    });
  }

  private resolve(account: PaymentAccount, keyring: Keyring): ResolvedAccount {
    if (!account.credentialCiphertext || account.credentialKeyVersion == null) {
      throw new ConflictError(`${PAYMENT_ACCOUNT_NOT_ACTIVE}: a conta não tem credencial gravada.`, PAYMENT_ACCOUNT_NOT_ACTIVE);
    }
    const plain = open(account.credentialCiphertext, account.id, account.credentialKeyVersion, keyring);
    const credential = JSON.parse(plain) as { accessToken: string; webhookSecret: string };
    return { id: account.id, credentialSource: 'OWN', credential };
  }

  private async require(scope: AccountingScope, id: string): Promise<CollectionCharge> {
    const row = await this.repo.findById(scope, id);
    if (!row) throw new NotFoundError(`Cobrança '${id}' não foi encontrada.`);
    return row;
  }

  private async requireAny(id: string): Promise<CollectionCharge> {
    const row = await this.repo.findByIdAnyScope(id);
    if (!row) throw new NotFoundError(`Cobrança '${id}' não foi encontrada.`);
    return row;
  }

  private async requireAccountRow(id: string): Promise<PaymentAccount> {
    const row = await this.paymentAccountRepo.findByIdAnyScope(id);
    if (!row) throw new NotFoundError(`Conta de pagamento '${id}' não foi encontrada.`);
    return row;
  }

  private audit(
    tx: Prisma.TransactionClient,
    scope: AccountingScope,
    eventType: string,
    id: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    return this.auditService.append(tx, scope, {
      actorUserId: scope.actorUserId,
      eventType,
      targetType: 'collection_charge',
      targetId: id,
      payload: { collectionChargeId: id, ...payload },
    });
  }
}

/** 4xx definitivo = qualquer 4xx exceto 401 (credencial, P2-4), 409 e 429 (transitórios) — P2-3. */
function isDefinitive(status: number | null): boolean {
  return status !== null && status >= 400 && status < 500 && status !== 401 && status !== 409 && status !== 429;
}

/** F4 (a): prazo sempre explícito. Boleto = dias corridos até o 3º dia útil (seg–sex, fuso de Brasília); Pix = 24 h. */
export function computeExpiry(dto: Pick<CreateChargeInputDto, 'kind' | 'expiresInDays' | 'expiresInMinutes'>, now: Date): { expiresIn: string; expiresAt: Date } {
  if (dto.kind === 'BOLETO') {
    const days = dto.expiresInDays ?? calendarDaysToBusinessDay(now, DEFAULT_BOLETO_BUSINESS_DAYS);
    return { expiresIn: `P${days}D`, expiresAt: new Date(now.getTime() + days * 86_400_000) };
  }
  const minutes = dto.expiresInMinutes ?? DEFAULT_PIX_MINUTES;
  return { expiresIn: `PT${minutes}M`, expiresAt: new Date(now.getTime() + minutes * 60_000) };
}

/** Re-drive: o prazo que resta até o `expiresAt` gravado (o MP devolve a mesma ordem pela mesma chave, invariante 5). */
function expiresInFor(charge: CollectionCharge, now: Date): string {
  const remainingMs = Math.max(charge.expiresAt.getTime() - now.getTime(), 0);
  if (charge.kind === 'BOLETO') return `P${Math.max(1, Math.ceil(remainingMs / 86_400_000))}D`;
  return `PT${Math.max(30, Math.ceil(remainingMs / 60_000))}M`;
}

/** Quantos dias corridos de `now` até o n-ésimo dia útil (seg–sex) seguinte, contado no dia-calendário de Brasília. */
export function calendarDaysToBusinessDay(now: Date, businessDays: number): number {
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short' }).format(now);
  const order = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let dow = order.indexOf(weekday);
  let days = 0;
  let counted = 0;
  while (counted < businessDays) {
    days += 1;
    dow = (dow + 1) % 7;
    if (dow !== 0 && dow !== 6) counted += 1;
  }
  return days;
}

function toView(row: CollectionCharge, withPayer: boolean): CollectionChargeView {
  return {
    id: row.id,
    unitId: row.unitId,
    receivableId: row.receivableId,
    paymentAccountId: row.paymentAccountId,
    kind: row.kind,
    amountCents: String(row.amountCents),
    expiresAt: row.expiresAt.toISOString(),
    status: row.status,
    providerRef: row.providerRef,
    providerPaymentRef: row.providerPaymentRef,
    providerStatus: row.providerStatus,
    providerStatusDetail: row.providerStatusDetail,
    paidAt: row.paidAt?.toISOString() ?? null,
    failReason: row.failReason,
    instrument: row.instrumentJson ? (JSON.parse(row.instrumentJson) as Record<string, string>) : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...(withPayer ? { payer: JSON.parse(row.payerSnapshotJson) as PayerInput } : {}),
  };
}
