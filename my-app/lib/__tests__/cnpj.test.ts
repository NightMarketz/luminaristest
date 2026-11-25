import { CNPJ_REGEX, formatCnpj, stripCnpjMask } from '../cnpj';

describe('lib/cnpj (Onda 3.1 — CNPJ alfanumérico, IN RFB 2.229/2024)', () => {
  it('stripCnpjMask tira só a máscara, põe em maiúsculas e NUNCA apaga letras', () => {
    expect(stripCnpjMask('12.abc.345/01de-35')).toBe('12ABC34501DE35');
    expect(stripCnpjMask('11.222.333/0001-81')).toBe('11222333000181');
  });
  it('CNPJ_REGEX = 12 posições [A-Z0-9] + 2 dígitos numéricos', () => {
    expect(CNPJ_REGEX.test('12ABC34501DE35')).toBe(true);
    expect(CNPJ_REGEX.test('11222333000181')).toBe(true);
    expect(CNPJ_REGEX.test('12ABC34501DEA5')).toBe(false);
    expect(CNPJ_REGEX.test('12abc34501de35')).toBe(false);
  });
  it('formatCnpj mascara progressivamente com letras', () => {
    expect(formatCnpj('12ABC34501DE35')).toBe('12.ABC.345/01DE-35');
    expect(formatCnpj('12')).toBe('12');
    expect(formatCnpj('12abc')).toBe('12.ABC');
    expect(formatCnpj('12ABC345')).toBe('12.ABC.345');
  });
});
