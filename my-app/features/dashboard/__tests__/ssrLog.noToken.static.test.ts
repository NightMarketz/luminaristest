import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * Teste-guarda estático — achado fora de escopo do #884 (FIX-FE-DASHBOARD, 24/10). O SSR de `pages/dashboard/index.tsx`
 * loga `tokenPreview: token.substring(0, 20)`: o início do JWT (header + começo do payload) vai para o log do servidor
 * do Next a cada visita. Dono, chat, 2026-10-24: "Aborda as questões fora do escopo".
 * Esperado: nenhuma chamada `console.*` do app carrega pedaço do conteúdo do token.
 */
const APP = path.resolve(__dirname, '../../..');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (name === '__tests__' || name === 'node_modules') return [];
    return statSync(full).isDirectory() ? walk(full) : /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

describe('log sem pedaço do token', () => {
  it('nenhum console.* em pages/, features/, lib/, components/ loga token.substring/slice/substr', () => {
    const vazando = ['pages', 'features', 'lib', 'components']
      .flatMap((d) => walk(path.join(APP, d)))
      .flatMap((f) =>
        readFileSync(f, 'utf8')
          .split('\n')
          .map((l, i) => `${path.relative(APP, f).replace(/\\/g, '/')}:${i + 1}: ${l.trim()}`)
          .filter((l) => /console\.\w+\(/.test(l) && /\btoken\??\.(substring|slice|substr)\(/i.test(l)),
      );
    expect(vazando).toEqual([]);
  });
});
