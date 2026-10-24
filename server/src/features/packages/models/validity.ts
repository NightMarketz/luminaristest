import { dateOnlyFromDayNumber, dayNumberFromDateOnly, isValidDateOnly } from '../../accounting/models/dates';
import { linhasVigentesDaTabela, type LinhaLegal } from '../../legalParameters/models/legalParameter';

/**
 * BE-INCR-PACOTE-VALIDADE (BRIEF §3 itens 1 e 8) — regra do prazo, pura. Datas são dia-calendário
 * `YYYY-MM-DD`, somadas no número de dia UTC (nunca em `Date` local — memória date-only-rendering-utc-shift).
 *
 * Contagem (F-PV-1 a): último dia válido = data da venda + N dias corridos (venda 01/03, N=30 → usa até
 * 31/03), CC art. 132 caput. Se esse dia cair em feriado, o prazo é prorrogado até o dia útil seguinte (CC art. 132
 * § 1º; F-JUR-6, D-2026-10-04-PACOTE-VALIDADE-TRIAGEM-JURIDICO: a cláusula "dias corridos" não afasta o § 1º). O § 1º
 * não distingue a esfera: feriado nacional, estadual e municipal (Lei 9.093/1995 arts. 1º e 2º) — F-E4-1 (a), dono,
 * questionário, 2026-10-12; executa: dono, chat, 2026-10-17 (dossiê verif-2026-10-17-lgpd-cdc-obrigacoes §1, DIVERGE 2).
 */

/**
 * Feriados nacionais fixos (MM-DD), transcritos do Planalto em 04/10/2026: Lei 662/1949 art. 1º (redação da Lei
 * 10.607/2002), Lei 6.802/1980 art. 1º (12/10) e Lei 14.759/2023 art. 1º (20/11, vale de 2024 em diante). Sexta-feira
 * da Paixão é feriado religioso declarado em lei MUNICIPAL (Lei 9.093/1995 art. 2º) → fora.
 *
 * BE-INCR-LEGAL-PARAMS PR-2 (item 26; emenda §9 L-9): a lista mora na tabela de plataforma `FERIADO_NACIONAL` (chave
 * MM-DD, fonte e vigência por linha — o 20/11 desde 2024). O serviço monta a fotografia e a passa aqui (F-LP-4 a);
 * feriado novo por lei = linha nova. Os domingos de eleição são REGRA (data móvel), não lista — ficam em código.
 */
export type Feriados = readonly LinhaLegal[];

/** Domingo = 0 (Date.getUTCDay). */
export function weekdayOf(dayNumber: number): number {
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

/** Só a esfera nacional: lista `FERIADO_NACIONAL` + domingos de eleição. */
export function isNationalHoliday(dateOnly: string, feriados: Feriados): boolean {
  const mmdd = dateOnly.slice(5);
  if (linhasVigentesDaTabela(feriados, 'FERIADO_NACIONAL', dateOnly).some((l) => l.chave === mmdd)) return true;
  return isElectionSunday(dayNumberFromDateOnly(dateOnly), dateOnly);
}

/** Domingo de Páscoa (computus gregoriano anônimo, Meeus/Jones/Butcher) — base das datas móveis `PASCOA±N`. */
export function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** `PASCOA±N` → a data do ano de `dateOnly` (Sexta-feira da Paixão = PASCOA-2; Corpus Christi = PASCOA+60). */
function movelDoAno(chave: string, year: number): string | null {
  const m = /^PASCOA([+-]\d{1,3})$/.exec(chave);
  if (!m) return null;
  return dateOnlyFromDayNumber(dayNumberFromDateOnly(easterSunday(year)) + parseInt(m[1], 10));
}

/**
 * F-E4-1 (a): linha `FERIADO_LOCAL` da UF (discriminador = 2 primeiros dígitos do IBGE do município) ou do próprio
 * município (IBGE de 7 dígitos). Data fixa `MM-DD` ou móvel `PASCOA±N` — a Páscoa é REGRA (computus), não lista.
 */
export function isLocalHoliday(dateOnly: string, feriados: Feriados, codMun: string): boolean {
  const uf = codMun.slice(0, 2);
  const year = parseInt(dateOnly.slice(0, 4), 10);
  return linhasVigentesDaTabela(feriados, 'FERIADO_LOCAL', dateOnly).some(
    (l) => (l.discriminador === uf || l.discriminador === codMun) &&
      (l.valorTexto === 'PASCOA' ? movelDoAno(l.chave, year) === dateOnly : l.chave === dateOnly.slice(5)),
  );
}

/**
 * Feriado em qualquer esfera para a unidade. `codMun` = IBGE do município da unidade (`FiscalProfile.codMun`); `null` =
 * município desconhecido → só o nacional (o comportamento anterior ao F-E4-1).
 */
export function isHoliday(dateOnly: string, feriados: Feriados, codMun: string | null): boolean {
  return isNationalHoliday(dateOnly, feriados) || (codMun != null && isLocalHoliday(dateOnly, feriados, codMun));
}

/** `null`/`0` = sem validade (o preset aceita 0). `N ≥ 1` → `saleDate + N`, prorrogado se cair em feriado. */
export function lastValidDay(saleDate: string, validityDays: number | null, feriados: Feriados, codMun: string | null = null): string | null {
  if (validityDays == null || validityDays === 0) return null;
  if (!Number.isInteger(validityDays) || validityDays < 0) {
    throw new Error(`validityDays inválido: ${validityDays}`);
  }
  if (!isValidDateOnly(saleDate)) throw new Error(`data inválida: '${saleDate}'`);
  let day = dayNumberFromDateOnly(saleDate) + validityDays;
  if (!isHoliday(dateOnlyFromDayNumber(day), feriados, codMun)) return dateOnlyFromDayNumber(day);
  // CC 132 § 1º: "seguinte dia útil" = o próximo que não é feriado (nacional, estadual ou municipal) nem domingo
  // (premissa da nota D-2026-10-04 §Delta D2; sábado conta como útil — o dossiê de 17/10 §4.2 deixa o sábado ao dono).
  do day++;
  while (isHoliday(dateOnlyFromDayNumber(day), feriados, codMun) || weekdayOf(day) === 0);
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

/**
 * KIT-SETOR PR-5 (item 44): competência e chave do movimento `expiry` são puras e só de data — moradas no núcleo
 * (`accounting/models/expiryKey`), que o `FiscalDocumentEmissionService` consome sem importar `packages`.
 */
export { expiryCompetence, expiryMovementKey, parseExpiryMovementKey } from '../../accounting/models/expiryKey';
