/**
 * ITEM-DESTINATION (BE-INCR-ITEM-DESTINATION BRIEF §2, item 1 + EMENDA 29/09 item 21) — destinação declarada
 * pelo COMPRADOR na entrada. O XML do fornecedor não a traz: o `prod/CFOP` é o da operação do emitente (achado
 * A-1; MOC 7.0 Anexo I, I08-10). F-ID-1 (a), ampliado pelo dono em 29/09 com `IMOBILIZADO` (o `classId` do
 * operador é a declaração, item 22).
 */
export const ITEM_DESTINATIONS = ['REVENDA', 'INSUMO_SERVICO', 'IMOBILIZADO'] as const;
export type ItemDestination = (typeof ITEM_DESTINATIONS)[number];

/** De onde veio a destinação do item (F-ID-6 a) — devolvida no preview/import, nunca inferida em silêncio.
 *  `PRODUTO` (default por produto, F-ID-2 a) só é produzida a partir do PR-2 (BRIEF §7). */
export const ITEM_DESTINATION_ORIGINS = ['OVERRIDE', 'PRODUTO', 'FALLBACK'] as const;
export type ItemDestinationOrigin = (typeof ITEM_DESTINATION_ORIGINS)[number];

/** CFOPs de ENTRADA de imobilizado. Desde a EMENDA 29/09 (item 23) NÃO roteiam — o XML do fornecedor traz o
 *  CFOP da saída dele (MOC 7.0 Anexo I, I08-10); só uma nota de entrada própria traz 1551/2551, e aí um item
 *  mapeado com `productRef` gera warning, nunca a rota. */
export const FIXED_ASSET_CFOPS: ReadonlySet<string> = new Set(['1551', '2551']);

/** O que o operador declarou para um `cProd` (o `itemMapping` do import/preview). */
export interface ItemDestinationMapping {
  productRef?: string;
  classId?: string;
  destination?: ItemDestination;
}

export interface ResolvedItemDestination {
  nItem: number;
  cProd: string;
  destination: ItemDestination;
  origem: ItemDestinationOrigin;
}

/**
 * ITEM-DESTINATION item 9 (função pura; a I/O fica no service). Ordem: `classId` → IMOBILIZADO/OVERRIDE
 * (EMENDA item 22) · `destination` do mapeamento → OVERRIDE · nada → REVENDA/FALLBACK + warning (F-ID-6 a).
 * A origem PRODUTO (default por produto, F-ID-2 a) entra no PR-2 (BRIEF §7). O resolver nunca grava default
 * (F-ID-9 a). Item sem mapeamento também cai em FALLBACK: quem exige mapeamento (D6) é o import, não aqui —
 * o preview aceita nota sem mapeamento (F-ID-8 a).
 */
export function resolveDestinations(
  itens: ReadonlyArray<{ nItem: number; cProd: string; cfop: string }>,
  mappingByCProd: ReadonlyMap<string, ItemDestinationMapping>,
): { byNItem: Map<number, ItemDestination>; destinacoes: ResolvedItemDestination[]; warnings: string[] } {
  const byNItem = new Map<number, ItemDestination>();
  const destinacoes: ResolvedItemDestination[] = [];
  const warnings: string[] = [];
  for (const it of itens) {
    const m = mappingByCProd.get(it.cProd);
    let destination: ItemDestination = 'REVENDA';
    let origem: ItemDestinationOrigin = 'FALLBACK';
    if (m?.classId != null) {
      destination = 'IMOBILIZADO';
      origem = 'OVERRIDE';
    } else if (m?.destination != null) {
      destination = m.destination;
      origem = 'OVERRIDE';
    } else {
      warnings.push(`item ${it.nItem} (${it.cProd}): sem destinação declarada — tratado como REVENDA (FALLBACK); marque INSUMO_SERVICO se o item é usado no serviço`);
    }
    if (m?.productRef != null && FIXED_ASSET_CFOPS.has(it.cfop)) {
      warnings.push(`item ${it.nItem} (${it.cProd}): CFOP ${it.cfop} — CFOP de imobilizado mapeado como estoque/insumo — confira`);
    }
    byNItem.set(it.nItem, destination);
    destinacoes.push({ nItem: it.nItem, cProd: it.cProd, destination, origem });
  }
  return { byNItem, destinacoes, warnings };
}
