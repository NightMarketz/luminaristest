/**
 * BE-INCR-FISCAL-OBLIGATION-PROFILE (nó X13, BRIEF item 2; PRE-ADR F-OBP-2 → a) — regime tributário da EMPRESA.
 *
 * `MEI` é valor próprio (não flag do Simples) porque as obrigações dele não são as do Simples ME/EPP. Para a
 * unidade (`FiscalProfile.regimeTributario`, que só conhece SIMPLES|PRESUMIDO|REAL) o MEI é SIMPLES: por
 * definição legal ele é "optante pelo Simples Nacional" (LC 123/2006 art. 18-A §1º, redação LC 188/2021).
 */
import type { REGIMES_TRIBUTARIOS } from '../dtos/FiscalProfileDto';

export const REGIMES_EMPRESA = ['MEI', 'SIMPLES', 'PRESUMIDO', 'REAL'] as const;
export type RegimeEmpresa = (typeof REGIMES_EMPRESA)[number];

/** Regime que o `FiscalProfile` de cada unidade deve ter sob o regime da empresa (consumido no PR-2, item 15). */
export function regimeUnidadeEsperado(regime: RegimeEmpresa): (typeof REGIMES_TRIBUTARIOS)[number] {
  return regime === 'MEI' ? 'SIMPLES' : regime;
}
