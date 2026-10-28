/**
 * Regras PURAS da linha de venda (`saleItems`), numa fonte só para o motor (SalesPlugin), as pontes contábeis
 * (`sync/bridges/saleItems.ts`) e a guarda fiscal (EFICIENCIA-FISCAL PR-1, review do #913). Mora em `lib/` sem import
 * nenhum: o motor não importa o núcleo contábil (B1) e o núcleo não importa `features/sales` (core-boundary, item 42).
 *
 * - Classificação: relação primeiro (`productId`/`serviceId`/`packageId`), depois `type`.
 * - Quantidade da linha para as guardas: `quantity` (1 se a coluna não existe — preset só-serviços). As pontes contábeis
 *   seguem `quantity × unitPrice` cru (contrato do X14/REVENUE-SPLIT); o subtotal do SalesPlugin conta serviço como 1 —
 *   divergência anterior a este nó, registrada no review do #913, fora do escopo dele.
 * - Fronteira reais → centavos: `Math.round(reais × 100)`, com lixo/NaN ⇒ 0.
 */

export type SaleLineKind = 'Product' | 'Service' | 'Package' | 'Unknown';

/** Coerção numérica que nunca propaga NaN para o dinheiro (ausente/lixo → 0). */
export function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Reais (float do DynamicTable) → centavos inteiros. */
export function reaisToCents(v: unknown): number {
  return Math.round(toNum(v) * 100);
}

export function classifySaleItem(d: Record<string, unknown>): SaleLineKind {
  if (d.productId || String(d.type ?? '') === 'Product') return 'Product';
  if (d.serviceId || String(d.type ?? '') === 'Service') return 'Service';
  if (d.packageId || String(d.type ?? '') === 'Package') return 'Package';
  return 'Unknown';
}

/** Quantidade da linha para as guardas: `quantity`, ou 1 quando a coluna não existe. */
export function saleLineQuantity(d: Record<string, unknown>): number {
  const q = d.quantity;
  return q === undefined || q === null || q === '' ? 1 : toNum(q);
}
