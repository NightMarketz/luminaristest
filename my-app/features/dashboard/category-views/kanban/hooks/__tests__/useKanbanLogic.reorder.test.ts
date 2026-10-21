import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { DragEndEvent } from '@dnd-kit/core';
import { useKanbanLogic } from '../useKanbanLogic';
import { DynamicTableService } from '../../../../../../lib/services/dynamic-table.service';
import type { Task } from '../../../../../../types/Task.types';
import type { ITableSchema } from '../../../../components/shared/dynamic-tables.client';

/**
 * FE-INCR-KANBAN-REORDER (forks F-KR-1..6 ratificados 21/10). Substitui o guarda do §3.5 item 22: reordenar
 * dentro da coluna agora grava `order` (updateRecord) e a ordem sobrevive ao refetch.
 */
vi.mock('../../../../../../lib/services/dynamic-table.service', () => ({
  DynamicTableService: { updateRecord: vi.fn().mockResolvedValue({ success: true }) },
}));
const update = vi.mocked(DynamicTableService.updateRecord);

const withOrder = { fields: [{ name: 'status', type: 'select', options: ['todo', 'done'] }, { name: 'order', type: 'number' }] } as unknown as ITableSchema;
const noOrder = { fields: [{ name: 'status', type: 'select', options: ['todo', 'done'] }] } as unknown as ITableSchema;
const task = (id: string, order: number, status = 'todo'): Task =>
  ({ id, name: id, description: null, status, priority: null, createdAt: '', updatedAt: '', dynamicTableId: 't1', order }) as unknown as Task;
const drag = (active: string, over: string) => ({ active: { id: active }, over: { id: over } }) as unknown as DragEndEvent;
const ids = (ts: Task[], status = 'todo') => ts.filter(t => t.status === status).map(t => t.id);

beforeEach(() => update.mockClear());

describe('useKanbanLogic — reordenar dentro da coluna', () => {
  it('item 1: sem ordenação escolhida, os cards saem por order', () => {
    const tasks1 = [task('c', 3000), task('a', 1000), task('b', 2000)];
    const { result } = renderHook(() =>
      useKanbanLogic({ tasks: tasks1, activeTabId: 't1', schema: withOrder, refetch: () => {} }));
    expect(ids(result.current.filteredTasks)).toEqual(['a', 'b', 'c']);
  });

  it('item 2: soltar sobre card da mesma coluna reordena e grava só o card movido', async () => {
    const refetch = vi.fn();
    const tasks2 = [task('a', 1000), task('b', 2000), task('c', 3000)];
    const { result } = renderHook(() =>
      useKanbanLogic({ tasks: tasks2, activeTabId: 't1', schema: withOrder, refetch }));
    await act(async () => { await result.current.handleDragEnd(drag('a', 'c')); });
    expect(ids(result.current.filteredTasks)).toEqual(['b', 'c', 'a']);
    expect(update.mock.calls).toEqual([['t1', 'a', { data: { order: 4000 } }]]);
    expect(refetch).toHaveBeenCalled();
  });

  it('item 3: a ordem gravada sobrevive ao refetch', async () => {
    const { result, rerender } = renderHook(({ tasks }) =>
      useKanbanLogic({ tasks, activeTabId: 't1', schema: withOrder, refetch: () => {} }),
      { initialProps: { tasks: [task('a', 1000), task('b', 2000)] } });
    await act(async () => { await result.current.handleDragEnd(drag('b', 'a')); });
    const order = (update.mock.calls[0][2] as { data: { order: number } }).data.order;
    rerender({ tasks: [task('a', 1000), task('b', order)] });
    expect(ids(result.current.filteredTasks)).toEqual(['b', 'a']);
  });

  it('item 4: outra coluna — sobre card entra na posição; status e order num só update', async () => {
    const tasks3 = [task('a', 1000), task('x', 1000, 'done'), task('y', 2000, 'done')];
    const { result } = renderHook(() =>
      useKanbanLogic({ tasks: tasks3, activeTabId: 't1', schema: withOrder, refetch: () => {} }));
    await act(async () => { await result.current.handleDragEnd(drag('a', 'y')); });
    expect(update.mock.calls).toEqual([['t1', 'a', { data: { status: 'done', order: 1500 } }]]);
    expect(ids(result.current.filteredTasks, 'done')).toEqual(['x', 'a', 'y']);
  });

  it('item 4: outra coluna — na área da coluna vai para o fim', async () => {
    const tasks4 = [task('a', 1000), task('x', 1000, 'done')];
    const { result } = renderHook(() =>
      useKanbanLogic({ tasks: tasks4, activeTabId: 't1', schema: withOrder, refetch: () => {} }));
    await act(async () => { await result.current.handleDragEnd(drag('a', 'done')); });
    expect(update.mock.calls).toEqual([['t1', 'a', { data: { status: 'done', order: 2000 } }]]);
  });

  it('item 7: empate (linhas antigas com 0) regrava a coluna na ordem visível', async () => {
    const tasks5 = [task('a', 0), task('b', 0), task('c', 0)];
    const { result } = renderHook(() =>
      useKanbanLogic({ tasks: tasks5, activeTabId: 't1', schema: withOrder, refetch: () => {} }));
    await act(async () => { await result.current.handleDragEnd(drag('c', 'a')); });
    expect(update.mock.calls.map(c => [c[1], (c[2] as { data: { order: number } }).data.order])).toEqual([
      ['c', 1000], ['a', 2000], ['b', 3000],
    ]);
    expect(ids(result.current.filteredTasks)).toEqual(['c', 'a', 'b']);
  });

  it('falha na gravação faz rollback da ordem local', async () => {
    update.mockRejectedValueOnce(new Error('500'));
    const tasks6 = [task('a', 1000), task('b', 2000)];
    const { result } = renderHook(() =>
      useKanbanLogic({ tasks: tasks6, activeTabId: 't1', schema: withOrder, refetch: () => {} }));
    await act(async () => { await result.current.handleDragEnd(drag('a', 'b')); });
    expect(ids(result.current.filteredTasks)).toEqual(['a', 'b']);
  });

  it('item 6: tabela sem campo order — mesma coluna não reordena; outra coluna só muda status', async () => {
    const tasks7 = [task('a', 0), task('b', 0)];
    const { result } = renderHook(() =>
      useKanbanLogic({ tasks: tasks7, activeTabId: 't1', schema: noOrder, refetch: () => {} }));
    expect(result.current.hasOrderField).toBe(false);
    await act(async () => { await result.current.handleDragEnd(drag('a', 'b')); });
    expect(update).not.toHaveBeenCalled();
    await act(async () => { await result.current.handleDragEnd(drag('a', 'done')); });
    expect(update.mock.calls).toEqual([['t1', 'a', { data: { status: 'done' } }]]);
  });
});
