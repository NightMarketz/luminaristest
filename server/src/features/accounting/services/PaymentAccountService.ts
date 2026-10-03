import type { PaymentAccount } from 'generated/prisma';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../../lib/errors';
import { loadKeyring, seal } from '../../../lib/secretBox';
import {
  PAYMENT_ACCOUNT_ALREADY_ACTIVE,
  PAYMENT_ACCOUNT_CREATED,
  PAYMENT_ACCOUNT_CREDENTIAL_SET,
  PAYMENT_ACCOUNT_DISABLED,
  PAYMENT_ACCOUNT_INVALID_TRANSITION,
  PAYMENT_ACCOUNT_UPDATED,
} from '../models/PaymentAccount.model';
import {
  PaymentAccountConfigSchema,
  type CreatePaymentAccountInput,
  type PaymentAccountConfig,
  type SetCredentialInput,
  type UpdatePaymentAccountInput,
} from '../dtos/PaymentAccountDto';
import type { IPaymentAccountRepository } from '../repositories/IPaymentAccountRepository';
import type { IAccountRepository } from '../repositories/IAccountRepository';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { AuditService } from './AuditService';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import type { Prisma } from 'generated/prisma';

/** Projeção pública — NUNCA carrega ciphertext nem credencial (PP-D7, P1-6/P1-7). */
export interface PaymentAccountView {
  id: string;
  unitId: string;
  provider: string;
  label: string;
  glAccountId: string;
  providerAccountRef: string | null;
  config: PaymentAccountConfig;
  status: string;
  credentialSetAt: string | null;
  credentialExpiresAt: string | null;
  accessTokenLast4: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * PaymentAccountService — conta de pagamento no provedor (BE-INCR-PAYMENT-PROVIDER PR-1, P1-3..P1-10;
 * ADR-INCR-PAYMENT-PROVIDER-COLLECTION PP-D2/PP-D7). FIRST-CLASS PRISMA; nunca posta no razão.
 *
 * - Policy-first: `canManagePaymentAccounts` nos comandos, `canReadPaymentAccounts` nas leituras.
 * - `glAccountId` folha do escopo, validado na criação e IMUTÁVEL depois (nenhum DTO de escrita o aceita).
 * - Uma `ACTIVE` por (escopo, provedor), re-checada DENTRO da tx que ativa (P1-4 → 409).
 * - Credencial: `loadKeyring()` roda ANTES de qualquer leitura/escrita (sem chave ⇒ 503 sem efeito, P1-2);
 *   cifra com AAD = id (P1-8); a resposta e o audit levam só ids/status (P1-7/P1-10).
 * - DELETE é soft e sem evento de audit (lacuna ratificada 03/10: o P1-10 não lista evento para ele).
 */
export class PaymentAccountService {
  constructor(
    private readonly repo: IPaymentAccountRepository,
    private readonly accountRepo: IAccountRepository,
    private readonly auditService: AuditService,
    private readonly policy: IAccountingPolicy,
  ) {}

  // ── Leituras ───────────────────────────────────────────────────────────────
  async list(scope: AccountingScope): Promise<PaymentAccountView[]> {
    if (!this.policy.canReadPaymentAccounts(scope)) {
      throw new ForbiddenError('Você não tem permissão para listar contas de pagamento.');
    }
    return (await this.repo.findManyByUnit(scope)).map(toView);
  }

  async get(scope: AccountingScope, id: string): Promise<PaymentAccountView> {
    if (!this.policy.canReadPaymentAccounts(scope)) {
      throw new ForbiddenError('Você não tem permissão para ler contas de pagamento.');
    }
    return toView(await this.require(scope, id));
  }

  // ── Comandos ───────────────────────────────────────────────────────────────
  async create(scope: AccountingScope, dto: CreatePaymentAccountInput): Promise<PaymentAccountView> {
    this.assertManage(scope);
    const gl = await this.accountRepo.findById(scope, dto.glAccountId);
    if (!gl || gl.deletedAt) throw new ValidationError(`Conta contábil '${dto.glAccountId}' não existe neste escopo.`);
    if (!gl.acceptsEntries) throw new ValidationError(`Conta contábil '${gl.code}' não aceita lançamentos (não é folha).`);
    const { userId, unitId } = accountingScopeWhere(scope);
    return this.repo.runTransaction(async (tx) => {
      const created = await this.repo.create(
        {
          userId,
          unitId,
          provider: dto.provider,
          label: dto.label,
          glAccountId: dto.glAccountId,
          configJson: JSON.stringify(dto.config),
          status: 'DRAFT',
          createdById: scope.actorUserId,
        },
        tx,
      );
      await this.audit(tx, scope, PAYMENT_ACCOUNT_CREATED, created.id, {
        provider: created.provider,
        glAccountId: created.glAccountId,
        status: created.status,
      });
      return toView(created);
    });
  }

  /** PATCH: só `label` e `ACTIVE → DISABLED` / `DISABLED → ACTIVE` (P1-9). Mesmo status = sem transição. */
  async update(scope: AccountingScope, id: string, dto: UpdatePaymentAccountInput): Promise<PaymentAccountView> {
    this.assertManage(scope);
    return this.repo.runTransaction(async (tx) => {
      const current = await this.require(scope, id, tx);
      const from = current.status;
      const to = dto.status ?? from;
      if (to !== from) {
        const allowed = (from === 'ACTIVE' && to === 'DISABLED') || (from === 'DISABLED' && to === 'ACTIVE');
        if (!allowed) {
          throw new ConflictError(
            `${PAYMENT_ACCOUNT_INVALID_TRANSITION}: ${from} → ${to} não é permitido (só ACTIVE↔DISABLED; a credencial ativa a conta).`,
            PAYMENT_ACCOUNT_INVALID_TRANSITION,
          );
        }
        if (to === 'ACTIVE') await this.assertNoOtherActive(scope, current, tx);
      }
      const labelChanged = dto.label !== undefined && dto.label !== current.label;
      const updated = await this.repo.update(
        scope,
        id,
        { ...(labelChanged ? { label: dto.label } : {}), ...(to !== from ? { status: to } : {}) },
        tx,
      );
      if (to === 'DISABLED' && from !== 'DISABLED') {
        await this.audit(tx, scope, PAYMENT_ACCOUNT_DISABLED, id, { fromStatus: from });
      }
      if (labelChanged || (to === 'ACTIVE' && from !== 'ACTIVE')) {
        await this.audit(tx, scope, PAYMENT_ACCOUNT_UPDATED, id, { fromStatus: from, toStatus: to });
      }
      return toView(updated);
    });
  }

  /** PUT …/credential (P1-6): cifra e ativa. Sem keyring ⇒ 503 antes de tocar no banco (P1-2). */
  async setCredential(scope: AccountingScope, id: string, dto: SetCredentialInput): Promise<PaymentAccountView> {
    this.assertManage(scope);
    const keyring = loadKeyring();
    return this.repo.runTransaction(async (tx) => {
      const current = await this.require(scope, id, tx);
      await this.assertNoOtherActive(scope, current, tx);
      const sealed = seal(JSON.stringify({ accessToken: dto.accessToken, webhookSecret: dto.webhookSecret }), current.id, keyring);
      const updated = await this.repo.update(
        scope,
        id,
        {
          credentialCiphertext: sealed.blob,
          credentialKeyVersion: sealed.keyVersion,
          credentialSetAt: new Date(),
          credentialExpiresAt: null, // OWN: a doc do MP não declara validade (M12)
          accessTokenLast4: dto.accessToken.slice(-4),
          status: 'ACTIVE',
        },
        tx,
      );
      await this.audit(tx, scope, PAYMENT_ACCOUNT_CREDENTIAL_SET, id, {
        credentialKeyVersion: sealed.keyVersion,
        fromStatus: current.status,
        toStatus: 'ACTIVE',
      });
      return toView(updated);
    });
  }

  /** DELETE: soft-delete; não é idempotente (a 2ª chamada é 404, leitura só de linha viva). */
  async remove(scope: AccountingScope, id: string): Promise<void> {
    this.assertManage(scope);
    await this.repo.runTransaction(async (tx) => {
      await this.require(scope, id, tx);
      await this.repo.update(scope, id, { deletedAt: new Date() }, tx);
    });
  }

  // ── Internos ───────────────────────────────────────────────────────────────
  private assertManage(scope: AccountingScope): void {
    if (!this.policy.canManagePaymentAccounts(scope)) {
      throw new ForbiddenError('Você não tem permissão para gerenciar contas de pagamento.');
    }
  }

  private async require(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<PaymentAccount> {
    const row = await this.repo.findById(scope, id, tx);
    if (!row) throw new NotFoundError(`Conta de pagamento '${id}' não foi encontrada.`);
    return row;
  }

  private async assertNoOtherActive(scope: AccountingScope, account: PaymentAccount, tx: Prisma.TransactionClient): Promise<void> {
    const other = await this.repo.findOtherActive(scope, account.provider, account.id, tx);
    if (other) {
      throw new ConflictError(
        `${PAYMENT_ACCOUNT_ALREADY_ACTIVE}: já existe conta ${account.provider} ativa neste escopo ('${other.id}'); desative-a antes.`,
        PAYMENT_ACCOUNT_ALREADY_ACTIVE,
      );
    }
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
      targetType: 'payment_account',
      targetId: id,
      payload: { paymentAccountId: id, ...payload },
    });
  }
}

function toView(row: PaymentAccount): PaymentAccountView {
  return {
    id: row.id,
    unitId: row.unitId,
    provider: row.provider,
    label: row.label,
    glAccountId: row.glAccountId,
    providerAccountRef: row.providerAccountRef,
    config: PaymentAccountConfigSchema.parse(JSON.parse(row.configJson)),
    status: row.status,
    credentialSetAt: row.credentialSetAt?.toISOString() ?? null,
    credentialExpiresAt: row.credentialExpiresAt?.toISOString() ?? null,
    accessTokenLast4: row.accessTokenLast4,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
