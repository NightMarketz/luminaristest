/**
 * Widget `crm-report` do dashboard (FE-INCR-CRM-REPORT-BUILDER PR-D, BRIEF §1 item 20, F-RB2=(a); contrato §3
 * `CrmReportWidgetConfig`). O `widgetConfig` vem do layout persistido (sem tipo no grid) — entra por esta guarda.
 */
export interface CrmReportWidgetConfig {
  reportId: string;
}

/** `widgetConfig` persistido → config do widget; qualquer outra forma = ainda não configurado (`null`). */
export function parseCrmReportWidgetConfig(raw: unknown): CrmReportWidgetConfig | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const reportId = (raw as { reportId?: unknown }).reportId;
  return typeof reportId === 'string' && reportId.trim() !== '' ? { reportId } : null;
}
