/**
 * CNPJ alfanumérico no front (Onda 3.1; IN RFB 2.229/2024 — formato `[A-Z0-9]{12}[0-9]{2}`, 14 posições). Espelho de
 * FORMA de `server/src/lib/cnpj.ts`; o dígito verificador NÃO é reimplementado aqui — é do servidor (o 400 aparece na tela).
 * NUNCA `replace(/\D/g, '')` num campo que pode ser CNPJ: isso apagaria as letras.
 */

/** 14 posições, sem máscara, MAIÚSCULO: 12 alfanuméricas + 2 DV numéricos. */
export const CNPJ_REGEX = /^[A-Z0-9]{12}[0-9]{2}$/;
/** CPF segue numérico. */
export const CPF_REGEX = /^[0-9]{11}$/;

/** Remove só a máscara (`.`, `/`, `-`, espaços) e põe em maiúsculas. Não valida. */
export function stripCnpjMask(raw: string): string {
  return raw.replace(/[./\-\s]/g, '').toUpperCase();
}

/** Só `[A-Z0-9]`, maiúsculo, até 14 posições — o que a digitação do campo de CNPJ mantém. */
export function cnpjInput(raw: string): string {
  return raw.replace(/[^0-9A-Za-z]/g, '').toUpperCase().slice(0, 14);
}

/** Máscara progressiva `AA.AAA.AAA/AAAA-DD` (só exibição; o fio leva as 14 posições sem máscara). */
export function formatCnpj(raw: string): string {
  const d = cnpjInput(raw);
  const cuts: Array<[number, number, string]> = [[0, 2, ''], [2, 5, '.'], [5, 8, '.'], [8, 12, '/'], [12, 14, '-']];
  return cuts.reduce((out, [from, to, sep]) => (d.length > from ? `${out}${sep}${d.slice(from, to)}` : out), '');
}
