import { linhasVigentesDaTabela, type LinhaLegal } from '../../legalParameters/models/legalParameter';
/**
 * ITEM-DESTINATION (BE-INCR-ITEM-DESTINATION BRIEF §2, item 1 + EMENDA 29/09 item 21) — destinação declarada
 * pelo COMPRADOR na entrada. O XML do fornecedor não a traz: o `prod/CFOP` é o da operação do emitente (achado
 * A-1; MOC 7.0 Anexo I, I08-10). F-ID-1 (a), ampliado pelo dono em 29/09 com `IMOBILIZADO` (o `classId` do
 * operador é a declaração, item 22).
 */
export const ITEM_DESTINATIONS = ['REVENDA', 'INSUMO_SERVICO', 'IMOBILIZADO'] as const;
export type ItemDestination = (typeof ITEM_DESTINATIONS)[number];

/** Destinações aceitas como DEFAULT por produto (F-ID-2 a). EMENDA 29/09 item 25: `IMOBILIZADO` não entra —
 *  o imobilizado precisa da classe, que não é do produto. */
export const PRODUCT_DESTINATION_DEFAULTS = ['REVENDA', 'INSUMO_SERVICO'] as const;
export type ProductDestinationDefaultValue = (typeof PRODUCT_DESTINATION_DEFAULTS)[number];

/** Linhas `product_destination_defaults` → mapa do resolver. A coluna é `String` no SQLite: valor fora do enum
 *  é dado corrompido e falha alto, nunca vira FALLBACK em silêncio. */
export function defaultByProductRefFrom(rows: ReadonlyArray<{ productRef: string; destination: string }>): Map<string, ProductDestinationDefaultValue> {
  return new Map(
    rows.map((r) => {
      if (!(PRODUCT_DESTINATION_DEFAULTS as readonly string[]).includes(r.destination)) {
        throw new Error(`product_destination_defaults: destination inválida '${r.destination}' para o produto '${r.productRef}'`);
      }
      return [r.productRef, r.destination as ProductDestinationDefaultValue];
    }),
  );
}

/** De onde veio a destinação do item (F-ID-6 a) — devolvida no preview/import, nunca inferida em silêncio. */
export const ITEM_DESTINATION_ORIGINS = ['OVERRIDE', 'PRODUTO', 'FALLBACK'] as const;
export type ItemDestinationOrigin = (typeof ITEM_DESTINATION_ORIGINS)[number];

/** CFOPs de ENTRADA de imobilizado. Desde a EMENDA 29/09 (item 23) NÃO roteiam — o XML do fornecedor traz o
 *  CFOP da saída dele (MOC 7.0 Anexo I, I08-10); só uma nota de entrada própria traz 1551/2551, e aí um item
 *  mapeado com `productRef` gera warning, nunca a rota. BE-INCR-LEGAL-PARAMS PR-2: a lista mora na tabela
 *  `CFOP_IMOBILIZADO` (item 17; D-7 — 3551 — é pendência de contador, não corrigida); o serviço monta a fotografia. */
export function cfopsImobilizadoDe(linhas: readonly LinhaLegal[], data: string): ReadonlySet<string> {
  return new Set(linhasVigentesDaTabela(linhas, 'CFOP_IMOBILIZADO', data).map((l) => l.chave));
}

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
 * (EMENDA item 22) · `destination` do mapeamento → OVERRIDE · default do `productRef` mapeado → PRODUTO
 * (F-ID-2 a) · nada → REVENDA/FALLBACK + warning (F-ID-6 a). O resolver nunca grava default (F-ID-9 a).
 * Item sem mapeamento também cai em FALLBACK: quem exige mapeamento (D6) é o import, não aqui — o preview aceita nota sem mapeamento (F-ID-8 a).
 */
export function resolveDestinations(
  itens: ReadonlyArray<{ nItem: number; cProd: string; cfop: string }>,
  mappingByCProd: ReadonlyMap<string, ItemDestinationMapping>,
  defaultByProductRef: ReadonlyMap<string, ProductDestinationDefaultValue>,
  cfopsImobilizado: ReadonlySet<string>,
): { byNItem: Map<number, ItemDestination>; destinacoes: ResolvedItemDestination[]; warnings: string[] } {
  const byNItem = new Map<number, ItemDestination>();
  const destinacoes: ResolvedItemDestination[] = [];
  const warnings: string[] = [];
  for (const it of itens) {
    const m = mappingByCProd.get(it.cProd);
    const productDefault = m?.productRef != null ? defaultByProductRef.get(m.productRef) : undefined;
    let destination: ItemDestination = 'REVENDA';
    let origem: ItemDestinationOrigin = 'FALLBACK';
    if (m?.classId != null) {
      destination = 'IMOBILIZADO';
      origem = 'OVERRIDE';
    } else if (m?.destination != null) {
      destination = m.destination;
      origem = 'OVERRIDE';
    } else if (productDefault != null) {
      destination = productDefault;
      origem = 'PRODUTO';
    } else {
      warnings.push(`item ${it.nItem} (${it.cProd}): sem destinação declarada — tratado como REVENDA (FALLBACK); marque INSUMO_SERVICO se o item é usado no serviço`);
    }
    if (m?.productRef != null && cfopsImobilizado.has(it.cfop)) {
      warnings.push(`item ${it.nItem} (${it.cProd}): CFOP ${it.cfop} — CFOP de imobilizado mapeado como estoque/insumo — confira`);
    }
    byNItem.set(it.nItem, destination);
    destinacoes.push({ nItem: it.nItem, cProd: it.cProd, destination, origem });
  }
  return { byNItem, destinacoes, warnings };
}
