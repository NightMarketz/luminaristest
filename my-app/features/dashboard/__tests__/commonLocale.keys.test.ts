import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Teste-guarda — ACHADOS-2026-10-19 §3.5 itens 16 e 17 (FIX-FE-DASHBOARD).
 *
 * 16: `common.json` (en e pt) declara `actions`, `filters` e `status` duas vezes no nível raiz; o JSON.parse fica
 *     com a última, e `t('actions')` (string) devolve a chave porque o valor vencedor é um objeto.
 * 17: `ConfirmDeleteModal` chama `t('delete_confirmation_title')` e `t('confirm_inactivate')` no ns `common`, que
 *     não tem as chaves → a tela em PT mostra o fallback em inglês.
 * Comportamento correto esperado: nenhuma chave raiz duplicada; as duas chaves existem nos dois idiomas.
 */
const LOCALES = ['en', 'pt'] as const;
const read = (lng: string) => readFileSync(path.resolve(__dirname, `../../../public/locales/${lng}/common.json`), 'utf8');

/** Chaves do objeto raiz, na ordem do texto, com repetição (o JSON.parse colapsa as repetidas). */
function rootKeys(src: string): string[] {
  const keys: string[] = [];
  let depth = 0;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '"') {
      let j = i + 1;
      while (src[j] !== '"') j += src[j] === '\\' ? 2 : 1;
      const str = src.slice(i + 1, j);
      i = j;
      if (depth === 1 && /^\s*:/.test(src.slice(j + 1, j + 20))) keys.push(str);
    } else if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') depth--;
  }
  return keys;
}

describe.each(LOCALES)('common.json (%s)', (lng) => {
  it('item 16: nenhuma chave raiz aparece duas vezes', () => {
    const keys = rootKeys(read(lng));
    const dup = [...new Set(keys.filter((k, i) => keys.indexOf(k) !== i))].sort();
    expect(dup).toEqual([]);
  });

  it('item 17: tem delete_confirmation_title e confirm_inactivate (usadas pelo ConfirmDeleteModal)', () => {
    const json = JSON.parse(read(lng)) as Record<string, unknown>;
    expect(typeof json.delete_confirmation_title).toBe('string');
    expect(typeof json.confirm_inactivate).toBe('string');
  });
});
