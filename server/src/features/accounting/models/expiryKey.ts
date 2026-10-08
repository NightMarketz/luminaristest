import { dateOnlyFromDayNumber, dayNumberFromDateOnly, isValidDateOnly } from './dates';

/**
 * BE-INCR-PACOTE-VALIDADE (BRIEF §3 itens 6 e F-PV-5) — competência e chave do movimento `expiry` do saldo de pacote.
 * Movidas de `packages/models/validity` no KIT-SETOR PR-5 (item 44): são puras e só de data, então moram no núcleo e
 * `packages` as re-exporta. Corpo inalterado.
 */

/** Competência do lançamento (F-PV-5 a): o direito acaba às 00:00 de `expiresOn + 1`. */
export function expiryCompetence(expiresOn: string): string {
  return dateOnlyFromDayNumber(dayNumberFromDateOnly(expiresOn) + 1);
}

/**
 * Chave do movimento `expiry` (item 6) — gravada em `PackageBalanceMovement.saleId`; é o `sourceId` do evento.
 * A 1ª ocorrência é a forma do BRIEF (`expiry:<balanceId>:<expiresOn>`); um 2º vencimento do MESMO saldo na
 * MESMA data (review #483, achado 3) ganha sufixo `:2`, `:3`…
 */
export function expiryMovementKey(balanceId: string, expiresOn: string, occurrence = 1): string {
  return occurrence <= 1 ? `expiry:${balanceId}:${expiresOn}` : `expiry:${balanceId}:${expiresOn}:${occurrence}`;
}

/** Inverso de `expiryMovementKey` (re-drive/rescan). `null` se a chave não tem a forma. */
export function parseExpiryMovementKey(key: string): { balanceId: string; expiresOn: string; occurrence: number } | null {
  const m = /^expiry:([^:]+):(\d{4}-\d{2}-\d{2})(?::([2-9]|[1-9]\d+))?$/.exec(key);
  return m && isValidDateOnly(m[2]) ? { balanceId: m[1], expiresOn: m[2], occurrence: m[3] ? Number(m[3]) : 1 } : null;
}
