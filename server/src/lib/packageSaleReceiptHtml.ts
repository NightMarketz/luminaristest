/**
 * Pure HTML serializer for the package-sale receipt (comprovante da venda de pacote) — FE-INCR-PACOTE-VALIDADE
 * (BRIEF item 13, §4.5; F-FE-PV-3 b / F-FE-PV-5 b). Same pattern and helpers as lib/receiptHtml.ts: plain data in,
 * self-contained HTML out (inline CSS, no assets) so lib/pdf.ts renders it offline. All that can be wrong — escaping,
 * date, money, the clause box, the "no acceptance" mark — lives here and is unit-tested; puppeteer stays a thin wrapper.
 *
 * The clause is printed at `font-size: 12pt` (corpo 12, CDC art. 54 § 3º): in a PDF `pt` is a real measure, unlike on
 * screen (BRIEF F14). Bold + bordered box = destaque (CDC art. 54 § 4º). Source: RESPOSTA-JURIDICO-2026-10-04-PACOTE-VALIDADE.md.
 */
import { centsToBRL, escapeHtml } from './receiptHtml';

export interface PackageSaleReceiptData {
  unitName: string;
  customerName: string;
  packageName: string;
  amountCents: number;
  /** 'YYYY-MM-DD' */
  saleDate: string;
  /** The `textShown` of the acceptance, or the notice `text` when there is none. */
  clause: string;
  /** null → the clause is stamped "ACEITE NÃO REGISTRADO". */
  acceptance: { acceptedByLabel: string; acceptedAt: Date; textVersion: string } | null;
}

// ponytail: 'YYYY-MM-DD' by components (no Date → no local-tz day-shift; memory date-only-rendering-utc-shift-class-bug).
function dateOnlyBR(dateOnly: string): string {
  const [y, m, d] = dateOnly.split('-');
  return `${d}/${m}/${y}`;
}

// ponytail: acceptedAt is an instant (server clock). The salon's scope is a CONSTANT America/Sao_Paulo (AccountingScope),
// which has been a fixed UTC-3 since DST was abolished in 2019 — so shift by -3h and read UTC getters instead of Intl
// (small-ICU Nodes drop locale data, same reason as centsToBRL). Upgrade: a per-scope zone + a tz database if the scope
// timeZone ever stops being a constant.
function instantBR(d: Date): string {
  const l = new Date(d.getTime() - 3 * 3_600_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(l.getUTCDate())}/${p(l.getUTCMonth() + 1)}/${l.getUTCFullYear()} ${p(l.getUTCHours())}:${p(l.getUTCMinutes())} (Brasília)`;
}

export function packageSaleReceiptHtml(d: PackageSaleReceiptData): string {
  const acceptance = d.acceptance
    ? `<div class="meta"><div><span class="label">Aceite registrado por</span>${escapeHtml(d.acceptance.acceptedByLabel)}</div>
    <div><span class="label">Em</span>${escapeHtml(instantBR(d.acceptance.acceptedAt))}</div>
    <div><span class="label">Versão do texto</span>${escapeHtml(d.acceptance.textVersion)}</div></div>`
    : '<div class="missing">ACEITE NÃO REGISTRADO</div>';

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #171717; margin: 40px; font-size: 13px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .sub { color: #525252; font-size: 12px; margin-bottom: 24px; }
  .meta { margin-bottom: 16px; }
  .meta div { margin: 2px 0; }
  .meta .label { display: inline-block; width: 180px; color: #525252; }
  .clause { border: 2px solid #171717; padding: 14px 16px; margin: 20px 0 8px; font-size: 12pt; font-weight: bold; line-height: 1.45; }
  .missing { color: #b91c1c; font-weight: bold; font-size: 12pt; margin: 8px 0 16px; letter-spacing: .04em; }
  .signature { margin-top: 56px; width: 60%; border-top: 1px solid #171717; padding-top: 4px; font-size: 12px; color: #525252; }
  .footer { margin-top: 32px; color: #737373; font-size: 11px; }
</style>
</head>
<body>
  <h1>Comprovante de Venda de Pacote</h1>
  <div class="sub">${escapeHtml(d.unitName)}</div>

  <div class="meta">
    <div><span class="label">Cliente</span>${escapeHtml(d.customerName)}</div>
    <div><span class="label">Pacote</span>${escapeHtml(d.packageName)}</div>
    <div><span class="label">Valor</span>${centsToBRL(d.amountCents)}</div>
    <div><span class="label">Data da venda</span>${dateOnlyBR(d.saleDate)}</div>
  </div>

  <div class="clause">${escapeHtml(d.clause)}</div>
  ${acceptance}

  <div class="signature">Assinatura do cliente: ${escapeHtml(d.customerName)}</div>

  <div class="footer">Documento gerado eletronicamente.</div>
</body>
</html>`;
}
