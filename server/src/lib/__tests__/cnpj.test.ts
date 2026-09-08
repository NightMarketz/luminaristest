/**
 * lib/cnpj.ts — CNPJ alfanumérico (IN RFB 2.229/2024, NT 2026.004) + chave de acesso NF-e.
 * BRIEF-CNPJ-ALFA comportamentos 1–5. Vetores: exemplo público `12ABC34501DE → 35`, compatibilidade
 * numérica `11222333/0001 → 81`, e os CNPJs/chaves dos fixtures sintéticos corrigidos (comportamento 9).
 * A lib é PURA: nunca lança ValidationError (comportamento 5) — só Error de programação em base inválida.
 */
import {
  CNPJ_REGEX,
  CPF_OR_CNPJ_REGEX,
  CPF_REGEX,
  NFE_CHAVE_REGEX,
  cnpjCheckDigits,
  isValidCnpj,
  isValidNfeChave,
  nfeChaveCheckDigit,
  stripCnpjMask,
} from '../cnpj';

describe('stripCnpjMask (comportamento 1)', () => {
  it('remove só . / - e espaços, e põe em maiúsculas — nunca apaga letras', () => {
    expect(stripCnpjMask('12.ABC.345/01-DE')).toBe('12ABC34501DE');
    expect(stripCnpjMask('12abc34501de35')).toBe('12ABC34501DE35');
    expect(stripCnpjMask(' 11.222.333/0001-81 ')).toBe('11222333000181');
  });

  it('não valida: caractere fora de máscara permanece (quem rejeita é o DTO/parser)', () => {
    expect(stripCnpjMask('12_ABC')).toBe('12_ABC');
    expect(stripCnpjMask('abc')).toBe('ABC');
  });
});

describe('cnpjCheckDigits (comportamento 2)', () => {
  it('reproduz o exemplo público alfanumérico e os numéricos', () => {
    expect(cnpjCheckDigits('12ABC34501DE')).toBe('35');
    expect(cnpjCheckDigits('112223330001')).toBe('81');
    expect(cnpjCheckDigits('123456780001')).toBe('95');
    expect(cnpjCheckDigits('987654320001')).toBe('98');
  });

  it('lança Error (programação) em base com tamanho errado ou caractere inválido', () => {
    expect(() => cnpjCheckDigits('12345678000')).toThrow(Error);
    expect(() => cnpjCheckDigits('1234567800012')).toThrow(Error);
    expect(() => cnpjCheckDigits('12abc3450 1DE')).toThrow(Error);
    expect(() => cnpjCheckDigits('12abc34501de')).toThrow(Error); // minúscula não é forma canônica
  });
});

describe('isValidCnpj (comportamento 3)', () => {
  it('aceita numérico e alfanumérico com DV corretos', () => {
    expect(isValidCnpj('11222333000181')).toBe(true);
    expect(isValidCnpj('12ABC34501DE35')).toBe(true);
    expect(isValidCnpj('12345678000195')).toBe(true);
  });

  it('rejeita DV errado — inclusive o CNPJ do fixture antigo', () => {
    expect(isValidCnpj('12ABC34501DE36')).toBe(false);
    expect(isValidCnpj('12345678000190')).toBe(false); // fixture antigo: DV correto é 95
    expect(isValidCnpj('98765432000155')).toBe(false); // idem: 98
  });

  it('rejeita tamanho, máscara e minúscula (forma canônica é responsabilidade de quem chama)', () => {
    expect(isValidCnpj('1234567800019')).toBe(false);
    expect(isValidCnpj('123456780001950')).toBe(false);
    expect(isValidCnpj('12.345.678/0001-95')).toBe(false);
    expect(isValidCnpj('12abc34501de35')).toBe(false);
    expect(isValidCnpj('')).toBe(false);
  });

  it('regexes exportados: CNPJ 12 alfanuméricas + 2 dígitos; CPF 11 dígitos; chave 6+12+26', () => {
    expect(CNPJ_REGEX.test('12ABC34501DE35')).toBe(true);
    expect(CNPJ_REGEX.test('12ABC34501DEAB')).toBe(false); // DV tem de ser numérico
    expect(CPF_REGEX.test('88244044940')).toBe(true);
    expect(CPF_REGEX.test('12ABC34501DE35')).toBe(false);
    expect(CPF_OR_CNPJ_REGEX.test('88244044940')).toBe(true);
    expect(CPF_OR_CNPJ_REGEX.test('12ABC34501DE35')).toBe(true);
    expect(CPF_OR_CNPJ_REGEX.test('12abc34501de35')).toBe(false);
    expect(CPF_OR_CNPJ_REGEX.test('1234567890')).toBe(false);
    expect(NFE_CHAVE_REGEX.test('35250912ABC34501DE35550010000000031000000030')).toBe(true);
    expect(NFE_CHAVE_REGEX.test('35250A12ABC34501DE35550010000000031000000030')).toBe(false); // letra fora das posições 7–20
  });
});

describe('nfeChaveCheckDigit / isValidNfeChave (comportamento 4)', () => {
  it('aceita as chaves dos fixtures corrigidos e a variante alfanumérica', () => {
    expect(isValidNfeChave('35250712345678000195550010000000011000000012')).toBe(true);
    expect(isValidNfeChave('35250798765432000198550010000000021000000026')).toBe(true);
    expect(isValidNfeChave('35250912ABC34501DE35550010000000031000000030')).toBe(true);
    expect(nfeChaveCheckDigit('3525071234567800019555001000000001100000001')).toBe(2);
  });

  it('rejeita as chaves antigas (cDV errado) e chave fora do formato', () => {
    expect(isValidNfeChave('35250712345678000190550010000000011000000017')).toBe(false);
    expect(isValidNfeChave('35250798765432000155550010000000021000000025')).toBe(false);
    expect(isValidNfeChave('3525071234567800019555001000000001100000001')).toBe(false); // 43
    expect(isValidNfeChave('35250712345678000195550010000000011000000012X')).toBe(false);
  });

  it('lança Error (programação) se não receber 43 posições', () => {
    expect(() => nfeChaveCheckDigit('123')).toThrow(Error);
  });
});
