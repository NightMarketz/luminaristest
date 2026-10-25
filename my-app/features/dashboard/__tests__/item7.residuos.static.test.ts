import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Testes-guarda estáticos — ACHADOS-2026-10-19 §3.5 item 7, resíduos (FIX-FE-DASHBOARD). O #806 tirou só os botões do
 * Kanban. Sobram:
 * - "Contact our technical support" no setup (`pages/dashboard/setup.tsx`): `<button>` sem `onClick`.
 *   Decisão do dono (chat, 2026-10-24): "Amplia e remove".
 * - Controle Total (`features/interview/setup/TotalControlSetup.tsx`): `analyzePresetDependencies` devolve sempre mapa
 *   vazio, então auto-seleção de dependências e o aviso ao desmarcar nunca rodam. Decisão do dono (chat, 2026-10-24):
 *   "Remove o código morto" (o servidor segue com as travas).
 */
const APP = path.resolve(__dirname, '../../..');
const read = (rel: string) => readFileSync(path.join(APP, rel), 'utf8');

describe('item 7: setup sem botão sem ação', () => {
  it('todo <button> de pages/dashboard/setup.tsx tem onClick ou type="submit"', () => {
    const src = read('pages/dashboard/setup.tsx');
    const semAcao = src
      .split('<button')
      .slice(1)
      .map((chunk) => chunk.split('</button>')[0])
      .filter((b) => !/onClick=|type="submit"/.test(b))
      .map((b) => b.replace(/\s+/g, ' ').trim().slice(0, 120));
    expect(semAcao).toEqual([]);
  });
});

describe('item 7: Controle Total sem lógica de dependência morta', () => {
  it('TotalControlSetup não carrega o mapa de dependências que sempre volta vazio', () => {
    const src = read('features/interview/setup/TotalControlSetup.tsx');
    const mortos = ['analyzePresetDependencies', 'dependencyMap', 'IPresetDependencyMap'].filter((s) => src.includes(s));
    expect(mortos).toEqual([]);
  });
});
