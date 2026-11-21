import { readFileSync } from 'fs';
import { join } from 'path';
import { parseNfe } from '../nfe';
import { acquisitionCost, type CostRegime } from '../nfeCost';

import { LEGAIS_SEMENTE } from '@test/helpers/legalParams';
/**
 * BE-INCR-PIS-COFINS PR-1 (nó X8, BRIEF item 5, F-X8-7 a) — `acquisitionCost` devolve PIS e Cofins separados; a soma é
 * EXATAMENTE o `creditoPisCofinsCents` do X6, por item e no total. Mesmo fixture e mesmo oráculo à mão de `nfeCost.test.ts`:
 * base do item 1 = 8473 ⇒ round(8473 × 1,65%) = 140 e round(8473 × 7,6%) = 644.
 */
const NFE = parseNfe(readFileSync(join(__dirname, 'fixtures/nfe', 'purchase-pis-cofins.SYNTHETIC.xml'), 'utf8'), LEGAIS_SEMENTE, { allowHomologacao: true });
const ITENS = NFE.itens.filter((it) => it.indTot !== '0');
const regime = (over: Partial<CostRegime> = {}): CostRegime => ({
  icmsContribuinte: false,
  pisCofinsRegime: 'NAO_CUMULATIVO',
  pisCofinsCreditExcludesIcms: true,
  pisCofinsCreditIncludesIpi: false,
  pisCofinsCreditFromSimplesSupplier: false,
  pisCofinsCreditMonofasicoInsumo: false,
  ...over,
});

describe('acquisitionCost — crédito PIS × Cofins separado (X8 item 5)', () => {
  it('não cumulativo: PIS 140 + Cofins 644 = 784, por item e no total', () => {
    const c = acquisitionCost(NFE, ITENS, regime(), undefined, LEGAIS_SEMENTE);
    expect([c.creditoPisCents, c.creditoCofinsCents, c.creditoPisCofinsCents]).toEqual([140, 644, 784]);
    for (const it of c.itens) expect(it.creditoPisCents + it.creditoCofinsCents).toBe(it.creditoPisCofinsCents);
  });

  // Padrão de produção (chave c516 ligada, revisor #1301 A1): REVENDA não muda o split; só o INSUMO_SERVICO monofásico por
  // NCM soma 70 + 322 (base 4237, item 2) ao total.
  it('chave c516 ligada: REVENDA segue 140 + 644; o insumo monofásico por NCM soma PIS 70 + Cofins 322 só no item 2', () => {
    const r = regime({ pisCofinsCreditMonofasicoInsumo: true });
    const revenda = acquisitionCost(NFE, ITENS, r, undefined, LEGAIS_SEMENTE);
    expect([revenda.creditoPisCents, revenda.creditoCofinsCents, revenda.creditoPisCofinsCents]).toEqual([140, 644, 784]);
    const insumo = acquisitionCost(NFE, ITENS, r, new Map([[2, 'INSUMO_SERVICO' as const]]), LEGAIS_SEMENTE);
    expect([insumo.itens[1].creditoPisCents, insumo.itens[1].creditoCofinsCents]).toEqual([70, 322]);
    expect([insumo.creditoPisCents, insumo.creditoCofinsCents, insumo.creditoPisCofinsCents]).toEqual([210, 966, 1176]);
    for (const it of insumo.itens) expect(it.creditoPisCents + it.creditoCofinsCents).toBe(it.creditoPisCofinsCents);
  });

  it('sem crédito (unidade no cumulativo ou no Simples) ⇒ as duas parcelas são 0', () => {
    for (const r of [regime({ pisCofinsRegime: 'CUMULATIVO' }), regime({ pisCofinsRegime: 'SIMPLES' })]) {
      const c = acquisitionCost(NFE, ITENS, r, undefined, LEGAIS_SEMENTE);
      expect([c.creditoPisCents, c.creditoCofinsCents, c.creditoPisCofinsCents]).toEqual([0, 0, 0]);
    }
  });
});
