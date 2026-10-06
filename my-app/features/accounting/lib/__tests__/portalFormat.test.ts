import { describe, it, expect } from 'vitest';
import { PORTAL_THOUSANDS_SEPARATOR, portalCTribNac, portalDate, portalDoc, portalMoney, portalPercent } from '../portalFormat';

/** portalFormat (FE-INCR-DFE item 20): tabela de casos por função; fora do formato lança (nunca aproxima). */
describe('portalFormat', () => {
  it('portalDate: AAAA-MM-DD → DD/MM/AAAA, sem fuso', () => {
    expect(portalDate('2026-10-06')).toBe('06/10/2026');
    expect(portalDate('2026-01-31')).toBe('31/01/2026');
    expect(() => portalDate('2026-10-06T03:00:00.000Z')).toThrow();
    expect(() => portalDate('06/10/2026')).toThrow();
  });

  it.each([
    ['1234.56', '1234,56'],
    ['0.5', '0,50'],
    ['10', '10,00'],
    ['1000000.00', '1000000,00'],
    ['0.05', '0,05'],
  ])('portalMoney(%s) → %s (sem milhar)', (input, out) => {
    expect(PORTAL_THOUSANDS_SEPARATOR).toBe('');
    expect(portalMoney(input)).toBe(out);
  });

  it('portalMoney: negativo, 3 casas e texto são recusados', () => {
    expect(() => portalMoney('-1.00')).toThrow();
    expect(() => portalMoney('1.234')).toThrow();
    expect(() => portalMoney('1,00')).toThrow();
    expect(() => portalMoney('')).toThrow();
  });

  it.each([
    ['2.00', '2,00'],
    ['15.5', '15,50'],
    ['0', '0,00'],
  ])('portalPercent(%s) → %s', (input, out) => {
    expect(portalPercent(input)).toBe(out);
  });

  it('portalPercent: negativo recusado', () => {
    expect(() => portalPercent('-2.00')).toThrow();
  });

  it('portalDoc: só dígitos; CPF (11) e CNPJ (14); outro tamanho lança', () => {
    expect(portalDoc('12.345.678/0001-95')).toBe('12345678000195');
    expect(portalDoc('123.456.789-09')).toBe('12345678909');
    expect(portalDoc('12345678000195')).toBe('12345678000195');
    expect(() => portalDoc('1234')).toThrow();
  });

  it('portalCTribNac: 010701 → 01.07.01; fora de 6 dígitos lança', () => {
    expect(portalCTribNac('010701')).toBe('01.07.01');
    expect(portalCTribNac('060101')).toBe('06.01.01');
    expect(() => portalCTribNac('01.07.01')).toThrow();
    expect(() => portalCTribNac('1070')).toThrow();
  });
});
