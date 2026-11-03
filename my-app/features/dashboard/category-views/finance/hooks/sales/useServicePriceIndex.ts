'use client';

import { useMemo } from 'react';
import { useTableData, type IDynamicTableData } from '../../../../components/shared/dynamic-tables.client';

/** id → `price` do catálogo de serviços (só os com preço > 0). Mesmo padrão do `usePackageCatalog`. */
export function buildServicePriceIndex(records: IDynamicTableData[]): Record<string, number> {
    const idx: Record<string, number> = {};
    for (const r of records) {
        const price = Number((r.data as Record<string, unknown> | undefined)?.price ?? 0);
        if (price > 0) idx[r.id] = price;
    }
    return idx;
}

/** Carrega a tabela-alvo do campo `serviceId` uma vez. `targetTable` vazio = sem fetch, índice vazio. */
export function useServicePriceIndex(targetTable: string): Record<string, number> {
    const { records } = useTableData(targetTable);
    return useMemo(() => buildServicePriceIndex(records), [records]);
}
