/**
 * Deep link Estoque → Contas a Pagar (compra de estoque pré-preenchida). O MovementModal não
 * registra Entrada+Compra (só o Payable de inventário lança o título, valora pelo custo médio e
 * dá a entrada física); em vez de só bloquear, ele abre `/accounting` com produto e quantidade.
 * Fornecedor fica de fora: o do estoque é linha DynamicTable, o do Payable é Counterparty.
 */
export interface InventoryPurchaseSeed {
  /** DynamicTable row id do produto — o mesmo `inventoryProductRef` do braço estoque. */
  productRef: string;
  /** Quantidade inteira > 0; ausente quando o link não trouxe uma válida. */
  qty?: number;
}

const PARAM = 'newInventoryPayable';

export function buildInventoryPurchaseHref(seed: InventoryPurchaseSeed): string {
  const params = new URLSearchParams({ [PARAM]: seed.productRef });
  if (seed.qty !== undefined && Number.isInteger(seed.qty) && seed.qty > 0) params.set('qty', String(seed.qty));
  return `/accounting?${params.toString()}`;
}

export function parseInventoryPurchaseSeed(search: string): InventoryPurchaseSeed | null {
  const params = new URLSearchParams(search);
  const productRef = params.get(PARAM)?.trim();
  if (!productRef) return null;
  const qty = Number(params.get('qty'));
  return Number.isInteger(qty) && qty > 0 ? { productRef, qty } : { productRef };
}
