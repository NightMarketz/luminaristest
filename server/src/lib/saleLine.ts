/**
 * Regras PURAS da linha de venda (`saleItems`), numa fonte só para o motor (SalesPlugin), as pontes contábeis
 * (`sync/bridges/saleItems.ts`) e a guarda fiscal (EFICIENCIA-FISCAL PR-1, review do #913). Mora em `lib/`: o motor não
 * importa o núcleo contábil (B1) e o núcleo não importa `features/sales` (core-boundary, item 42). Os únicos imports são
 * `lib/errors` e o teto `MAX_CENTS` (`features/accounting/models/money`, sem dependências), desde o SOT F-11.1.
 *
 * - Classificação: relação primeiro (`productId`/`serviceId`/`packageId`), depois `type`.
 * - Quantidade da linha para as guardas: `quantity` (1 se a coluna não existe — preset só-serviços). As pontes contábeis
 *   seguem `quantity × unitPrice` cru (contrato do X14/REVENUE-SPLIT), e o subtotal do SalesPlugin também, desde o VP-1b
 *   (D-2026-11-04-VENDA-QUANTIDADE-SERVICO-E-PV-A; antes contava serviço como 1, divergência do review do #913).
 * - Fronteira reais → centavos: `Math.round(reais × 100)`; ausente ⇒ 0, lixo/NaN/Infinity e acima de `MAX_CENTS` ⇒
 *   `ValidationError` (SOT F-11.1, Q-07 = a, dono, questionário 2026-11-10).
 */

import { ValidationError } from './errors';
import { MAX_CENTS } from '../features/accounting/models/money';

export type SaleLineKind = 'Product' | 'Service' | 'Package' | 'Unknown';

/** Coerção numérica que nunca propaga NaN para o dinheiro (ausente/lixo → 0). */
export function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Reais (float do DynamicTable) → centavos inteiros. Ausente ⇒ 0; lixo ou acima de `MAX_CENTS` ⇒ erro (SOT F-11.1). */
export function reaisToCents(v: unknown): number {
  if (v === undefined || v === null || v === '') return 0;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new ValidationError('Valor em reais inválido: não é um número finito.');
  const cents = Math.round(n * 100);
  if (Math.abs(cents) > MAX_CENTS) throw new ValidationError('Valor em reais fora da faixa suportada de centavos.');
  return cents;
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
