/**
 * CPF — máscara e dígitos verificadores (par de `lib/cnpj.ts`, mesma disciplina: normaliza na
 * borda, valida por regra pública, nunca inventa formato).
 *
 * Regra do DV (Receita Federal, algoritmo módulo 11 do CPF): para cada um dos dois dígitos
 * verificadores, soma dos 9 (depois 10) primeiros dígitos ponderados de 10..2 (11..2), resto da
 * divisão por 11; DV = 0 se resto < 2, senão 11 - resto. Sequências de um só dígito repetido
 * (`11111111111`) passam no módulo 11 e são rejeitadas explicitamente — a RFB não as emite.
 *
 * BESPOKE LOCAL, não import de `dynamicTables/utils/ValidationUtils.isValidCpf`: aquele utilitário
 * vive do outro lado da fronteira de plataforma (Contrato §2.1); o cadastro do contador é Prisma
 * first-class e valida por conta própria (mesmo argumento de `normalizeTaxId` no Counterparty).
 */

/** Tira a máscara usual (`123.456.789-09` → `12345678909`). Só remove pontuação; não completa zeros. */
export function stripCpfMask(value: string): string {
  return value.replace(/[.\-\s]/g, '');
}

function checkDigit(digits: string, length: number): number {
  let sum = 0;
  for (let i = 0; i < length; i += 1) sum += Number(digits[i]) * (length + 1 - i);
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

/** 11 dígitos, não-repetidos, com os dois DVs corretos. Recebe o valor JÁ sem máscara. */
export function isValidCpf(value: string): boolean {
  if (!/^\d{11}$/.test(value)) return false;
  if (/^(\d)\1{10}$/.test(value)) return false;
  return checkDigit(value, 9) === Number(value[9]) && checkDigit(value, 10) === Number(value[10]);
}
