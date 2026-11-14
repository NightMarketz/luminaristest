import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Toda linha expansível dos painéis contábeis usa `<painel>.col.expand` no `RowExpandButton`. A chave tem de existir
 * em pt E en: sem ela o `t(key, 'Expandir')` cai no texto em português no idioma inglês, e a checagem de paridade
 * não pega porque a chave falta nos dois arquivos (achado do revisor no #1257).
 */
const root = join(__dirname, '../../../../public/locales');
const load = (loc: string) => JSON.parse(readFileSync(join(root, loc, 'accounting.json'), 'utf-8')) as Record<string, any>;
const PAINEIS = ['contasAPagar', 'contasAReceber', 'approvals', 'journalEntries', 'reconciliation'];

describe('RowExpandButton — rótulo traduzido (pt e en)', () => {
  for (const loc of ['pt', 'en']) {
    for (const painel of PAINEIS) {
      it(`${loc}: ${painel}.col.expand existe`, () => {
        const v = load(loc)[painel]?.col?.expand;
        expect(typeof v).toBe('string');
        expect(v.length).toBeGreaterThan(0);
      });
    }
  }
});
