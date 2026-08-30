/**
 * Counterparty domain constants (Contraparte fornecedor/cliente — INCR-COUNTERPARTY / A1). Small
 * const/helper file in the style of `Payable.model.ts` / `Dimension.model.ts`: the Prisma row type
 * (`Counterparty`) comes from `generated/prisma`; this file owns the enum-like union (SUPPLIER/
 * CUSTOMER), the audit event keys, and the rename-on-delete helper for the business key.
 *
 * A counterparty is a first-class catalog identity (F-CP1 → A1): the AP/AR subledger points at it by
 * FK (`counterpartyId`, nullable this increment) so aging/posição por contraparte groups by a STABLE,
 * integral key instead of the display-name snapshot. It carries NO money and NO dates of its own.
 */

/** The counterparty kind. A supplier is the AP side; a customer is the AR side. */
export const COUNTERPARTY_TYPES = ['SUPPLIER', 'CUSTOMER'] as const;
export type CounterpartyType = (typeof COUNTERPARTY_TYPES)[number];

/**
 * Comprimento máximo de `name`. Mora aqui, e não só no `CounterpartyDto`, porque o catálogo tem DOIS
 * caminhos de escrita: a rota HTTP (validada pelo DTO) e a cunhagem implícita da criação de AP/AR
 * (SEC-A1-5), que recebe `supplierName`/`customerName` — campos SEM `.max` próprio. Um número
 * repetido nos dois lugares divergiria no primeiro ajuste; o DTO importa desta constante.
 */
export const COUNTERPARTY_NAME_MAX_LENGTH = 200;

/**
 * Audit event keys for catalog management (T8 — every state change is auditable). Creating and
 * archiving a counterparty are the only catalog mutations; the AP/AR link is written inside the
 * payable/receivable create flow (their own audit events already carry the counterpartyId).
 */
export const COUNTERPARTY_CREATED = 'counterparty.created';
export const COUNTERPARTY_ARCHIVED = 'counterparty.archived';

/**
 * Rename-on-delete transform for the DISPLAY name (SEC-A1-4). `name` is no longer the business key
 * (BRIEF-W2-A moved that to `nameNormalized`, comp. 1) but is still mangled on archive for consistency
 * with the historical convention and so a UI reading raw `name` never shows a bare original value for
 * an archived row. The AP/AR rows keep their OWN name snapshot (supplierName/customerName), so the
 * mangled name never leaks into a subledger read.
 */
export function deletedCounterpartyName(id: string, name: string): string {
  return `deleted:${id}:${name}`;
}

/**
 * Normalization contract for the business key (F1(b), BRIEF-W2-A comp. 2): trim + case-fold + collapse
 * of internal whitespace runs to a single space. NO accent-folding this phase (fork F-W2A-3 ratified
 * 2026-08-30 — "Café" and "Cafe" stay distinct identities; expanding to Unicode diacritic-stripping is
 * a decision the ratified scope does not cover, tracked as a future increment, not implemented here).
 * Pure and testable in isolation — the SAME function runs at every write choke-point (create, implicit
 * mint, migration backfill) so the business key never drifts between callers.
 */
export function normalizeCounterpartyName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * `taxId` normalization (BRIEF-W2-A comp. 3): digit-only, same pattern as `isValidCpf`/`isValidCnpj`
 * (`dynamicTables/utils/ValidationUtils.ts`) — BESPOKE LOCAL, not a cross-module import (that utility
 * lives on the DynamicTable side of the platform boundary; `Counterparty` is Prisma first-class and
 * owns its own normalization). NO checksum and NO fixed `.length` (11 or 14) validation this phase —
 * `taxId` is an informational discriminator, OUTSIDE the `@@unique` key (fork F-W2A-4).
 */
export function normalizeTaxId(taxId: string): string {
  return taxId.replace(/\D/g, '');
}

/**
 * Rename-on-delete transform for `nameNormalized` — the mangling `deletedCounterpartyName` applies to
 * `name` MUST be mirrored here (BRIEF-W2-A comp. 4), or the rename-on-delete frees the OLD key (`name`)
 * but leaves `nameNormalized` — the column the `@@unique` actually constrains since this BRIEF — still
 * occupied by the live value, and an archive+recreate of the same name trips P2002 all over again
 * (memória unique-de-idempotencia-x-soft-delete, SEC-A1-4). Takes the counterparty's OWN CURRENT
 * `nameNormalized` (not a re-derivation from the mangled `name`) so the tombstone's normalized value
 * carries the same `deleted:<id>:` prefix + already-folded original — consistent with
 * `deletedCounterpartyName` mangling the display name, not a fresh normalization of it.
 */
export function deletedCounterpartyNameNormalized(id: string, nameNormalized: string): string {
  return `deleted:${id}:${nameNormalized}`;
}
