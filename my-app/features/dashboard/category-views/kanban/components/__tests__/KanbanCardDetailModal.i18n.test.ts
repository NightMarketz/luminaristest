import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Teste-guarda — ACHADOS-2026-10-19 §3.5 item 18 (FIX-FE-DASHBOARD), recorte do Kanban.
 *
 * O detalhe do card escreve texto de tela direto no JSX, em PT ("Ações Rápidas", "Arquivar", "Utilitários",
 * "Criado em", "Informações Detalhadas"…), fora do `t()` que o componente já importa — a tela em EN mostra PT.
 * Esperado: nenhum texto visível literal no JSX nem em `label="…"`; tudo passa por `t()`.
 * O achado fala em ~12 arquivos sem listá-los; este guarda cobre o arquivo que o achado nomeia (Kanban).
 */
const src = readFileSync(path.resolve(__dirname, '../KanbanCardDetailModal.tsx'), 'utf8');

describe('KanbanCardDetailModal — item 18: texto de tela fora do i18n', () => {
  it('sem texto literal visível em nó JSX ou em label="…"', () => {
    const jsxText = [...src.matchAll(/>\s*([A-Za-zÀ-ÿ][^<>{}\n]*?)\s*</g)].map((m) => m[1].trim());
    const labels = [...src.matchAll(/\blabel="([^"]+)"/g)].map((m) => m[1]);
    const literais = [...new Set([...jsxText, ...labels])].filter((s) => /[A-Za-zÀ-ÿ]{2,}/.test(s)).sort();
    expect(literais).toEqual([]);
  });
});
