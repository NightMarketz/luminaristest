import React from 'react';
import { useTranslation } from 'next-i18next';
import type { CrmReportTemplate } from '../../../../lib/services/crmReports.service';
import { templateAvailable, type ReportSource } from '../../lib/reportBuilder';

/**
 * "Começar de um modelo" (FE-INCR-CRM-REPORT-BUILDER PR-C, item 19; F-FRB4=(a)). Os modelos vêm de `GET
 * /api/crm/reports/templates`. Clicar num modelo abre o editor preenchido, ainda não salvo. Se a fonte não estiver
 * instalada, o modelo aparece desabilitado e com o motivo. O nome é traduzido pela `key`, e o nome do BE fica como
 * fallback.
 */
export interface CrmReportTemplatesProps {
  templates: CrmReportTemplate[];
  installed: readonly ReportSource[];
  onPick: (template: CrmReportTemplate) => void;
}

export function CrmReportTemplates({ templates, installed, onPick }: CrmReportTemplatesProps) {
  const { t } = useTranslation('crm');
  if (templates.length === 0) return null;

  return (
    <section className="flex flex-col gap-2" aria-labelledby="crm-report-templates-title">
      <h2 id="crm-report-templates-title" className="text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {t('report_builder.templates.title', 'Começar de um modelo')}
      </h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {templates.map((tpl) => {
          const ok = templateAvailable(tpl, installed);
          return (
            <button
              key={tpl.key}
              type="button"
              disabled={!ok}
              onClick={() => onPick(tpl)}
              title={ok ? undefined : t('report_builder.templates.unavailable', 'A tabela deste modelo não está instalada.')}
              className="flex flex-col items-start gap-1 rounded-2xl border border-gray-200 bg-white p-3 text-left transition hover:border-blue-300 hover:bg-blue-50/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-gray-200 disabled:hover:bg-white dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-blue-800 dark:hover:bg-blue-950/20 dark:disabled:hover:border-neutral-800 dark:disabled:hover:bg-neutral-900"
            >
              <span className="text-sm font-bold text-gray-900 dark:text-white">{t(`report_builder.templates.names.${tpl.key}`, tpl.name)}</span>
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                {ok
                  ? t(`report_builder.chart_type.${tpl.chartType}`, tpl.chartType)
                  : t('report_builder.templates.unavailable_short', 'Tabela não instalada')}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
