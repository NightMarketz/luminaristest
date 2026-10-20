import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

vi.mock('next-i18next', () => ({ useTranslation: () => ({ t: (_k: string, d?: string) => d ?? _k }) }));

const { areaCharts } = vi.hoisted(() => ({ areaCharts: [] as { value: number }[][] }));
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AreaChart: (p: { data: { value: number }[] }) => {
    areaCharts.push(p.data);
    return <div data-testid="sparkline" />;
  },
  Area: () => null,
}));

import GoldKpiWidgetView from '../GoldKpiWidgetView';
import type { ChartPreset } from '@/features/dashboard/category-views/finance/types';

/**
 * GAP-MAP Nível 5 — sparkline com `Math.random()` exibida como histórico.
 *
 * `GoldKpiWidgetView.tsx` desenhava um `AreaChart` com 12 pontos aleatórios ("mockSparklineData") atrás de todo
 * KPI, inclusive quando o backend não mandou série nenhuma. Esperado: série real de `fullRecords` ou nenhum gráfico.
 */
describe('GoldKpiWidgetView — sparkline', () => {
  const chartPreset = { key: 'profitKpis', title: 'Lucros', type: 'bar', processor: 'profitKpis', options: {} } as ChartPreset;
  let random: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    random = vi.spyOn(Math, 'random');
  });
  afterEach(() => {
    cleanup();
    areaCharts.length = 0;
    random.mockRestore();
  });

  it('sem fullRecords, não renderiza sparkline nem chama Math.random', () => {
    const { queryByTestId } = render(<GoldKpiWidgetView kpi={{ name: 'Lucro Líquido', value: 4000 }} chartPreset={chartPreset} />);

    expect(queryByTestId('sparkline')).toBeNull();
    expect(random).not.toHaveBeenCalled();
  });

  it('com fullRecords, a sparkline usa os valores reais, na ordem, sem Math.random', () => {
    render(
      <GoldKpiWidgetView
        kpi={{
          name: 'Lucro Líquido',
          value: 4000,
          fullRecords: {
            timestamp: 1,
            records: [
              { id: '2024-01', data: { value: 1000 } },
              { id: '2024-02', data: { value: 2500 } },
              { id: '2024-03', data: { value: 4000 } },
            ],
          },
        }}
        chartPreset={chartPreset}
      />,
    );

    expect(areaCharts).toHaveLength(1);
    expect(areaCharts[0].map((p) => p.value)).toEqual([1000, 2500, 4000]);
    expect(random).not.toHaveBeenCalled();
  });
});
