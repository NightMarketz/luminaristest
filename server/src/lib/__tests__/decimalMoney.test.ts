import { MODO_REAIS_PARA_CENTAVOS, reaisToCentsHalfUp, reaisToCentsLegado, roundReaisToCents } from '../decimalMoney';

/**
 * CENTAVOS-EXATOS PR-1 (BRIEF `docs/accounting/BE-INCR-CENTAVOS-EXATOS-brief.md` §3 itens 5 e 8; F-CE-1, F-CE-5, F-CE-6,
 * F-CE-9 ratificados em `D-2026-11-24-CENTAVOS-EXATOS-FORKS`). O núcleo tem dois corpos; a constante escolhe o legado e
 * NENHUM valor muda neste PR. O roteamento das bordas está em `decimalMoney.roteamento.test.ts`.
 */
describe('CENTAVOS-EXATOS PR-1 — o corte único', () => {
  it('o modo vigente é o LEGADO: o PR-3 troca esta constante de propósito, junto com splitRevenueCredit e os pins', () => {
    expect(MODO_REAIS_PARA_CENTAVOS).toBe('FLOAT_LEGADO');
  });

  it('roundReaisToCents segue o corpo legado (Math.round(x*100)) enquanto o modo for FLOAT_LEGADO', () => {
    for (const x of [1.005, 0.285, 8.665, 86.655, 0.1 + 0.2, 1500.5, 0.005]) {
      expect(roundReaisToCents(x)).toBe(reaisToCentsLegado(x));
    }
    expect(roundReaisToCents(1.005)).toBe(100);
  });
});

describe('CENTAVOS-EXATOS PR-1 — reaisToCentsHalfUp (meio-para-cima decimal, ainda sem uso nas bordas)', () => {
  it.each([
    [1.005, 101n],
    [0.285, 29n],
    [86.655, 8666n],
    [0.1 + 0.2, 30n],
    [1.00499999999999, 100n],
    [8.665, 867n],
    [2.675, 268n],
    [123456.785, 12345679n],
    [0, 0n],
    [-0, 0n],
  ])('reaisToCentsHalfUp(%s) = %s', (x, esperado) => {
    expect(reaisToCentsHalfUp(x)).toBe(esperado);
  });

  it('negativo: o meio afasta de zero (F-CE-6 a), ao contrário de Math.round', () => {
    expect(reaisToCentsHalfUp(-1.005)).toBe(-101n);
    expect(reaisToCentsHalfUp(-0.285)).toBe(-29n);
    expect(reaisToCentsHalfUp(-12.34)).toBe(-1234n);
    expect(reaisToCentsLegado(-1.005)).toBe(-100);
  });

  it('notação científica nos dois sentidos: abaixo de 1e-6 vira 0; a partir de 1e21 expande por escala', () => {
    expect(reaisToCentsHalfUp(1e-7)).toBe(0n);
    expect(reaisToCentsHalfUp(-1.5e-7)).toBe(0n);
    expect(reaisToCentsHalfUp(1e21)).toBe(10n ** 23n);
    expect(reaisToCentsHalfUp(1.5e21)).toBe(15n * 10n ** 22n);
  });

  it('não finito lança RangeError (a borda valida antes e dá a mensagem dela)', () => {
    for (const x of [NaN, Infinity, -Infinity]) {
      expect(() => reaisToCentsHalfUp(x)).toThrow(RangeError);
    }
  });

  it('a virada não muda venda ordinária: para todo valor de 2 casas (R$ 0,01 … 2.000,00) o corpo exato == o legado', () => {
    const diferentes: number[] = [];
    for (let k = 1; k <= 200_000; k += 1) {
      const x = k / 100;
      if (reaisToCentsHalfUp(x) !== BigInt(reaisToCentsLegado(x))) diferentes.push(k);
    }
    expect(diferentes).toEqual([]);
  });

  it('só muda o sub-centavo: dos 10 000 valores x,xx5 (0,005 … 99,995), 572 divergem entre os dois corpos (medida do PR-0)', () => {
    let divergem = 0;
    for (let k = 5; k < 100_000; k += 10) {
      const x = Number((k / 1000).toFixed(3));
      if (reaisToCentsHalfUp(x) !== BigInt(reaisToCentsLegado(x))) divergem += 1;
    }
    expect(divergem).toBe(572);
  });

  it('o valor CALCULADO em float que já traz o erro no texto (0,333×10 + 2,5×33,33 = 86,65499…) dá 8665 nos dois corpos', () => {
    const calculado = 0.333 * 10 + 2.5 * 33.33;
    expect(reaisToCentsHalfUp(calculado)).toBe(8665n);
    expect(reaisToCentsLegado(calculado)).toBe(8665);
  });
});
