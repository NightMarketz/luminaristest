/**
 * Fração exata — BE-INCR-DP-F2 item 2 (PR-0).
 *
 * Nenhum valor intermediário da folha arredonda (§2 do BRIEF, "arredondamento só no ponto declarado pela regra"): as
 * calculadoras somam e multiplicam `Fracao` (`bigint` num/den, normalizada, den > 0) e arredondam ao centavo **só** no
 * ponto que o item declara, pelo modo lido de `FOLHA_REGRA` (`ARREDONDAMENTO`, item 65). Nenhuma operação usa `number`;
 * os inteiros de entrada (bp, minutos, dias) entram por `inteiro()`, que recusa o que não é inteiro seguro.
 */
import type { FOLHA_REGRA_CHAVES_TEXTO } from '../../../legalParameters/models/formatoLinha';

export interface Fracao {
  readonly num: bigint;
  readonly den: bigint;
}

/** Os modos da linha `ARREDONDAMENTO` (o código conhece as duas formas; a escolha é dado). */
export type ModoArredondamento = (typeof FOLHA_REGRA_CHAVES_TEXTO)['ARREDONDAMENTO'][number];

const abs = (x: bigint) => (x < 0n ? -x : x);
function mdc(a: bigint, b: bigint): bigint {
  let x = abs(a);
  let y = abs(b);
  while (y !== 0n) [x, y] = [y, x % y];
  return x;
}

export function fracao(num: bigint, den: bigint = 1n): Fracao {
  if (den === 0n) throw new Error('Fracao: denominador zero.');
  const s = den < 0n ? -1n : 1n;
  const g = mdc(num, den) || 1n;
  return { num: (s * num) / g, den: (s * den) / g };
}

/** Inteiro de entrada (bp, minutos, dias, segundos) → `bigint`; não inteiro seguro ⇒ erro de programação. */
export function inteiro(n: number): bigint {
  if (!Number.isSafeInteger(n)) throw new Error(`Fracao: ${n} não é inteiro seguro.`);
  return BigInt(n);
}

export const somar = (a: Fracao, b: Fracao): Fracao => fracao(a.num * b.den + b.num * a.den, a.den * b.den);
export const subtrair = (a: Fracao, b: Fracao): Fracao => fracao(a.num * b.den - b.num * a.den, a.den * b.den);
export const multiplicar = (a: Fracao, b: Fracao): Fracao => fracao(a.num * b.num, a.den * b.den);
export function dividir(a: Fracao, b: Fracao): Fracao {
  if (b.num === 0n) throw new Error('Fracao: divisão por zero.');
  return fracao(a.num * b.den, a.den * b.num);
}

/**
 * Item 2 — a fração (em centavos) arredondada ao centavo. `TRUNCA_CENTAVO` corta em direção ao zero;
 * `MEIO_PARA_CIMA_CENTAVO` leva o meio centavo para longe do zero.
 */
export function arredondarCentavos(f: Fracao, modo: ModoArredondamento): bigint {
  const sinal = f.num < 0n ? -1n : 1n;
  const n = abs(f.num);
  const q = modo === 'TRUNCA_CENTAVO' ? n / f.den : (2n * n + f.den) / (2n * f.den);
  return sinal * q;
}

/** `num/den` para o rótulo da prova (o valor exato que o nó exibe arredondado). */
export function textoFracao(f: Fracao): string {
  return f.den === 1n ? `${f.num}` : `${f.num}/${f.den}`;
}
