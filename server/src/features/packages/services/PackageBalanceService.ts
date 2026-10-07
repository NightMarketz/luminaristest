import { Prisma } from 'generated/prisma';
import type { LegalParameterService } from '../../legalParameters/services/LegalParameterService';
import type { CustomerPackageBalance } from 'generated/prisma';
import { ForbiddenError, PackageBalanceExpiredError, ValidationError } from '../../../lib/errors';
import type { AccountingScope } from '../../accounting/scope/AccountingScope';
import { centsFromDb } from '../../accounting/models/money';
import { scopeToday } from '../../accounting/models/dates';
import type { IPackageBalanceRepository } from '../repositories/IPackageBalanceRepository';
import type { IPackageBalancePolicy } from '../policies/IPackageBalancePolicy';
import {
  expiresAtToDb,
  expiresOnFromDb,
  expiryMovementKey,
  isDueForExpiry,
  isExpiredForConsumption,
  lastValidDay,
} from '../models/validity';

/** One balance mutation tied to a sale (origin credit or consumption debit). */
export interface PackageMovementCommand {
  customerId: string;
  packageId: string;
  saleId: string;
  amountCents: number;
}

/** BE-INCR-PACOTE-VALIDADE item 2: the origin credit also carries the validity of the purchase. */
export interface PackageCreditCommand extends PackageMovementCommand {
  /** 'YYYY-MM-DD' — sale.data.date (already date-only in the preset). */
  saleDate: string;
  /** From the catalog (F-PV-1 a, copied at credit time); null/0 = no validity. */
  validityDays: number | null;
}

/** Item 6: what one expiry released (the movement fixes the amount; the posting comes after). */
export interface ExpireDueResult {
  /** 'expiry:<balanceId>:<expiresOn>' — stored in PackageBalanceMovement.saleId. */
  movementKey: string;
  /** > 0, safe integer. */
  amountCents: number;
  /** 'YYYY-MM-DD' (last valid day). */
  expiresOn: string;
}

/**
 * PackageBalanceService — prepaid-package balance orchestration (Incremento G).
 *
 * Lives ABOVE the DynamicTable engine (never injected into it). Write paths:
 *  - creditFromSale: package-sale origin grants balance (paired with the C 2.1.1 posting) and writes
 *    the validity (BE-INCR-PACOTE-VALIDADE item 2, junction rule F-PV-2 a) in the same tx.
 *  - debitForConsumption: Package Balance consumption draws balance down (never checks validity —
 *    item 5: a consumption that passed the pre-check on a valid day is legitimate even if re-driven later).
 *  - expireDue: the remaining balance of an expired customer × package is released (item 6).
 * All idempotent per (saleId, kind): the append-only movement is the gate — its unique key turns a
 * reconcile re-drive (or a race) into a no-op. The balanceCents >= 0 invariant is enforced atomically
 * by the repository's conditional decrement. Money is INTEGER CENTS at every boundary.
 */
export class PackageBalanceService {
  constructor(
    private readonly repo: IPackageBalanceRepository,
    private readonly policy: IPackageBalancePolicy,
    /** BE-INCR-LEGAL-PARAMS PR-2 (L-9; F-LP-4 a): fotografia `FERIADO_NACIONAL` para o último dia válido. */
    private readonly legalParams: Pick<LegalParameterService, 'fotografia'>,
  ) {}

  /**
   * Grants balance from a finalized package sale. Idempotent: a second call for the same
   * saleId is a no-op (movement gate), whether from a retry or reconcile — so the validity a
   * re-drive would compute never moves an already-applied credit.
   */
  public async creditFromSale(scope: AccountingScope, cmd: PackageCreditCommand): Promise<void> {
    if (!this.policy.canMutate(scope)) {
      throw new ForbiddenError('Sem permissão para creditar saldo de pacote.');
    }
    this.assertAmount(cmd.amountCents);

    // Fast path: already applied — skip the transaction entirely.
    const existing = await this.repo.findMovement(scope, cmd.saleId, 'credit');
    if (existing) return;
    const purchaseLastDay = lastValidDay(cmd.saleDate, cmd.validityDays, await this.legalParams.fotografia(['FERIADO_NACIONAL']));

    try {
      await this.repo.runTransaction(async (tx) => {
        // Movement-first: its unique (userId,unitId,saleId,kind) is the idempotency gate.
        // If a concurrent credit already won, this throws P2002 and the tx rolls back —
        // the balance is then never double-incremented.
        await this.repo.createMovement(
          {
            userId: scope.ownerUserId,
            unitId: scope.unitId,
            customerId: cmd.customerId,
            packageId: cmd.packageId,
            saleId: cmd.saleId,
            kind: 'credit',
            deltaCents: cmd.amountCents,
          },
          tx,
        );
        // F-PV-2 a — junction, read IN the tx: an empty (or new) balance takes the new validity; a balance
        // with something left keeps the LONGER one, where null (no limit) beats any date.
        const prior = await this.repo.findBalance(scope, cmd.customerId, cmd.packageId, tx);
        const expiresOn = this.joinValidity(prior, purchaseLastDay);
        await this.repo.upsertCredit(
          scope,
          cmd.customerId,
          cmd.packageId,
          cmd.amountCents,
          expiresAtToDb(expiresOn),
          tx,
        );
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) return; // concurrent credit already applied
      throw error;
    }
  }

  /**
   * Draws balance down for a Package Balance consumption. Idempotent per saleId. Throws
   * ValidationError (insufficient) if the balance cannot cover the amount — in which case
   * the transaction rolls back and no movement is recorded. Does NOT check the validity (item 5).
   */
  public async debitForConsumption(
    scope: AccountingScope,
    cmd: PackageMovementCommand,
  ): Promise<void> {
    if (!this.policy.canMutate(scope)) {
      throw new ForbiddenError('Sem permissão para debitar saldo de pacote.');
    }
    this.assertAmount(cmd.amountCents);

    const existing = await this.repo.findMovement(scope, cmd.saleId, 'debit');
    if (existing) return;

    try {
      await this.repo.runTransaction(async (tx) => {
        await this.repo.createMovement(
          {
            userId: scope.ownerUserId,
            unitId: scope.unitId,
            customerId: cmd.customerId,
            packageId: cmd.packageId,
            saleId: cmd.saleId,
            kind: 'debit',
            deltaCents: cmd.amountCents,
          },
          tx,
        );
        const applied = await this.repo.tryDecrement(
          scope,
          cmd.customerId,
          cmd.packageId,
          cmd.amountCents,
          tx,
        );
        if (!applied) {
          throw new ValidationError(
            `Saldo de pacote insuficiente para consumo (cliente ${cmd.customerId}, pacote ${cmd.packageId}).`,
          );
        }
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) return; // concurrent debit already applied
      throw error; // insufficient-balance ValidationError propagates (tx rolled back)
    }
  }

  /**
   * Item 6 — releases the whole remaining balance of an expired customer × package, in ONE tx: re-reads
   * the balance, checks it is due (grace of item 8, `today ≥ expiresOn + 2`), appends the `expiry`
   * movement (it FIXES the amount) and decrements with the existing conditional `tryDecrement`.
   * The journal entry comes AFTER, re-drivable (item 11) — 2 commits, as the credit/debit today.
   * Not due, nothing left or no validity → null. A duplicate (P2002) → null: a concurrent expiry won the race
   * and already drove the balance to 0 (the read and the decrement share the tx).
   *
   * Review #483, achado 3: a balance that ALREADY expired on this same `expiresOn` can hold value again (a
   * credit re-driven late, or a re-purchase dated back, lands on an empty balance and takes the same last valid
   * day). That is a NEW expiry; the base key `expiry:<balanceId>:<expiresOn>` is taken, so the key gets the
   * next free suffix (`…:2`, `…:3`) — read IN the tx. Before, the P2002 was swallowed as "already expired" and
   * the balance stayed > 0, overdue, with no pending row.
   */
  public async expireDue(
    scope: AccountingScope,
    balanceId: string,
    today: string,
  ): Promise<ExpireDueResult | null> {
    if (!this.policy.canMutate(scope)) {
      throw new ForbiddenError('Sem permissão para vencer saldo de pacote.');
    }
    try {
      return await this.repo.runTransaction(async (tx) => {
        const balance = await this.repo.findBalanceById(scope, balanceId, tx);
        if (!balance) return null;
        const expiresOn = expiresOnFromDb(balance.expiresAt);
        if (expiresOn == null || !isDueForExpiry(expiresOn, today)) return null;
        const amountCents = centsFromDb(balance.balanceCents);
        if (amountCents <= 0) return null;
        const movementKey = await this.freeExpiryKey(scope, balance.id, expiresOn, tx);
        await this.repo.createMovement(
          {
            userId: scope.ownerUserId,
            unitId: scope.unitId,
            customerId: balance.customerId,
            packageId: balance.packageId,
            saleId: movementKey,
            kind: 'expiry',
            deltaCents: amountCents,
          },
          tx,
        );
        const applied = await this.repo.tryDecrement(scope, balance.customerId, balance.packageId, amountCents, tx);
        if (!applied) {
          // Unreachable while the read and the decrement share the tx; loud if a future change breaks that.
          throw new Error(`expireDue: decremento condicional recusado no saldo ${balance.id}.`);
        }
        return { movementKey, amountCents, expiresOn };
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) return null;
      throw error;
    }
  }

  /**
   * The key the NEXT expiry of this balance on `expiresOn` would take (review #483, achado 3) — the job uses it as
   * the pending-row identity while a guard blocks, so a 2nd expiry never shares the row of the 1st (already done).
   */
  public async nextExpiryMovementKey(scope: AccountingScope, balanceId: string, expiresOn: string): Promise<string> {
    if (!this.policy.canRead(scope)) {
      throw new ForbiddenError('Sem permissão para ler saldo de pacote.');
    }
    return this.freeExpiryKey(scope, balanceId, expiresOn);
  }

  private async freeExpiryKey(
    scope: AccountingScope,
    balanceId: string,
    expiresOn: string,
    tx?: Prisma.TransactionClient,
  ): Promise<string> {
    let occurrence = 1;
    while (await this.repo.findMovement(scope, expiryMovementKey(balanceId, expiresOn, occurrence), 'expiry', tx)) {
      occurrence++;
    }
    return expiryMovementKey(balanceId, expiresOn, occurrence);
  }

  /**
   * Read-only context of one expiry (BE-INCR-PACOTE-VALIDADE §5.2 item 14a / F-PV-9d a): who, how much and
   * the anchor sale of the expiry NFS-e — the newest origin credit of the balance THAT EXISTED WHEN IT EXPIRED.
   * Review #483, achado 1: a re-purchase after the expiry (note still pending, emitted later) must never become
   * the anchor — the expired value came from the earlier credits. Null when the movement does not exist. Used by
   * the fiscal emission (and its reenvio), which never touches the subledger itself.
   */
  public async getExpiryContext(
    scope: AccountingScope,
    movementKey: string,
  ): Promise<{ customerId: string; packageId: string; releasedCents: number; originSaleId: string | null } | null> {
    if (!this.policy.canRead(scope)) {
      throw new ForbiddenError('Sem permissão para ler saldo de pacote.');
    }
    const movement = await this.repo.findMovement(scope, movementKey, 'expiry');
    if (!movement) return null;
    const credits = await this.repo.listCreditMovements(scope, movement.customerId, movement.packageId);
    const before = credits.find((c) => c.createdAt.getTime() <= movement.createdAt.getTime()); // newest first
    return {
      customerId: movement.customerId,
      packageId: movement.packageId,
      releasedCents: centsFromDb(movement.deltaCents),
      originSaleId: before?.saleId ?? null,
    };
  }

  /**
   * Pre-write check for the consumption path (fast user feedback before the sale is marked Paid).
   * Refuses an expired balance (item 4, from `expiresOn + 1` in the scope's day) and an insufficient one.
   * The authoritative sufficiency guard is still the atomic debit.
   */
  public async assertSufficient(
    scope: AccountingScope,
    customerId: string,
    packageId: string,
    amountCents: number,
  ): Promise<void> {
    if (!this.policy.canRead(scope)) {
      throw new ForbiddenError('Sem permissão para ler saldo de pacote.');
    }
    this.assertAmount(amountCents);
    const balance = await this.repo.findBalance(scope, customerId, packageId);
    const expiresOn = expiresOnFromDb(balance?.expiresAt ?? null);
    if (isExpiredForConsumption(expiresOn, scopeToday(scope))) {
      throw new PackageBalanceExpiredError(expiresOn!);
    }
    const current = centsFromDb(balance?.balanceCents ?? 0n);
    if (current < amountCents) {
      throw new ValidationError(
        `Saldo de pacote insuficiente: disponível ${current}, requerido ${amountCents} (cliente ${customerId}, pacote ${packageId}).`,
      );
    }
  }

  /** Current balance in cents for a customer × package (0 when no row exists). */
  public async getBalanceCents(
    scope: AccountingScope,
    customerId: string,
    packageId: string,
  ): Promise<number> {
    if (!this.policy.canRead(scope)) {
      throw new ForbiddenError('Sem permissão para ler saldo de pacote.');
    }
    const balance = await this.repo.findBalance(scope, customerId, packageId);
    return centsFromDb(balance?.balanceCents ?? 0n);
  }

  /**
   * Lists balances under the scope, optionally filtered to one customer and/or to the ones whose
   * validity ends on or before `expiresOnOrBefore` ('YYYY-MM-DD', F-PV-11 a).
   */
  public async listBalances(
    scope: AccountingScope,
    filter: { customerId?: string; expiresOnOrBefore?: string } = {},
  ): Promise<CustomerPackageBalance[]> {
    if (!this.policy.canRead(scope)) {
      throw new ForbiddenError('Sem permissão para ler saldo de pacote.');
    }
    return this.repo.listBalances(scope, {
      customerId: filter.customerId,
      expiresOnOrBefore: expiresAtToDb(filter.expiresOnOrBefore ?? null) ?? undefined,
    });
  }

  /** F-PV-2 a: balance 0 / new row → the purchase's validity; balance > 0 → the longer one (null wins). */
  private joinValidity(prior: CustomerPackageBalance | null, purchaseLastDay: string | null): string | null {
    if (!prior || centsFromDb(prior.balanceCents) <= 0) return purchaseLastDay;
    const current = expiresOnFromDb(prior.expiresAt);
    if (current == null || purchaseLastDay == null) return null;
    return current > purchaseLastDay ? current : purchaseLastDay; // 'YYYY-MM-DD' compares lexically
  }

  /** Money boundary: cents must be a positive, safe integer — never a float. */
  private assertAmount(amountCents: number): void {
    if (typeof amountCents !== 'number' || !Number.isFinite(amountCents)) {
      throw new ValidationError('Valor de saldo inválido (não-numérico).');
    }
    if (!Number.isInteger(amountCents) || !Number.isSafeInteger(amountCents)) {
      throw new ValidationError('Valor de saldo deve ser um inteiro de centavos seguro.');
    }
    if (amountCents <= 0) {
      throw new ValidationError('Valor de saldo deve ser maior que zero.');
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
