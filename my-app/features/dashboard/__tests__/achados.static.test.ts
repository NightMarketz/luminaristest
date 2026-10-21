import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * Testes-guarda estáticos — ACHADOS-2026-10-19 §3.5 itens 25, 26, 27 e 30 (FIX-FE-DASHBOARD).
 *
 * 25: `renderContent` (pages/dashboard/index.tsx) isenta a categoria `'sales'` do estado vazio, mas `renderByCategory`
 *     não tem `case 'sales'` → cai no `GenericTabbedView` com zero tabelas ("No tables found"). Esperado: toda
 *     categoria isenta do estado vazio tem renderizador próprio.
 * 26: `RightSidebar` deixa `console.log` de depuração e um `setTimeout` que só loga. Esperado: nenhum `console.log`.
 * 27: `window.confirm` nativo (`DashboardSidebar`, `components/ui/Modal.tsx`) em vez do modal de confirmação do app.
 *     Esperado: nenhum `confirm` global em features/dashboard e components.
 * 30: o hook `shared/hooks/useRelationLookups` está marcado `@deprecated` e continua com chamador vivo
 *     (`KpiDrillDownDrawer`). Esperado: nenhum import fora de teste.
 */
const APP = path.resolve(__dirname, '../../..');
const read = (rel: string) => readFileSync(path.join(APP, rel), 'utf8');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (name === '__tests__' || name === 'node_modules') return [];
    return statSync(full).isDirectory() ? walk(full) : /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}
const rel = (f: string) => path.relative(APP, f).replace(/\\/g, '/');

describe('item 25: categoria isenta do estado vazio tem renderizador', () => {
  it("toda categoria em `!== '<cat>'` do renderContent tem `case '<cat>'` no renderByCategory", () => {
    const src = read('pages/dashboard/index.tsx');
    const cases = new Set([...src.matchAll(/case '([a-z]+)'/g)].map((m) => m[1]));
    expect(cases.size).toBeGreaterThan(0);
    const emptyLine = src.split('\n').find((l) => /filteredTables\.length === 0/.test(l)) ?? '';
    const isentas = [...emptyLine.matchAll(/!== '([a-z]+)'/g)].map((m) => m[1]);
    expect(isentas.filter((c) => !cases.has(c))).toEqual([]);
  });
});

describe('item 26: RightSidebar sem log de depuração', () => {
  it('nenhum console.log em features/interview/components/RightSidebar/index.tsx', () => {
    const logs = read('features/interview/components/RightSidebar/index.tsx')
      .split('\n')
      .map((l, i) => [i + 1, l.trim()] as const)
      .filter(([, l]) => /console\.log\(/.test(l));
    expect(logs).toEqual([]);
  });
});

describe('item 27: sem window.confirm nativo', () => {
  it('nenhum confirm() global em features/dashboard e components', () => {
    const hits = ['features/dashboard', 'components']
      .flatMap((d) => walk(path.join(APP, d)))
      .flatMap((f) => {
        const src = readFileSync(f, 'utf8');
        const confirmLocal = /\{\s*[^}]*\bconfirm\b[^}]*\}\s*=|const confirm\b|function confirm\b/.test(src);
        return src.split('\n').flatMap((l, i) => {
          const nativo = /\bwindow\.confirm\(/.test(l) || (!confirmLocal && /(^|[^.\w])confirm\(/.test(l));
          return nativo ? [`${rel(f)}:${i + 1}`] : [];
        });
      });
    expect(hits).toEqual([]);
  });
});

describe('item 30: hook deprecado sem chamador', () => {
  it('ninguém importa shared/hooks/useRelationLookups fora de teste', () => {
    const importers = walk(path.join(APP, 'features'))
      .filter((f) => /from ['"][^'"]*shared\/hooks\/useRelationLookups['"]/.test(readFileSync(f, 'utf8')))
      .map(rel);
    expect(importers).toEqual([]);
  });
});
