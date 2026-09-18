import { quotaCumulativa, lifeMonths, isAnexoSource } from '../FixedAsset.model';

describe('quotaCumulativa — fórmula pura (BRIEF item 12)', () => {
  it('100.000 × 10% a.a.: cumulativa mês a mês é 833/1666/2500… e Σ12 = 10.000 exato', () => {
    const base = 100_000n;
    const bp = 1000; // 10%
    expect(quotaCumulativa(base, bp, 1)).toBe(833n);
    expect(quotaCumulativa(base, bp, 2)).toBe(1666n);
    expect(quotaCumulativa(base, bp, 3)).toBe(2500n);
    // quota do mês = diferença de cumulativas consecutivas — 833/833/834…
    expect(quotaCumulativa(base, bp, 1) - quotaCumulativa(base, bp, 0)).toBe(833n);
    expect(quotaCumulativa(base, bp, 2) - quotaCumulativa(base, bp, 1)).toBe(833n);
    expect(quotaCumulativa(base, bp, 3) - quotaCumulativa(base, bp, 2)).toBe(834n);
    expect(quotaCumulativa(base, bp, 12)).toBe(10_000n); // Σ12 exato, sem resíduo
  });

  it('100.000 × 33,3% a.a.: no mês 37 a cumulativa ULTRAPASSA a base (cap é responsabilidade do chamador)', () => {
    const base = 100_000n;
    const bp = 3330;
    expect(quotaCumulativa(base, bp, 37)).toBeGreaterThan(base);
  });

  it('base zero ou bp zero → sempre zero (sem divisão por zero, sem NaN)', () => {
    expect(quotaCumulativa(0n, 1000, 12)).toBe(0n);
  });
});

describe('lifeMonths — BRIEF item 12 [D4]', () => {
  it('10% a.a. → 120 meses; 33,3% a.a. → 37 meses', () => {
    expect(lifeMonths(1000)).toBe(120);
    expect(lifeMonths(3330)).toBe(37);
  });
});

describe('isAnexoSource — linhas ANEXO_* são imutáveis (parecer D4)', () => {
  it('CUSTOM não é Anexo; as 3 fontes do Anexo são', () => {
    expect(isAnexoSource('CUSTOM')).toBe(false);
    expect(isAnexoSource('ANEXO_III_IN_1700_2017')).toBe(true);
    expect(isAnexoSource('ANEXO_III_NOTA_1')).toBe(true);
    expect(isAnexoSource('ANEXO_III_NOTA_2')).toBe(true);
  });
});
