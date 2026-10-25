import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useKanbanData } from '../useKanbanData';
import { DynamicTableService } from '../../../../../../lib/services/dynamic-table.service';
import type { IDynamicTable } from '../../../../components/shared/dynamic-tables.client';

/**
 * Teste-guarda — RUNBOOK-KANBAN-REORDER passo 4 (FALHOU, #886).
 *
 * Com a rede caindo no meio do rebalanceio, o `catch` do `handleDragEnd` chama `refetch()` ainda offline.
 * `useKanbanData` engole a falha de `getTableData` (`.catch(() => null)`), pula a tabela e grava a lista
 * vazia: o quadro inteiro some até o F5.
 * Esperado: quando o refetch falha, o quadro mantém os cards já carregados.
 */
vi.mock('../../../../../../lib/services/dynamic-table.service', () => ({
  DynamicTableService: {
    getTableById: vi.fn(),
    getTableData: vi.fn(),
  },
}));

const tables = [{ id: 't1', name: 'Tasks', category: 'kanban', schema: { fields: [] } }] as unknown as IDynamicTable[];

describe('useKanbanData — refetch que falha', () => {
  it('falha de rede no refetch não esvazia o quadro', async () => {
    const offline = new TypeError('Failed to fetch');
    vi.mocked(DynamicTableService.getTableById)
      .mockResolvedValueOnce({ success: true, data: { schema: { fields: [] } } } as never)
      .mockRejectedValue(offline);
    vi.mocked(DynamicTableService.getTableData)
      .mockResolvedValueOnce({
        success: true,
        data: [
          { id: 'r1', data: { name: 'A', status: 'todo' }, createdAt: '', updatedAt: '' },
          { id: 'r2', data: { name: 'B', status: 'todo' }, createdAt: '', updatedAt: '' },
        ],
      } as never)
      .mockRejectedValue(offline);

    const { result } = renderHook(() => useKanbanData(tables));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.tasks.map((t) => t.id)).toEqual(['r1', 'r2']);

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.tasks.map((t) => t.id)).toEqual(['r1', 'r2']);
  });
});
