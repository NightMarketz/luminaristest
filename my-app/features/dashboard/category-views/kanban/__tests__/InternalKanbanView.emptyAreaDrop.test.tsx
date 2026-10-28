import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { getFirstCollision } from '@dnd-kit/core';
import type { Active, ClientRect, CollisionDetection, DndContextProps, DragEndEvent, DroppableContainer, UniqueIdentifier } from '@dnd-kit/core';
import { InternalKanbanView } from '../InternalKanbanView';
import { DynamicTableService } from '../../../../../lib/services/dynamic-table.service';
import type { Task } from '../../../../../types/Task.types';
import type { IDynamicTable } from '../../../components/shared/dynamic-tables.client';

/**
 * FE-INCR-KANBAN-REORDER, runbook passo 6 (rodada de 27/10, FALHOU): soltar na ÁREA VAZIA de outra coluna deve
 * mandar o card para o fim (F-KR-4 (a), ratificado 21/10). Na tela, o PATCH saiu com order 2500 (antes do último).
 * O item 4 de useKanbanLogic.reorder.test.ts injeta `over: { id: 'done' }` e não passa pela detecção de colisão;
 * aqui o `collisionDetection` e o `onDragEnd` são os que o InternalKanbanView entrega ao DndContext, e a geometria
 * é a do passo 6 (coluna Done com 4 cards, ponteiro 40 px acima da borda de baixo, abaixo do último card).
 */
(globalThis as unknown as { React: typeof React }).React = React;

let dnd: DndContextProps | undefined;
vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>();
  return {
    ...actual,
    DndContext: (props: DndContextProps) => { dnd = props; return null; },
    DragOverlay: () => null,
  };
});
vi.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k: string, d?: string) => d ?? k }) }));
vi.mock('../../../../../lib/services/dynamic-table.service', () => ({
  DynamicTableService: { updateRecord: vi.fn().mockResolvedValue({ success: true }) },
}));
vi.mock('../KanbanColumn', () => ({ default: () => null }));
vi.mock('../KanbanTaskCard', () => ({ default: () => null }));
vi.mock('../KanbanFilterBar', () => ({ KanbanFilterBar: () => null }));
vi.mock('../components/KanbanCardDetailModal', () => ({ KanbanCardDetailModal: () => null }));
vi.mock('../hooks/useRelationLookups', () => ({ useRelationLookups: () => ({ lookups: {} }) }));
vi.mock('../../../components/shared/FloatingActionButton', () => ({ default: () => null }));
vi.mock('../../../shared/components/EmptyState', () => ({ EmptyState: () => null }));
vi.mock('../../shared/components/CategoryHeader', () => ({ default: () => null }));
vi.mock('../../shared/components/CategoryTabs', () => ({ default: () => null }));
vi.mock('../../shared/hooks/useFilterPersistence', () => ({ useFilterPersistence: () => ({ isOpen: false, toggle: () => {} }) }));
const update = vi.mocked(DynamicTableService.updateRecord);

const task = (id: string, order: number, status: string): Task =>
  ({ id, name: id, description: null, status, priority: null, createdAt: '', updatedAt: '', dynamicTableId: 't1', order }) as unknown as Task;
const rect = (left: number, top: number, width: number, height: number): ClientRect =>
  ({ left, top, width, height, right: left + width, bottom: top + height });

describe('InternalKanbanView — soltar na área vazia de outra coluna (runbook passo 6)', () => {
  it('F-KR-4 (a): a colisão real resolve para a coluna e o card vai para o fim (order 4000)', async () => {
    // Estado do banco antes do passo 6: Done = Feito 1, A fazer 1, Feito 2, Feito 3
    const tasks = [
      task('aFazer2', 2000, 'To Do'),
      task('feito1', 1000, 'Done'), task('aFazer1', 1500, 'Done'), task('feito2', 2000, 'Done'), task('feito3', 3000, 'Done'),
    ];
    const table = { id: 't1', name: 'Tarefas', internalName: 'tasks', schema: {} } as unknown as IDynamicTable;
    const schema = { fields: [{ name: 'status', type: 'select', options: ['To Do', 'Done'] }, { name: 'order', type: 'number' }] };
    render(<InternalKanbanView tables={[table]} tasks={tasks} activeTabId="t1" setActiveTabId={() => {}}
      schemaByTableId={{ t1: schema }} isLoading={false} error={null} refetch={() => {}} />);
    const collisionDetection = dnd?.collisionDetection as CollisionDetection;
    const onDragEnd = dnd?.onDragEnd as (e: DragEndEvent) => Promise<void>;
    expect(collisionDetection).toBeTypeOf('function');

    // Geometria do passo 6: cada coluna é o droppable inteiro (cabeçalho + lista min-h-[500px]); cards de 100 px, gap 16
    const rects = new Map<UniqueIdentifier, ClientRect>([
      ['To Do', rect(1100, 200, 320, 776)], ['aFazer2', rect(1110, 276, 300, 100)],
      ['Done', rect(1438, 200, 320, 776)],
      ['feito1', rect(1448, 276, 300, 100)], ['aFazer1', rect(1448, 392, 300, 100)],
      ['feito2', rect(1448, 508, 300, 100)], ['feito3', rect(1448, 624, 300, 100)], // último card termina em y=724
    ]);
    const pointer = { x: 1598, y: 936 }; // área vazia de Done, 40 px acima da borda de baixo (976)
    const collisionRect = rect(pointer.x - 150, pointer.y - 50, 300, 100); // card arrastado sob o ponteiro
    const droppableContainers = [...rects.keys()].map(id => ({ id }) as unknown as DroppableContainer);
    const active = { id: 'aFazer2', rect: { current: { initial: rects.get('aFazer2'), translated: collisionRect } }, data: { current: {} } } as unknown as Active;

    const over = getFirstCollision(collisionDetection({ active, collisionRect, droppableRects: rects, droppableContainers, pointerCoordinates: pointer }), 'id');
    await onDragEnd({ active, over: over === null ? null : { id: over } } as unknown as DragEndEvent);

    expect({ over, patch: update.mock.calls[0]?.[2] }).toEqual({ over: 'Done', patch: { data: { status: 'Done', order: 4000 } } });
  });
});
