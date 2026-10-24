'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { DynamicTableService } from '../../../../../lib/services/dynamic-table.service';
import { SortOption, sortRecords } from '../../shared/SortSelect';
import type { Task, TaskStatus } from '../../../../../types/Task.types';
import type { ISchemaField, ITableSchema } from '../../../components/shared/dynamic-tables.client';
import { computeDropOrder, sortByManualOrder, type OrderWrite } from './kanbanOrder';

interface UseKanbanLogicProps {
    tasks: Task[];
    activeTabId: string;
    schema: ITableSchema | null; // Schema of the active table
    onTabChangeCallback?: (tabId: string) => void;
    refetch: () => void;
}

export function useKanbanLogic({ tasks, activeTabId, schema, onTabChangeCallback, refetch }: UseKanbanLogicProps) {
    // --- State ---
    const [query, setQuery] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [sortConfig, setSortConfig] = useState<SortOption | null>(null);
    const [activeTask, setActiveTask] = useState<Task | null>(null);

    // Optimistic UI state for tasks
    const [localTasks, setLocalTasks] = useState<Task[]>([]);

    // Sync local tasks when props change
    useEffect(() => {
        setLocalTasks(tasks);
    }, [tasks]);

    // --- Columns Extraction ---
    const columns = useMemo(() => {
        let cols: { title: string; status: string }[] = [];
        const statusField = schema?.fields?.find((f: ISchemaField) => f.name === 'status');

        if (statusField && statusField.type === 'select' && statusField.options && statusField.options.length > 0) {
            cols = statusField.options.map((option) => {
                if (typeof option === 'string') { return { title: option, status: option }; }
                return { title: option.label, status: option.value };
            });
        } else {
            // Fallback: extract unique from current active tab tasks
            const tabTasks = localTasks.filter(t => t.dynamicTableId === activeTabId);
            const uniqueStatuses = Array.from(new Set(tabTasks.map(r => r.status).filter(Boolean)));
            if (uniqueStatuses.length > 0) {
                cols = uniqueStatuses.map(status => ({ title: String(status), status: String(status) }));
            } else {
                cols = [
                    { title: 'To Do', status: 'todo' },
                    { title: 'In Progress', status: 'in_progress' },
                    { title: 'Done', status: 'done' }
                ];
            }
        }
        return cols;
    }, [schema, localTasks, activeTabId]);

    // --- Filters ---
    const filteredTasks = useMemo(() => {
        let result = localTasks.filter(t => t.dynamicTableId === activeTabId);

        if (query.trim()) {
            const q = query.toLowerCase();
            result = result.filter(t => t.name.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q)));
        }

        if (priorityFilter) {
            result = result.filter(t => t.priority === priorityFilter);
        }

        // Sem ordenação escolhida, vale a ordem manual (FE-INCR-KANBAN-REORDER item 1)
        result = sortConfig ? sortRecords(result, sortConfig) : sortByManualOrder(result);

        return result;
    }, [localTasks, activeTabId, query, priorityFilter, sortConfig]);

    // Reordenar exige o campo `order` no schema (F-KR-6) e nenhuma ordenação escolhida pelo usuário
    const hasOrderField = useMemo(() => !!schema?.fields?.some((f: ISchemaField) => f.name === 'order'), [schema]);
    const canReorder = hasOrderField && !sortConfig;

    // --- Stats ---
    const tabStats = useMemo(() => {
        const tabTasks = localTasks.filter(t => t.dynamicTableId === activeTabId);

        // Count done vs not done (assuming last column is "done")
        const doneColumnStatus = columns.length > 0 ? columns[columns.length - 1].status : 'done';
        const done = tabTasks.filter(t => t.status === doneColumnStatus).length;

        const byTable: Record<string, number> = {};
        localTasks.forEach(t => {
            const tableId = String(t.dynamicTableId);
            byTable[tableId] = (byTable[tableId] || 0) + 1;
        });

        return {
            total: tabTasks.length,
            done,
            inProgress: tabTasks.length - done,
            byTable
        };
    }, [localTasks, activeTabId, columns]);

    // --- Handlers ---
    const handleTabChange = useCallback((tabId: string) => {
        if (onTabChangeCallback) onTabChangeCallback(tabId);
        setQuery('');
    }, [onTabChangeCallback]);

    const handleDragStart = useCallback((event: DragStartEvent) => {
        const { active } = event;
        const task = localTasks.find(t => t.id === active.id);
        setActiveTask(task || null);
    }, [localTasks]);

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTask(null);

        if (!over) return;

        const activeId = String(active.id);
        const overId = String(over.id);
        const moved = localTasks.find(t => t.id === activeId);
        if (!moved || activeId === overId) return;

        const overIsColumn = columns.some(c => c.status === overId);
        const overTask = overIsColumn ? undefined : localTasks.find(t => t.id === overId);
        if (!overIsColumn && !overTask) return;
        const newStatus = (overIsColumn ? overId : overTask!.status) as TaskStatus;
        const sameColumn = newStatus === moved.status;

        // Coluna inteira (sem filtro de busca), na ordem manual
        const columnOf = (status: string) =>
            sortByManualOrder(localTasks.filter(t => t.dynamicTableId === activeTabId && t.status === status));

        let writes: OrderWrite[] = [];
        if (canReorder) {
            let rest: Task[];
            let targetIndex: number;
            if (sameColumn) {
                if (overIsColumn) return; // soltar na área da própria coluna: nada muda
                const full = columnOf(newStatus);
                const reordered = arrayMove(full, full.findIndex(t => t.id === activeId), full.findIndex(t => t.id === overId));
                targetIndex = reordered.findIndex(t => t.id === activeId);
                rest = reordered.filter(t => t.id !== activeId);
            } else {
                rest = columnOf(newStatus);
                // F-KR-4: sobre um card entra na posição dele; na área da coluna, vai para o fim
                targetIndex = overIsColumn ? rest.length : rest.findIndex(t => t.id === overId);
            }
            writes = computeDropOrder(rest, activeId, targetIndex);
        } else if (sameColumn) {
            return; // F-KR-6 / ordenação escolhida: drag só muda de coluna
        }

        const orderById = new Map(writes.map(w => [w.id, w.order]));
        const originalTasks = [...localTasks];

        // Optimistic update
        setLocalTasks(prev => prev.map(t => {
            const order = orderById.get(t.id);
            if (t.id === activeId) return { ...t, status: newStatus, ...(order !== undefined ? { order } : {}) };
            return order !== undefined ? { ...t, order } : t;
        }));

        try {
            // Card movido primeiro, num único update (status + order); depois o rebalanceio, sem toast
            const movedData: Record<string, unknown> = sameColumn ? {} : { status: newStatus };
            if (orderById.has(activeId)) movedData.order = orderById.get(activeId);
            await DynamicTableService.updateRecord(activeTabId, activeId, { data: movedData });
            for (const w of writes) {
                if (w.id === activeId) continue;
                await DynamicTableService.updateRecord(activeTabId, w.id, { data: { order: w.order } }, { successMessage: null });
            }
            refetch();
        } catch (error) {
            console.error(error);
            setLocalTasks(originalTasks); // Rollback
            if (writes.length > 1) refetch(); // rebalanceio parcial: o servidor manda
        }
    }, [localTasks, columns, activeTabId, canReorder, refetch]);

    return {
        // State
        query,
        setQuery,
        priorityFilter,
        setPriorityFilter,
        sortConfig,
        setSortConfig,

        // Computed
        filteredTasks,
        columns,
        activeTask,
        tabStats,
        canReorder,
        hasOrderField,

        // Handlers
        handleTabChange,
        handleDragStart,
        handleDragEnd
    };
}
