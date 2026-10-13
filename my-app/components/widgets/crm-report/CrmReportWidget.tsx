'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import { HiOutlineCog, HiOutlinePresentationChartBar, HiX } from 'react-icons/hi';
import { CrmReportsService, type CrmReportRow } from '@/lib/services/crmReports.service';
import type { ISchemaField } from '@/features/dashboard/components/shared/dynamic-tables.client';
import { useReportSources } from '@/features/crm/hooks/useReportSources';
import { CrmReportResult, buildRunSnapshot, type ReportRunSnapshot } from '@/features/crm/components/reports/CrmReportResult';
import {
  browserTimeZone,
  combinedFields,
  fromReport,
  reportError,
  reportFields,
  type ReportErrorView,
  type ReportSource,
} from '@/features/crm/lib/reportBuilder';
import { parseCrmReportWidgetConfig, type CrmReportWidgetConfig } from '@/features/crm/lib/reportWidget';

/**
 * Widget "Relatório do CRM" no grid do dashboard (FE-INCR-CRM-REPORT-BUILDER PR-D, item 20, F-RB2=(a)). Configuração =
 * escolher um relatório salvo (`widgetConfig: { reportId }`, via `onConfigChange`); exibição = `POST
 * /api/crm/reports/:id/run` com o render do builder (itens 14 e 15). `REPORT_NOT_FOUND` → "não existe mais" com a ação
 * de reconfigurar. Sempre no menu; sem relatório salvo, aponta para o builder ([[D-2026-10-13-FE-CRM-RB-PR-B-D-LACUNAS]]).
 */
interface CrmReportWidgetProps {
  id: string;
  onClose?: () => void;
  /** `widgetConfig` do layout persistido — sem tipo no grid; passa por `parseCrmReportWidgetConfig`. */
  initialConfig?: unknown;
  onConfigChange?: (config: CrmReportWidgetConfig) => void;
}

type RightRaw = Partial<Record<ReportSource, ISchemaField[] | null>>;

const headerBtn =
  'widget-action-btn rounded p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-black dark:hover:bg-neutral-700 dark:hover:text-white';

export default function CrmReportWidget({ onClose, initialConfig, onConfigChange }: CrmReportWidgetProps) {
  const { t } = useTranslation('crm');
  // `t` muda de identidade a cada render em alguns ambientes — fora das dependências dos efeitos (memória do projeto)
  const tRef = useRef(t);
  tRef.current = t;
  const { fieldsOf } = useReportSources();

  const [config, setConfig] = useState<CrmReportWidgetConfig | null>(() => parseCrmReportWidgetConfig(initialConfig));
  const [configuring, setConfiguring] = useState(config === null);
  const [reports, setReports] = useState<CrmReportRow[] | null>(null);
  const [row, setRow] = useState<CrmReportRow | null>(null);
  const [snapshot, setSnapshot] = useState<ReportRunSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ReportErrorView | null>(null);

  // Configuração: a lista dos relatórios salvos
  useEffect(() => {
    if (!configuring) return;
    let alive = true;
    setReports(null);
    setError(null);
    CrmReportsService.list()
      .then((res) => {
        if (alive) setReports(Array.isArray(res?.data) ? res.data : []);
      })
      .catch((e) => {
        if (!alive) return;
        setReports([]);
        setError(reportError(e));
      });
    return () => {
      alive = false;
    };
  }, [configuring]);

  // Exibição: o relatório (rótulos, moeda por medida) + o run salvo
  useEffect(() => {
    if (configuring || !config) return;
    let alive = true;
    setLoading(true);
    setError(null);
    setSnapshot(null);
    (async () => {
      try {
        const [got, run] = await Promise.all([
          CrmReportsService.get(config.reportId),
          CrmReportsService.run(config.reportId, { timeZone: browserTimeZone() }),
        ]);
        const draft = fromReport(got.data);
        const tr = tRef.current;
        const labels = {
          id: tr('report_builder.fields.id', 'ID'),
          createdAt: tr('report_builder.fields.created_at', 'Criado em'),
          updatedAt: tr('report_builder.fields.updated_at', 'Atualizado em'),
        };
        const source = await fieldsOf(got.data.spec.source);
        const right: RightRaw = {};
        for (const j of draft.joins) if (j.rightSource && !(j.rightSource in right)) right[j.rightSource] = await fieldsOf(j.rightSource);
        const fields = combinedFields(reportFields(source ?? [], labels), draft.joins, (s) => {
          const raw = right[s];
          return raw ? reportFields(raw, labels) : null;
        });
        if (!alive) return;
        setRow(got.data);
        setSnapshot(buildRunSnapshot(run.data, draft, fields, tr));
      } catch (e) {
        if (alive) setError(reportError(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [configuring, config, fieldsOf]);

  const choose = (reportId: string) => {
    const next: CrmReportWidgetConfig = { reportId };
    setConfig(next);
    setRow(null);
    setConfiguring(false);
    onConfigChange?.(next);
  };

  const notFound = error?.code === 'REPORT_NOT_FOUND';
  const title = !configuring && row ? row.name : t('report_widget.title', 'Relatório do CRM');

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="drag-handle group flex cursor-move items-center justify-between border-b border-gray-200 bg-gray-50/50 px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-800/30">
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <HiOutlinePresentationChartBar className="h-4 w-4 text-indigo-500" />
          <h3 className="max-w-[240px] truncate text-xs font-semibold uppercase tracking-wide" title={title}>
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {!configuring ? (
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setConfiguring(true);
              }}
              className={headerBtn}
              title={t('report_widget.settings', 'Escolher o relatório')}
              aria-label={t('report_widget.settings', 'Escolher o relatório')}
            >
              <HiOutlineCog className="h-3.5 w-3.5" />
            </button>
          ) : null}
          {onClose ? (
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className={headerBtn}
              title={t('report_widget.close', 'Fechar')}
              aria-label={t('report_widget.close', 'Fechar')}
            >
              <HiX className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-auto p-3">
        {configuring ? (
          <div className="flex flex-col gap-2" data-testid="crm-report-widget-config">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-300">{t('report_widget.pick', 'Escolha o relatório salvo:')}</p>
            {error ? <ErrorText view={error} /> : null}
            {reports === null ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('report_widget.loading', 'Carregando…')}</p>
            ) : reports.length === 0 ? (
              <div className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-300">
                <p>{t('report_widget.empty', 'Nenhum relatório salvo.')}</p>
                <Link href="/crm/reports" className="text-xs font-bold text-blue-600 hover:underline dark:text-blue-400">
                  {t('report_widget.go_builder', 'Criar um relatório no construtor')}
                </Link>
              </div>
            ) : (
              reports.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => choose(r.id)}
                  className={`rounded-2xl border p-3 text-left text-sm font-semibold transition-colors ${
                    config?.reportId === r.id
                      ? 'border-neutral-900 bg-neutral-100 text-neutral-900 dark:border-white dark:bg-neutral-800 dark:text-white'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300 dark:border-neutral-800 dark:text-gray-200 dark:hover:border-neutral-600'
                  }`}
                >
                  {r.name}
                </button>
              ))
            )}
          </div>
        ) : loading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('report_widget.loading', 'Carregando…')}</p>
        ) : notFound ? (
          <div className="flex flex-col items-start gap-2" role="alert">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {t('report_widget.not_found', 'Este relatório não existe mais.')}
            </p>
            <button
              type="button"
              className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100 dark:border-neutral-700 dark:text-gray-200 dark:hover:bg-neutral-800"
              onClick={() => setConfiguring(true)}
            >
              {t('report_widget.reconfigure', 'Escolher outro relatório')}
            </button>
          </div>
        ) : error ? (
          <ErrorText view={error} />
        ) : snapshot ? (
          <CrmReportResult snapshot={snapshot} />
        ) : null}
      </div>
    </div>
  );
}

function ErrorText({ view }: { view: ReportErrorView }) {
  const { t } = useTranslation('crm');
  return (
    <p role="alert" className="text-sm font-semibold text-rose-600 dark:text-rose-300">
      {t(view.key, { defaultValue: t('report_builder.errors.GENERIC', 'Não foi possível concluir. Tente de novo.'), ...view.params })}
    </p>
  );
}
