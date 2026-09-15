import { readFileSync } from 'fs';
import { join } from 'path';
import { parseNfe } from '../nfe';
import { acquisitionCost, custoBrutoCents, rateio, type CostRegime } from '../nfeCost';

/**
 * BE-INCR-NFE-COST-REGIME (nó X6) — itens 7, 8, 9, 10, 11 + EMENDA 2026-09-15 (F-X6-3 b, F-X6-7 a).
 * Fixture `purchase-pis-cofins.SYNTHETIC.xml`: emitente CRT=3; item 1 NCM 6302.60.00 CST 01 (TRIBUTADO),
 * item 2 NCM 3305.90.00 CST 01 (MONOFÁSICO pela Lei 10.147 — a tabela manda), item 3 CST 04 (a nota manda).
 * Totais: vProd 183,33 · vDesc 10,00 · vFrete 15,00 · vIPI 5,00 · vICMS 33,00 (18+9+6) → bruto 19333 = vNF.
 *
 * Números esperados calculados À MÃO (oráculo independente do código):
 *   rateio de vDesc 1000 por vProd [10000,5000,3333]: floor(1000·10000/18333)=545, floor(1000·5000/18333)=272, resto 183
 *   rateio de vFrete 1500: 818, 409, 273
 *   base item 1 (defaults: ICMS fora, IPI fora) = 10000 − 545 + 818 − 1800 = 8473
 *   crédito item 1 = round(8473·1,65%)=140 + round(8473·7,6%)=644 → 784
 *   ICMS recuperável do contribuinte = 1800 + 900 + 600 = 3300
 */
const read = (f: string) => readFileSync(join(__dirname, 'fixtures/nfe', f), 'utf8');
const NFE = parseNfe(read('purchase-pis-cofins.SYNTHETIC.xml'), { allowHomologacao: true });
const ITENS = NFE.itens.filter((it) => it.indTot !== '0');

const regime = (over: Partial<CostRegime> = {}): CostRegime => ({
  icmsContribuinte: false,
  pisCofinsRegime: 'CUMULATIVO',
  pisCofinsCreditExcludesIcms: true,
  pisCofinsCreditIncludesIpi: false,
  pisCofinsCreditFromSimplesSupplier: false,
  ...over,
});

describe('acquisitionCost — X6 por regime', () => {
  it('parser lê os grupos por item (N, O, Q/S) e emit/CRT', () => {
    expect(NFE.emit.crt).toBe('3');
    expect(ITENS.map((it) => it.vICMSCents)).toEqual([1800, 900, 600]);
    expect(ITENS.map((it) => it.vIPICents)).toEqual([300, 150, 50]);
    expect(ITENS.map((it) => it.cstPis)).toEqual(['01', '01', '04']);
    expect(ITENS.map((it) => it.cstCofins)).toEqual(['01', '01', '04']);
  });

  it('item 7 — não-contribuinte + CUMULATIVO: fórmula de hoje intacta (19333), zero crédito', () => {
    const c = acquisitionCost(NFE, ITENS, regime());
    expect(c.custoBrutoCents).toBe(19333);
    expect(c.custoEstoqueCents).toBe(19333);
    expect([c.creditoIcmsCents, c.creditoPisCofinsCents]).toEqual([0, 0]);
    expect([c.regimeAplicado, c.pisCofinsAplicado]).toEqual(['NAO_CONTRIBUINTE', 'SEM_CREDITO']);
    expect(c.itens.map((i) => i.classe)).toEqual(['SEM_REGIME', 'SEM_REGIME', 'SEM_REGIME']);
  });

  it('item 8 — contribuinte de ICMS: sai a Σ vICMS dos itens (3300), bruto continua 19333 (passivo)', () => {
    const c = acquisitionCost(NFE, ITENS, regime({ icmsContribuinte: true }));
    expect(c.custoBrutoCents).toBe(19333);
    expect(c.creditoIcmsCents).toBe(3300);
    expect(c.custoEstoqueCents).toBe(16033);
    expect(c.regimeAplicado).toBe('CONTRIBUINTE_ICMS');
  });

  it('item 10/11 — NAO_CUMULATIVO com defaults: crédito só no item TRIBUTADO (784 sobre base 8473); monofásico pela tabela e CST 04 pela nota ficam de fora', () => {
    const c = acquisitionCost(NFE, ITENS, regime({ pisCofinsRegime: 'NAO_CUMULATIVO' }));
    expect(c.pisCofinsAplicado).toBe('NAO_CUMULATIVO');
    expect(c.itens.map((i) => i.classe)).toEqual(['TRIBUTADO', 'MONOFASICO', 'MONOFASICO']);
    expect(c.itens[0].basePisCofinsCents).toBe(8473);
    expect(c.itens[0].creditoPisCofinsCents).toBe(784);
    expect(c.baseCreditoPisCofinsCents).toBe(8473);
    expect(c.creditoPisCofinsCents).toBe(784);
    expect(c.custoEstoqueCents).toBe(19333 - 784);
  });

  it('as 3 flags mudam a base de forma determinística: ICMS na base (+1800) e IPI na base (+300)', () => {
    const c = acquisitionCost(NFE, ITENS, regime({ pisCofinsRegime: 'NAO_CUMULATIVO', pisCofinsCreditExcludesIcms: false, pisCofinsCreditIncludesIpi: true }));
    expect(c.itens[0].basePisCofinsCents).toBe(8473 + 1800 + 300);
  });

  it('fornecedor do Simples (CRT=1) com a flag OFF: crédito 0 + warning; com a flag ON: crédito normal', () => {
    const simples = { ...NFE, emit: { ...NFE.emit, crt: '1' } };
    const off = acquisitionCost(simples, ITENS, regime({ pisCofinsRegime: 'NAO_CUMULATIVO' }));
    expect(off.creditoPisCofinsCents).toBe(0);
    expect(off.pisCofinsAplicado).toBe('SEM_CREDITO');
    expect(off.warnings.join(' ')).toMatch(/Simples Nacional/);
    const on = acquisitionCost(simples, ITENS, regime({ pisCofinsRegime: 'NAO_CUMULATIVO', pisCofinsCreditFromSimplesSupplier: true }));
    expect(on.creditoPisCofinsCents).toBe(784);
  });

  it('item sem grupo Q/S → UNKNOWN: sem crédito e warning nomeando o item (default conservador)', () => {
    const semQ = ITENS.map((it, i) => (i === 0 ? { ...it, cstPis: null, cstCofins: null } : it));
    const c = acquisitionCost(NFE, semQ, regime({ pisCofinsRegime: 'NAO_CUMULATIVO' }));
    expect(c.itens[0].classe).toBe('UNKNOWN');
    expect(c.creditoPisCofinsCents).toBe(0);
    expect(c.warnings.some((w) => /item 1 .*CST ausente/.test(w))).toBe(true);
  });

  it('item 9 — invariante do rateio: Σ custoLiquido_item === custoEstoqueCents e Σ bruto_item === bruto, nos 3 regimes', () => {
    for (const r of [regime(), regime({ icmsContribuinte: true }), regime({ icmsContribuinte: true, pisCofinsRegime: 'NAO_CUMULATIVO' })]) {
      const c = acquisitionCost(NFE, ITENS, r);
      expect(c.itens.reduce((a, i) => a + i.custoLiquidoCents, 0)).toBe(c.custoEstoqueCents);
      expect(c.itens.reduce((a, i) => a + i.custoBrutoCents, 0)).toBe(c.custoBrutoCents);
    }
  });

  it('custoBrutoCents e rateio — helpers puros', () => {
    expect(custoBrutoCents(NFE.totais)).toBe(19333);
    expect(rateio(1000, [10000, 5000, 3333])).toEqual([545, 272, 183]);
    expect(rateio(1500, [10000, 5000, 3333])).toEqual([818, 409, 273]);
    expect(rateio(7, [0, 0])).toEqual([0, 7]);
  });
});
