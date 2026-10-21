import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';
import { SENSITIVE_RADICALS, matchesSensitiveRadical } from '../manualChanges';

// W6 emenda item 11 (F-MS-3 a): o FE espelha a rede de radicais do servidor só para mostrar o selo e a caixa antes de
// salvar; quem decide é o servidor (400 sem a ciência). As duas listas não podem divergir.
describe('manualChanges — rede de dado sensível', () => {
  it('a lista do FE é a mesma do servidor (FieldProposal.SENSITIVE_RADICALS)', () => {
    const fonte = readFileSync(
      resolve(__dirname, '../../../../../../server/src/features/interview/FieldCustomizationService/FieldProposal.ts'),
      'utf8',
    );
    const bloco = fonte.match(/const SENSITIVE_RADICALS = \[([\s\S]*?)\] as const;/);
    expect(bloco).not.toBeNull();
    const doServidor = Array.from(bloco![1].matchAll(/'([^']+)'/g), (m) => m[1]);
    expect([...SENSITIVE_RADICALS]).toEqual(doServidor);
  });

  it('casa sem acento e sem caixa, pelo nome ou pelo rótulo', () => {
    expect(matchesSensitiveRadical('obs', 'Histórico de Saúde')).toBe(true);
    expect(matchesSensitiveRadical('ALERGIAS', '')).toBe(true);
    expect(matchesSensitiveRadical('apelido', 'Apelido')).toBe(false);
  });
});
