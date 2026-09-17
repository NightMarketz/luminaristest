/**
 * BE-INCR-DFE F-DFE-17 → (a) (2026-09-17) + ADR-DFE §9.2 item 10: "teste de que unidade com CNPJ alfanumérico
 * CADASTRA no preset `units`". Antes desta mudança `isValidCnpj` fazia `replace(/\D/g, '')` — as letras
 * sumiam, sobravam 12 dígitos e o preset rejeitava todo CNPJ alfanumérico (verificado em
 * ValidationUtils.ts:37 na sessão de planejamento). Agora delega a lib/cnpj.ts (alfanumérico + DV) e a
 * lib/cpf.ts (DV do CPF). Medido no dev.db real antes da troca: 0 valores em campos `format: 'cpf'|'cnpj'`.
 */
import { isValidCnpj, isValidCpf, isValidCpfOrCnpj } from '../ValidationUtils';
import { SchemaValidator } from '../../validation/SchemaValidator';
import { unitsModule } from '../../presets/modules/core/UnitsModule';
import { ValidationError } from '../../../../lib/errors';

describe('ValidationUtils — CNPJ alfanumérico + DV (F-DFE-17 a)', () => {
  it('CNPJ alfanumérico com DV correto passa; com DV errado falha (vetor de lib/cnpj.ts: 12ABC34501DE → 35)', () => {
    expect(isValidCnpj('12ABC34501DE35')).toBe(true);
    expect(isValidCnpj('12.ABC.345/01-DE35')).toBe(true); // máscara tolerada (stripCnpjMask)
    expect(isValidCnpj('12ABC34501DE36')).toBe(false);
  });

  it('CNPJ numérico: DV confere (11222333000181 ok; 11222333000182 falha) — antes só contava 14 dígitos', () => {
    expect(isValidCnpj('11222333000181')).toBe(true);
    expect(isValidCnpj('11222333000182')).toBe(false);
    expect(isValidCnpj('11111111111111')).toBe(false);
  });

  it('CPF: DV confere (52998224725 ok; 52998224726 falha); vazio continua permitido (required é do preset)', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('52998224726')).toBe(false);
    expect(isValidCpf('')).toBe(true);
    expect(isValidCnpj('')).toBe(true);
  });

  it('isValidCpfOrCnpj decide pelo tamanho sem máscara e aplica DV nos dois', () => {
    expect(isValidCpfOrCnpj('52998224725')).toBe(true);
    expect(isValidCpfOrCnpj('12ABC34501DE35')).toBe(true);
    expect(isValidCpfOrCnpj('12345')).toBe(false);
  });
});

describe('preset `units` — CNPJ alfanumérico cadastra (ADR-DFE §9.2 item 10)', () => {
  const validator = new SchemaValidator();
  const schema = unitsModule.schema;

  it('aceita CNPJ alfanumérico com DV válido', () => {
    const row = validator.validateDataAgainstSchema({ name: 'Filial Centro', cnpj: '12ABC34501DE35', type: 'Own' }, schema);
    expect(row.cnpj).toBe('12ABC34501DE35');
  });

  it('rejeita CNPJ com DV inválido (controle: a validação continua ligada)', () => {
    expect(() => validator.validateDataAgainstSchema({ name: 'Filial Centro', cnpj: '12ABC34501DE36', type: 'Own' }, schema)).toThrow(ValidationError);
  });
});
