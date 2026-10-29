import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, cleanup } from '@testing-library/react';
import { KanbanFilterBar } from '../KanbanFilterBar';
import type { Task } from '@/types/Task.types';

/**
 * Teste-guarda — RUNBOOK-KANBAN-REORDER passo 7 (FALHOU na rodada de 2026-10-28, branch do #961).
 *
 * O passo pede "escolha uma ordenação na barra do Kanban (por exemplo, prioridade)", e a barra aberta não
 * oferece nenhuma. O `SortSelect` só detecta campos em `record.data` e devolve `null` sem campos; o `Task`
 * que o `useKanbanData` monta espalha os campos no topo (`...data`), sem `data`.
 * Esperado: com cards que têm `priority`, a barra de filtros oferece o seletor de ordenação com "Prioridade".
 */
vi.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (key: string, def?: unknown) => (typeof def === 'string' ? def : key) }),
}));

afterEach(() => cleanup());

// Mesmo formato que `useKanbanData.tsx` grava: campos dinâmicos no topo, sem `data`.
const card = (id: string, name: string, priority: Task['priority'], order: number): Task => ({
  id,
  name,
  description: '',
  status: 'To_Do',
  priority,
  order,
  createdAt: '2026-10-28T12:00:00.000Z',
  updatedAt: '2026-10-28T12:00:00.000Z',
  dynamicTableId: 'tbl-tasks',
});

describe('KanbanFilterBar — ordenação (RUNBOOK-KANBAN-REORDER passo 7)', () => {
  it('a barra oferece ordenar por prioridade quando os cards têm prioridade', () => {
    const tasks = [card('t1', 'A fazer 1', 'High', 1000), card('t2', 'A fazer 2', 'Low', 2000)];

    const { container } = render(
      <KanbanFilterBar
        query=""
        setQuery={() => {}}
        priorityFilter=""
        setPriorityFilter={() => {}}
        sortConfig={null}
        setSortConfig={() => {}}
        tasks={tasks}
        stats={{ total: 2, done: 0, inProgress: 0 }}
      />,
    );

    const opcoesDeOrdenacao = Array.from(container.querySelectorAll('select option')).map((o) => o.textContent);
    expect(opcoesDeOrdenacao).toContain('Prioridade');
  });
});
