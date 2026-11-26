import { centsFromReais } from '../../features/accountingBinding/domain/interpreter/money';
import { MODO_REAIS_PARA_CENTAVOS } from '../decimalMoney';
import { reaisToCents } from '../saleLine';

/**
 * CENTAVOS-EXATOS PR-1 (BRIEF §3 item 8) — "nenhum valor muda", provado nas BORDAS REAIS, sem mock: com o modo vigente
 * (`FLOAT_LEGADO`) os dois conversores vivos ainda dão o arredondamento de float de hoje, inclusive onde o corpo exato
 * divergiria. Se uma borda passasse a chamar o corpo exato direto, ou o modo virasse sem o PR-3, isto reprovaria.
 * (O roteamento em si — as bordas seguem o núcleo — está em `decimalMoney.roteamento.test.ts`, com o núcleo trocado.)
 */
describe('CENTAVOS-EXATOS PR-1 — as bordas reais seguem no legado', () => {
  it('o modo vigente é FLOAT_LEGADO', () => {
    expect(MODO_REAIS_PARA_CENTAVOS).toBe('FLOAT_LEGADO');
  });

  it.each([
    [1.005, 100],
    [0.285, 28],
    [8.665, 866],
    [86.655, 8666],
    [1500.5, 150050],
  ])('reaisToCents(%s) = %i e centsFromReais(%s) = %i (legado, igual ao de antes do PR-1)', (x, esperado) => {
    expect(reaisToCents(x)).toBe(esperado);
    expect(centsFromReais(x, 'ctx')).toBe(esperado);
  });
});
