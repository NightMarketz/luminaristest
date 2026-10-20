import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

vi.mock('next-i18next', () => ({ useTranslation: () => ({ t: (_k: string, d?: string) => d ?? _k }) }));

const { bars, hook } = vi.hoisted(() => ({
  bars: [] as { title: string; data: { name: string; current: number; previous?: number }[] }[],
  hook: { value: {} as Record<string, unknown> },
}));

vi.mock('../DashboardBarComparison', () => ({
  default: (p: (typeof bars)[number]) => {
    bars.push(p);
    return <div>{p.title}</div>;
  },
}));
vi.mock('@/features/dashboard/category-views/finance/hooks/analytics/useAnalyticsData', () => ({
  useAnalyticsData: () => hook.value,
}));

import AnalyticsDashboard from '../AnalyticsDashboard';

/**
 * GAP-MAP Nível 5 — barra "período anterior" FABRICADA.
 *
 * `AnalyticsDashboard.tsx` montava `previous: d.previousValue || d.value * 0.8`: quando o ponto não trazia
 * `previousValue`, o gráfico de comparação desenhava uma barra "Anterior" = 80% do atual, exibida como dado.
 * Esperado: sem `previousValue`, nenhum valor anterior é passado ao gráfico.
 */
describe('AnalyticsDashboard — barra "Anterior" sem previousValue', () => {
  afterEach(() => {
    cleanup();
    bars.length = 0;
  });

  const chart = {
    key: 'revenueByType',
    title: 'Receita por Tipo',
    type: 'bar',
    processor: 'aggregatePipeline',
    options: { metricDisplay: { 'Receita por Tipo': 'chart' } },
  };

  it('não fabrica previous quando o ponto não traz previousValue', () => {
    hook.value = {
      presetGroups: [{ key: 'g1', title: 'Receita', charts: [chart] }],
      chartData: { revenueByType: { chart, data: [{ name: 'Produto', value: 1000 }, { name: 'Serviço', value: 250 }] } },
      loading: false,
      errors: {},
      discoverKPIs: vi.fn(),
      datePreset: 'thisMonth',
      setDatePreset: vi.fn(),
    };

    render(<AnalyticsDashboard presetKey="beautySalon" />);

    expect(bars).toHaveLength(1);
    expect(bars[0].data.map((d) => d.previous)).toEqual([undefined, undefined]);
  });

  it('controle: previousValue real é repassado como previous', () => {
    hook.value = {
      presetGroups: [{ key: 'g1', title: 'Receita', charts: [chart] }],
      chartData: { revenueByType: { chart, data: [{ name: 'Produto', value: 1000, previousValue: 900 }] } },
      loading: false,
      errors: {},
      discoverKPIs: vi.fn(),
      datePreset: 'thisMonth',
      setDatePreset: vi.fn(),
    };

    render(<AnalyticsDashboard presetKey="beautySalon" />);

    expect(bars[0].data[0].previous).toBe(900);
  });
});
