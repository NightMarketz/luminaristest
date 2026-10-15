import { useEffect, useState } from 'react';
import { loadCrmReportTemplates, type CrmReportTemplate } from '../../../lib/services/crmReports.service';
import type { MoneyCurrencyPairs } from '../lib/reportBuilder';

/**
 * Modelos prontos e pares valor→moeda do builder (FE-INCR-CRM-REPORT-BUILDER PR-C, item 19; `GET
 * /api/crm/reports/templates`, buscado uma vez por `loadCrmReportTemplates`).
 */
export interface ReportTemplatesState {
  templates: CrmReportTemplate[];
  /** `null` enquanto carrega ou se falhar. Sem os pares, o editor não sabe o que é dinheiro com moeda, então fica bloqueado. */
  pairs: MoneyCurrencyPairs | null;
  loading: boolean;
  error: boolean;
}

export function useReportTemplates(): ReportTemplatesState {
  const [state, setState] = useState<ReportTemplatesState>({ templates: [], pairs: null, loading: true, error: false });

  useEffect(() => {
    let alive = true;
    loadCrmReportTemplates()
      .then((data) => {
        if (alive) setState({ templates: data.templates, pairs: data.moneyCurrencyPairs, loading: false, error: false });
      })
      .catch(() => {
        if (alive) setState({ templates: [], pairs: null, loading: false, error: true });
      });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
