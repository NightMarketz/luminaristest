/**
 * packageValidityBackfill — BE-INCR-PACOTE-VALIDADE §5.2 item 2a (F-PV-3 b + 3b a + 3c b + 3d + 3e a).
 *
 * Gives a validity to the prepaid balances sold BEFORE the deploy of the increment. Runs ONCE PER BOOT, inside
 * the `app.listen()` callback next to the schedulers (JOB-003) — the owner chose the boot over a CLI (3c b,
 * against the recommendation). It is NOT a data migration: the S6 smoke-gate rejects backfills by design
 * (memória `smoke-gate-s6-x-migracao-de-dado`).
 *
 * Execution mark (3e a): the `JobWatermark` row `package-validity-backfill`. The 1st run writes `watermarkAt` = the
 * instant of that run (the "deploy"); later runs read it and never move it. Target: live balances with
 * `expiresAt null` and something left, whose package has `validityDays ≥ 1` in the catalog TODAY, AND whose
 * NEWEST credit is older than the mark — a balance sold after the mark already got its validity copied at credit
 * time (F-PV-1 a) and is never touched. Value (3b a): `expiresAt = lastValidDay(today, N)` — counted from the
 * backfill, so no legacy balance expires in the first pass.
 *
 * Idempotent: the `expiresAt null` filter (and the conditional write) exclude what was already filled.
 *
 * ⚠ Trava do PE-6 (3d): o incremento só vai a produção depois do parecer do jurídico. NÃO há flag aqui: o job
 * roda no 1º boot de qualquer ambiente onde o código estiver; a trava é do deploy, não do código.
 */

import { logger } from '../lib/logger';
import { resolveAccountingScope } from '../features/accounting/scope/AccountingScope';
import type { AccountingScope } from '../features/accounting/scope/AccountingScope';
import { scopeToday } from '../features/accounting/models/dates';
import { loadPackageValidityDays } from '../features/accounting/sync/bridges/saleItems';
import { PackageBalanceRepository } from '../features/packages/repositories/PackageBalanceRepository';
import { expiresAtToDb, lastValidDay } from '../features/packages/models/validity';
import { JobWatermarkRepository } from './JobWatermarkRepository';

export const PACKAGE_VALIDITY_BACKFILL_JOB = 'package-validity-backfill';

export interface BackfillCandidate {
  ownerUserId: string;
  unitId: string;
  balanceId: string;
  customerId: string;
  packageId: string;
}

export interface PackageValidityBackfillDeps {
  getMark: () => Promise<Date | null>;
  setMark: (at: Date) => Promise<void>;
  now: () => Date;
  listCandidates: () => Promise<BackfillCandidate[]>;
  /** createdAt of the newest `credit` movement of the balance, or null when it has none. */
  newestCreditAt: (scope: AccountingScope, customerId: string, packageId: string) => Promise<Date | null>;
  loadValidityDays: (ownerUserId: string, packageId: string) => Promise<number | null>;
  today: (scope: AccountingScope) => string;
  setExpiresAtIfNull: (scope: AccountingScope, balanceId: string, expiresAt: Date) => Promise<boolean>;
}

export async function runPackageValidityBackfill(
  deps: PackageValidityBackfillDeps,
): Promise<{ mark: Date; updated: number; skipped: number; failed: number }> {
  // The mark is written FIRST: a credit that lands while this run is in flight is already after it.
  let mark = await deps.getMark();
  if (!mark) {
    mark = deps.now();
    await deps.setMark(mark);
  }

  let updated = 0;
  let skipped = 0;
  let failed = 0;
  for (const c of await deps.listCandidates()) {
    try {
      const scope = resolveAccountingScope({ userId: c.ownerUserId }, c.unitId);
      const newest = await deps.newestCreditAt(scope, c.customerId, c.packageId);
      if (!newest || newest.getTime() >= mark.getTime()) {
        skipped++; // sold after the deploy (3e a) — its validity, if any, came with the credit
        continue;
      }
      const validityDays = await deps.loadValidityDays(c.ownerUserId, c.packageId);
      const expiresOn = lastValidDay(deps.today(scope), validityDays);
      if (!expiresOn) {
        skipped++; // package without validity today — stays without (it may get one on a later boot)
        continue;
      }
      if (await deps.setExpiresAtIfNull(scope, c.balanceId, expiresAtToDb(expiresOn)!)) updated++;
      else skipped++;
    } catch (error) {
      failed++;
      logger.error('Package validity backfill failed for one balance — continuing', {
        balanceId: c.balanceId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.info('Package validity backfill complete', { mark: mark.toISOString(), updated, skipped, failed });
  return { mark, updated, skipped, failed };
}

/** Production wiring (thin): the boot calls this once, inside the `app.listen()` callback. */
export async function runPackageValidityBackfillOnBoot(): Promise<void> {
  const marks = new JobWatermarkRepository();
  const repo = new PackageBalanceRepository();
  await runPackageValidityBackfill({
    getMark: () => marks.get(PACKAGE_VALIDITY_BACKFILL_JOB),
    setMark: (at) => marks.set(PACKAGE_VALIDITY_BACKFILL_JOB, at),
    now: () => new Date(),
    listCandidates: async () =>
      (await repo.listBackfillCandidates()).map((b) => ({
        ownerUserId: b.userId,
        unitId: b.unitId,
        balanceId: b.id,
        customerId: b.customerId,
        packageId: b.packageId,
      })),
    newestCreditAt: async (scope, customerId, packageId) =>
      (await repo.listCreditMovements(scope, customerId, packageId))[0]?.createdAt ?? null,
    loadValidityDays: loadPackageValidityDays,
    today: (scope) => scopeToday(scope),
    setExpiresAtIfNull: (scope, balanceId, expiresAt) => repo.setExpiresAtIfNull(scope, balanceId, expiresAt),
  });
}
