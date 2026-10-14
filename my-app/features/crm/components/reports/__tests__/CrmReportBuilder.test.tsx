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
 * 16 (erros nomeados), 17 (salvar/salvar como/apagar) e 18 (abrir salvo, 404).
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
});
