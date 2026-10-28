'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { IDynamicTable, ISchemaField } from '../../../components/shared/dynamic-tables.client';
import { DynamicTableService } from '../../../../../lib/services/dynamic-table.service';
import { Task } from '../../../../../types/Task.types';

export function useKanbanData(tables: IDynamicTable[]) {
    // Filter tables with 'kanban' or 'tasks' category
    const kanbanTables = useMemo(() => {
        return tables.filter(t =>
            t.category === 'kanban' ||
            t.category === 'tasks' ||
            t.internalName === 'tasks' ||
            t.name.toLowerCase() === 'tasks' ||
            t.name.toLowerCase() === 'tarefas'
        );
    }, [tables]);

    const [aggregatedData, setAggregatedData] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [schemaMap, setSchemaMap] = useState<Record<string, unknown>>({});
    const [error, setError] = useState<string | null>(null);
    // Emenda 1 (F-KRO-1/2): a última busca falhou? Ref para o listener `online` não re-registrar
    const lastFetchFailed = useRef(false);

    const fetchData = useCallback(async () => {
        if (kanbanTables.length === 0) {
            setIsLoading(false);
            setAggregatedData([]);
            lastFetchFailed.current = false;
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const results: Task[] = [];
            const newSchemaMap: Record<string, unknown> = {};
            const failedTableIds = new Set<string>();

            await Promise.all(kanbanTables.map(async (table) => {
                const [tableData, tableRecords] = await Promise.all([
                    DynamicTableService.getTableById(table.id).catch(() => null),
                    DynamicTableService.getTableData(table.id).catch(() => null)
                ]);

                type TableMetaWithData = { success?: boolean; data?: { schema?: unknown } };
                const tableDataTyped = tableData as unknown as TableMetaWithData;
                if (tableDataTyped?.success && tableDataTyped.data) {
                    newSchemaMap[table.id] = tableDataTyped.data.schema || table.schema;
                } else {
                    newSchemaMap[table.id] = table.schema;
                }

                type TableRecordsTyped = { success?: boolean; data?: Array<{ id: string; data?: Record<string, unknown>; createdAt?: string; updatedAt?: string }> };
                const tableRecordsTyped = tableRecords as unknown as TableRecordsTyped;
                if (tableRecordsTyped?.success && tableRecordsTyped.data) {
                    const records = tableRecordsTyped.data || [];

                    // Extract columns to determine default status
                    let defaultStatus = 'todo';
                    const schema = newSchemaMap[table.id] as { fields?: ISchemaField[] } | null;
                    if (schema && schema.fields) {
                        const statusField = schema.fields.find((f: ISchemaField) => f.name === 'status');
                        if (statusField && statusField.options && statusField.options.length > 0) {
                            defaultStatus = typeof statusField.options[0] === 'string'
                                ? statusField.options[0]
                                : statusField.options[0].value;
                        }
                    }

                    records.forEach((record) => {
                        const data = (record.data || {}) as Record<string, unknown>;
                        results.push({
                            ...data, // Preserve all dynamic fields from the backend
                            id: record.id,
                            name: (data.name || data.title || 'Untitled') as string,
                            description: (data.description || '') as string,
                            status: (data.status || defaultStatus) as 'To_Do' | 'In_Progress' | 'Done' | 'Archived',
                            priority: (data.priority || null) as 'Low' | 'Medium' | 'High' | 'Urgent' | null,
                            createdAt: record.createdAt ?? '',
                            updatedAt: record.updatedAt ?? '',
                            dynamicTableId: table.id,
                        });
                    });
                } else {
                    console.error(`Failed to fetch data for table ${table.name}`);
                    failedTableIds.add(table.id);
                }
            }));

            // Tabela que falhou mantém os cards já carregados (refetch offline não esvazia o quadro)
            setAggregatedData(prev => [...results, ...prev.filter(t => typeof t.dynamicTableId === 'string' && failedTableIds.has(t.dynamicTableId))]);
            setSchemaMap(newSchemaMap);
            lastFetchFailed.current = failedTableIds.size > 0;
        } catch (err) {
            console.error('Error fetching kanban data:', err);
            setError('Failed to load tasks');
            lastFetchFailed.current = true;
        } finally {
            setIsLoading(false);
        }
    }, [kanbanTables]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Emenda 1 (F-KRO-3 = só o `online`): a rede voltou e a última busca falhou → busca de novo
    useEffect(() => {
        const onOnline = () => { if (lastFetchFailed.current) void fetchData(); };
        window.addEventListener('online', onOnline);
        return () => window.removeEventListener('online', onOnline);
    }, [fetchData]);

    return {
        kanbanTables,
        tasks: aggregatedData,
        isLoading,
        error,
        refetch: fetchData,
        schemaByTableId: schemaMap,
    };
}
