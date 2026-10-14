import React from 'react';
import { useTranslation } from 'next-i18next';
import type { CrmReportRow } from '../../../../lib/services/crmReports.service';
import { formatTimestamp } from '../../lib/dates';

/**
 * Lista de relatórios do builder (FE-INCR-CRM-REPORT-BUILDER PR-A, item 2). Lista PRÓPRIA, não o `GenericTable`:
 * o relatório é Prisma (`CrmReportDefinition`), e as ações do `GenericTable` editam linha de DynamicTable —
 * decisão do dono, [[D-2026-10-13-FE-CRM-RB-PR-A-LACUNAS]].
 * Relatório de outro usuário (só o ADMIN o vê, F-RB4=(c)) leva a marca "de outro usuário" — o BE não devolve o nome.
 */
export interface CrmReportListProps {
  reports: CrmReportRow[];
  currentUserId: string | null;
  onOpen: (id: string) => void;
  onDelete: (report: CrmReportRow) => void;
  onNew: () => void;
}

export function CrmReportList({ reports, currentUserId, onOpen, onDelete, onNew }: CrmReportListProps) {
  const { t } = useTranslation('crm');

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-200 p-10 text-center dark:border-neutral-700">
        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
          {t('report_builder.list.empty', 'Nenhum relatório salvo ainda.')}
        </p>
        <button
          type="button"
          onClick={onNew}
          className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white transition hover:bg-blue-700"
        >
          {t('report_builder.list.new', 'Novo relatório')}
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-neutral-800">
      <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-neutral-800">
        <thead className="bg-gray-50 dark:bg-neutral-800/50">
          <tr>
            {[
              t('report_builder.list.name', 'Nome'),
              t('report_builder.list.kind', 'Tipo'),
              t('report_builder.list.chart', 'Gráfico'),
              t('report_builder.list.updated', 'Atualizado em'),
              '',
            ].map((h, i) => (
              <th
                key={i}
                scope="col"
                className="px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white dark:divide-neutral-800 dark:bg-neutral-900">
          {reports.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800/40">
              <td className="px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => onOpen(r.id)}
                  className="text-left font-bold text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                >
                  {r.name}
                </button>
                {currentUserId && r.userId !== currentUserId ? (
                  <span className="ml-2 rounded-lg bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    {t('report_builder.list.other_user', 'de outro usuário')}
                  </span>
                ) : null}
              </td>
              <td className="px-3 py-2.5 text-gray-600 dark:text-gray-300">{t(`report_builder.kind.${r.kind}`, r.kind)}</td>
              <td className="px-3 py-2.5 text-gray-600 dark:text-gray-300">
                {t(`report_builder.chart_type.${r.chartType}`, r.chartType)}
              </td>
              <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400">{formatTimestamp(r.updatedAt)}</td>
              <td className="px-3 py-2.5 text-right">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onOpen(r.id)}
                    className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-bold text-gray-700 hover:bg-gray-100 dark:border-neutral-700 dark:text-gray-200 dark:hover:bg-neutral-800"
                  >
                    {t('report_builder.list.open', 'Abrir')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(r)}
                    className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-300 dark:hover:bg-rose-950/40"
                  >
                    {t('report_builder.list.delete', 'Apagar')}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
