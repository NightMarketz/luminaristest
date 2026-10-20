'use client';

import React, { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useTranslation } from 'next-i18next';
import { formatKpiValue, getKpiVisualMeta } from '@/features/dashboard/category-views/finance/utils/kpiHelpers';
import type { ChartDataPoint, ChartPreset, MetricFormat, MetricDisplayMode } from '@/features/dashboard/category-views/finance/types';

interface GoldKpiWidgetViewProps {
    kpi: ChartDataPoint;
    chartPreset: ChartPreset;
}

function TrendIndicator({ trend }: { trend: 'up' | 'down' | 'flat' | null }) {
    if (!trend) return null;
    const icons = { up: '▲', down: '▼', flat: '▬' };
    return (
        <span className="text-[10px]" aria-label={`Tendência: ${trend}`}>
            {icons[trend]}
        </span>
    );
}

export default function GoldKpiWidgetView({ kpi, chartPreset }: GoldKpiWidgetViewProps) {
    const { t } = useTranslation(['analytics']);
    const format = (chartPreset.options?.metricFormats?.[kpi.name] || 'number') as MetricFormat;
    const displayMode = (chartPreset.options?.metricDisplay?.[kpi.name] || 'card') as MetricDisplayMode;
    const currency = chartPreset.options?.currency;

    const displayValue = formatKpiValue(kpi.value, format, currency);
    const { trend, colorClass } = getKpiVisualMeta(kpi.name, kpi.value, format, displayMode);

    // Calc delta percent
    const hasPrevious = typeof kpi.previousValue === 'number' && kpi.previousValue !== 0;
    const deltaPct = hasPrevious ? ((kpi.value - (kpi.previousValue as number)) / Math.abs(kpi.previousValue as number)) * 100 : 0;
    
    let trendStr = '';
    if (hasPrevious) {
        const sign = deltaPct > 0 ? '+' : '';
        trendStr = `${sign}${deltaPct.toFixed(1)}%`;
    }

    // Sparkline = série real que o processador manda em `fullRecords.records` ({ id: período, data: { value } }).
    // Sem série (ou com 1 ponto) não há gráfico — nunca dado inventado (GAP-MAP Nível 5, 2026-10-19).
    const sparklineData = useMemo(() => {
        const records = kpi.fullRecords?.records ?? [];
        return records
            .map((r) => ({ name: String(r.id), value: Number((r.data as { value?: unknown } | undefined)?.value) }))
            .filter((p) => Number.isFinite(p.value));
    }, [kpi.fullRecords]);

    return (
        <div className="flex flex-col h-full w-full relative">
            <div className="flex flex-col z-10 p-5 px-6 items-start h-full">
                
                <span className="text-gray-500 dark:text-gray-400 text-sm font-medium tracking-wide">
                    {kpi.name}
                </span>

                <div className="mt-2 flex items-baseline gap-2">
                    <span className={`text-4xl font-extrabold tracking-tight ${colorClass} max-w-full truncate`} title={displayValue}>
                        {displayValue}
                    </span>
                    {hasPrevious && (
                        <div className={`px-1.5 py-0.5 rounded text-xs font-semibold flex items-center gap-1 ${trend === 'up' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : (trend === 'down' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300')}`}>
                            <TrendIndicator trend={trend} />
                            {trendStr}
                        </div>
                    )}
                </div>

                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {hasPrevious ? 'vs período anterior' : 'Métrica isolada'}
                </div>
            </div>

            {/* Sparkline Baseline — só com série real de pelo menos 2 pontos */}
            {sparklineData.length >= 2 && (
            <div className="absolute bottom-0 left-0 right-0 h-1/2 opacity-20 pointer-events-none transform translate-y-2">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparklineData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={trend === 'down' ? '#ef4444' /* lumi-danger */ : (trend === 'up' ? '#10b981' /* lumi-success */ : '#3b82f6' /* lumi-primary */)}
                            fill={trend === 'down' ? '#ef4444' /* lumi-danger */ : (trend === 'up' ? '#10b981' /* lumi-success */ : '#3b82f6' /* lumi-primary */)}
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            )}
        </div>
    );
}
