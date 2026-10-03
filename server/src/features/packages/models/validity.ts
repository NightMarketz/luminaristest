import { dateOnlyFromDayNumber, dayNumberFromDateOnly, isValidDateOnly } from '../../accounting/models/dates';

/**
 * BE-INCR-PACOTE-VALIDADE (BRIEF §3 itens 1 e 8) — regra do prazo, pura. Datas são dia-calendário
 * `YYYY-MM-DD`, somadas no número de dia UTC (nunca em `Date` local — memória date-only-rendering-utc-shift).
 *
 * Contagem (F-PV-1 a): último dia válido = data da venda + N dias corridos (venda 01/03, N=30 → usa até
 * 31/03), CC art. 132 caput. Feriado NÃO empurra o vencimento: a cláusula "dias corridos" afasta o § 1º
 * até o PE-6 (jurídico) dizer o contrário.
 */

/** `null`/`0` = sem validade (o preset aceita 0). `N ≥ 1` → `saleDate + N`. */
export function lastValidDay(saleDate: string, validityDays: number | null): string | null {
  if (validityDays == null || validityDays === 0) return null;
  if (!Number.isInteger(validityDays) || validityDays < 0) {
    throw new Error(`validityDays inválido: ${validityDays}`);
  }
  if (!isValidDateOnly(saleDate)) throw new Error(`data inválida: '${saleDate}'`);
  return dateOnlyFromDayNumber(dayNumberFromDateOnly(saleDate) + validityDays);
}

/** Pré-check de consumo (item 4): recusa a partir de `expiresOn + 1`. */
export function isExpiredForConsumption(expiresOn: string | null, today: string): boolean {
  if (expiresOn == null) return false;
  return dayNumberFromDateOnly(today) > dayNumberFromDateOnly(expiresOn);
}

/**
 * Carência do job (item 8): vence só a partir de `expiresOn + 2`. Um consumo cujo pré-check passou em
 * `expiresOn` já commitou o Paid (mesma requisição HTTP) antes de o job poder agir.
 */
export function isDueForExpiry(expiresOn: string | null, today: string): boolean {
  if (expiresOn == null) return false;
  return dayNumberFromDateOnly(today) >= dayNumberFromDateOnly(expiresOn) + 2;
}

/** `expiresAt` é date-only gravado em meia-noite UTC (P15) — volta a `YYYY-MM-DD` por componente. */
export function expiresOnFromDb(expiresAt: Date | null): string | null {
  return expiresAt ? expiresAt.toISOString().slice(0, 10) : null;
}

/** Inverso: `YYYY-MM-DD` → `Date` meia-noite UTC (convenção date-only do schema). */
export function expiresAtToDb(expiresOn: string | null): Date | null {
  return expiresOn ? new Date(`${expiresOn}T00:00:00.000Z`) : null;
}

/** Competência do lançamento (F-PV-5 a): o direito acaba às 00:00 de `expiresOn + 1`. */
export function expiryCompetence(expiresOn: string): string {
  return dateOnlyFromDayNumber(dayNumberFromDateOnly(expiresOn) + 1);
}

/** Chave do movimento `expiry` (item 6) — gravada em `PackageBalanceMovement.saleId`; é o `sourceId` do evento. */
export function expiryMovementKey(balanceId: string, expiresOn: string): string {
  return `expiry:${balanceId}:${expiresOn}`;
}

/** Inverso de `expiryMovementKey` (re-drive/rescan). `null` se a chave não tem a forma. */
export function parseExpiryMovementKey(key: string): { balanceId: string; expiresOn: string } | null {
  const m = /^expiry:(.+):(\d{4}-\d{2}-\d{2})$/.exec(key);
  return m && isValidDateOnly(m[2]) ? { balanceId: m[1], expiresOn: m[2] } : null;
}
