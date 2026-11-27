/**
 * splitCents — BE-INCR-DFE (BRIEF item 16, emenda F-DFE-16 b) — generalização N-ária da técnica
 * canônica de `revenueSplit.ts` (residue-on-last): cada peso recebe `round(total * peso / Σpesos)`
 * e o resíduo de arredondamento cai no ÚLTIMO elemento, garantindo `Σ shares === totalCents` exato
 * (nenhum centavo perdido). Usada para ratear `vServCents` entre os N `FiscalDocument` de uma venda
 * com serviços de `cTribNac` distintos (uma DPS por código — a DPS é mono-serviço, `cServ` é 1-1).
 */
export function splitCents(totalCents: number, weights: number[]): number[] {
  if (weights.length === 0) return [];
  const sumWeights = weights.reduce((a, b) => a + b, 0);
  if (sumWeights <= 0) {
    // Sem peso usável: tudo cai no primeiro elemento (o chamador decide o que fazer com N>1 aqui —
    // no uso real de F-DFE-16 (b) os pesos vêm de linhas com unitPrice*quantity > 0 por construção).
    return weights.map((_, i) => (i === 0 ? totalCents : 0));
  }
  const shares = weights.map((w) => Math.round((totalCents * w) / sumWeights));
  const sumShares = shares.reduce((a, b) => a + b, 0);
  shares[shares.length - 1] += totalCents - sumShares;
  return shares;
}
