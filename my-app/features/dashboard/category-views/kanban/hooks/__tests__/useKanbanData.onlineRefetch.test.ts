import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useKanbanData } from '../useKanbanData';
import { useKanbanLogic } from '../useKanbanLogic';
import { DynamicTableService } from '../../../../../../lib/services/dynamic-table.service';
import type { IDynamicTable, ITableSchema } from '../../../../components/shared/dynamic-tables.client';
import type { DragEndEvent } from '@dnd-kit/core';

/**
 * FE-INCR-KANBAN-REORDER — EMENDA 1 (docs/accounting/FE-INCR-KANBAN-REORDER-EMENDA-1-brief.md §1, forks F-KRO-1..5
 * ratificados 25/10): quando a rede volta (evento `online`), o quadro refaz a busca se a última falhou.
 */
vi.mock('../../../../../../lib/services/dynamic-table.service', () => ({
  DynamicTableService: {
    getTableById: vi.fn(),
    getTableData: vi.fn(),
    updateRecord: vi.fn(),
  },
}));
const byId = vi.mocked(DynamicTableService.getTableById);
const data = vi.mocked(DynamicTableService.getTableData);
const update = vi.mocked(DynamicTableService.updateRecord);

const schema = { fields: [{ name: 'status', type: 'select', options: ['todo'] }, { name: 'order', type: 'number' }] };
const tables = [{ id: 't1', name: 'Tasks', category: 'kanban', schema }] as unknown as IDynamicTable[];
const offline = new TypeError('Failed to fetch');
const meta = { success: true, data: { schema } } as never;
const rows = (...r: Array<[string, number]>) =>
  ({ success: true, data: r.map(([id, order]) => ({ id, data: { name: id, status: 'todo', order }, createdAt: '', updatedAt: '' })) }) as never;
const online = () => act(async () => { window.dispatchEvent(new Event('online')); });

beforeEach(() => {
  byId.mockReset();
  data.mockReset();
  update.mockReset();
  byId.mockResolvedValue(meta);
});

describe('useKanbanData — refetch no evento online', () => {
  it('itens 1 e 2: busca que falhou liga a marca e o online busca de novo; depois do sucesso o online não faz nada', async () => {
    data.mockRejectedValueOnce(offline).mockResolvedValueOnce(rows(['r1', 1000], ['r2', 2000]));
    const { result } = renderHook(() => useKanbanData(tables));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(data).toHaveBeenCalledTimes(1);
    expect(result.current.tasks).toEqual([]);

    await online();
    await waitFor(() => expect(result.current.tasks.map(t => t.id)).toEqual(['r1', 'r2']));
    expect(data).toHaveBeenCalledTimes(2);

    await online();
    expect(data).toHaveBeenCalledTimes(2);
  });

  it('item 2: sem falha, o online não chama getTableData', async () => {
    data.mockResolvedValue(rows(['r1', 1000]));
    const { result } = renderHook(() => useKanbanData(tables));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await online();
    expect(data).toHaveBeenCalledTimes(1);
  });

  it('item 3: o refetch do online falha de novo → a marca segue ligada e o próximo online tenta outra vez', async () => {
    data
      .mockRejectedValueOnce(offline)
      .mockRejectedValueOnce(offline)
      .mockResolvedValueOnce(rows(['r1', 1000]));
    const { result } = renderHook(() => useKanbanData(tables));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await online();
    await waitFor(() => expect(data).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.tasks).toEqual([]);

    await online();
    await waitFor(() => expect(result.current.tasks.map(t => t.id)).toEqual(['r1']));
    expect(data).toHaveBeenCalledTimes(3);
  });

  it('item 4: depois do unmount o online não chama getTableData', async () => {
    data.mockRejectedValueOnce(offline).mockResolvedValue(rows(['r1', 1000]));
    const { result, unmount } = renderHook(() => useKanbanData(tables));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    unmount();
    await online();
    expect(data).toHaveBeenCalledTimes(1);
  });
});

describe('useKanbanLogic + useKanbanData — alinhamento tela × servidor (passo 4 do runbook)', () => {
  it('item 5: rebalanceio parcial (2 PUTs ok, o 3º rejeita) → online → a tela fica com a ordem do servidor', async () => {
    // Empate em 0 força o rebalanceio da coluna inteira (3 writes)
    data
      .mockResolvedValueOnce(rows(['a', 0], ['b', 0], ['c', 0]))
      .mockRejectedValueOnce(offline) // refetch do catch, ainda offline
      .mockResolvedValueOnce(rows(['c', 1000], ['a', 2000], ['b', 0])); // o que o servidor gravou
    update
      .mockResolvedValueOnce({ success: true } as never)
      .mockResolvedValueOnce({ success: true } as never)
      .mockRejectedValueOnce(offline);

    const { result } = renderHook(() => {
      const d = useKanbanData(tables);
      const l = useKanbanLogic({ tasks: d.tasks, activeTabId: 't1', schema: schema as unknown as ITableSchema, refetch: d.refetch });
      return { d, l };
    });
    await waitFor(() => expect(result.current.l.filteredTasks.map(t => t.id)).toEqual(['a', 'b', 'c']));

    await act(async () => {
      await result.current.l.handleDragEnd({ active: { id: 'c' }, over: { id: 'a' } } as unknown as DragEndEvent);
    });
    expect(update).toHaveBeenCalledTimes(3);
    await waitFor(() => expect(data).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.d.isLoading).toBe(false));
    // rollback: a tela mostra o snapshot de antes, não o que o servidor tem
    expect(result.current.l.filteredTasks.map(t => t.id)).toEqual(['a', 'b', 'c']);

    await online();
    await waitFor(() => expect(result.current.l.filteredTasks.map(t => t.id)).toEqual(['b', 'c', 'a']));
    expect(data).toHaveBeenCalledTimes(3);
  });
});
