import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('next-i18next', async () => (await import('./i18nPt')).nextI18nextPt());

// Os canônicos de gráfico/KPI/tabela são substituídos por sondas que guardam as props recebidas.
const { charts, kpis, tables } = vi.hoisted(() => ({
  charts: [] as { chart: { title: string; options?: { currency?: string } }; data: { data: { name: string; value: number }[] } }[],
  kpis: [] as { title: string; value: string }[],
  tables: [] as { schema: { fields: { name: string; label?: string }[] }; records: { data: Record<string, unknown> }[] }[],
}));
vi.mock('../../../../dashboard/category-views/finance/components/analytics/charts/ChartRenderer', () => ({
  default: (p: (typeof charts)[number]) => {
    charts.push(p);
    return <div>{p.chart.title}</div>;
  },
}));
vi.mock('../../../../dashboard/category-views/finance/components/analytics/dashboard/DashboardKpiCard', () => ({
  default: (p: (typeof kpis)[number]) => {
    kpis.push(p);
    return <div>{`${p.title}=${p.value}`}</div>;
  },
}));
vi.mock('../../../../dashboard/category-views/shared/components/GenericTable', () => ({
  GenericTable: (p: (typeof tables)[number]) => {
    tables.push(p);
    return <div>tabela</div>;
  },
}));

import { CrmReportResult, type ReportRunSnapshot } from '../CrmReportResult';

/**
 * Resultado do builder — FE-INCR-CRM-REPORT-BUILDER PR-A, itens 14 (verdade, por modo de moeda) e 15 (convertido).
 */
const meta = (currency: ReportRunSnapshot['output']['meta']['currency']) => ({
  rowsRead: 4,
  truncated: false as const,
  currency,
  timeZone: 'America/Sao_Paulo',
});
const nbsp = (s: string) => s.replace(/\s/g, ' ');

function snap(patch: Partial<ReportRunSnapshot> & { output: ReportRunSnapshot['output'] }): ReportRunSnapshot {
  return {
    kind: 'chart',
    chartType: 'bar',
    dimensions: [{ type: 'field', field: 'currency' }],
    moneyIndexes: [0],
    measureLabels: ['Soma de Valor', 'Contagem'],
    groupLabel: 'Moeda',
    ...patch,
  };
}

const byCurrency = {
  series: [
    { measure: 'sum:amount', points: [{ name: 'BRL', value: 1000 }, { name: 'USD', value: 50 }, { name: '__NO_CURRENCY__', value: 7 }] },
    { measure: 'count:*', points: [{ name: 'BRL', value: 2 }, { name: 'USD', value: 1 }, { name: '__NO_CURRENCY__', value: 1 }] },
  ],
  meta: meta({ mode: 'dimension', field: 'currency' }),
};

describe('CrmReportResult', () => {
  beforeEach(() => {
    charts.length = 0;
    kpis.length = 0;
    tables.length = 0;
  });
  afterEach(() => cleanup());

  it('modo dimension (gráfico): um gráfico por moeda na série de dinheiro, com o símbolo; a contagem num só', () => {
    render(<CrmReportResult snapshot={snap({ output: byCurrency })} />);
    expect(charts.map((c) => [c.chart.title, c.chart.options?.currency])).toEqual([
      ['Soma de Valor — BRL', 'BRL'],
      ['Soma de Valor — USD', 'USD'],
      ['Soma de Valor — Sem moeda', undefined],
      ['Contagem', undefined],
    ]);
    expect(charts[3].data.data.map((p) => p.name)).toEqual(['BRL', 'USD', 'Sem moeda']);
  });

  it('modo filter: um gráfico na moeda do filtro', () => {
    render(
      <CrmReportResult
        snapshot={snap({
          dimensions: [{ type: 'field', field: 'status' }],
          output: { series: [{ measure: 'sum:amount', points: [{ name: 'Open', value: 9 }] }], meta: meta({ mode: 'filter', field: 'currency', value: 'USD' }) },
        })}
      />,
    );
    expect(charts.map((c) => [c.chart.title, c.chart.options?.currency])).toEqual([['Soma de Valor', 'USD']]);
  });

  it('modo undeclared: aviso de moeda não declarada e número sem símbolo', () => {
    render(
      <CrmReportResult
        snapshot={snap({
          kind: 'kpi',
          dimensions: [],
          output: { series: [{ measure: 'sum:x', points: [{ name: 'Total', value: 1234.5 }] }], meta: meta({ mode: 'undeclared' }) },
        })}
      />,
    );
    expect(screen.getByText(/Moeda não declarada/)).toBeInTheDocument();
    expect(kpis.map((k) => nbsp(k.value))).toEqual(['1.234,5']);
  });

  it('kind table: GenericTable com uma coluna por série e o valor na moeda de cada ponto', () => {
    render(<CrmReportResult snapshot={snap({ kind: 'table', chartType: 'table', output: byCurrency })} />);
    expect(tables[0].schema.fields.map((f) => f.label)).toEqual(['Moeda', 'Soma de Valor', 'Contagem']);
    expect(tables[0].records.map((r) => [r.data.__group, nbsp(String(r.data.s0)), r.data.s1])).toEqual([
      ['BRL', 'R$ 1.000,00', '2'],
      ['USD', 'US$ 50,00', '1'],
      ['Sem moeda', '7', '1'],
    ]);
  });

  it('kind kpi: um card por ponto (um por moeda)', () => {
    render(<CrmReportResult snapshot={snap({ kind: 'kpi', output: { ...byCurrency, series: [byCurrency.series[0]] } })} />);
    expect(kpis.map((k) => [k.title, nbsp(k.value)])).toEqual([
      ['Soma de Valor — BRL', 'R$ 1.000,00'],
      ['Soma de Valor — USD', 'US$ 50,00'],
      ['Soma de Valor — Sem moeda', '7'],
    ]);
  });

  it('item 15: bloco convertido à parte, com a data da taxa, o aviso stale e os excluídos; a verdade continua', () => {
    render(
      <CrmReportResult
        snapshot={snap({
          kind: 'kpi',
          output: {
            ...byCurrency,
            series: [byCurrency.series[0]],
            converted: {
              target: 'BRL',
              referenceDate: '2026-10-13',
              rates: [{ currency: 'USD', side: 'venda', rate: 5.4321, rateDate: '2026-10-05', stale: true, source: 'BCB_PTAX_FECHAMENTO' }],
              series: [{ measure: 'sum:amount', points: [{ name: 'Total', value: 1271.6 }] }],
              excluded: [{ reason: 'NO_CURRENCY', measure: 'sum:amount', rows: 1 }],
            },
          },
        })}
      />,
    );
    expect(screen.getByText('Estimativa em R$ pela PTAX de venda de 13/10/2026 — não é número contábil')).toBeInTheDocument();
    expect(screen.getByText(/USD: 5,4321 \(taxa de 05\/10\/2026\)/)).toBeInTheDocument();
    expect(screen.getByText('taxa com mais de 5 dias')).toBeInTheDocument();
    expect(screen.getByTestId('report-excluded')).toHaveTextContent('Sem moeda: 1 linha(s)');
    // verdade (3 cards por moeda) + convertido (1 card em R$)
    expect(kpis.map((k) => nbsp(k.value))).toEqual(['R$ 1.000,00', 'US$ 50,00', '7', 'R$ 1.271,60']);
  });

  it('review — bloco convertido em tabela alinha as linhas pelo nome do ponto, não pela posição', () => {
    render(
      <CrmReportResult
        snapshot={snap({
          kind: 'table',
          chartType: 'table',
          dimensions: [{ type: 'field', field: 'status' }],
          moneyIndexes: [0, 1],
          measureLabels: ['Soma A', 'Soma B'],
          output: {
            series: [
              { measure: 'a', points: [{ name: 'Open', value: 1 }] },
              { measure: 'b', points: [{ name: 'Open', value: 1 }] },
            ],
            meta: meta({ mode: 'filter', field: 'currency', value: 'BRL' }),
            converted: {
              target: 'BRL',
              referenceDate: '2026-10-13',
              rates: [],
              series: [
                { measure: 'a', points: [{ name: 'Open', value: 2 }, { name: 'Won', value: 1 }] },
                { measure: 'b', points: [{ name: 'Won', value: 5 }] },
              ],
              excluded: [],
            },
          },
        })}
      />,
    );
    const conv = tables[1];
    expect(conv.records.map((r) => [r.data.__group, String(r.data.s0).replace(/\s/g, ' '), String(r.data.s1).replace(/\s/g, ' ')])).toEqual([
      ['Open', 'R$ 2,00', '—'],
      ['Won', 'R$ 1,00', 'R$ 5,00'],
    ]);
  });

  it('2ª passada N1: na verdade, pontos homônimos (dois contatos "Maria") são linhas distintas', () => {
    render(
      <CrmReportResult
        snapshot={snap({
          kind: 'table',
          chartType: 'table',
          dimensions: [{ type: 'field', field: 'contactId' }],
          moneyIndexes: [],
          output: {
            series: [
              { measure: 'count:*', points: [{ name: 'Maria', value: 3 }, { name: 'Maria', value: 5 }] },
              { measure: 'count:x', points: [{ name: 'Maria', value: 1 }, { name: 'Maria', value: 2 }] },
            ],
            meta: meta(null),
          },
        })}
      />,
    );
    expect(tables[0].records.map((r) => [r.data.__group, r.data.s0, r.data.s1])).toEqual([
      ['Maria', '3', '1'],
      ['Maria', '5', '2'],
    ]);
  });
});
