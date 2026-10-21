import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * Teste-guarda — ACHADOS-2026-10-19 §3.5 item 21 (FIX-FE-DASHBOARD).
 *
 * Só `components/ui/Modal.tsx` (e o `ConfirmModal`, que o reusa) declara `role="dialog"` com foco e trap; os modais
 * e gavetas do dashboard montam o próprio overlay `fixed inset-0` sem isso. Esperado: todo arquivo `*Modal.tsx` /
 * `*Drawer.tsx` em `features/dashboard` e `components` que desenha overlay próprio declara `role="dialog"` ou
 * renderiza o `Modal` canônico. (Foco e trap não são visíveis no fonte; o guarda cobre a parte estática.)
 */
const APP = path.resolve(__dirname, '../../..');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (name === '__tests__' || name === 'node_modules') return [];
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe('item 21: modais com role="dialog"', () => {
  it('todo *Modal/*Drawer com overlay próprio declara role="dialog" ou usa o Modal canônico', () => {
    const files = ['features/dashboard', 'components']
      .flatMap((d) => walk(path.join(APP, d)))
      .filter((f) => /(Modal|Drawer)\.tsx$/.test(f));
    expect(files.length).toBeGreaterThan(0);

    const semDialog = files
      .filter((f) => {
        const src = readFileSync(f, 'utf8');
        if (!/fixed inset-0/.test(src)) return false;
        return !/role=["']dialog["']/.test(src) && !/<Modal\b/.test(src);
      })
      .map((f) => path.relative(APP, f).replace(/\\/g, '/'))
      .sort();
    expect(semDialog).toEqual([]);
  });
});
