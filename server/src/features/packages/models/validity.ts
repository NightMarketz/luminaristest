import { dateOnlyFromDayNumber, dayNumberFromDateOnly, isValidDateOnly } from '../../accounting/models/dates';

/**
 * BE-INCR-PACOTE-VALIDADE (BRIEF §3 itens 1 e 8) — regra do prazo, pura. Datas são dia-calendário
 * `YYYY-MM-DD`, somadas no número de dia UTC (nunca em `Date` local — memória date-only-rendering-utc-shift).
 *
 * Contagem (F-PV-1 a): último dia válido = data da venda + N dias corridos (venda 01/03, N=30 → usa até
 * 31/03), CC art. 132 caput. Se esse dia cair em feriado nacional, o prazo é prorrogado até o dia útil
 * seguinte (CC art. 132 § 1º; F-JUR-6, D-2026-10-04-PACOTE-VALIDADE-TRIAGEM-JURIDICO: a cláusula "dias
 * corridos" não afasta o § 1º).
 */

/**
 * Feriados nacionais fixos (MM-DD), transcritos do Planalto em 04/10/2026:
 * Lei 662/1949 art. 1º (redação da Lei 10.607/2002), Lei 6.802/1980 art. 1º (12/10) e
 * Lei 14.759/2023 art. 1º (20/11, publicada em 22/12/2023 → vale de 2024 em diante).
 * Sexta-feira da Paixão é feriado religioso declarado em lei MUNICIPAL (Lei 9.093/1995 art. 2º) → fora.
 */
const FIXED_NATIONAL_HOLIDAYS = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '12-25'];
const ZUMBI_FROM_YEAR = 2024;

/** Domingo = 0 (Date.getUTCDay). */
function weekdayOf(dayNumber: number): number {
  return new Date(dayNumber * 86_400_000).getUTCDay();
}

/**
 * Domingos de eleição de data fixada pela CF (Código Eleitoral art. 380; CF arts. 28, 29 e 77): 1º e último
 * domingo de outubro, anos pares. Os DOIS turnos entram (dono, 04/10, contra a recomendação): o 2º turno
 * prorroga mesmo onde não houve 2º turno — sempre a favor do cliente.
 */
function isElectionSunday(dayNumber: number, dateOnly: string): boolean {
  const [y, m, d] = dateOnly.split('-').map((n) => parseInt(n, 10));
  if (y % 2 !== 0 || m !== 10 || weekdayOf(dayNumber) !== 0) return false;
  return d <= 7 || d >= 25; // 1º domingo cai em 1..7; último em 25..31
}

/**
 * ponytail: só feriado NACIONAL. Estaduais e municipais (inclusive Sexta-feira da Paixão e Corpus Christi)
 * ficam fora; o upgrade é um calendário por unidade (F-JUR-6, opção recusada).
 */
export function isNationalHoliday(dateOnly: string): boolean {
  const mmdd = dateOnly.slice(5);
  if (FIXED_NATIONAL_HOLIDAYS.includes(mmdd)) return true;
  if (mmdd === '11-20' && parseInt(dateOnly.slice(0, 4), 10) >= ZUMBI_FROM_YEAR) return true;
  return isElectionSunday(dayNumberFromDateOnly(dateOnly), dateOnly);
}

/** `null`/`0` = sem validade (o preset aceita 0). `N ≥ 1` → `saleDate + N`, prorrogado se cair em feriado. */
export function lastValidDay(saleDate: string, validityDays: number | null): string | null {
  if (validityDays == null || validityDays === 0) return null;
  if (!Number.isInteger(validityDays) || validityDays < 0) {
    throw new Error(`validityDays inválido: ${validityDays}`);
  }
  if (!isValidDateOnly(saleDate)) throw new Error(`data inválida: '${saleDate}'`);
  let day = dayNumberFromDateOnly(saleDate) + validityDays;
  if (!isNationalHoliday(dateOnlyFromDayNumber(day))) return dateOnlyFromDayNumber(day);
  // CC 132 § 1º: "seguinte dia útil" = o próximo que não é feriado nacional nem domingo (premissa da nota
  // D-2026-10-04 §Delta D2; sábado conta como útil).
  do day++;
  while (isNationalHoliday(dateOnlyFromDayNumber(day)) || weekdayOf(day) === 0);
  return dateOnlyFromDayNumber(day);
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
