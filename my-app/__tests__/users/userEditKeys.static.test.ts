import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * L-20261113-152223-5f02: `t('userEditBackToList')` não existia nos locales e aparecia literalmente na tela de erro da
 * edição de usuário. Guarda: toda chave citada como `t('chave')` (sem texto padrão) em users/edit/[id].tsx existe em
 * common.json de en e pt.
 */
const app = path.resolve(__dirname, '../..');
const src = fs.readFileSync(path.join(app, 'pages/users/edit/[id].tsx'), 'utf8');
const keys = [...src.matchAll(/\bt\(\s*['"]([A-Za-z0-9_.]+)['"]\s*\)/g)].map((m) => m[1]);

describe('users/edit/[id] — chaves i18n existem', () => {
  for (const lng of ['en', 'pt']) {
    it(`common.json (${lng}) tem todas as chaves sem texto padrão`, () => {
      const json = JSON.parse(fs.readFileSync(path.join(app, `public/locales/${lng}/common.json`), 'utf8')) as Record<string, unknown>;
      const missing = [...new Set(keys)].filter((k) => !(k in json));
      expect(missing).toEqual([]);
    });
  }
});
