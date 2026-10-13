import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

vi.mock('next-i18next', async () => (await import('@/features/crm/components/reports/__tests__/i18nPt')).nextI18nextPt());

const { svc, fieldsOf, kpis } = vi.hoisted(() => ({
  svc: { list: vi.fn(), get: vi.fn(), run: vi.fn() },
  fieldsOf: vi.fn(),
  kpis: [] as { title: string; value: string }[],
}));
vi.mock('@/lib/services/crmReports.service', () => ({ CrmReportsService: svc }));
vi.mock('@/features/crm/hooks/useReportSources', () => ({
  useReportSources: () => ({ sources: ['leadProposals'], loading: false, error: false, fieldsOf }),
}));
// sonda no card de KPI: prova que o widget usa o render do builder (item 14) com a moeda por medida
vi.mock('@/features/dashboard/category-views/finance/components/analytics/dashboard/DashboardKpiCard', () => ({
  default: (p: { title: string; value: string }) => {
    kpis.push(p);
    return <div>{`${p.title}=${p.value}`}</div>;
  },
}));

import CrmReportWidget from '../CrmReportWidget';
import type { CrmReportRow } from '@/lib/services/crmReports.service';

/**
 * Widget "Relatório do CRM" — FE-INCR-CRM-REPORT-BUILDER PR-D (BRIEF §1 item 20, F-RB2=(a)): configurar = escolher um
 * relatório salvo (`{ reportId }` via `onConfigChange`); exibir = run salvo com o render dos itens 14/15; 404 →
 * "não existe mais" com a ação de reconfigurar.
 */
const ok = <T,>(data: T) => Promise.resolve({ success: true, data });
const PROPOSAL_SCHEMA = [
  { name: 'amount', label: 'Valor', type: 'number', numberFormat: 'currency' },
  { name: 'currency', label: 'Moeda', type: 'select', options: ['BRL', 'USD'] },
];
const report: CrmReportRow = {
  id: 'r1',
  userId: 'eu',
  name: 'Total proposto',
  description: null,
  kind: 'kpi',
  chartType: 'bar',
  spec: {
    source: 'leadProposals',
    measures: [{ type: 'sum', field: 'amount', alias: 'Total' }],
    filters: [{ field: 'currency', op: 'eq', value: 'USD' }],
  },
  createdAt: '2026-10-13T10:00:00.000Z',
  updatedAt: '2026-10-13T10:00:00.000Z',
};
const RUN = {
  series: [{ measure: 'Total', points: [{ name: 'Total', value: 1500 }] }],
  meta: { rowsRead: 3, truncated: false, currency: { mode: 'filter', field: 'currency', value: 'USD' }, timeZone: 'UTC' },
};
const notFound = { success: false, code: 'REPORT_NOT_FOUND', message: 'x', status: 404 };

describe('CrmReportWidget', () => {
  beforeEach(() => {
    Object.values(svc).forEach((f) => f.mockReset());
    fieldsOf.mockReset().mockResolvedValue(PROPOSAL_SCHEMA);
    kpis.length = 0;
    svc.list.mockImplementation(() => ok([report]));
    svc.get.mockImplementation(() => ok(report));
    svc.run.mockImplementation(() => ok(RUN));
  });
  afterEach(() => cleanup());

  it('sem config: lista os salvos; escolher salva { reportId } e roda POST /:id/run', async () => {
    const onConfigChange = vi.fn();
    render(<CrmReportWidget id="w1" onConfigChange={onConfigChange} />);
    expect(svc.run).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByText('Total proposto'));
    expect(onConfigChange).toHaveBeenCalledWith({ reportId: 'r1' });
    await waitFor(() => expect(svc.run).toHaveBeenCalledWith('r1', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }));
  });

  it('com config: roda o salvo e reusa o render do builder — KPI formatado na moeda do filtro', async () => {
    render(<CrmReportWidget id="w1" initialConfig={{ reportId: 'r1' }} />);
    expect(await screen.findByText(/^Total=/)).toBeInTheDocument();
    expect(svc.list).not.toHaveBeenCalled();
    expect(kpis[kpis.length - 1].value).toBe(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(1500));
    expect(screen.getByTitle('Total proposto')).toBeInTheDocument(); // o cabeçalho leva o nome do relatório
  });

  it('relatório com convertTo: o bloco convertido aparece (item 15)', async () => {
    svc.run.mockImplementation(() =>
      ok({
        ...RUN,
        converted: {
          currency: 'BRL',
          referenceDate: '2026-10-10',
          rates: [{ currency: 'USD', rate: 5.4, rateDate: '2026-10-10', stale: false }],
          series: [{ measure: 'Total', points: [{ name: 'Total', value: 8100 }] }],
          excluded: [],
        },
      }),
    );
    render(<CrmReportWidget id="w1" initialConfig={{ reportId: 'r1' }} />);
    expect(await screen.findByTestId('report-converted')).toBeInTheDocument();
  });

  it('REPORT_NOT_FOUND → "não existe mais" com a ação de reconfigurar, que volta à lista', async () => {
    svc.get.mockRejectedValue(notFound);
    svc.run.mockRejectedValue(notFound);
    render(<CrmReportWidget id="w1" initialConfig={{ reportId: 'apagado' }} />);
    expect(await screen.findByText('Este relatório não existe mais.')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Escolher outro relatório'));
    expect(await screen.findByText('Total proposto')).toBeInTheDocument();
    expect(svc.list).toHaveBeenCalledTimes(1);
  });

  it('outro erro nomeado vira a mensagem traduzida, sem a ação de reconfigurar', async () => {
    svc.run.mockRejectedValue({ success: false, code: 'CRM_MODULE_NOT_INSTALLED', message: 'x', details: { moduleKey: 'CRM-2' }, status: 409 });
    render(<CrmReportWidget id="w1" initialConfig={{ reportId: 'r1' }} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('O módulo CRM-2 do CRM não está instalado; esta fonte não está disponível.');
    expect(screen.queryByText('Escolher outro relatório')).toBeNull();
  });

  it('sem relatório salvo: "nenhum relatório salvo" com link para o builder', async () => {
    svc.list.mockImplementation(() => ok([]));
    render(<CrmReportWidget id="w1" />);
    expect(await screen.findByText('Nenhum relatório salvo.')).toBeInTheDocument();
    expect(screen.getByText('Criar um relatório no construtor').closest('a')).toHaveAttribute('href', '/crm/reports');
  });

  it('widgetConfig persistido em forma estranha conta como não configurado', async () => {
    render(<CrmReportWidget id="w1" initialConfig={{ reportId: 42 }} />);
    expect(await screen.findByText('Total proposto')).toBeInTheDocument();
    expect(svc.run).not.toHaveBeenCalled();
  });

  describe('review do PR-D — regressões', () => {
    it('achado 1: schema da fonte indisponível → aviso explícito (os valores podem sair sem moeda)', async () => {
      fieldsOf.mockResolvedValue(null);
      render(<CrmReportWidget id="w1" initialConfig={{ reportId: 'r1' }} />);
      expect(await screen.findByText(/^Total=/)).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar os campos desta fonte.');
    });

    it('achado 2: abrir a configuração de um widget válido tem Cancelar, que volta ao relatório', async () => {
      render(<CrmReportWidget id="w1" initialConfig={{ reportId: 'r1' }} />);
      await screen.findByText(/^Total=/);
      fireEvent.click(screen.getByLabelText('Escolher o relatório'));
      fireEvent.click(await screen.findByText('Cancelar'));
      expect(await screen.findByText(/^Total=/)).toBeInTheDocument();
    });

    it('achado 3: lista que falha mostra o erro, não "nenhum relatório salvo"', async () => {
      svc.list.mockRejectedValue({ success: false, code: 'X', message: 'x', status: 500 });
      render(<CrmReportWidget id="w1" />);
      expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível concluir. Tente de novo.');
      expect(screen.queryByText('Nenhum relatório salvo.')).toBeNull();
      expect(screen.queryByText('Carregando…')).toBeNull();
    });

    it('achado 4: relatório apagado para no GET — o run não é chamado (um 404 só)', async () => {
      svc.get.mockRejectedValue(notFound);
      render(<CrmReportWidget id="w1" initialConfig={{ reportId: 'apagado' }} />);
      expect(await screen.findByText('Este relatório não existe mais.')).toBeInTheDocument();
      expect(svc.run).not.toHaveBeenCalled();
    });
  });

  describe('review do PR-D — 2ª passada', () => {
    it('Cancelar volta ao resultado sem rodar de novo', async () => {
      render(<CrmReportWidget id="w1" initialConfig={{ reportId: 'r1' }} />);
      await screen.findByText(/^Total=/);
      fireEvent.click(screen.getByLabelText('Escolher o relatório'));
      fireEvent.click(await screen.findByText('Cancelar'));
      expect(screen.getByText(/^Total=/)).toBeInTheDocument();
      expect(svc.get).toHaveBeenCalledTimes(1);
      expect(svc.run).toHaveBeenCalledTimes(1);
    });

    it('trocar de relatório com o GET do anterior pendente não roda o anterior', async () => {
      let releaseA: (v: unknown) => void = () => {};
      svc.get.mockImplementation((id: string) =>
        id === 'r1' ? new Promise((r) => (releaseA = () => r({ success: true, data: report }))) : ok({ ...report, id: 'r2', name: 'Outro' }),
      );
      svc.list.mockImplementation(() => ok([report, { ...report, id: 'r2', name: 'Outro' }]));
      render(<CrmReportWidget id="w1" initialConfig={{ reportId: 'r1' }} />);
      await waitFor(() => expect(svc.get).toHaveBeenCalledWith('r1'));
      fireEvent.click(screen.getByLabelText('Escolher o relatório'));
      fireEvent.click(await screen.findByText('Outro'));
      await waitFor(() => expect(svc.run).toHaveBeenCalledWith('r2', expect.anything()));
      releaseA(undefined);
      await new Promise((r) => setTimeout(r, 0));
      expect(svc.run.mock.calls.map((c) => c[0])).toEqual(['r2']);
    });

    it('lista que falha num widget novo tem "Tentar de novo"', async () => {
      svc.list.mockRejectedValueOnce({ success: false, code: 'X', message: 'x', status: 500 });
      render(<CrmReportWidget id="w1" />);
      fireEvent.click(await screen.findByText('Tentar de novo'));
      expect(await screen.findByText('Total proposto')).toBeInTheDocument();
      expect(svc.list).toHaveBeenCalledTimes(2);
    });
  });
});
