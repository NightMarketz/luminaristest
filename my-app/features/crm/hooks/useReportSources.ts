import { useCallback, useEffect, useRef, useState } from 'react';
import { DynamicTableService } from '../../../lib/services/dynamic-table.service';
import { isTableSchema, type ISchemaField } from '../../dashboard/components/shared/dynamic-tables.client';
import { installedSources, type ReportSource } from '../lib/reportBuilder';

/**
 * Fontes do builder de relatórios (FE-INCR-CRM-REPORT-BUILDER PR-A, itens 3–4): as da whitelist que estão instaladas
 * (`getTables()` por `internalName`) e, sob demanda, os campos do schema vivo de cada uma (`getTableById` →
 * `{ data: { schema } }` — o apiClient não desembrulha o envelope).
 */
export interface ReportSourcesState {
  sources: ReportSource[];
  loading: boolean;
  error: boolean;
  /** Campos do schema da fonte (cache por fonte); `null` enquanto carrega ou se falhar. */
  fieldsOf: (source: ReportSource) => Promise<ISchemaField[] | null>;
}

export function useReportSources(): ReportSourcesState {
  const [sources, setSources] = useState<ReportSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const tableIds = useRef(new Map<ReportSource, string>());
  const cache = useRef(new Map<ReportSource, Promise<ISchemaField[] | null>>());

  useEffect(() => {
    let alive = true;
    DynamicTableService.getTables()
      .then((res) => {
        const list = Array.isArray(res?.data) ? (res.data as { id?: string; internalName?: string | null }[]) : [];
        const installed = installedSources(list.map((t) => t?.internalName));
        for (const t of list) {
          const s = installed.find((x) => x === t?.internalName);
          if (s && t.id) tableIds.current.set(s, t.id);
        }
        if (alive) setSources(installed);
      })
      .catch(() => {
        if (alive) setError(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const fieldsOf = useCallback((source: ReportSource): Promise<ISchemaField[] | null> => {
    const hit = cache.current.get(source);
    if (hit) return hit;
    const tableId = tableIds.current.get(source);
    if (!tableId) return Promise.resolve(null);
    const p = DynamicTableService.getTableById(tableId)
      .then((meta) => {
        const schema = (meta as { data?: { schema?: unknown } })?.data?.schema;
        return isTableSchema(schema) ? schema.fields : null;
      })
      .catch(() => {
        cache.current.delete(source);
        return null;
      });
    cache.current.set(source, p);
    return p;
  }, []);

  return { sources, loading, error, fieldsOf };
}
