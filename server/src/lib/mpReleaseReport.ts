import { ValidationError } from './errors';
import type { InTable } from './spreadsheet';
import { scopeDay } from '../features/accounting/models/dates';

/**
 * Parser PURO do relatório de liberações do Mercado Pago ("released money") — BE-INCR-PAYMENT-PROVIDER PR-3
 * (nó F5; BRIEF §3 P3-1..P3-3; decisões G2/G3/G8 em docs/plano/decisoes/D-2026-10-10-F5-PR3-FORKS.md).
 *
 * Normaliza o CSV para o MESMO `{headers, rows}` que o `parseLines` do import de extrato valida (um gate só, como
 * OFX/CNAB): header `date,amountCents,description,externalRef,rawJson`.
 *   - Uma linha por `RECORD_TYPE = release` (M11). `initial_available_balance` / `available_balance` viram o saldo
 *     de abertura / fechamento (G2: os saldos vêm SÓ dessas linhas); `total` é ignorado; outro RECORD_TYPE ⇒ 400.
 *   - `amountCents = NET_CREDIT_AMOUNT − NET_DEBIT_AMOUNT` (P3-1); a mesma fórmula dá o valor das linhas de saldo.
 *   - `date` = dia-calendário de America/Sao_Paulo do instante `DATE` lido COM offset (P3-2, ADR-TZ F-TZ1 b):
 *     `2026-10-01T23:30:00-04:00` ⇒ `2026-10-02`. Nunca recorte de string: o offset muda o dia.
 *   - `externalRef = EXTERNAL_REFERENCE`; `rawJson` = TODAS as colunas da linha (objeto header → valor).
 *   - Valores decimais por aritmética de string (nunca `Number(x) * 100`, ACC-014).
 *
 * Coluna obrigatória ausente ⇒ 400 `release_report_missing_columns` com a lista (P3-3, F-PPB-2 a): quem configura as
 * colunas na conta do cliente é o runbook de provisionamento; o Luminaris não escreve na config da conta.
 *
 * Fixture escrito a partir da descrição das colunas (M11); o BRIEF §9 item 4 manda trocá-lo pelo CSV real da sonda
 * de colunas (F-PPB-1 c) antes do merge. A válvula de formato inesperado é este 400 alto, nunca import silencioso.
 */

export const MP_RELEASE_FORMAT = 'mp_release';

export const RELEASE_REPORT_MISSING_COLUMNS = 'release_report_missing_columns';
export const RELEASE_REPORT_INVALID = 'release_report_invalid';

/** Colunas que o parser e o passo novo do scan (P3-6/P3-7) leem. */
export const MP_RELEASE_REQUIRED_COLUMNS = [
  'DATE',
  'SOURCE_ID',
  'EXTERNAL_REFERENCE',
  'RECORD_TYPE',
  'DESCRIPTION',
  'NET_CREDIT_AMOUNT',
  'NET_DEBIT_AMOUNT',
  'GROSS_AMOUNT',
  'MP_FEE_AMOUNT',
  'FINANCING_FEE_AMOUNT',
  'SHIPPING_FEE_AMOUNT',
  'TAXES_AMOUNT',
] as const;

/**
 * Deduções da linha (G3, dono 2026-10-10): vêm NEGATIVAS no arquivo e `NET = GROSS + Σ(deduções)`. Base: o CSV de
 * exemplo da página "released money — report fields" do MP
 * (https://www.mercadopago.com.br/developers/en/docs/checkout-api-payments/additional-content/reports/released-money/report-fields):
 * 269,00 + (−43,04) = 225,96.
 */
export const MP_RELEASE_DEDUCTION_COLUMNS = ['MP_FEE_AMOUNT', 'FINANCING_FEE_AMOUNT', 'SHIPPING_FEE_AMOUNT', 'TAXES_AMOUNT'] as const;

export interface MpReleaseParsed {
  table: InTable;
  openingBalanceCents: number | null;
  closingBalanceCents: number | null;
  /** Menor e maior instante `DATE` do arquivo, ISO UTC (G8). `null` se o arquivo não tiver nenhuma data. */
  fromUtc: string | null;
  toUtc: string | null;
}

const SP = { timeZone: 'America/Sao_Paulo' };
const OFFSET_RE = /(Z|[+-]\d{2}:?\d{2})$/;

/** Decimal do relatório → centavos inteiros, por string. Vazio = 0. Aceita "1234.56", "-43.04" e "43,04". */
export function mpDecimalToCents(raw: string): number {
  const v = raw.trim();
  if (v === '') return 0;
  const m = /^(-?)(\d+)(?:[.,](\d{1,2}))?$/.exec(v);
  if (!m) throw new ValidationError(`${RELEASE_REPORT_INVALID}: valor '${raw}' não é decimal.`, { code: RELEASE_REPORT_INVALID });
  const cents = Number(m[2]) * 100 + Number((m[3] ?? '').padEnd(2, '0'));
  return m[1] === '-' && cents !== 0 ? -cents : cents;
}

/** `GROSS − NET` quando `NET = GROSS + Σ(deduções)` (G3); `null` quando a linha não fecha. */
export function mpReleaseFeeCents(raw: Record<string, string>): { grossCents: number; feeCents: number } | null {
  const gross = mpDecimalToCents(raw.GROSS_AMOUNT ?? '');
  const net = mpDecimalToCents(raw.NET_CREDIT_AMOUNT ?? '') - mpDecimalToCents(raw.NET_DEBIT_AMOUNT ?? '');
  const deductions = MP_RELEASE_DEDUCTION_COLUMNS.reduce((sum, c) => sum + mpDecimalToCents(raw[c] ?? ''), 0);
  if (gross <= 0 || net !== gross + deductions) return null;
  return { grossCents: gross, feeCents: gross - net };
}

/** CSV com aspas (RFC 4180): campo entre aspas pode conter separador, quebra de linha e `""`. */
function parseCsv(text: string, sep: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/** Separador do arquivo (M10: configurável, padrão ","): o que aparece no header — `;` só se não houver `,`. */
function detectSeparator(headerLine: string): string {
  if (headerLine.includes(',')) return ',';
  if (headerLine.includes(';')) return ';';
  return ',';
}

function instantOf(raw: string, rowNumber: number): Date {
  const v = raw.trim();
  const d = new Date(v);
  if (!OFFSET_RE.test(v) || Number.isNaN(d.getTime())) {
    throw new ValidationError(`${RELEASE_REPORT_INVALID}: linha ${rowNumber}: DATE '${raw}' tem de ser instante ISO com offset.`, {
      code: RELEASE_REPORT_INVALID,
    });
  }
  return d;
}

export function parseMpReleaseReport(buffer: Buffer): MpReleaseParsed {
  const text = buffer.toString('utf8').replace(/^﻿/, '');
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const all = parseCsv(text, detectSeparator(firstLine));
  if (all.length === 0) throw new ValidationError(`${RELEASE_REPORT_INVALID}: arquivo vazio.`, { code: RELEASE_REPORT_INVALID });
  const headers = all[0].map((h) => h.trim());
  const missing = MP_RELEASE_REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
  if (missing.length > 0) {
    throw new ValidationError(`${RELEASE_REPORT_MISSING_COLUMNS}: colunas obrigatórias ausentes no relatório: ${missing.join(', ')}.`, {
      code: RELEASE_REPORT_MISSING_COLUMNS,
      missingColumns: missing,
    });
  }

  const rows: string[][] = [];
  let opening: number | null = null;
  let closing: number | null = null;
  let min: Date | null = null;
  let max: Date | null = null;
  all.slice(1).forEach((cells, i) => {
    const rowNumber = i + 1;
    const raw: Record<string, string> = {};
    headers.forEach((h, idx) => {
      raw[h] = (cells[idx] ?? '').trim();
    });
    const type = raw.RECORD_TYPE;
    if (type === 'total') return;
    const amount = mpDecimalToCents(raw.NET_CREDIT_AMOUNT) - mpDecimalToCents(raw.NET_DEBIT_AMOUNT);
    if (raw.DATE !== '') {
      const at = instantOf(raw.DATE, rowNumber);
      if (!min || at < min) min = at;
      if (!max || at > max) max = at;
    }
    if (type === 'initial_available_balance') {
      opening = amount;
      return;
    }
    if (type === 'available_balance') {
      closing = amount;
      return;
    }
    if (type !== 'release') {
      throw new ValidationError(`${RELEASE_REPORT_INVALID}: linha ${rowNumber}: RECORD_TYPE '${type}' desconhecido.`, {
        code: RELEASE_REPORT_INVALID,
      });
    }
    const day = scopeDay(SP, instantOf(raw.DATE, rowNumber));
    rows.push([day, String(amount), raw.DESCRIPTION, raw.EXTERNAL_REFERENCE, JSON.stringify(raw)]);
  });

  const fromUtc = min ? (min as Date).toISOString() : null;
  const toUtc = max ? (max as Date).toISOString() : null;
  return {
    table: { headers: ['date', 'amountCents', 'description', 'externalRef', 'rawJson'], rows },
    openingBalanceCents: opening,
    closingBalanceCents: closing,
    fromUtc,
    toUtc,
  };
}
