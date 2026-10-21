import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useKanbanData } from '../useKanbanData';
import type { IDynamicTable } from '../../../../components/shared/dynamic-tables.client';

/**
 * Teste-guarda — ACHADOS-2026-10-19 §3.5 item 29 (FIX-FE-DASHBOARD).
 *
 * `useKanbanData` monta cada `Task` com `priority: data.priority || 'Low'`: registro sem prioridade aparece como
 * "Low" no quadro (e o filtro de prioridade o conta como Low), embora o tipo `Task` aceite `null`.
 * Esperado: registro sem `priority` chega ao quadro com `priority` nula.
 */
vi.mock('../../../../../../lib/services/dynamic-table.service', () => ({
  DynamicTableService: {
    getTableById: vi.fn().mockResolvedValue({ success: true, data: { schema: { fields: [] } } }),
    getTableData: vi.fn().mockResolvedValue({
      success: true,
      data: [{ id: 'r1', data: { name: 'Sem prioridade', status: 'todo' }, createdAt: '', updatedAt: '' }],
    }),
  },
}));

const tables = [{ id: 't1', name: 'Tasks', category: 'kanban', schema: { fields: [] } }] as unknown as IDynamicTable[];

describe('useKanbanData — defaults forçados', () => {
  it('registro sem priority não vira "Low"', async () => {
    const { result } = renderHook(() => useKanbanData(tables));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const task = result.current.tasks.find((t) => t.id === 'r1');
    expect(task).toBeDefined();
    expect(task?.priority ?? null).toBeNull();
  });
});
