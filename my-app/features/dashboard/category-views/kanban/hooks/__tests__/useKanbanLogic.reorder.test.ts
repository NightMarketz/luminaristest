import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { DragEndEvent } from '@dnd-kit/core';
import { useKanbanLogic } from '../useKanbanLogic';
import { DynamicTableService } from '../../../../../../lib/services/dynamic-table.service';
import type { Task } from '../../../../../../types/Task.types';
import type { ITableSchema } from '../../../../components/shared/dynamic-tables.client';

/**
 * Teste-guarda — ACHADOS-2026-10-19 §3.5 item 22 (FIX-FE-DASHBOARD).
 *
 * Soltar um card sobre outro da mesma coluna faz `arrayMove` só em `localTasks`: nada vai ao servidor, e o próximo
 * refetch desfaz a ordem que o usuário viu. Esperado (neutro entre as correções possíveis): a tela não mostra uma
 * ordem que não persiste — ou o reordenar é gravado (`updateRecord`), ou a ordem local não muda.
 */
vi.mock('../../../../../../lib/services/dynamic-table.service', () => ({
  DynamicTableService: { updateRecord: vi.fn().mockResolvedValue({ success: true }) },
}));

const schema = { fields: [{ name: 'status', type: 'select', options: ['todo', 'done'] }] } as unknown as ITableSchema;
const task = (id: string): Task =>
  ({ id, name: id, description: null, status: 'todo', priority: null, createdAt: '', updatedAt: '', dynamicTableId: 't1' }) as unknown as Task;

describe('useKanbanLogic — reordenar dentro da coluna', () => {
  it('reordenar persiste ou não acontece', async () => {
    const tasks = [task('a'), task('b'), task('c')];
    const { result } = renderHook(() =>
      useKanbanLogic({ tasks, activeTabId: 't1', schema, refetch: () => {} }),
    );
    const before = result.current.filteredTasks.map((t) => t.id);
    expect(before).toEqual(['a', 'b', 'c']);

    await act(async () => {
      await result.current.handleDragEnd({ active: { id: 'a' }, over: { id: 'c' } } as unknown as DragEndEvent);
    });

    const after = result.current.filteredTasks.map((t) => t.id);
    const persisted = vi.mocked(DynamicTableService.updateRecord).mock.calls.length > 0;
    expect({ persisted, orderChangedLocally: after.join() !== before.join() }).not.toEqual({
      persisted: false,
      orderChangedLocally: true,
    });
  });
});
