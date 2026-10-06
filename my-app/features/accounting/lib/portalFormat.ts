/**
 * Formatos do Emissor Nacional web (Guia v1.2) para a ficha espelho — FE-INCR-DFE PR-2, item 20. Funções puras, uma
 * por formato, só em string (sem float: o valor da DPS já é decimal em texto). Entrada fora do formato LANÇA — a ficha
 * nunca mostra um valor "aproximado" para o operador colar no portal.
 *
 * Os formatos são do guia (PV-2 do RUNBOOK-H2-DFE-MANUAL: o guia dá o tipo do campo, não a máscara — grau INFERIDO).
 */

// ponytail: ligar se o runbook mostrar que o portal exige milhar — PV-2
export const PORTAL_THOUSANDS_SEPARATOR = '';

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const DECIMAL = /^(\d+)(?:\.(\d{1,2}))?$/;

/** `AAAA-MM-DD` → `DD/MM/AAAA` (date-only: corte de string, nunca `new Date()`). */
export function portalDate(iso: string): string {
  const m = DATE_ONLY.exec(iso);
  if (!m) throw new Error(`portalDate: data fora do formato AAAA-MM-DD: '${iso}'`);
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function withThousands(intPart: string): string {
  if (!PORTAL_THOUSANDS_SEPARATOR) return intPart;
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, PORTAL_THOUSANDS_SEPARATOR);
}

/** Decimal da DPS (`"1234.56"`, `"0.5"`) → vírgula com 2 casas (`"1234,56"`, `"0,50"`). Negativo ou não numérico lança. */
function decimal2(value: string, fn: string): string {
  const m = DECIMAL.exec(value);
  if (!m) throw new Error(`${fn}: valor fora do formato decimal não negativo: '${value}'`);
  const cents = (m[2] ?? '').padEnd(2, '0');
  return `${withThousands(m[1])},${cents}`;
}

/** Valor em reais da DPS → formato do portal. */
export function portalMoney(value: string): string {
  return decimal2(value, 'portalMoney');
}

/** Percentual da DPS (`"2.00"`) → `"2,00"`. */
export function portalPercent(value: string): string {
  return decimal2(value, 'portalPercent');
}

/** CPF/CNPJ só com dígitos (o portal recebe sem máscara). */
export function portalDoc(doc: string): string {
  const digits = doc.replace(/\D/g, '');
  if (digits.length !== 11 && digits.length !== 14) throw new Error(`portalDoc: CPF/CNPJ com ${digits.length} dígitos`);
  return digits;
}

/** Código de Tributação Nacional `"010701"` → `"01.07.01"` (G5: o combo do portal o exibe assim). */
export function portalCTribNac(code: string): string {
  if (!/^\d{6}$/.test(code)) throw new Error(`portalCTribNac: código fora do formato de 6 dígitos: '${code}'`);
  return `${code.slice(0, 2)}.${code.slice(2, 4)}.${code.slice(4, 6)}`;
}
