import { aggregatePipelineProcessor } from '../AggregatePipelineProcessor';
import type { AnalyticsProcessorContext } from '../../../core';

/**
 * GAP-MAP Nível 5 — "Top 10 por receita devolve os 10 últimos NOMES".
 *
 * `sort: { by: 'measure', dir: 'desc' }` + `limit` é o contrato do preset `revenueByCustomerTop`
 * (`SalesModule.ts`, "1.3 Receita por Cliente – Top 10 Clientes por Receita") e de revenueByType /
 * revenueByChannel / costByCategory. O processador ordenava SEMPRE pelo nome (`localeCompare`) e só
 * invertia no `desc`: o "top 2" saía como as 2 últimas letras do alfabeto, não os 2 maiores valores.
 */
describe('AggregatePipelineProcessor — sort por measure', () => {
  const rows = [
    { id: 'S1', data: { customerId: 'Ana', totalAmount: 100 } },
    { id: 'S2', data: { customerId: 'Bruno', totalAmount: 300 } },
    { id: 'S3', data: { customerId: 'Zé', totalAmount: 50 } },
  ];

  const buildContext = (sort: { by: 'measure' | 'dimension'; dir?: 'asc' | 'desc' }, limit?: number): AnalyticsProcessorContext =>
    ({
      table: { id: 'sales_1', name: 'Sales', presetKey: 'sales' },
      schema: { fields: [] },
      rows,
      params: {
        pipeline: {
          source: { kind: 'presetTable', key: '@@TABLE_SELF@@' },
          dimensions: [{ type: 'field', field: 'customerId', label: 'Cliente' }],
          measures: [{ type: 'sum', field: 'totalAmount', alias: 'Receita' }],
          sort,
          ...(limit ? { limit } : {}),
        },
      },
    }) as unknown as AnalyticsProcessorContext;

  it('sort {by: measure, dir: desc} + limit 2 devolve os 2 MAIORES valores, em ordem decrescente', async () => {
    const result = await aggregatePipelineProcessor(buildContext({ by: 'measure', dir: 'desc' }, 2));

    expect(result.map((r) => [r.name, r.value])).toEqual([
      ['Bruno', 300],
      ['Ana', 100],
    ]);
  });

  it('sort {by: measure, dir: asc} devolve do menor ao maior valor', async () => {
    const result = await aggregatePipelineProcessor(buildContext({ by: 'measure', dir: 'asc' }));

    expect(result.map((r) => r.value)).toEqual([50, 100, 300]);
  });

  it('controle: sort {by: dimension, dir: desc} continua ordenando pelo nome Z→A', async () => {
    const result = await aggregatePipelineProcessor(buildContext({ by: 'dimension', dir: 'desc' }));

    expect(result.map((r) => r.name)).toEqual(['Zé', 'Bruno', 'Ana']);
  });
});
