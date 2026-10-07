/**
 * BE-INCR-TAX-ASSESSMENT Fase A (nó X7, BRIEF itens 4–5) — tabela de parâmetros versionada e arredondamento único.
 */
import { CODIGOS_RECEITA, PARAMETROS_APURACAO, TAX_ASSESSMENT_TABELA_VERSAO, arred, linhaVigente, mulBp, parametroVigente } from '../taxAssessmentParams';

describe('tabela de parâmetros (item 4)', () => {
  it('toda linha tem fonte não vazia e vigenteDesde date-only', () => {
    for (const p of PARAMETROS_APURACAO) {
      expect(p.fonte.trim()).not.toBe('');
      expect(p.vigenteDesde).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('acréscimo da CSLL: 0 em 2026-03-31 (antes da vigência, IN 2.305 art. 3º II) e 1000 bp em 2026-06-30', () => {
    expect(parametroVigente('LC224_ACRESCIMO_CSLL', '2026-03-31')).toBe(0);
    expect(parametroVigente('LC224_ACRESCIMO_CSLL', '2026-06-30')).toBe(1000);
    expect(parametroVigente('LC224_ACRESCIMO_IRPJ', '2026-03-31')).toBe(1000);
    expect(parametroVigente('LC224_ACRESCIMO_IRPJ', '2025-12-31')).toBe(0);
  });

  it('presunção por atividade; chave não-LC224 sem linha vigente é erro, não 0', () => {
    expect(parametroVigente('PRESUNCAO_IRPJ', '2026-03-31', 'SERVICO')).toBe(3200);
    expect(parametroVigente('PRESUNCAO_IRPJ', '2026-03-31', 'REVENDA')).toBe(800);
    expect(parametroVigente('PRESUNCAO_CSLL', '2026-03-31', 'REVENDA')).toBe(1200);
    expect(() => parametroVigente('IRPJ_ALIQ', '1990-12-31')).toThrow(/sem linha vigente/);
  });
});

describe('BE-INCR-TAX-PRESUMIDO-16 itens 1 e 6', () => {
  it('as linhas do 16% citam também o art. 215 § 10 (valor igual); versão nova; código 208902', () => {
    expect(linhaVigente('PRESUNCAO_IRPJ_REDUZIDA', '2026-03-31')).toMatchObject({ valor: 1600, fonte: expect.stringContaining('art. 215 § 10') });
    expect(linhaVigente('RECEITA_LIMITE_REDUZIDA_ANO_CENTS', '2026-03-31')).toMatchObject({ valor: 12_000_000, fonte: expect.stringContaining('art. 215 § 10') });
    expect(TAX_ASSESSMENT_TABELA_VERSAO).toBe('2026-10-06');
    expect(CODIGOS_RECEITA.IRPJ_PRESUMIDO_DIFERENCA_POSTERGADA_16).toBe('208902');
  });
});

describe('arredondamento único (item 5, F-TA-2 a: half-up ao centavo)', () => {
  it('meia unidade sobe; abaixo da metade desce; negativo arredonda para cima também', () => {
    expect(arred(5n, 10n)).toBe(1n); // 0,5 → 1
    expect(arred(4n, 10n)).toBe(0n); // 0,4 → 0
    expect(arred(15n, 10n)).toBe(2n); // 1,5 → 2
    expect(arred(-5n, 10n)).toBe(0n); // −0,5 → 0 (para cima)
    expect(arred(-6n, 10n)).toBe(-1n);
  });

  it('mulBp multiplica por vários bp e arredonda UMA vez', () => {
    // 1 centavo × 32% × 10% = 0,032 → 0 (duas roundings dariam o mesmo aqui; o caso abaixo distingue)
    expect(mulBp(1n, 3200, 1000)).toBe(0n);
    // 15 centavos × 32% × 10% = 0,48 → 0; arredondando no meio (15 × 32% = 4,8 → 5; × 10% = 0,5 → 1) daria 1
    expect(mulBp(15n, 3200, 1000)).toBe(0n);
    expect(mulBp(200_000_000n, 3200)).toBe(64_000_000n);
  });
});
