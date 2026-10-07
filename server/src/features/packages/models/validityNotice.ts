import { createHash } from 'crypto';
import { isValidDateOnly } from '../../accounting/models/dates';
import { lastValidDay, type FeriadosNacionais } from './validity';

/**
 * FE-INCR-PACOTE-VALIDADE (BRIEF §3 item 2, §4.3; F-FE-PV-4 a/7 a) — texto da validade do pacote, puro e versionado.
 * É a ÚNICA fonte do que o cliente lê na venda e do que o comprovante imprime (o `textShown` do aceite é este texto).
 * Datas saem de `YYYY-MM-DD` por componente — nunca `Date` local (memória date-only-rendering-utc-shift-class-bug).
 *
 * Regra de domínio citada: CDC art. 54 §§ 3º–4º (fonte ≥ corpo 12; destaque) e art. 6º VIII (prova), pergunta 4 do
 * jurídico — docs/accounting/RESPOSTA-JURIDICO-2026-10-04-PACOTE-VALIDADE.md; "não devolvido" = F-JUR-3 e o texto v1
 * ratificado pelo dono em 05/10 (F-FE-PV-7 a, D-2026-10-05-FE-PACOTE-VALIDADE-FORKS). Mudou uma palavra → versão nova.
 */
export const PACKAGE_VALIDITY_NOTICE_VERSION = 'v1';

/** `YYYY-MM-DD` → `DD/MM/AAAA` (sem `Date`). */
function dateBR(dateOnly: string): string {
  const [y, m, d] = dateOnly.split('-');
  return `${d}/${m}/${y}`;
}

export interface ValidityNoticeInput {
  validityDays: number;
  /** 'YYYY-MM-DD' */
  saleDate: string;
  /** 'YYYY-MM-DD' — `lastValidDay(saleDate, validityDays)` */
  expiresOn: string;
}

/** Texto v1 (BRIEF §4.3). Uma linha só: o hash cobre exatamente estes caracteres. */
export function renderValidityNotice(i: ValidityNoticeInput): string {
  return (
    `VALIDADE DO PACOTE: este pacote vale por ${i.validityDays} dias corridos a contar da data da compra (${dateBR(i.saleDate)}). ` +
    `Último dia para usar: ${dateBR(i.expiresOn)}. ` +
    'Se o prazo terminar em feriado nacional, ele vai até o dia útil seguinte, e a data acima já considera isso. ' +
    'O saldo não usado até essa data não será devolvido nem trocado por dinheiro.'
  );
}

export function validityNoticeSha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

export interface ValidityNotice extends ValidityNoticeInput {
  textVersion: string;
  text: string;
  textSha256: string;
}

/**
 * Notice de uma compra, ou `null` se o pacote não tem validade (`null`/`0`). `saleDate` precisa ser calendário real.
 * Quem chama (serviço) traz `validityDays` do catálogo e a fotografia `FERIADO_NACIONAL` — esta função não lê nada.
 */
export function buildValidityNotice(saleDate: string, validityDays: number | null, feriados: FeriadosNacionais): ValidityNotice | null {
  if (!isValidDateOnly(saleDate)) throw new Error(`data inválida: '${saleDate}'`);
  const expiresOn = lastValidDay(saleDate, validityDays, feriados);
  if (expiresOn == null || validityDays == null) return null;
  const text = renderValidityNotice({ validityDays, saleDate, expiresOn });
  return { validityDays, saleDate, expiresOn, textVersion: PACKAGE_VALIDITY_NOTICE_VERSION, text, textSha256: validityNoticeSha256(text) };
}
