import bwipjs from 'bwip-js';
import { ValidationError } from '../errors';
import { NFE_CHAVE_REGEX } from '../cnpj';

/**
 * NFE-DANFE-IBSCBS PR-2, item 13 (F-DANFE-4 b: biblioteca `bwip-js`, dependência de runtime nomeada aqui). Código de
 * barras da chave de acesso como SVG inline, por função pura.
 *
 * Simbologia: CODE-128C (`[MOC-DANFE-C128-SIMB]`, MOC 7.0 Anexo II §2). Chave com CNPJ alfanumérico (NT 2026.004): modelo
 * HÍBRIDO 128C/128A da NT Conjunta 2025.001 §6 (dono, questionário de 26/10: "Híbrido 128C/128A"). As palavras-código
 * saem de `codewordsChave` e vão à biblioteca no modo `raw`, que acrescenta só o DV (módulo 103) e o Stop — a biblioteca
 * no modo automático escolheria o conjunto B para letras, fora da NT.
 * Fontes: `docs/accounting/fontes-oficiais/TRANSCRICAO-MOC70-AnexoII-DANFE-2026-10-26.md` e dossiê `pesquisas-legais/nfe-danfe-pr2/`.
 */

const START_C = 105;
const CODE_A = 101; // em C, troca para A
const CODE_C = 99; // em A, troca para C

const isDigit = (c: string) => c >= '0' && c <= '9';

/** Valor do conjunto A: ASCII 32–95 → 0–63 (dígito '0' = 16; 'A' = 33, como no exemplo da NT Conjunta). */
function valorA(c: string): number {
  const code = c.charCodeAt(0);
  if (code < 32 || code > 95) throw new ValidationError(`Caractere "${c}" fora do conjunto CODE-128A.`);
  return code - 32;
}

/** Tamanho da sequência de dígitos que começa em `i`. */
function runDigitos(s: string, i: number): number {
  let j = i;
  while (j < s.length && isDigit(s[j])) j++;
  return j - i;
}

/**
 * Palavras-código (sem DV e sem Stop) pelas orientações da NT Conjunta 2025.001 §6: começa em Start C; em C, dígitos aos
 * pares e, com sobra ímpar antes de um não numérico, Code A antes do último dígito (regra 2) — ou antes do não numérico
 * (regra 4); em A, volta para C quando houver 4 ou mais dígitos seguidos — antes do 1º dígito se o grupo for par,
 * depois do 1º se for ímpar (regra 3). Só dígitos ⇒ 128C puro.
 */
export function codewordsHibridos(dados: string): number[] {
  if (!dados || !isDigit(dados[0]) || !isDigit(dados[1] ?? '')) {
    throw new ValidationError('CODE-128 híbrido: os dados devem começar com ao menos 2 dígitos (Start C).');
  }
  const out = [START_C];
  let modo: 'A' | 'C' = 'C';
  let i = 0;
  while (i < dados.length) {
    if (modo === 'C') {
      const run = runDigitos(dados, i);
      const pares = Math.floor(run / 2);
      for (let p = 0; p < pares; p++, i += 2) out.push(Number(dados.slice(i, i + 2)));
      if (i < dados.length) {
        out.push(CODE_A);
        modo = 'A';
      }
      continue;
    }
    const run = runDigitos(dados, i);
    if (run >= 4) {
      if (run % 2 === 1) out.push(valorA(dados[i++]));
      out.push(CODE_C);
      modo = 'C';
      continue;
    }
    out.push(valorA(dados[i++]));
  }
  return out;
}

/** Palavras-código da chave de acesso: 44 posições no formato da NT 2026.004 (`NFE_CHAVE_REGEX`); outra entrada ⇒ erro. */
export function codewordsChave(chave: string): number[] {
  if (!NFE_CHAVE_REGEX.test(chave)) {
    throw new ValidationError('Código de barras do DANFE: a entrada não é uma chave de acesso de 44 posições.');
  }
  return codewordsHibridos(chave);
}

/** DV da simbologia: (Σ valor × peso) mod 103, com o Start de peso 1 (`[MOC-DANFE-C128-DV]`). */
export function dvCode128(codewords: readonly number[]): number {
  return codewords.reduce((soma, v, idx) => soma + v * Math.max(idx, 1), 0) % 103;
}

const asRaw = (codewords: readonly number[]) => codewords.map((v) => `^${String(v).padStart(3, '0')}`).join('');

/** Larguras barra/espaço alternadas, de Start a Stop (com DV), como a biblioteca vai desenhar. Para teste contra os vetores. */
export function larguras(codewords: readonly number[]): string {
  const [sym] = bwipjs.raw({ bcid: 'code128', text: asRaw(codewords), raw: true } as bwipjs.RenderOptions);
  return (sym as { sbs: number[] }).sbs.join('');
}

/**
 * SVG inline do código de barras da chave, sem texto embaixo (a chave sai impressa à parte, `[MOC-DANFE-CHAVE-MASCARA]`).
 * Determinístico: mesma chave ⇒ mesmo SVG.
 */
export function barcodeChaveSvg(chave: string): string {
  return bwipjs.toSVG({
    bcid: 'code128',
    text: asRaw(codewordsChave(chave)),
    raw: true,
    height: 10, // mm — altura mínima 0,8 cm (`[MOC-DANFE-C128-DIM]`)
    includetext: false,
  } as bwipjs.RenderOptions);
}
