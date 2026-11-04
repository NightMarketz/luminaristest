import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * Teste-guarda estático (GAP-MAP Nível 4, classe "resposta simulada assenta depois do teardown do jsdom").
 *
 * Um mock que resolve num timer (`setTimeout(() => resolve(v), 50)`) deixa a resposta em voo quando o caso termina
 * antes dela. No último caso do arquivo ela chega depois do teardown, que apaga `window`; o `setState` cai em
 * `resolveUpdatePriority` → `ReferenceError: window is not defined` → vitest sai 1 com todos os testes verdes.
 * Mordeu a CI do #439, #455, #1046 (main, 04/11) e #1071 — sempre por timing do worker, nunca reprodutível sob demanda.
 *
 * Esperado: toda resposta simulada em macrotask passa pelo `later()` de `test-utils/later.ts`, que registra a
 * promessa e é drenado por um `afterEach` global no `vitest.setup.ts` — antes do teardown, sem depender do caso.
 * Este guarda reprova qualquer arquivo de teste que monte o atraso por conta própria (e escaparia do dreno).
 */
const APP = path.resolve(__dirname, '..');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (name === 'node_modules' || name === '.next' || name.startsWith('.')) return [];
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : /\.(test|spec)\.tsx?$/.test(name) ? [full] : [];
  });
}

// Callback de timer que resolve uma promessa: `setTimeout(() => resolve(…)` / `setTimeout(() => r(…)`, com ou sem o
// salto de 0 ms (`setTimeout(() => setTimeout(() => resolve(…)`). Espera dentro do próprio caso
// (`await new Promise((r) => setTimeout(r, 20))`) não casa: o caso aguarda o timer, nada fica em voo.
const DELAYED_RESOLVE = /setTimeout\(\s*\(\)\s*=>\s*(?:setTimeout\(\s*\(\)\s*=>\s*)?(?:resolve|r)\(/;
// Mock que devolve promessa atrasada na mesma linha: `mockImplementation(() => new Promise((r) => setTimeout(r, 50)))`.
const DELAYED_MOCK = /mock(?:Implementation|ResolvedValue|RejectedValue)\w*\(.*setTimeout\(/;

describe('resposta simulada em macrotask passa pelo later() drenado', () => {
  it('nenhum arquivo de teste monta resposta atrasada fora de test-utils/later.ts', () => {
    const locais = walk(APP)
      .filter((f) => path.relative(APP, f).replace(/\\/g, '/') !== '__tests__/delayedMockDrain.static.test.ts')
      .flatMap((f) =>
        readFileSync(f, 'utf8')
          .split('\n')
          .map((l, i) => ({ l, at: `${path.relative(APP, f).replace(/\\/g, '/')}:${i + 1}` }))
          .filter(({ l }) => !/^\s*(\/\/|\*)/.test(l) && (DELAYED_RESOLVE.test(l) || DELAYED_MOCK.test(l)))
          .map(({ at }) => at),
      );
    expect(locais, 'resposta atrasada fora do later() compartilhado — fica em voo depois do teardown do jsdom').toEqual([]);
  });
});
