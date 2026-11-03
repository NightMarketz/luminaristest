import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import type { ClientRect, CollisionDetection, DragEndEvent, DroppableContainer, UniqueIdentifier } from '@dnd-kit/core';
import { InternalKanbanView } from '../InternalKanbanView';
import { DynamicTableService } from '../../../../../lib/services/dynamic-table.service';
import type { Task } from '../../../../../types/Task.types';
import type { IDynamicTable, ITableSchema } from '../../../components/shared/dynamic-tables.client';

/**
 * Teste-guarda do achado 5 de D-2026-10-29-ACHADOS-FORA-DE-ESCOPO (dono, chat, 2026-10-29: "Ir p/ o card mais
 * próximo"). Depois do #961 (colisão `pointerWithin` primeiro), soltar no VÃO entre dois cards da MESMA coluna acerta
 * só a coluna, e o `handleDragEnd` não faz nada (`useKanbanLogic.tsx`, `if (overIsColumn) return`). Esperado: o card
 * vai para a posição do card mais próximo, como fazia o `closestCenter` antes do #961. Entre colunas diferentes, a
 * área vazia continua mandando para o fim (passo 6, `InternalKanbanView.dropAreaVazia.test.tsx`).
 *
 * Mesma geometria do guarda do passo 6 (p6-antes.png, 1800×1000). Os droppables levam o `data` que o dnd-kit monta:
 * card (`useSortable`) com `sortable.containerId` = id do `SortableContext` da coluna; coluna (`useDroppable`) sem data.
 */
(globalThis as unknown as { React: typeof React }).React = React;

type DndProps = { collisionDetection: CollisionDetection; onDragEnd: (e: DragEndEvent) => Promise<void> | void };
const dnd: { props: DndProps | null } = { props: null };

vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>();
  return {
    ...actual,
    DndContext: (props: DndProps & { children?: React.ReactNode }) => { dnd.props = props; return <>{props.children}</>; },
    DragOverlay: () => null,
  };
});
vi.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k: string, d?: string) => d ?? k }) }));
vi.mock('../../../../../lib/services/dynamic-table.service', () => ({
  DynamicTableService: { updateRecord: vi.fn().mockResolvedValue({ success: true }) },
}));
vi.mock('../KanbanColumn', () => ({ default: () => null }));
vi.mock('../KanbanFilterBar', () => ({ KanbanFilterBar: () => null }));
vi.mock('../components/KanbanCardDetailModal', () => ({ KanbanCardDetailModal: () => null }));
vi.mock('../hooks/useRelationLookups', () => ({ useRelationLookups: () => ({ lookups: {} }) }));
vi.mock('../../../components/shared/FloatingActionButton', () => ({ default: () => null }));
vi.mock('../../shared/components/CategoryHeader', () => ({ default: () => null }));
vi.mock('../../shared/components/CategoryTabs', () => ({ default: () => null }));
vi.mock('../../shared/hooks/useFilterPersistence', () => ({ useFilterPersistence: () => ({ isOpen: false, toggle: () => {} }) }));

const update = vi.mocked(DynamicTableService.updateRecord);

const STATUSES = ['To Do', 'In Progress', 'In Review', 'Done'];
const schema = { fields: [{ name: 'status', type: 'select', options: STATUSES }, { name: 'order', type: 'number' }] } as unknown as ITableSchema;
const table = { id: 't1', name: 'Tasks', internalName: 'tasks' } as unknown as IDynamicTable;
const task = (id: string, status: string, order: number): Task =>
  ({ id, name: id, description: null, status, priority: 'Medium', createdAt: '', updatedAt: '', dynamicTableId: 't1', order }) as unknown as Task;

const tasks = [
  task('A fazer 2', 'To Do', 1000),
  task('Feito 1', 'Done', 1000),
  task('A fazer 1', 'Done', 1500),
  task('Feito 2', 'Done', 2000),
  task('Feito 3', 'Done', 3000),
];
const columnOf = new Map(tasks.map(t => [t.id, String(t.status)]));

const rect = (left: number, top: number, right: number, bottom: number): ClientRect =>
  ({ left, top, right, bottom, width: right - left, height: bottom - top });

const droppableRects = new Map<UniqueIdentifier, ClientRect>([
  ['To Do', rect(281, 200, 635, 975)],
  ['In Progress', rect(661, 200, 1015, 975)],
  ['In Review', rect(1041, 200, 1395, 975)],
  ['Done', rect(1421, 200, 1775, 975)],
  ['A fazer 2', rect(297, 265, 618, 366)],
  ['Feito 1', rect(1437, 265, 1758, 366)],
  ['A fazer 1', rect(1437, 383, 1758, 484)],
  ['Feito 2', rect(1437, 501, 1758, 602)],
  ['Feito 3', rect(1437, 619, 1758, 720)],
]);

const sortableData = (id: UniqueIdentifier) => {
  const containerId = columnOf.get(String(id));
  return { current: containerId ? { sortable: { containerId } } : undefined };
};

const dropAt = async (activeId: string, pointer: { x: number; y: number }) => {
  render(
    <InternalKanbanView tables={[table]} tasks={tasks} activeTabId="t1" setActiveTabId={() => {}}
      schemaByTableId={{ t1: schema }} isLoading={false} error={null} refetch={() => {}} />,
  );
  const { collisionDetection, onDragEnd } = dnd.props!;
  const collisions = collisionDetection({
    active: { id: activeId, data: sortableData(activeId) },
    collisionRect: rect(pointer.x - 160.5, pointer.y - 50.5, pointer.x + 160.5, pointer.y + 50.5),
    droppableRects,
    droppableContainers: [...droppableRects.keys()].map(id => ({ id, data: sortableData(id) })) as unknown as DroppableContainer[],
    pointerCoordinates: pointer,
  } as unknown as Parameters<CollisionDetection>[0]);
  const over = collisions[0] ? { id: collisions[0].id } : null;
  await act(async () => { await onDragEnd({ active: { id: activeId }, over } as unknown as DragEndEvent); });
};

beforeEach(() => update.mockClear());

describe('InternalKanbanView — vão entre cards da mesma coluna (achado 5)', () => {
  it('soltar no vão vai para a posição do card mais próximo', async () => {
    // "Feito 3" solto em y=488: vão entre "A fazer 1" (termina em 484) e "Feito 2" (começa em 501).
    // Centro do card arrastado a 54,5 px do centro de "A fazer 1" e 63,5 px do de "Feito 2" → o mais próximo é "A fazer 1".
    await dropAt('Feito 3', { x: 1598, y: 488 });

    // arrayMove para o índice de "A fazer 1": Feito 1, Feito 3, A fazer 1, Feito 2 → entre 1000 e 1500 = 1250
    expect(update.mock.calls).toEqual([['t1', 'Feito 3', { data: { order: 1250 } }]]);
  });

  it('entre colunas, a área vazia continua mandando para o fim (passo 6)', async () => {
    await dropAt('A fazer 2', { x: 1598, y: 936 });
    expect(update.mock.calls).toEqual([['t1', 'A fazer 2', { data: { status: 'Done', order: 4000 } }]]);
  });
});
