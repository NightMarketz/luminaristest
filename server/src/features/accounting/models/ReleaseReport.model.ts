import { scopeDay } from './dates';

/**
 * BE-INCR-PAYMENT-PROVIDER PR-3 (nó F5) — relatório de liberações do Mercado Pago → extrato da PaymentAccount → F7.
 * Constantes e helpers puros. Decisões: BRIEF §3 P3-1..P3-12 e D-2026-10-10-F5-PR3-FORKS (G1..G8, dono 2026-10-10).
 */

/** P3-12 / G8: gravado no job E no upload manual. */
export const PAYMENT_ACCOUNT_RELEASE_REPORT_IMPORTED = 'payment_account.release_report_imported';

/**
 * Review do #615, A1 (R1 a, dono 2026-10-10): arquivo do job só com linhas de saldo ⇒ nenhum extrato (o import continua
 * recusando "extrato sem linhas"), a watermark avança e fica este audit.
 */
export const PAYMENT_ACCOUNT_RELEASE_REPORT_EMPTY_RANGE = 'payment_account.release_report_empty_range';

/**
 * Review do #615, A2 (R2 a, dono 2026-10-10): o arquivo do job sobrepõe extrato já importado ⇒ o job PARA na conta
 * (`releaseReportBlockedReason`), grava este audit e não tenta de novo até o operador destravar (evento `_unblocked`).
 */
export const PAYMENT_ACCOUNT_RELEASE_REPORT_BLOCKED = 'payment_account.release_report_blocked';
export const PAYMENT_ACCOUNT_RELEASE_REPORT_UNBLOCKED = 'payment_account.release_report_unblocked';

export const RELEASE_REPORT_OVERLAP = 'release_report_overlap';
/** G2: com `mp_release` os saldos vêm só das linhas de saldo do arquivo — DTO com saldo ⇒ 400. */
export const RELEASE_REPORT_BALANCE_FROM_FILE = 'release_report_balance_from_file';
/** G6: upload mp_release numa folha sem conta MP ⇒ 409. */
export const RELEASE_REPORT_NO_PAYMENT_ACCOUNT = 'release_report_no_payment_account';

/** P3-5: chave da watermark no `JobWatermarkRepository`. */
export const releaseReportWatermarkKey = (paymentAccountId: string): string => `mp_release:${paymentAccountId}`;

const SP = { timeZone: 'America/Sao_Paulo' };

/**
 * 00:00 de Brasília do dia-calendário de `instant`, como instante UTC (P3-5: "hoje 00:00 BRT"; G4: o dia da credencial).
 * Offset fixo −03:00: sem horário de verão desde o Decreto 9.772/2019.
 */
export function brtMidnightOf(instant: Date): Date {
  return new Date(`${scopeDay(SP, instant)}T00:00:00.000-03:00`);
}

/** Dia-calendário de Brasília como `Date` meia-noite UTC — a convenção date-only de `periodStart/periodEnd`. */
export function brtDateOnly(instant: Date): Date {
  return new Date(`${scopeDay(SP, instant)}T00:00:00.000Z`);
}

/** Chave de sobreposição (P3-4, F-PPB-4 a): `SOURCE_ID` + `DESCRIPTION`; linha sem SOURCE_ID não entra. */
export function releaseOverlapKey(raw: Record<string, string>): string | null {
  const sourceId = (raw.SOURCE_ID ?? '').trim();
  if (!sourceId) return null;
  return `${sourceId}|${(raw.DESCRIPTION ?? '').trim()}`;
}
