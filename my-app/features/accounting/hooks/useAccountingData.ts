import { useCallback, useEffect, useState } from 'react';
import { useAccountingT } from '../lib/useAccountingT';
import { DynamicTableService } from '../../../lib/services/dynamic-table.service';
import { accountingService } from '../../../lib/services/accounting.service';
import type { TrialBalanceReport } from '../../../lib/services/accounting.service';

export interface UnitOption {
  id: string;
  label: string;
}

interface TableMetaLike {
  id?: unknown;
  name?: unknown;
  internalName?: unknown;
}
interface RowLike {
  id?: unknown;
  data?: Record<string, unknown>;
}

/**
 * Loads the units the user can keep books for, plus the trial balance for the
 * currently-selected unit. Units come from the `units` DynamicTable (the only
 * coupling to DynamicTable — the accounting data itself is first-class Prisma).
 */
export function useAccountingData() {
  // Só `tRef` aqui: este hook não renderiza nada — todo uso de `t` está dentro de
  // efeito/callback, e é exatamente aí que a identidade instável morde
  // (ver `../lib/useAccountingT`).
  const { tRef } = useAccountingT();
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [unitId, setUnitId] = useState<string>('');
  const [report, setReport] = useState<TrialBalanceReport | null>(null);
  const [loadingUnits, setLoadingUnits] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const tables = await DynamicTableService.getTables();
        const list: TableMetaLike[] = Array.isArray(tables?.data) ? (tables.data as TableMetaLike[]) : [];
        const unitsTable = list.find(
          (t) => t.internalName === 'units' || /unidade|units/i.test(String(t.name ?? '')),
        );
        if (!unitsTable?.id) {
          if (active) {
            setUnits([]);
            setLoadingUnits(false);
          }
          return;
        }
        const rows = await DynamicTableService.getTableData(String(unitsTable.id));
        const data: RowLike[] = Array.isArray(rows?.data) ? (rows.data as RowLike[]) : [];
        const opts: UnitOption[] = data.map((r) => ({
          id: String(r.id),
          label: String(r?.data?.name ?? r?.data?.fantasyName ?? r?.data?.companyName ?? r.id),
        }));
        if (active) {
          setUnits(opts);
          setUnitId(opts[0]?.id ?? '');
          setLoadingUnits(false);
        }
      } catch {
        if (active) {
          setError(tRef.current('view.error.units', 'Falha ao carregar as unidades.'));
          setLoadingUnits(false);
        }
      }
    })();
    return () => {
      active = false;
    };
    // Sem `t` nas deps: este efeito carrega as unidades UMA vez. Com `t` ele
    // re-disparava a cada render sob i18next não-inicializado.
  }, [tRef]);

  const loadReport = useCallback(async (uid: string) => {
    if (!uid) {
      setReport(null);
      return;
    }
    setLoadingReport(true);
    setError(null);
    try {
      const r = await accountingService.getTrialBalance({ unitId: uid });
      setReport(r);
    } catch {
      setError(tRef.current('view.error.report', 'Falha ao carregar o balancete.'));
      setReport(null);
    } finally {
      setLoadingReport(false);
    }
  }, [tRef]);

  useEffect(() => {
    if (unitId) loadReport(unitId);
  }, [unitId, loadReport]);

  return {
    units,
    unitId,
    setUnitId,
    report,
    loadingUnits,
    loadingReport,
    error,
    reload: () => loadReport(unitId),
  };
}
