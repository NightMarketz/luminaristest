/**
 * BE-INCR-PIS-COFINS PR-1 (nó X8, BRIEF itens 3, 4 e 6) — tabela versionada com revogação em 2027 e a divisão PIS ×
 * Cofins do crédito da NF-e (parcelas gravadas ou derivadas por 165:760 com o `arred` do X7).
 */
import { parametroPisCofinsVigente, separarCreditoPisCofins } from '../pisCofinsParams';
import { RAZAO_CREDITO_SEMENTE, tabelaPisCofinsSemente } from '@test/helpers/legalParams';

// BE-INCR-LEGAL-PARAMS PR-1: as alíquotas moram no banco; a semente da migração é a fotografia destes testes.
const PARAMETROS_PIS_COFINS = tabelaPisCofinsSemente();

describe('tabela de parâmetros (item 3)', () => {
  it('toda linha tem fonte não vazia, vigenteDesde date-only e vigenteAte 2026-12-31 (LC 214 art. 542)', () => {
    expect(PARAMETROS_PIS_COFINS).toHaveLength(4);
    for (const p of PARAMETROS_PIS_COFINS) {
      expect(p.fonte.trim()).not.toBe('');
      expect(p.vigenteDesde).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(p.vigenteAte).toBe('2026-12-31');
    }
  });

  it('dezembro de 2026 resolve; janeiro de 2027 não resolve (revogados)', () => {
    expect(parametroPisCofinsVigente(PARAMETROS_PIS_COFINS, 'PIS', 'CUMULATIVO', '2026-12-31')).toBeDefined();
    expect(parametroPisCofinsVigente(PARAMETROS_PIS_COFINS, 'COFINS', 'NAO_CUMULATIVO', '2026-12-31')).toBeDefined();
    for (const data of ['2027-01-01', '2027-01-31']) {
      expect(parametroPisCofinsVigente(PARAMETROS_PIS_COFINS, 'PIS', 'CUMULATIVO', data)).toBeUndefined();
      expect(parametroPisCofinsVigente(PARAMETROS_PIS_COFINS, 'COFINS', 'NAO_CUMULATIVO', data)).toBeUndefined();
    }
  });

  it('alíquotas e códigos DCTF; o não cumulativo reusa as constantes do crédito da NF-e', () => {
    const v = (t: 'PIS' | 'COFINS', m: 'CUMULATIVO' | 'NAO_CUMULATIVO') => parametroPisCofinsVigente(PARAMETROS_PIS_COFINS, t, m, '2026-06-30')!;
    expect([v('PIS', 'CUMULATIVO').aliquotaBp, v('PIS', 'CUMULATIVO').codigoReceita]).toEqual([65, '810902']);
    expect([v('COFINS', 'CUMULATIVO').aliquotaBp, v('COFINS', 'CUMULATIVO').codigoReceita]).toEqual([300, '217201']);
    expect([v('PIS', 'NAO_CUMULATIVO').aliquotaBp, v('PIS', 'NAO_CUMULATIVO').codigoReceita]).toEqual([RAZAO_CREDITO_SEMENTE.pisBp, '691201']);
    expect([v('COFINS', 'NAO_CUMULATIVO').aliquotaBp, v('COFINS', 'NAO_CUMULATIVO').codigoReceita]).toEqual([RAZAO_CREDITO_SEMENTE.cofinsBp, '585601']);
  });
});

describe('divisão PIS × Cofins do crédito da NF-e (itens 4 e 6)', () => {
  it('linha com as parcelas ⇒ usa como estão', () => {
    expect(separarCreditoPisCofins({ amountCents: 784, baseCents: 8473, pisCents: 140, cofinsCents: 644 }, RAZAO_CREDITO_SEMENTE))
      .toEqual({ baseCents: 8473, pisCents: 140, cofinsCents: 644, derivado: false });
  });

  it('linha antiga ⇒ DERIVADO: PIS = half-up de amount × 165/925, Cofins = resto, soma = amount', () => {
    expect(separarCreditoPisCofins({ amountCents: 925 }, RAZAO_CREDITO_SEMENTE)).toEqual({ baseCents: null, pisCents: 165, cofinsCents: 760, derivado: true });
    // 37 × 165 / 925 = 6,6 → 7: truncar daria 6 — prova que é o arredondamento do X7, não um piso
    expect(separarCreditoPisCofins({ amountCents: 37 }, RAZAO_CREDITO_SEMENTE)).toMatchObject({ pisCents: 7, cofinsCents: 30 });
    expect(separarCreditoPisCofins({ amountCents: 14 }, RAZAO_CREDITO_SEMENTE)).toMatchObject({ pisCents: 2, cofinsCents: 12 }); // 2,497… → 2
    expect(separarCreditoPisCofins({ amountCents: 0 }, RAZAO_CREDITO_SEMENTE)).toMatchObject({ pisCents: 0, cofinsCents: 0 });
    for (const amount of [1, 2, 3, 17, 784, 99_999, 123_456_789]) {
      const s = separarCreditoPisCofins({ amountCents: amount }, RAZAO_CREDITO_SEMENTE);
      expect(s.pisCents + s.cofinsCents).toBe(amount);
      expect(Math.abs(s.pisCents - (amount * 165) / 925)).toBeLessThanOrEqual(0.5);
    }
  });
});
