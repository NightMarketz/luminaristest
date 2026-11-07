/**
 * BE-INCR-DP-F2 PR-0 itens 1 e 2 — o nó de prova (filhos `soma: true` batem com o pai) e a fração exata com o
 * arredondamento ao centavo só no ponto declarado.
 */
import fc from 'fast-check';
import { no, provaIncoerente } from '../calcNode';
import { arredondarCentavos, dividir, fracao, inteiro, multiplicar, somar, subtrair, type ModoArredondamento } from '../fracao';

const MODOS: ModoArredondamento[] = ['MEIO_PARA_CIMA_CENTAVO', 'TRUNCA_CENTAVO'];
const fr = fc.tuple(fc.bigInt({ min: -10_000_000n, max: 10_000_000n }), fc.bigInt({ min: 1n, max: 100_000n })).map(([n, d]) => fracao(n, d));

describe('DP-F2 item 1 — CalcNode', () => {
  it('a soma dos filhos marcados soma: true bate com o pai; os informativos não contam', () => {
    const ok = no('total', 300n, { filhos: [no('a', 100n, { soma: true }), no('b', 200n, { soma: true }), no('alíquota', 999n)] });
    expect(provaIncoerente(ok)).toEqual([]);
  });

  it('filho que não fecha é apontado pelo rótulo, em qualquer nível', () => {
    const ruim = no('total', 300n, { filhos: [no('a', 100n, { soma: true, filhos: [no('a1', 1n, { soma: true })] }), no('b', 200n, { soma: true })] });
    expect(provaIncoerente(ruim)).toEqual(['a']);
    expect(provaIncoerente(no('t', 1n, { filhos: [no('x', 2n, { soma: true })] }))).toEqual(['t']);
  });
});

describe('DP-F2 item 2 — Fracao', () => {
  it('normaliza (sinal no numerador, mdc 1) e opera exato', () => {
    expect(fracao(6n, -4n)).toEqual({ num: -3n, den: 2n });
    expect(somar(fracao(1n, 3n), fracao(1n, 6n))).toEqual({ num: 1n, den: 2n });
    expect(subtrair(fracao(1n, 3n), fracao(1n, 3n))).toEqual({ num: 0n, den: 1n });
    expect(multiplicar(fracao(2n, 3n), fracao(3n, 4n))).toEqual({ num: 1n, den: 2n });
    expect(dividir(fracao(1n), fracao(3n))).toEqual({ num: 1n, den: 3n });
    expect(() => fracao(1n, 0n)).toThrow('denominador zero');
    expect(() => dividir(fracao(1n), fracao(0n))).toThrow('divisão por zero');
  });

  it('inteiro() recusa o que não é inteiro seguro (nenhuma conta passa por number)', () => {
    expect(inteiro(5000)).toBe(5000n);
    expect(() => inteiro(0.5)).toThrow();
    expect(() => inteiro(Number.MAX_SAFE_INTEGER + 1)).toThrow();
  });

  it('arredondarCentavos: meio para cima (longe do zero) e truncar (em direção ao zero)', () => {
    expect(arredondarCentavos(fracao(5n, 2n), 'MEIO_PARA_CIMA_CENTAVO')).toBe(3n);
    expect(arredondarCentavos(fracao(-5n, 2n), 'MEIO_PARA_CIMA_CENTAVO')).toBe(-3n);
    expect(arredondarCentavos(fracao(7n, 3n), 'MEIO_PARA_CIMA_CENTAVO')).toBe(2n);
    expect(arredondarCentavos(fracao(299n, 100n), 'TRUNCA_CENTAVO')).toBe(2n);
    expect(arredondarCentavos(fracao(-299n, 100n), 'TRUNCA_CENTAVO')).toBe(-2n);
  });

  it('fast-check: arredondar(a) + arredondar(b) difere de arredondar(a + b) em no máximo 1 centavo, nos dois modos', () => {
    fc.assert(
      fc.property(fr, fr, fc.constantFrom(...MODOS), (a, b, modo) => {
        const d = arredondarCentavos(a, modo) + arredondarCentavos(b, modo) - arredondarCentavos(somar(a, b), modo);
        return d >= -1n && d <= 1n;
      }),
    );
  });
});
