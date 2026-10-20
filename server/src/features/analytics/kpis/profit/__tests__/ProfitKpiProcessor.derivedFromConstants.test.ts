import { profitKpiProcessor } from '../ProfitKpiProcessor';
import type { AnalyticsProcessorContext } from '../../../core';

/**
 * GAP-MAP Nível 5 — KPIs derivados de CONSTANTES exibidos como dado.
 *
 * `SalesModule.ts` (bloco `profitKpis`) fixa `employeesCount: 3`, `totalHoursWorked: 528`, `equity: 50000`
 * e `recurringProfit: 3500`; o processador divide o lucro real por esses números e devolve "Lucro por
 * Funcionário", "Lucro por Hora Trabalhada", "Produtividade do Lucro", "Rentabilidade Geral (%)" e
 * "Índice de Qualidade do Lucro" como se fossem medidos. Decisão de produto (retirar × ler de fonte real)
 * fica com o dono; a opção segura é NÃO exibir enquanto a fonte for constante.
 */
describe('ProfitKpiProcessor — KPIs derivados de constantes', () => {
  const referenceDate = new Date('2024-03-15T12:00:00Z');

  const revenueRows = [
    { id: 'R1', data: { totalAmount: 10000, date: '2024-03-01T10:00:00Z', status: 'finalized', paymentStatus: 'paid', customerId: 'C1' } },
    { id: 'R2', data: { totalAmount: 8500, date: '2024-02-15T10:00:00Z', status: 'finalized', paymentStatus: 'paid', customerId: 'C1' } },
  ];
  const expenseRows = [
    { id: 'E1', data: { amount: 2000, category: 'variable', paymentDate: '2024-03-05T10:00:00Z', paymentStatus: 'paid' } },
    { id: 'E2', data: { amount: 3000, category: 'fixed/aluguel', paymentDate: '2024-03-10T10:00:00Z', paymentStatus: 'paid' } },
    { id: 'E3', data: { amount: 1000, category: 'tax/imposto', paymentDate: '2024-03-12T10:00:00Z', paymentStatus: 'paid' } },
  ];

  const context = {
    rows: revenueRows,
    params: {
      amountField: 'totalAmount',
      dateField: 'date',
      statusField: 'status',
      datePreset: 'thisMonth',
      referenceDate: referenceDate.toISOString(),
      costSourceTableKey: 'mock-expenses',
      requireFinalized: false,
      // as mesmas constantes do preset real (SalesModule.ts, bloco profitKpis)
      employeesCount: 3,
      totalHoursWorked: 528,
      equity: 50000,
      recurringProfit: 3500,
    },
    table: { id: 'test_sales', name: 'Sales' },
    schema: { fields: [] },
    fetchByPresetTableKey: async (tableKey: string) => (tableKey === 'mock-expenses' ? { rows: expenseRows } : { rows: [] }),
  } as unknown as AnalyticsProcessorContext;

  const DERIVED_FROM_CONSTANTS = [
    'Lucro por Funcionário',
    'Lucro por Hora Trabalhada',
    'Produtividade do Lucro',
    'Rentabilidade Geral (%)',
    'Índice de Qualidade do Lucro',
  ];

  it('não devolve os 5 KPIs cuja única fonte é constante de params', async () => {
    const results = await profitKpiProcessor(context);
    const names = results.map((r) => r.name);

    expect(names.filter((n) => DERIVED_FROM_CONSTANTS.includes(n))).toEqual([]);
  });

  it('os KPIs medidos continuam saindo com o mesmo valor', async () => {
    const results = await profitKpiProcessor(context);
    const net = results.find((r) => r.name === 'Lucro Líquido');

    expect(net?.value).toBe(4000);
    expect(results.map((r) => r.name)).toEqual(
      expect.arrayContaining(['Lucro Bruto', 'Lucro Operacional', 'Lucro Líquido', 'Margem Bruta (%)', 'Crescimento do Lucro (%)', 'Lucro Acumulado']),
    );
  });
});
