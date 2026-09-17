import { isValidCpf as isValidCpfDv, stripCpfMask } from '../../../lib/cpf';
import { isValidCnpj as isValidCnpjDv, stripCnpjMask } from '../../../lib/cnpj';

// --- Validation Utilities for Dynamic Tables ---

/**
 * Valida um CPF: 11 dígitos, não-repetidos, com os dois dígitos verificadores corretos.
 * BE-INCR-DFE F-DFE-17 → (a) (2026-09-17): delega a `lib/cpf.ts` (mesma regra do cadastro do contador,
 * C12) — antes só contava dígitos. Campo vazio continua permitido (o `required` do preset decide).
 * Medido no dev.db real antes da troca: 0 valores em campos `format: 'cpf'|'cnpj'` (nada deixa de editar).
 */
export function isValidCpf(cpf: string): boolean {
  if (typeof cpf !== 'string') return false;
  const digits = stripCpfMask(cpf);
  if (digits.length === 0) return true;
  return isValidCpfDv(digits);
}

/**
 * Valida um CNPJ: 12 posições alfanuméricas + 2 DV numéricos (IN RFB 2.229/2024, vigente desde
 * 01/07/2026) — delega a `lib/cnpj.ts` (BE-INCR-CNPJ-ALFA #280). F-DFE-17 → (a): a versão anterior
 * fazia `replace(/\D/g, '')` e REMOVIA as letras, rejeitando todo CNPJ alfanumérico no preset `units`
 * (ADR-DFE §9.2 item 10 exigia o teste de que ele cadastra). Campo vazio continua permitido.
 */
export function isValidCnpj(cnpj: string): boolean {
  if (typeof cnpj !== 'string') return false;
  const value = stripCnpjMask(cnpj);
  if (value.length === 0) return true;
  return isValidCnpjDv(value);
}

/**
 * Valida CPF OU CNPJ pelo tamanho após tirar a máscara (11 => CPF, 14 => CNPJ), ambos com DV.
 * Útil para campos que aceitam ambos os formatos.
 */
export function isValidCpfOrCnpj(value: string): boolean {
  if (typeof value !== 'string') return false;
  const cnpjLike = stripCnpjMask(value);
  if (cnpjLike.length === 0) return true;
  if (cnpjLike.length === 14) return isValidCnpjDv(cnpjLike);
  const cpfLike = stripCpfMask(value);
  if (cpfLike.length === 11) return isValidCpfDv(cpfLike);
  return false;
}

/**
 * Valida o formato de um telefone brasileiro.
 * Aceita telefones com 10 ou 11 dígitos.
 * 
 * @param phone O telefone a ser validado.
 * @returns `true` se válido, `false` caso contrário.
 */
export function isValidPhone(phone: string): boolean {
  if (typeof phone !== 'string') return false;

  const digits = phone.replace(/\D/g, '');

  // Campo vazio é permitido
  if (digits.length === 0) return true;

  // Verifica se tem 10 ou 11 dígitos (formato brasileiro)
  return digits.length >= 10 && digits.length <= 11;
}
