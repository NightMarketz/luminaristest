/**
 * Shared money limits for the accounting ledger (integer cents).
 *
 * MAX_CENTS was the PERSISTENCE ceiling before BE-INCR-MONEY-BIGINT (F2/F-W2B-1): every
 * `*Cents` column was Prisma `Int` (signed 32-bit), so a single leg above this was rejected by
 * the DB at write time with an opaque `POST_FAILED` at commit (ACC-INCR6-J-001, confirmed live
 * against SQLite in `PostingRepository.moneyOverflow.test.ts`).
 *
 * Post-migration (all 13 `*Cents` columns are `BigInt` — schema has no 32-bit width left),
 * MAX_CENTS is a POLICY ceiling only (F-W2B-2a): the persistence layer can hold far more, but
 * the choke-point guard (`PostingService.assertCentsAndBalance`, Council 1.5/ACC-014) still
 * rejects any leg above this value UP FRONT, so the value keeps meaning business-wise even
 * though the database would happily accept more. Both write surfaces keep guarding against it:
 *   - the import validators (`dataExchangeValidators`) — ACC-INCR6-J-001;
 *   - the direct `/post` DTO (`PostingDto`) — ACC-HARDEN-POST-CENTS-001.
 *
 * Raising or removing this ceiling is a product decision (fork F-W2B-2, options b/c), not an
 * engineering one — kept at the pre-migration value until the dono decides otherwise.
 */
export const MAX_CENTS = 2_147_483_647;

/**
 * BigInt → number bridge for the `*Cents` columns at the read boundary (F-W2B-3).
 *
 * Every `*Cents` column is persisted as `BigInt` (SQLite/Prisma read boundary), but everything
 * above the repository/service read boundary — 9 `groupBy`/`_sum` call sites, `res.json()` at
 * every controller, 6 `my-app` components + `accounting.service.ts` — expects `number` (`res.json`
 * itself throws `TypeError: Do not know how to serialize a BigInt` on a raw bigint). This
 * DELIBERATELY diverges from the `AuditEvent.seq`/`nextSeq` precedent (bigint → STRING, see
 * `auditCanonical.ts`): a sequence counter grows forever with no realistic ceiling, while a cents
 * value has a real-world business ceiling many orders of magnitude below `Number.MAX_SAFE_INTEGER`
 * (2^53-1 cents ≈ R$ 90 trillion on a single value). Converting to `number` here avoids touching
 * every FE consumer's type; the guard below is what keeps that safe: it throws LOUD instead of
 * silently truncating if a value ever does exceed the safe-integer range.
 */
export function centsFromDb(value: bigint): number {
  const asNumber = Number(value);
  if (!Number.isSafeInteger(asNumber)) {
    throw new Error(
      `cents value ${value.toString()} exceeds Number.MAX_SAFE_INTEGER at the BigInt->number read boundary (F-W2B-3)`,
    );
  }
  return asNumber;
}

/** Nullable variant of {@link centsFromDb} — several `*Cents` columns are optional (e.g. `BankStatement.openingBalanceCents`). */
export function centsFromDbNullable(value: bigint | null | undefined): number | null {
  return value == null ? null : centsFromDb(value);
}
