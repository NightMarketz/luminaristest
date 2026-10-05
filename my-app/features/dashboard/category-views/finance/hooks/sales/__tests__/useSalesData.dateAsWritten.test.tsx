import React from 'react';
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';

// Shim obrigatório (jsx "preserve" + runtime clássico) — nunca em código de produção.
(globalThis as unknown as { React: typeof React }).React = React;
import { renderHook, render, screen, cleanup } from '@testing-library/react';
import { useSalesData } from '../useSalesData';
import { useSalesLogic } from '../useSalesLogic';
import SalesTable from '../../../components/sales/SalesTable';
import type { IDynamicTable } from '@/features/dashboard/components/shared/dynamic-tables.client';

/**
 * FE-FIX-SALES-DATE-D1 (F3 do BRIEF PACOTE-VALIDADE-PENDENCIAS; F-PP-5 c) — TESTES-GUARDA da sessão de instrumentação.
 *
 * Lacuna: o motor grava o campo `date` da venda como ISO à meia-noite UTC (`2026-12-01T00:00:00.000Z`) e o módulo de vendas
 * o lê como INSTANTE: em UTC-3 ele vira o dia anterior às 21h. Efeitos na tela: a lista mostra 30/11 para a venda de 01/12
 * (verificado em browser), o filtro "Este mês" deixa a venda do dia 1º de fora e o balde mensal da analítica a põe no mês anterior.
 *
 * Comportamento correto esperado: a UI de vendas trata a data da venda como o DIA ESCRITO (date-only). Os casos partem do que o
 * hook de carga (`useSalesData`) entrega aos consumidores, então valem para qualquer correção feita na entrada do módulo.
 *
 * Condição que morde: fuso America/Sao_Paulo (UTC-3). `process.env.TZ` é fixado no teste e restaurado — vermelho/verde em máquina
 * UTC não seria evidência (mesma classe de `teste-de-hoje-quebra-em-janela-utc`).
 */

// Fontes de dados do hook: a tabela de vendas devolve a linha como o motor a guarda (ISO à meia-noite UTC).
const SALES_ROW = (id: string, date: string) => ({
  id,
  data: { date, status: 'Finalized', paymentStatus: 'Pending', totalAmount: 100, customerId: 'c1', unitId: 'u1' },
});
let salesRows: ReturnType<typeof SALES_ROW>[] = [];

vi.mock('../../shared/useFinanceData', () => ({
  useFinanceData: () => ({ salesTable: { id: 'tbl-sales' }, saleItemsTable: { id: 'tbl-items' } }),
}));
vi.mock('@/features/dashboard/shared/hooks/useTableRelationLookups', () => ({
  useTableRelationLookups: () => ({ relationLookups: {}, isLoadingRelations: false }),
}));
vi.mock('@/features/dashboard/components/shared/dynamic-tables.client', async (orig) => {
  const actual = await orig<typeof import('@/features/dashboard/components/shared/dynamic-tables.client')>();
  return {
    ...actual,
    useTableData: (id: string) => ({ table: null, records: id === 'tbl-sales' ? salesRows : [], isLoading: false, refetch: vi.fn() }),
  };
});
vi.mock('@/lib/services/sales.service', () => ({ salesService: {}, SALE_PAYMENT_METHODS: [] }));
vi.mock('@/lib/context/CurrencyContext', () => ({ useFormatCurrency: () => (v: number) => `R$ ${v.toFixed(2)}` }));
vi.mock('../../../services/FinanceService', () => ({ FinanceService: {} }));

let prevTz: string | undefined;
beforeAll(() => {
  prevTz = process.env.TZ;
  process.env.TZ = 'America/Sao_Paulo';
});
afterAll(() => {
  if (prevTz === undefined) delete process.env.TZ;
  else process.env.TZ = prevTz;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const tables = [] as IDynamicTable[];

describe('UI de vendas — a data da venda é o DIA ESCRITO (motor grava ISO à meia-noite UTC)', () => {
  it('premissa: em America/Sao_Paulo o instante 2026-12-01T00:00:00.000Z é 30/11 às 21h (se isto mudar, o teste deixa de provar o que diz)', () => {
    const d = new Date('2026-12-01T00:00:00.000Z');
    expect(d.getDate()).toBe(30);
    expect(d.getHours()).toBe(21);
  });

  it('a lista mostra o dia da venda (01/12/2026), não o dia anterior (30/11/2026)', () => {
    salesRows = [SALES_ROW('s1', '2026-12-01T00:00:00.000Z')];
    const { result } = renderHook(() => useSalesData(tables));
    render(
      <SalesTable
        sales={result.current.salesList}
        saleIdToSubtotal={{}}
        customerNameMap={{}}
        onSelectSale={() => {}}
        onUpdateSale={async () => {}}
        onRequestPay={() => {}}
        onRequestCancel={() => {}}
        onRequestReturn={() => {}}
        onRefresh={() => {}}
      />,
    );
    expect(screen.queryByText('30/11/2026'), 'a venda de 01/12 foi listada como 30/11: a data ISO à meia-noite UTC foi lida como instante em UTC-3').toBeNull();
    expect(screen.getByText('01/12/2026')).toBeInTheDocument();
  });

  it('o filtro "Este mês" inclui a venda do dia 1º do mês corrente', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-12-15T15:00:00.000Z')); // 15/12 12:00 BRT
    salesRows = [SALES_ROW('first', '2026-12-01T00:00:00.000Z'), SALES_ROW('last-month', '2026-11-30T00:00:00.000Z')];
    const { result: data } = renderHook(() => useSalesData(tables));
    const { result: logic } = renderHook(() => useSalesLogic(data.current.salesList));
    React.act(() => logic.current.setPeriodFilter('this_month'));
    const ids = logic.current.filteredSales.map((s) => s.id);
    expect(ids, 'a venda de 01/12 ficou fora de "Este mês" (lida como 30/11 21h) e/ou a de 30/11 entrou').toEqual(['first']);
  });

  it('o balde mensal da analítica põe a venda do dia 1º no mês certo (2026-12, não 2026-11)', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-12-15T15:00:00.000Z'));
    salesRows = [SALES_ROW('first', '2026-12-01T00:00:00.000Z')];
    const { result } = renderHook(() => useSalesData(tables));
    expect(result.current.analytics.monthly, 'a venda de 01/12 caiu no balde de novembro').toEqual({ '2026-12': 100 });
  });
});
