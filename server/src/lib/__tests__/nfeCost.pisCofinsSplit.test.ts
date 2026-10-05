import { readFileSync } from 'fs';
import { join } from 'path';
import { parseNfe } from '../nfe';
import { acquisitionCost, type CostRegime } from '../nfeCost';

/**
 * BE-INCR-PIS-COFINS PR-1 (nó X8, BRIEF item 5, F-X8-7 a) — `acquisitionCost` devolve PIS e Cofins separados; a soma é
 * EXATAMENTE o `creditoPisCofinsCents` do X6, por item e no total. Mesmo fixture e mesmo oráculo à mão de `nfeCost.test.ts`:
 * base do item 1 = 8473 ⇒ round(8473 × 1,65%) = 140 e round(8473 × 7,6%) = 644.
 */
const NFE = parseNfe(readFileSync(join(__dirname, 'fixtures/nfe', 'purchase-pis-cofins.SYNTHETIC.xml'), 'utf8'), { allowHomologacao: true });
const ITENS = NFE.itens.filter((it) => it.indTot !== '0');
const regime = (over: Partial<CostRegime> = {}): CostRegime => ({
  icmsContribuinte: false,
  pisCofinsRegime: 'NAO_CUMULATIVO',
  pisCofinsCreditExcludesIcms: true,
  pisCofinsCreditIncludesIpi: false,
  pisCofinsCreditFromSimplesSupplier: false,
  ...over,
});

describe('acquisitionCost — crédito PIS × Cofins separado (X8 item 5)', () => {
  it('não cumulativo: PIS 140 + Cofins 644 = 784, por item e no total', () => {
    const c = acquisitionCost(NFE, ITENS, regime());
    expect([c.creditoPisCents, c.creditoCofinsCents, c.creditoPisCofinsCents]).toEqual([140, 644, 784]);
    for (const it of c.itens) expect(it.creditoPisCents + it.creditoCofinsCents).toBe(it.creditoPisCofinsCents);
  });

  it('sem crédito (cumulativo, Simples, fornecedor do Simples) ⇒ as duas parcelas são 0', () => {
    for (const r of [regime({ pisCofinsRegime: 'CUMULATIVO' }), regime({ pisCofinsRegime: 'SIMPLES' })]) {
      const c = acquisitionCost(NFE, ITENS, r);
      expect([c.creditoPisCents, c.creditoCofinsCents, c.creditoPisCofinsCents]).toEqual([0, 0, 0]);
    }
  });
});
