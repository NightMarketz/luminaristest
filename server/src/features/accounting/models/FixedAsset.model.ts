/**
 * FixedAsset domain constants + fórmula pura de depreciação (BE-INCR-FIXED-ASSETS, nó C8).
 * PR-1 (execution-plan Passo 4) escreve isto cedo — junto do schema — porque é testável SEM banco;
 * `quotaCumulativa`/`lifeMonths` só ganham chamador real no `runMonth` do PR-3 (Bloco C).
 */

export const FIXED_ASSET_STATUSES = ['PENDING_ACTIVATION', 'ACTIVE', 'FULLY_DEPRECIATED', 'DISPOSED'] as const;
export type FixedAssetStatus = (typeof FIXED_ASSET_STATUSES)[number];

export const DEPRECIATION_RATE_SOURCES = [
  'ANEXO_III_IN_1700_2017',
  'ANEXO_III_NOTA_1',
  'ANEXO_III_NOTA_2',
  'CUSTOM',
] as const;
export type DepreciationRateSource = (typeof DEPRECIATION_RATE_SOURCES)[number];

/** Linhas ANEXO_* são imutáveis (parecer D4, BRIEF item 2) — só CUSTOM aceita edição/criação livre. */
export const isAnexoSource = (source: string): boolean => source !== 'CUSTOM';

/** Allowlist do PR-1 (Passo 5) — `depreciation_rate.created`/`.hidden` no `auditCanonical.ts`. */
export const DEPRECIATION_RATE_CREATED = 'depreciation_rate.created';
export const DEPRECIATION_RATE_HIDDEN = 'depreciation_rate.hidden';

/**
 * Quota ACUMULADA (não a do mês isolado) até o mês `k` desde a ativação, em `BigInt` de centavos —
 * `floor(base × bp × k ÷ 120000)`, onde `bp` é basis points anuais (10% = 1000) e 120000 =
 * 12 (meses) × 10000 (bp de 100%). A quota do mês N é `quotaCumulativa(k=N) − quotaCumulativa(k=N-1)`
 * (item 12/13, PR-3) — não faz parte desta função: aqui só a fórmula fechada, sem estado.
 *
 * Item 12 (BRIEF): `k=12`, `bp=1000` (10% a.a.) → `Σ12 = base × bp ÷ 10000` exato — sem resíduo.
 * Para taxas que não dividem 120000 exatamente (ex.: 33,3% → 3330 bp), a cumulativa ULTRAPASSA
 * `base` antes do fim da vida útil nominal (`lifeMonths`, abaixo) — o CAP (`min(cumulativa, base −
 * acumulado)`) é responsabilidade de quem chama (`runMonth`, PR-3), não desta função pura.
 */
export function quotaCumulativa(baseCents: bigint, annualRateBp: number, k: number): bigint {
  return (baseCents * BigInt(annualRateBp) * BigInt(k)) / 120000n;
}

/**
 * Nº de meses para a cumulativa nominal atingir 100% da base — `ceil(120000 ÷ bp)` (item 12,
 * [D4]): 120 para 10% a.a., 37 para 33,3% a.a. (a cumulativa em 37 meses já passa de 100%, daí o
 * cap no mês final). Usado pelo `runMonth` (PR-3) para decidir quando parar de chamar esta série.
 */
export function lifeMonths(annualRateBp: number): number {
  return Math.ceil(120000 / annualRateBp);
}
