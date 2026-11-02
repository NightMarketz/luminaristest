import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, cleanup } from '@testing-library/react';
import { SortSelect } from '../SortSelect';

/**
 * Teste-guarda — achado 6 do #961 (dono, chat, 2026-10-29): a ordenação do Kanban oferecia `order`, a posição do card
 * na coluna (campo `hidden` do TasksModule, mantido pelo arrastar). Esperado: `order` não vira opção de ordenação.
 */
vi.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (key: string, def?: unknown) => (typeof def === 'string' ? def : key) }),
}));

afterEach(() => cleanup());

describe('SortSelect — campos detectados', () => {
  it('não oferece `order`', () => {
    const { container } = render(
      <SortSelect value={null} onChange={() => {}} records={[{ id: 't1', data: { name: 'Tarefa', order: 0, priority: 'high' } }]} />,
    );
    const opcoes = Array.from(container.querySelectorAll('option')).map((o) => o.value);
    expect(opcoes).toEqual(['', 'name', 'priority']);
  });
});
