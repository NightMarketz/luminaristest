import { ValidationError } from '../errors';
import { MAX_CENTS } from '../../features/accounting/models/money';
import { reaisToCents } from '../saleLine';

/**
 * SOT F-11.1 (Q-07 = a, dono, questionário 2026-11-10): "valor inválido dá erro e o teto `MAX_CENTS` vale em todos os
 * caminhos de reais → centavos do servidor". Caminho 1 de 3: `reaisToCents` (`lib/saleLine.ts`), usado pelo
 * `discountGuard` do SalesPlugin e pelo `SaleFiscalGuardService`. Hoje lixo vira 0 e não há teto.
 * Ausente (`undefined`/`null`/`''`) não é lixo: continua 0 (desconto não informado, por exemplo).
 */
describe('SOT F-11.1 — reaisToCents: lixo dá erro e MAX_CENTS vale', () => {
  it('SOT F-11.1: lixo (texto não numérico, NaN, Infinity) lança ValidationError em vez de virar 0', () => {
    for (const lixo of ['abc', NaN, Infinity, '12,50']) {
      expect(() => reaisToCents(lixo)).toThrow(ValidationError);
    }
  });

  it('SOT F-11.1: valor acima de MAX_CENTS lança ValidationError; exatamente MAX_CENTS passa', () => {
    expect(reaisToCents(MAX_CENTS / 100)).toBe(MAX_CENTS);
    expect(() => reaisToCents((MAX_CENTS + 1) / 100)).toThrow(ValidationError);
  });

  it('controle: ausente vira 0 e número válido converte com Math.round', () => {
    expect(reaisToCents(undefined)).toBe(0);
    expect(reaisToCents(null)).toBe(0);
    expect(reaisToCents('')).toBe(0);
    expect(reaisToCents(12.345)).toBe(1235);
    expect(reaisToCents('7.5')).toBe(750);
  });
});
