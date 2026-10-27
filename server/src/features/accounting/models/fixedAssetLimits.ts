/**
 * C8 emenda 3.2 (BE-INCR-FIXED-ASSETS-EMENDA-3-2-brief.md, Parte 1) — bem de pequeno valor direto na despesa.
 *
 * IN RFB 1.700/2017 art. 120 (= RIR/2018 art. 313 § 1º I): pode ser deduzido como despesa o custo de aquisição de
 * bem do ativo não circulante imobilizado "cujo valor unitário não seja superior a R$ 1.200,00" ou cujo prazo de
 * vida útil não ultrapasse 1 ano. § 1º (RIR 313 § 2º): a exceção não vale para bem que só funciona em conjunto.
 * A escolha é do contribuinte, no lançamento da aquisição (PN CST 100/78 item 13) — por isso `treatment` é
 * explícito por item (F-EM-1 → a, padrão ativar) e irreversível (item 20: não há comando "expensar ativo").
 */
export const FIXED_ASSET_EXPENSE_LIMIT_CENTS = 120000n;

export const FIXED_ASSET_TREATMENTS = ['CAPITALIZE', 'EXPENSE'] as const;
export type FixedAssetTreatment = (typeof FIXED_ASSET_TREATMENTS)[number];

/**
 * E2 (F-EM-2 → b): valor unitário da utilidade funcional = teto da divisão inteira do custo líquido da LINHA (rateio
 * D3) pela quantidade — nunca o total da nota. Com limite inteiro em centavos, `ceil(c/q) ≤ L ⇔ c ≤ L·q`.
 */
export function unitCostCentsOf(costCents: number, qty: number): bigint {
  const c = BigInt(costCents);
  const q = BigInt(qty);
  return (c + q - 1n) / q;
}

/** E4/E4b: EXPENSE acima do limite só com a 2ª hipótese do caput do art. 120 (vida útil ≤ 1 ano) declarada. */
export function expenseAllowed(unitCostCents: bigint, usefulLifeUpToOneYear: boolean | undefined): boolean {
  return unitCostCents <= FIXED_ASSET_EXPENSE_LIMIT_CENTS || usefulLifeUpToOneYear === true;
}
