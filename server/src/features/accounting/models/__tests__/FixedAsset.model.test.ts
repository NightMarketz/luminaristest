import { quotaCumulativa, lifeMonths, isAnexoSource, resolveRateForNcm, type NcmRateCandidate } from '../FixedAsset.model';
import { ValidationError } from '../../../../lib/errors';

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

// ── resolveRateForNcm — BE-INCR-FIXED-ASSETS PR-5 (fork "annualRateBp do rascunho", decisão do
// dono 23/09; review independente #366, achados 1 e 2) ─────────────────────────────────────────
describe('resolveRateForNcm — casamento por NCM (Anexo III), FUNÇÃO PURA', () => {
  const chapterOnly: NcmRateCandidate[] = [{ id: 'rate-8452', ncm: '8452', annualRateBp: 1000 }];

  it('casa o NCM 8452.10 (subposição) com a linha 8452 (capítulo, 4 dígitos)', () => {
    expect(resolveRateForNcm(chapterOnly, '8452.10', 'MAQ-1')).toEqual({ rateId: 'rate-8452', annualRateBp: 1000 });
  });

  it('prefixo MAIS ESPECÍFICO vence: subposição de 6 dígitos bate antes do capítulo de 4', () => {
    const rates: NcmRateCandidate[] = [
      { id: 'rate-chapter', ncm: '8452', annualRateBp: 1000 },
      { id: 'rate-subheading', ncm: '8452.10', annualRateBp: 2000 },
    ];
    expect(resolveRateForNcm(rates, '84521000', 'MAQ-1')).toEqual({ rateId: 'rate-subheading', annualRateBp: 2000 });
  });

  it('sem NCM no item → 400 nomeado', () => {
    expect(() => resolveRateForNcm(chapterOnly, undefined, 'MAQ-1')).toThrow(ValidationError);
    expect(() => resolveRateForNcm(chapterOnly, '', 'MAQ-1')).toThrow(/sem NCM/);
  });

  it('NCM sem NENHUMA correspondência (ex.: 9999.99, fora do Anexo III) → 400 nomeado', () => {
    expect(() => resolveRateForNcm(chapterOnly, '9999.99', 'MAQ-1')).toThrow(/Nenhuma taxa de depreciação/);
  });

  // Review #366, achado 2 — dados REAIS do fixture do Anexo III (não um exemplo inventado): NCM
  // '8417' tem 2 linhas com taxas DISTINTAS (fornos industriais 10% × fornos p/ vidro, Nota 1, 33,3%).
  it('achado 2: NCM 8417 com 2 taxas DISTINTAS sob o mesmo prefixo → 400 ambíguo, nunca escolhe pela ordem', () => {
    const rates: NcmRateCandidate[] = [
      { id: 'rate-8417-geral', ncm: '8417', annualRateBp: 1000 },
      { id: 'rate-8417-vidro', ncm: '8417', annualRateBp: 3330 },
    ];
    expect(() => resolveRateForNcm(rates, '84171000', 'FORNO-1')).toThrow(/MAIS DE UMA taxa/);
    // Ordem invertida — o erro tem de ser o MESMO (não depende de qual linha o seed gravou 1ª).
    expect(() => resolveRateForNcm([...rates].reverse(), '84171000', 'FORNO-1')).toThrow(/MAIS DE UMA taxa/);
  });

  // 3926.90 tem 2 subposições REAIS do fixture com taxas distintas (correias 20% × artigos de
  // laboratório 10%) — mesmo padrão de ambiguidade, prefixo de 6 dígitos.
  it('achado 2 (variante): NCM 3926.90 com 2 taxas distintas na MESMA subposição → 400 ambíguo', () => {
    const rates: NcmRateCandidate[] = [
      { id: 'rate-correias', ncm: '3926.90', annualRateBp: 5000 },
      { id: 'rate-laboratorio', ncm: '3926.90', annualRateBp: 2000 },
    ];
    expect(() => resolveRateForNcm(rates, '39269000', 'ITEM-1')).toThrow(/MAIS DE UMA taxa/);
  });

  it('candidatos duplicados com a MESMA taxa NÃO são ambíguos — usa o primeiro', () => {
    const rates: NcmRateCandidate[] = [
      { id: 'rate-dup-1', ncm: '8417', annualRateBp: 1000 },
      { id: 'rate-dup-2', ncm: '8417', annualRateBp: 1000 },
    ];
    expect(resolveRateForNcm(rates, '84171000', 'FORNO-1')).toEqual({ rateId: 'rate-dup-1', annualRateBp: 1000 });
  });

  it('taxa CUSTOM (ncm=null) nunca casa por prefixo — é ignorada no matching', () => {
    const rates: NcmRateCandidate[] = [{ id: 'rate-custom', ncm: null, annualRateBp: 9999 }];
    expect(() => resolveRateForNcm(rates, '84521000', 'MAQ-1')).toThrow(/Nenhuma taxa de depreciação/);
  });
});
