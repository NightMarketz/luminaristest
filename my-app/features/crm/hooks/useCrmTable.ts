import { useCallback, useEffect, useState } from 'react';
import { useLatestRequest } from './useLatestRequest';
import { DynamicTableService } from '../../../lib/services/dynamic-table.service';
import { fetchAllRows } from '../lib/crmFetch';
import type { CrmRecord } from './useCrmData';

interface DynTable {
  id: string;
  internalName?: string;
  schema?: unknown;
}

export interface CrmTableState {
  loading: boolean;
  error: string | null;
  table: DynTable | null;
  rows: CrmRecord[];
  reload: () => Promise<void>;
}

/**
 * Generic loader for a single CRM/preset table, resolved by its stable
 * `internalName` (e.g. 'crmContacts', 'leadProposals'). Returns the rows so
 * list screens can render them without bespoke fetching logic.
 */
export function useCrmTable(internalName: string): CrmTableState {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [table, setTable] = useState<DynTable | null>(null);
  const [rows, setRows] = useState<CrmRecord[]>([]);

  const begin = useLatestRequest();

  const reload = useCallback(async () => {
    const isCurrent = begin();
    setLoading(true);
    setError(null);
    try {
      const tablesRes = await DynamicTableService.getTables();
      if (!isCurrent()) return;
      const tables: DynTable[] = (tablesRes?.data ?? []) as DynTable[];
      const t = tables.find((x) => x?.internalName === internalName) ?? null;
      setTable(t);
      if (!t?.id) {
        setRows([]);
        return;
      }
      const fetched = (await fetchAllRows(t.id)) as CrmRecord[];
      if (!isCurrent()) return;
      setRows(fetched);
    } catch (e) {
      if (!isCurrent()) return;
      setError(e instanceof Error ? e.message : 'Falha ao carregar dados');
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [internalName, begin]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { loading, error, table, rows, reload };
}
