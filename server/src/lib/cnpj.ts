/**
 * CNPJ alfanumérico + chave de acesso da NF-e — lib PURA (BE-INCR-CNPJ-ALFA / T10).
 *
 * Espelha `lib/ofx.ts` / `lib/nfe.ts`: zero dependência, zero I/O, zero Prisma. NÃO lança
 * `ValidationError` — quem valida fronteira (DTO Zod, parser) decide a mensagem; aqui só há
 * booleanos e cálculo. Erro de PROGRAMAÇÃO (base com tamanho errado) lança `Error` comum.
 *
 * Regra de domínio (BRIEF-CNPJ-ALFA §Cabeçalho; IN RFB 2.229/2024 em produção desde 01/07/2026;
 * NT 2026.004 para a NF-e — fontes secundárias convergentes, primária pendente na triagem T10):
 *  - CNPJ = 12 posições `[A-Z0-9]` (8 raiz + 4 ordem) + 2 dígitos verificadores NUMÉRICOS.
 *  - Valor de cada posição = código ASCII − 48 ('0'→0 … '9'→9, 'A'→17 … 'Z'→42).
 *  - DV1: pesos 5,4,3,2,9,8,7,6,5,4,3,2 sobre as 12; DV2: pesos 6,5,4,3,2,9,8,7,6,5,4,3,2 sobre as 13.
 *    resto < 2 ⇒ 0, senão 11 − resto. Compatível com o CNPJ numérico (11222333/0001 → 81).
 *  - Chave de acesso 4.00: `[0-9]{6}[A-Z0-9]{12}[0-9]{26}` — posições 7–20 = CNPJ do emitente;
 *    `cDV` (44ª) = módulo 11 com pesos 2..9 cíclicos da direita para a esquerda, resto 0/1 ⇒ 0.
 *    Letras nas posições do CNPJ entram no módulo 11 pelo mesmo valor ASCII − 48
 *    [grau: inferido de fonte secundária — NT 2026.004; vetor de teste = fixture sintético].
 *
 * Manual da ECF Leiaute 12 (20/05/2026) §2.4 já declara `CNPJ C 014` (alfanumérico) com o exemplo
 * `AAA.AA.AAA/AAAA-10 ➔ |AAAAAAAAAAAA10|` — sem máscara, 14 posições exatas.
 */

/** 14 posições, sem máscara, MAIÚSCULO: 12 alfanuméricas + 2 DV numéricos. */
export const CNPJ_REGEX = /^[A-Z0-9]{12}[0-9]{2}$/;
/** CPF segue numérico (a IN 2.229 não o altera). */
export const CPF_REGEX = /^[0-9]{11}$/;
/** CPF (11 dígitos) OU CNPJ (14 posições) — um regex só, para o snapshot de shape dos DTOs enxergar o contrato (refine é invisível ao JSON Schema). */
export const CPF_OR_CNPJ_REGEX = /^[0-9]{11}$|^[A-Z0-9]{12}[0-9]{2}$/;
/** Chave de acesso NF-e 4.00 pós NT 2026.004. */
export const NFE_CHAVE_REGEX = /^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$/;

/**
 * Remove SÓ os caracteres de máscara ('.', '/', '-' e espaços) e põe em maiúsculas.
 * NUNCA `\D` — isso apagaria as letras do CNPJ alfanumérico (F-CNPJ-1 → lib normaliza).
 * Não valida: `'12.ABC.345/01-DE'` → `'12ABC34501DE'`; `'abc'` → `'ABC'`.
 */
export function stripCnpjMask(raw: string): string {
  return raw.replace(/[./\-\s]/g, '').toUpperCase();
}

/** Valor de uma posição: código ASCII − 48 (vale para dígitos e para A–Z). */
function charValue(ch: string): number {
  return ch.charCodeAt(0) - 48;
}

const DV1_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const DV2_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

function mod11(values: number[], weights: number[]): number {
  let sum = 0;
  for (let i = 0; i < weights.length; i++) sum += values[i] * weights[i];
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

/**
 * Dígitos verificadores de uma base de 12 posições `[A-Z0-9]` (já sem máscara, maiúscula).
 * `'12ABC34501DE'` → `'35'` · `'112223330001'` → `'81'` · `'123456780001'` → `'95'`.
 * Lança `Error` (programação, não fronteira) se a base não tiver exatamente 12 posições válidas.
 */
export function cnpjCheckDigits(base12: string): string {
  if (!/^[A-Z0-9]{12}$/.test(base12)) {
    throw new Error(`cnpjCheckDigits: base deve ter 12 posições [A-Z0-9], recebeu "${base12}".`);
  }
  const values = Array.from(base12, charValue);
  const dv1 = mod11(values, DV1_WEIGHTS);
  const dv2 = mod11([...values, dv1], DV2_WEIGHTS);
  return `${dv1}${dv2}`;
}

/** Forma canônica (`CNPJ_REGEX`) E dígitos verificadores conferem. Não normaliza — chame `stripCnpjMask` antes. */
export function isValidCnpj(value: string): boolean {
  if (!CNPJ_REGEX.test(value)) return false;
  return cnpjCheckDigits(value.slice(0, 12)) === value.slice(12);
}

/**
 * `cDV` de uma chave de acesso: módulo 11 sobre as 43 primeiras posições, pesos 2..9 cíclicos da
 * direita para a esquerda; resto 0 ou 1 ⇒ 0. Letras (posições do CNPJ) valem ASCII − 48.
 * Lança `Error` se não receber exatamente 43 posições.
 */
export function nfeChaveCheckDigit(chave43: string): number {
  if (chave43.length !== 43) {
    throw new Error(`nfeChaveCheckDigit: esperava 43 posições, recebeu ${chave43.length}.`);
  }
  let sum = 0;
  let weight = 2;
  for (let i = chave43.length - 1; i >= 0; i--) {
    sum += charValue(chave43[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

/** `NFE_CHAVE_REGEX` E o `cDV` (44ª posição) confere. */
export function isValidNfeChave(chave44: string): boolean {
  if (!NFE_CHAVE_REGEX.test(chave44)) return false;
  return nfeChaveCheckDigit(chave44.slice(0, 43)) === Number(chave44[43]);
}
