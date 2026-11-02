import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { KanbanFilterBar } from '../KanbanFilterBar';
import { useKanbanData } from '../hooks/useKanbanData';
import { useKanbanLogic } from '../hooks/useKanbanLogic';
import type { IDynamicTable, ITableSchema } from '../../../components/shared/dynamic-tables.client';

/**
 * Teste-guarda (sessao-instrumentacao) do passo 7 do RUNBOOK-KANBAN-REORDER, que FALHOU na rodada de 28/10:
 * "Escolha uma ordenação na barra do Kanban" — com a barra aberta não havia seletor de ordenação (`<select>` 0,
 * sem "Sort by"; evidencia-kanban-reorder-2026-10-28/p7.log). Esperado: a barra oferece a ordenação e, escolhida,
 * ela ordena os cards. Dados pelo caminho real (useKanbanData → useKanbanLogic → KanbanFilterBar), service mockado.
 */
(globalThis as unknown as { React: typeof React }).React = React;

vi.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k: string, d?: string) => d ?? k }) }));

const { schema } = vi.hoisted(() => ({
  schema: { fields: [{ name: 'status', type: 'select', options: ['To Do', 'Done'] }, { name: 'order', type: 'number' }] },
}));
vi.mock('../../../../../lib/services/dynamic-table.service', () => ({
  DynamicTableService: {
    getTableById: vi.fn().mockResolvedValue({ success: true, data: { schema } }),
    getTableData: vi.fn().mockResolvedValue({
      success: true,
      data: [
        { id: 'c', data: { name: 'Charlie', status: 'To Do', priority: 'Medium', order: 1000 }, createdAt: '', updatedAt: '' },
        { id: 'a', data: { name: 'Alpha', status: 'To Do', priority: 'Medium', order: 2000 }, createdAt: '', updatedAt: '' },
        { id: 'b', data: { name: 'Bravo', status: 'To Do', priority: 'Medium', order: 3000 }, createdAt: '', updatedAt: '' },
      ],
    }),
  },
}));

const tables = [{ id: 't1', name: 'Tasks', category: 'kanban', schema }] as unknown as IDynamicTable[];

function Harness() {
  const { tasks } = useKanbanData(tables);
  const logic = useKanbanLogic({ tasks, activeTabId: 't1', schema: schema as unknown as ITableSchema, refetch: () => {} });
  return (
    <>
      <KanbanFilterBar isOpen query={logic.query} setQuery={logic.setQuery} priorityFilter={logic.priorityFilter}
        setPriorityFilter={logic.setPriorityFilter} sortConfig={logic.sortConfig} setSortConfig={logic.setSortConfig}
        tasks={logic.filteredTasks} stats={{ total: 0, done: 0, inProgress: 0 }} />
      <ul data-testid="coluna">{logic.filteredTasks.map(t => <li key={t.id}>{t.name}</li>)}</ul>
    </>
  );
}

const coluna = () => Array.from(screen.getByTestId('coluna').querySelectorAll('li')).map(li => li.textContent);

describe('Kanban — RUNBOOK-KANBAN-REORDER passo 7', () => {
  it('a barra oferece ordenação e, escolhida, ela ordena os cards', async () => {
    const { container } = render(<Harness />);
    await waitFor(() => expect(coluna()).toEqual(['Charlie', 'Alpha', 'Bravo'])); // ordem manual (order)

    const sortSelect = container.querySelector<HTMLSelectElement>('select:has(option[value="name"])');
    expect(sortSelect, 'a barra do Kanban não oferece ordenação por nome').not.toBeNull();
    fireEvent.change(sortSelect!, { target: { value: 'name' } });

    expect(coluna()).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });
});
