import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';

vi.mock('next-i18next', async () => (await import('./i18nPt')).nextI18nextPt());
vi.mock('../../../../../lib/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'eu' } }) }));

const { svc, fieldsOf } = vi.hoisted(() => ({
  svc: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), preview: vi.fn(), run: vi.fn() },
  fieldsOf: vi.fn(),
}));
vi.mock('../../../../../lib/services/crmReports.service', () => ({ CrmReportsService: svc }));
vi.mock('../../../hooks/useReportSources', () => ({
  useReportSources: () => ({ sources: ['leads', 'leadProposals'], loading: false, error: false, fieldsOf }),
}));
// o resultado tem teste próprio; aqui basta saber que apareceu
vi.mock('../CrmReportResult', () => ({ CrmReportResult: () => <div data-testid="report-result" /> }));

import { CrmReportBuilder } from '../CrmReportBuilder';
import type { CrmReportRow } from '../../../../../lib/services/crmReports.service';

/**
 * Orquestrador do builder — FE-INCR-CRM-REPORT-BUILDER PR-A, itens 8 (bloqueio com explicação), 13 (visualizar),
 * 16 (erros nomeados), 17 (salvar/salvar como/apagar) e 18 (abrir salvo, 404); PR-B, item 10 (joins: schema da tabela
 * da direita, envio e confirmação ao remover join em uso).
 */
const PROPOSAL_SCHEMA = [
  { name: 'amount', label: 'Valor', type: 'number', numberFormat: 'currency' },
  { name: 'currency', label: 'Moeda', type: 'select', options: ['BRL', 'USD'] },
  { name: 'status', label: 'Status', type: 'select', options: ['Draft', 'Sent'] },
];
const ok = <T,>(data: T) => Promise.resolve({ success: true, data });
const saved: CrmReportRow = {
  id: 'r1',
  userId: 'outro',
  name: 'Propostas',
  description: null,
  kind: 'chart',
  chartType: 'bar',
  spec: { source: 'leadProposals', measures: [{ type: 'count' }], dimensions: [{ type: 'field', field: 'status' }] },
  createdAt: '2026-10-13T10:00:00.000Z',
  updatedAt: '2026-10-13T10:00:00.000Z',
};
const RUN = { series: [{ measure: 'count:*', points: [{ name: 'Draft', value: 2 }] }], meta: { rowsRead: 2, truncated: false, currency: null, timeZone: 'UTC' } };

async function newReportOn(source: string) {
  render(<CrmReportBuilder />);
  fireEvent.click(await screen.findByText('Novo relatório'));
  fireEvent.change(screen.getByLabelText('Fonte'), { target: { value: source } });
  await screen.findByText('Medidas');
}

describe('CrmReportBuilder', () => {
  beforeEach(() => {
    Object.values(svc).forEach((f) => f.mockReset());
    fieldsOf.mockReset().mockResolvedValue(PROPOSAL_SCHEMA);
    svc.list.mockImplementation(() => ok([saved]));
    svc.preview.mockImplementation(() => ok(RUN));
    svc.run.mockImplementation(() => ok(RUN));
  });
  afterEach(() => cleanup());

  it('item 13: Visualizar envia o spec do editor + o fuso do navegador', async () => {
    await newReportOn('leadProposals');
    fireEvent.click(screen.getByText('Visualizar'));
    await waitFor(() => expect(svc.preview).toHaveBeenCalledTimes(1));
    expect(svc.preview).toHaveBeenCalledWith({
      spec: { source: 'leadProposals', measures: [{ type: 'count' }] },
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    expect(await screen.findByTestId('report-result')).toBeInTheDocument();
  });

  it('item 8: soma de dinheiro sem escolha de moeda → Visualizar desabilitado, com a explicação', async () => {
    await newReportOn('leadProposals');
    const row = screen.getByTestId('measure-0');
    fireEvent.change(within(row).getByLabelText('Cálculo'), { target: { value: 'sum' } });
    fireEvent.change(within(row).getByLabelText('Campo'), { target: { value: 'amount' } });
    expect(screen.getByText('Visualizar')).toBeDisabled();
    expect(screen.getByTestId('block-reason')).toHaveTextContent('Escolha separar por moeda ou uma moeda só antes de visualizar.');
    fireEvent.click(screen.getByText('Separar por moeda'));
    expect(screen.getByText('Visualizar')).toBeEnabled();
  });

  it('item 16: o code do erro vira a mensagem traduzida com os details', async () => {
    svc.preview.mockRejectedValue({ success: false, code: 'REPORT_TOO_LARGE', message: 'x', details: { rowsRead: 20001, cap: 20000 }, status: 422 });
    await newReportOn('leadProposals');
    fireEvent.click(screen.getByText('Visualizar'));
    expect(await screen.findByRole('alert')).toHaveTextContent('O relatório lê mais de 20000 linhas. Adicione filtros ou escolha outra fonte.');
  });

  it('item 17: salvar novo faz POST; depois do POST, salvar de novo manda PUT só com o patch', async () => {
    svc.create.mockImplementation((body: { name: string }) => ok({ ...saved, userId: 'eu', id: 'n1', name: body.name, spec: { source: 'leadProposals', measures: [{ type: 'count' }] } }));
    svc.update.mockImplementation(() => ok({ ...saved, userId: 'eu', id: 'n1', name: 'Outro nome', spec: { source: 'leadProposals', measures: [{ type: 'count' }] } }));
    await newReportOn('leadProposals');
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Contagem' } });
    fireEvent.click(screen.getByText('Salvar'));
    await waitFor(() => expect(svc.create).toHaveBeenCalledWith({ name: 'Contagem', kind: 'chart', chartType: 'bar', spec: { source: 'leadProposals', measures: [{ type: 'count' }] } }));
    await waitFor(() => expect(screen.getByText('Salvar')).toBeDisabled()); // nada mudou desde o POST
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Outro nome' } });
    fireEvent.click(screen.getByText('Salvar'));
    await waitFor(() => expect(svc.update).toHaveBeenCalledWith('n1', { name: 'Outro nome' }));
  });

  it('item 18 + 17: abrir salvo preenche o editor e roda o salvo; alheio mostra o aviso; Salvar como faz POST; apagar pede confirmação', async () => {
    svc.get.mockImplementation(() => ok(saved));
    svc.create.mockImplementation(() => ok({ ...saved, id: 'r2', userId: 'eu', name: 'Cópia' }));
    svc.remove.mockImplementation(() => ok({ id: 'r1' }));
    render(<CrmReportBuilder />);
    fireEvent.click(await screen.findByText('Abrir'));
    await waitFor(() => expect(svc.run).toHaveBeenCalledWith('r1', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }));
    expect(screen.getByLabelText('Nome')).toHaveValue('Propostas');
    expect(screen.getByText('Este relatório é de outro usuário. As mudanças valem para ele.')).toBeInTheDocument();
    expect(await screen.findByTestId('report-result')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Salvar como'));
    const nameInputs = screen.getAllByLabelText('Nome');
    fireEvent.change(nameInputs[nameInputs.length - 1], { target: { value: 'Cópia' } });
    const dialogSave = screen.getAllByText('Salvar');
    fireEvent.click(dialogSave[dialogSave.length - 1]);
    await waitFor(() =>
      expect(svc.create).toHaveBeenCalledWith({ name: 'Cópia', kind: 'chart', chartType: 'bar', spec: saved.spec }),
    );

    fireEvent.click(screen.getAllByText('Apagar')[0]);
    expect(screen.getByText('O relatório "Cópia" será apagado.')).toBeInTheDocument();
    expect(svc.remove).not.toHaveBeenCalled();
    const confirm = screen.getAllByText('Apagar');
    fireEvent.click(confirm[confirm.length - 1]);
    await waitFor(() => expect(svc.remove).toHaveBeenCalledWith('r2'));
  });

  it('item 18: relatório apagado/alheio → 404 com a mensagem e volta à lista', async () => {
    svc.get.mockRejectedValue({ success: false, code: 'REPORT_NOT_FOUND', message: 'x', status: 404 });
    render(<CrmReportBuilder />);
    fireEvent.click(await screen.findByText('Abrir'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Relatório não encontrado.');
    expect(screen.getByText('Propostas')).toBeInTheDocument(); // a lista
    expect(svc.list).toHaveBeenCalledTimes(2);
  });

  describe('item 10 — joins', () => {
    const OPP_SCHEMA = [
      { name: 'title', label: 'Título', type: 'string' },
      { name: 'leadId', label: 'Lead', type: 'relation', relation: { targetTable: '@@PRESET_TABLE_KEY::leads' } },
    ];
    const LEAD_SCHEMA = [{ name: 'status', label: 'Status', type: 'select', options: ['Novo', 'Ganho'] }];
    const withJoin: CrmReportRow = {
      ...saved,
      id: 'rj',
      userId: 'eu',
      name: 'Opps por status do lead',
      spec: {
        source: 'crmOpportunities',
        joins: [{ leftField: 'leadId', rightSource: 'leads', rightField: 'id', alias: 'lead' }],
        measures: [{ type: 'count' }],
        dimensions: [{ type: 'field', field: 'lead.status' }],
      },
    };

    beforeEach(() => {
      fieldsOf.mockImplementation((s: string) => Promise.resolve(s === 'leads' ? LEAD_SCHEMA : OPP_SCHEMA));
      svc.list.mockImplementation(() => ok([withJoin]));
      svc.get.mockImplementation(() => ok(withJoin));
    });

    it('abrir salvo com join carrega o schema da tabela da direita; o agrupamento mostra apelido.campo; Visualizar manda o join', async () => {
      render(<CrmReportBuilder />);
      fireEvent.click(await screen.findByText('Abrir'));
      await waitFor(() => expect(svc.run).toHaveBeenCalled());
      expect(fieldsOf).toHaveBeenCalledWith('leads');
      const dim = within(screen.getByTestId('dimension-0')).getByLabelText('Campo do agrupamento');
      expect(dim).toHaveValue('lead.status');
      expect(within(dim).getByRole('option', { selected: true })).toHaveTextContent('lead.Status');
      fireEvent.click(screen.getByText('Visualizar'));
      await waitFor(() => expect(svc.preview).toHaveBeenCalledTimes(1));
      expect(svc.preview.mock.calls[0][0].spec).toEqual(withJoin.spec);
    });

    it('remover join em uso pede confirmação: cancelar mantém; confirmar remove o join e o agrupamento', async () => {
      render(<CrmReportBuilder />);
      fireEvent.click(await screen.findByText('Abrir'));
      await waitFor(() => expect(svc.run).toHaveBeenCalled());
      fireEvent.click(within(screen.getByTestId('join-0')).getByText('Remover'));
      expect(screen.getByText('Mudar o cruzamento?')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Cancelar'));
      expect(screen.getByTestId('join-0')).toBeInTheDocument();
      expect(screen.getByTestId('dimension-0')).toBeInTheDocument();

      fireEvent.click(within(screen.getByTestId('join-0')).getByText('Remover'));
      fireEvent.click(screen.getByText('Mudar e limpar'));
      await waitFor(() => expect(screen.queryByTestId('join-0')).toBeNull());
      expect(screen.queryByTestId('dimension-0')).toBeNull();
    });

    it('join novo incompleto bloqueia Visualizar com a explicação', async () => {
      fieldsOf.mockImplementation((s: string) => Promise.resolve(s === 'leads' ? LEAD_SCHEMA : OPP_SCHEMA));
      await newReportOn('leadProposals');
      fireEvent.click(screen.getByText('Avançado: cruzar com outra tabela'));
      fireEvent.click(screen.getByText('Adicionar cruzamento'));
      expect(screen.getByText('Visualizar')).toBeDisabled();
      expect(screen.getByTestId('block-reason')).toHaveTextContent('Complete ou remova o cruzamento: escolha a tabela e os dois campos.');
      fireEvent.change(within(screen.getByTestId('join-0')).getByLabelText('Tabela'), { target: { value: 'leads' } });
      await waitFor(() => expect(within(screen.getByTestId('join-0')).getByLabelText('Apelido')).toHaveValue('leads'));
    });
  });
});

describe('review do PR-B — regressões no orquestrador', () => {
  const OPP_SCHEMA = [
    { name: 'title', label: 'Título', type: 'string' },
    { name: 'leadId', label: 'Lead', type: 'relation', relation: { targetTable: '@@PRESET_TABLE_KEY::leads' } },
  ];
  const LEAD_SCHEMA = [{ name: 'status', label: 'Status', type: 'select', options: ['Novo', 'Ganho'] }];
  beforeEach(() => {
    Object.values(svc).forEach((f) => f.mockReset());
    svc.list.mockImplementation(() => ok([]));
  });
  afterEach(() => cleanup());

  it('achado 1: editar enquanto o schema da tabela do join carrega não se perde', async () => {
    let release: (v: unknown) => void = () => {};
    fieldsOf.mockReset().mockImplementation((s: string) =>
      s === 'leads' ? new Promise((r) => (release = () => r(LEAD_SCHEMA))) : Promise.resolve(OPP_SCHEMA),
    );
    await newReportOn('leadProposals'); // fonte do mock de useReportSources; os campos vêm do fieldsOf acima
    fireEvent.click(screen.getByText('Avançado: cruzar com outra tabela'));
    fireEvent.click(screen.getByText('Adicionar cruzamento'));
    fireEvent.change(within(screen.getByTestId('join-0')).getByLabelText('Tabela'), { target: { value: 'leads' } });
    fireEvent.click(screen.getByText('Adicionar medida'));
    expect(screen.getAllByTestId(/^measure-/)).toHaveLength(2);
    release(undefined);
    await waitFor(() => expect(within(screen.getByTestId('join-0')).getByLabelText('Apelido')).toHaveValue('leads'));
    expect(screen.getAllByTestId(/^measure-/)).toHaveLength(2);
  });

  it('achado 3: apelido inválido digitado desabilita Visualizar e Salvar', async () => {
    fieldsOf.mockReset().mockImplementation((s: string) => Promise.resolve(s === 'leads' ? LEAD_SCHEMA : OPP_SCHEMA));
    await newReportOn('leadProposals');
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'R' } });
    fireEvent.click(screen.getByText('Avançado: cruzar com outra tabela'));
    fireEvent.click(screen.getByText('Adicionar cruzamento'));
    const row = screen.getByTestId('join-0');
    fireEvent.change(within(row).getByLabelText('Tabela'), { target: { value: 'leads' } });
    await waitFor(() => expect(within(row).getByLabelText('Apelido')).toHaveValue('leads'));
    fireEvent.change(within(row).getByLabelText('Campo da fonte'), { target: { value: 'leadId' } });
    fireEvent.change(within(row).getByLabelText('Campo da outra tabela'), { target: { value: 'id' } });
    expect(screen.getByText('Visualizar')).toBeEnabled();
    const alias = within(row).getByLabelText('Apelido');
    fireEvent.change(alias, { target: { value: 'id' } });
    fireEvent.blur(alias);
    expect(screen.getByText('Visualizar')).toBeDisabled();
    expect(screen.getByText('Salvar')).toBeDisabled();
    expect(screen.getByTestId('block-reason')).toHaveTextContent('Corrija o apelido do cruzamento.');
  });
});
