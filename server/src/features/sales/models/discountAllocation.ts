/**
 * EFICIENCIA-FISCAL PR-1 item 3 (BRIEF BE-INCR-EFICIENCIA-FISCAL §3/§4.2; ADR-INCR-EFICIENCIA-FISCAL D5, D6, I-3, I-4b) —
 * alocação fiscal PURA do desconto de um combo entre os itens, em centavos inteiros.
 *
 * - PROPORCIONAL_CATALOGO (padrão desde a triagem de 21/10, D-2026-10-21-TRIAGEM-CONTADOR-F1): peso = catálogo × quantidade;
 *   cada item recebe ⌊desconto × peso / Σ pesos⌋ e o resíduo vai ao último item na ordem estável por `itemRef`.
 * - CARGA_TRIBUTARIA (só com aceite do contador — I-6): ordem decrescente de `cargaBp` (empate: maior catálogo, depois
 *   `itemRef`); cada item recebe min(restante, catálogo − piso); item sem piso não passa da sua cota proporcional (D6,
 *   aviso SEM_CUSTO); o que sobrar é `excedenteCents` (> 0 ⇒ COMBO_ABAIXO_DO_CUSTO). Algum `cargaBp` nulo ⇒ sem ordem:
 *   aviso ORDEM_DE_CARGA_INDETERMINADA e alocação proporcional (D5).
 *
 * `pisoCents` é o piso da LINHA (custo unitário × quantidade), não o unitário.
 */

export type CriterioAlocacao = 'PROPORCIONAL_CATALOGO' | 'CARGA_TRIBUTARIA';
export const CRITERIOS_ALOCACAO = ['PROPORCIONAL_CATALOGO', 'CARGA_TRIBUTARIA'] as const;

export interface ItemParaAlocacao {
  itemRef: string;
  catalogUnitPriceCents: bigint;
  quantity: number;
  /** Piso da linha (custo × quantidade); null = indeterminado. */
  pisoCents: bigint | null;
  /** Carga tributária do item na data, em basis points; null = indeterminada. */
  cargaBp: number | null;
}

export type AvisoAlocacao = 'ORDEM_DE_CARGA_INDETERMINADA' | 'SEM_CUSTO';

export interface AlocacaoDesconto {
  porItem: Array<{ itemRef: string; discountCents: bigint }>;
  criterioAplicado: CriterioAlocacao;
  avisos: AvisoAlocacao[];
  excedenteCents: bigint;
}

const byRef = (a: { itemRef: string }, b: { itemRef: string }) => (a.itemRef < b.itemRef ? -1 : a.itemRef > b.itemRef ? 1 : 0);
const minB = (a: bigint, b: bigint) => (a < b ? a : b);
const maxB = (a: bigint, b: bigint) => (a > b ? a : b);

/** Linha de catálogo do item (catálogo × quantidade), em centavos. */
export function linhaCatalogoCents(item: Pick<ItemParaAlocacao, 'catalogUnitPriceCents' | 'quantity'>): bigint {
  return BigInt(Math.round(Number(item.catalogUnitPriceCents) * item.quantity));
}

function proporcional(itens: readonly ItemParaAlocacao[], descontoCents: bigint): Map<string, bigint> {
  const ordem = [...itens].sort(byRef);
  const pesos = ordem.map(linhaCatalogoCents);
  const total = pesos.reduce((s, p) => s + p, 0n);
  const out = new Map<string, bigint>();
  const alocavel = minB(descontoCents, total);
  if (total <= 0n || alocavel <= 0n) {
    ordem.forEach((i) => out.set(i.itemRef, 0n));
    return out;
  }
  let resto = alocavel;
  ordem.forEach((item, idx) => {
    const v = idx === ordem.length - 1 ? resto : (alocavel * pesos[idx]) / total;
    resto -= v;
    out.set(item.itemRef, v);
  });
  return out;
}

export function alocarDescontoFiscal(itens: readonly ItemParaAlocacao[], descontoCents: bigint, criterio: CriterioAlocacao): AlocacaoDesconto {
  const desconto = maxB(descontoCents, 0n);
  const prop = proporcional(itens, desconto);
  const total = itens.reduce((s, i) => s + linhaCatalogoCents(i), 0n);
  const sorted = [...itens].sort(byRef);

  if (criterio === 'PROPORCIONAL_CATALOGO' || itens.some((i) => i.cargaBp === null)) {
    return {
      porItem: sorted.map((i) => ({ itemRef: i.itemRef, discountCents: prop.get(i.itemRef) ?? 0n })),
      criterioAplicado: 'PROPORCIONAL_CATALOGO',
      avisos: criterio === 'CARGA_TRIBUTARIA' ? ['ORDEM_DE_CARGA_INDETERMINADA'] : [],
      excedenteCents: maxB(desconto - total, 0n),
    };
  }

  const ordem = [...itens].sort((a, b) => {
    if (a.cargaBp !== b.cargaBp) return (b.cargaBp ?? 0) - (a.cargaBp ?? 0);
    const la = linhaCatalogoCents(a);
    const lb = linhaCatalogoCents(b);
    if (la !== lb) return la > lb ? -1 : 1;
    return byRef(a, b);
  });
  const avisos: AvisoAlocacao[] = [];
  const dado = new Map<string, bigint>();
  let restante = desconto;
  for (const item of ordem) {
    let teto: bigint;
    if (item.pisoCents === null) {
      teto = prop.get(item.itemRef) ?? 0n;
      if (!avisos.includes('SEM_CUSTO')) avisos.push('SEM_CUSTO');
    } else {
      teto = maxB(linhaCatalogoCents(item) - item.pisoCents, 0n);
    }
    const v = minB(restante, teto);
    dado.set(item.itemRef, v);
    restante -= v;
  }
  return {
    porItem: sorted.map((i) => ({ itemRef: i.itemRef, discountCents: dado.get(i.itemRef) ?? 0n })),
    criterioAplicado: 'CARGA_TRIBUTARIA',
    avisos,
    excedenteCents: restante,
  };
}

/**
 * Item 8 — economia estimada da alocação por carga contra a proporcional: Σ cargaBp × (desconto_carga − desconto_prop) /
 * 10 000 (a base de cada item cai pelo desconto que recebe). Sem carga de todos os itens, ou se a carga caiu no
 * proporcional, não há número (null).
 */
export function economiaPotencialCents(itens: readonly ItemParaAlocacao[], carga: AlocacaoDesconto, prop: AlocacaoDesconto): bigint | null {
  if (carga.criterioAplicado !== 'CARGA_TRIBUTARIA' || itens.some((i) => i.cargaBp === null)) return null;
  const p = new Map(prop.porItem.map((x) => [x.itemRef, x.discountCents]));
  let bp = 0n;
  for (const x of carga.porItem) {
    const item = itens.find((i) => i.itemRef === x.itemRef)!;
    bp += BigInt(item.cargaBp!) * (x.discountCents - (p.get(x.itemRef) ?? 0n));
  }
  return bp / 10000n;
}
