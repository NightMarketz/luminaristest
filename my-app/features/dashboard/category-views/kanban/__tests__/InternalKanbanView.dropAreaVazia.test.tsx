import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import type { ClientRect, CollisionDetection, DragEndEvent, DroppableContainer, UniqueIdentifier } from '@dnd-kit/core';
import { InternalKanbanView } from '../InternalKanbanView';
import { DynamicTableService } from '../../../../../lib/services/dynamic-table.service';
import type { Task } from '../../../../../types/Task.types';
import type { IDynamicTable, ITableSchema } from '../../../components/shared/dynamic-tables.client';

/**
 * Teste-guarda (sessao-instrumentacao) do passo 6 do RUNBOOK-KANBAN-REORDER, que FALHOU na rodada de 27/10:
 * soltar o card na ÁREA VAZIA de outra coluna deve mandá-lo para o FIM dela (F-KR-4). Na tela, "A fazer 2" solto
 * em {x:1598, y:936} na coluna Done gravou order 2500 (antes de "Feito 3"), não 4000.
 *
 * O teste do #824 (useKanbanLogic.reorder, item 4) passa `over: { id: 'done' }` direto e não exercita a colisão.
 * Aqui o `over` sai da detecção de colisão que o próprio InternalKanbanView entrega ao DndContext, alimentada com a
 * geometria medida em docs/runbooks/evidencia-kanban-reorder-2026-10-27/p6-antes.png (viewport 1800×1000).
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

// Estado de p6.log ("antes"), coluna Done: Feito 1, A fazer 1, Feito 2, Feito 3 (orders do "banco depois")
const tasks = [
  task('A fazer 2', 'To Do', 1000),
  task('Feito 1', 'Done', 1000),
  task('A fazer 1', 'Done', 1500),
  task('Feito 2', 'Done', 2000),
  task('Feito 3', 'Done', 3000),
];

const rect = (left: number, top: number, right: number, bottom: number): ClientRect =>
  ({ left, top, right, bottom, width: right - left, height: bottom - top });

// Droppables medidos no p6-antes.png: colunas (useDroppable em KanbanColumn) e cards (sortable)
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

// `data` como o dnd-kit monta: card (useSortable) com sortable.containerId = coluna; coluna (useDroppable) sem data
const columnOf = new Map(tasks.map(t => [t.id, String(t.status)]));
const sortableData = (id: UniqueIdentifier) => {
  const containerId = columnOf.get(String(id));
  return { current: containerId ? { sortable: { containerId } } : undefined };
};

describe('InternalKanbanView — RUNBOOK-KANBAN-REORDER passo 6', () => {
  it('soltar na área vazia de outra coluna manda o card para o fim dela', async () => {
    render(
      <InternalKanbanView tables={[table]} tasks={tasks} activeTabId="t1" setActiveTabId={() => {}}
        schemaByTableId={{ t1: schema }} isLoading={false} error={null} refetch={() => {}} />,
    );
    const { collisionDetection, onDragEnd } = dnd.props!;

    // "A fazer 2" (321×101) arrastado pelo centro até {x:1598, y:936}: área vazia de Done, abaixo de "Feito 3" (y≤720)
    const pointer = { x: 1598, y: 936 };
    const collisions = collisionDetection({
      active: { id: 'A fazer 2', data: sortableData('A fazer 2') },
      collisionRect: rect(pointer.x - 160.5, pointer.y - 50.5, pointer.x + 160.5, pointer.y + 50.5),
      droppableRects,
      droppableContainers: [...droppableRects.keys()].map(id => ({ id, data: sortableData(id) })) as unknown as DroppableContainer[],
      pointerCoordinates: pointer,
    } as unknown as Parameters<CollisionDetection>[0]);
    const over = collisions[0] ? { id: collisions[0].id } : null;

    await act(async () => { await onDragEnd({ active: { id: 'A fazer 2' }, over } as unknown as DragEndEvent); });

    // Fim da coluna = depois de "Feito 3" (3000) → 4000, num único update com status + order (F-KR-4)
    expect(update.mock.calls).toEqual([['t1', 'A fazer 2', { data: { status: 'Done', order: 4000 } }]]);
  });
});
