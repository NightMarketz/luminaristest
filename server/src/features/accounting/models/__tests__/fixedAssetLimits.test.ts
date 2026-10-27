/** C8 emenda 3.2 (BRIEF E1/E2/E4b): limite do art. 120 da IN RFB 1.700/2017 e o unitário por teto da divisão. */
import { FIXED_ASSET_EXPENSE_LIMIT_CENTS, expenseAllowed, unitCostCentsOf } from '../fixedAssetLimits';

describe('fixedAssetLimits', () => {
  it('E1 — limite = R$ 1.200,00 em centavos', () => {
    expect(FIXED_ASSET_EXPENSE_LIMIT_CENTS).toBe(120000n);
  });

  it.each([
    [270000, 3, 90000n],
    [360000, 3, 120000n],
    [360001, 3, 120001n],
    [130000, 1, 130000n],
  ])('E2 — unitário de %i / %i = %s (teto da divisão)', (cost, qty, unit) => {
    expect(unitCostCentsOf(cost, qty)).toBe(unit);
  });

  it('E4/E4b — acima do limite só com vida útil ≤ 1 ano declarada', () => {
    expect(expenseAllowed(120000n, undefined)).toBe(true);
    expect(expenseAllowed(120001n, undefined)).toBe(false);
    expect(expenseAllowed(120001n, false)).toBe(false);
    expect(expenseAllowed(500000n, true)).toBe(true);
  });
});
