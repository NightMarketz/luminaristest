'use client';

import { useMemo } from 'react';
import { useTableData, type IDynamicTableData } from '../../../../components/shared/dynamic-tables.client';
import type { PackageCatalog, PackageCatalogEntry } from '../../utils/packageSale';

export type { PackageCatalog, PackageCatalogEntry };

function toCatalogEntry(d: Record<string, unknown>): PackageCatalogEntry {
    const validity = d.validityDays;
    return {
        name: String(d.name ?? ''),
        price: Number(d.price ?? 0),
        validityDays: validity == null || validity === '' ? null : Number(validity),
        active: d.active !== false,
    };
}

/** id → entrada do catálogo de pacotes (FE-INCR-VENDA-PACOTE item 2). Mesmo cliente do `stockIndex`. */
export function buildPackageCatalog(records: IDynamicTableData[]): PackageCatalog {
    const idx: PackageCatalog = {};
    for (const r of records) idx[r.id] = toCatalogEntry((r.data ?? {}) as Record<string, unknown>);
    return idx;
}

/** Carrega a tabela-alvo do campo `packageId` uma vez. `targetTable` vazio = sem fetch, índice vazio. */
export function usePackageCatalog(targetTable: string): PackageCatalog {
    const { records } = useTableData(targetTable);
    return useMemo(() => buildPackageCatalog(records), [records]);
}
