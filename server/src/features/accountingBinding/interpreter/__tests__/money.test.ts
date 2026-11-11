import { ValidationError } from '../../../../lib/errors';
import { MAX_CENTS } from '../../../accounting/models/money';
import { assertCentsInRange, centsFromReais } from '../money';

/**
 * `centsFromReais`/`assertCentsInRange` (BE-INCR-BINDING-PRESS, Corpo D, item 11 do BRIEF) —
 * migração VERBATIM das duas variantes de guard de dinheiro dos mappers atuais (dossiê §c). Estes
 * testes replicam, um a um, os casos de `SaleFinalizedMapper.test.ts` (Variante 1) e
 * `SaleCogsMapper.test.ts` (Variante 2) — se um guard aqui divergir da lógica original, o caso
 * correspondente falha (não é um teste que só espelha a implementação).
 */
describe('centsFromReais — Variante 1 verbatim (float reais → centavos)', () => {
  it('converte reais para centavos com Math.round', () => {
    expect(centsFromReais(1500.5, 'ctx')).toBe(150050);
    expect(centsFromReais(0.005, 'ctx')).toBe(1); // round half-up no limite
  });

  it('rejeita NaN', () => {
    expect(() => centsFromReais(NaN, 'ctx')).toThrow(ValidationError);
  });

  it('rejeita Infinity', () => {
    expect(() => centsFromReais(Infinity, 'ctx')).toThrow(ValidationError);
  });

  it('rejeita zero', () => {
    expect(() => centsFromReais(0, 'ctx')).toThrow(ValidationError);
  });

  it('rejeita negativo', () => {
    expect(() => centsFromReais(-10, 'ctx')).toThrow(ValidationError);
  });

  it('rejeita valor fora da faixa segura de inteiro', () => {
    expect(() => centsFromReais(Number.MAX_SAFE_INTEGER, 'ctx')).toThrow(ValidationError);
  });

  it('rejeita valor que não é number', () => {
    expect(() => centsFromReais('200' as unknown, 'ctx')).toThrow(ValidationError);
  });

  it('mensagem de erro carrega o context recebido', () => {
    expect(() => centsFromReais(0, 'liquidação (venda sale-9)')).toThrow(/liquidação \(venda sale-9\)/);
  });
});

describe('assertCentsInRange — Variante 2 verbatim (centavos já prontos, revalida teto)', () => {
  it('aceita um inteiro seguro dentro do teto, sem tocar no valor', () => {
    expect(assertCentsInRange(20000, 'ctx')).toBe(20000);
  });

  it('rejeita valor não-inteiro (float não cai aqui — não é uma conversão)', () => {
    expect(() => assertCentsInRange(123.45, 'ctx')).toThrow(ValidationError);
  });

  it('rejeita ausente/NaN', () => {
    expect(() => assertCentsInRange(undefined, 'ctx')).toThrow(ValidationError);
    expect(() => assertCentsInRange(NaN, 'ctx')).toThrow(ValidationError);
  });

  it('rejeita zero e negativo', () => {
    expect(() => assertCentsInRange(0, 'ctx')).toThrow(ValidationError);
    expect(() => assertCentsInRange(-1, 'ctx')).toThrow(ValidationError);
  });

  it('rejeita acima de MAX_CENTS e aceita exatamente MAX_CENTS — fronteira dedicada', () => {
    expect(assertCentsInRange(MAX_CENTS, 'ctx')).toBe(MAX_CENTS);
    expect(() => assertCentsInRange(MAX_CENTS + 1, 'ctx')).toThrow(ValidationError);
  });
});

// SOT F-11.1 (Q-07 = a, dono, questionário 2026-11-10): "valor inválido dá erro e o teto MAX_CENTS vale em todos os
// caminhos de reais → centavos do servidor". Caminhos 2 e 3 de 3: as duas variantes deste módulo.
describe('SOT F-11.1 — o teto MAX_CENTS vale nas duas variantes', () => {
  it('SOT F-11.1: centsFromReais rejeita reais que dão centavos acima de MAX_CENTS', () => {
    expect(() => centsFromReais((MAX_CENTS + 1000) / 100, 'ctx')).toThrow(ValidationError);
  });

  it('SOT F-11.1: centsFromReais aceita exatamente MAX_CENTS', () => {
    expect(centsFromReais(MAX_CENTS / 100, 'ctx')).toBe(MAX_CENTS);
  });

  it('SOT F-11.1: assertCentsInRange rejeita lixo e acima de MAX_CENTS (já conforme — referência)', () => {
    expect(() => assertCentsInRange('abc', 'ctx')).toThrow(ValidationError);
    expect(() => assertCentsInRange(MAX_CENTS + 1, 'ctx')).toThrow(ValidationError);
  });
});
