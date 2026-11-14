import { useCallback, useEffect, useRef, useState } from 'react';
import { useAccountingT } from '../lib/useAccountingT';
import { DynamicTableService } from '../../../lib/services/dynamic-table.service';
import { accountingService } from '../../../lib/services/accounting.service';
import type { TrialBalanceReport } from '../../../lib/services/accounting.service';
import type { GovernanceScope } from '../governance/GovernanceScope';

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
export function useAccountingData(governance?: GovernanceScope) {
  // Modo cliente (F-FE-GOV-1 b): `getTrialBalance` não é um dos 9 handlers do F-GOV-7 — resolveria o escopo do
  // PRÓPRIO contador. Sem balancete aqui; as unidades próprias seguem carregando (o "Meus livros" volta a elas).
  const delegated = !!governance;
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

  // Desmonte: descarta a resposta de uma busca de unidades que volta depois (o antigo `active` do efeito).
  const mountedRef = useRef(true);
  // A última busca de unidades falhou? Só o banner usa (retry); o `reload` dos painéis nunca busca unidades.
  const [unitsFailed, setUnitsFailed] = useState(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadUnits = useCallback(async () => {
    setLoadingUnits(true);
    setError(null);
    setUnitsFailed(false);
    try {
      const tables = await DynamicTableService.getTables();
      const list: TableMetaLike[] = Array.isArray(tables?.data) ? (tables.data as TableMetaLike[]) : [];
      const unitsTable =
        list.find((t) => t.internalName === 'units') ??
        list.find((t) => /unidade|units/i.test(String(t.name ?? '')));
      if (!unitsTable?.id) {
        if (mountedRef.current) {
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
      if (mountedRef.current) {
        setUnits(opts);
        setUnitId(opts[0]?.id ?? '');
        setLoadingUnits(false);
      }
    } catch {
      if (mountedRef.current) {
        setUnitsFailed(true);
        setError(tRef.current('view.error.units', 'Falha ao carregar as unidades.'));
        setLoadingUnits(false);
      }
    }
  }, [tRef]);

  // Sem `t` nas deps: carrega as unidades UMA vez. Com `t` o efeito re-disparava a cada render sob i18next
  // não-inicializado.
  useEffect(() => {
    loadUnits();
  }, [loadUnits]);

  const loadReport = useCallback(async (uid: string) => {
    if (!uid || delegated) {
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
  }, [tRef, delegated]);

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
    unitsFailed,
    // Banner, falha ao carregar as unidades (`unitsFailed`): busca-as de novo.
    retryUnits: loadUnits,
    // Refaz o balancete. É também o onLedgerChange/onSuccess dos painéis e do modal: NUNCA busca unidades (religar
    // `loadingUnits` tira o livro do cliente da tela no modo contador e remonta os painéis — #1263, rodadas 2 e 3).
    reload: () => loadReport(unitId),
  };
}
