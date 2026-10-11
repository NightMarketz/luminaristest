import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { TaxAssessmentPanel } from '../TaxAssessmentPanel';
import type { TaxAssessment } from '../../../../lib/services/taxAssessments.service';
import { formatCentsStr, montarGrade } from '../../lib/taxAssessmentGrid';

(globalThis as unknown as { React: typeof React }).React = React;

const list = vi.fn();
const get = vi.fn();
const reconcileProvisao = vi.fn();
vi.mock('../../../../lib/services/taxAssessments.service', () => ({
  taxAssessmentsService: {
    list: (...a: unknown[]) => list(...a),
    get: (...a: unknown[]) => get(...a),
    reconcileProvisao: (...a: unknown[]) => reconcileProvisao(...a),
  },
}));

const ta = (id: string, extra: Partial<TaxAssessment> = {}): TaxAssessment => ({
  id, tributo: 'IRPJ', periodo: 'T01', modo: 'PRESUMIDO', codigoReceita: '208901', baseCents: '100000', devidoCents: '15000',
  deducoesCents: '0', aPagarCents: '15000', saldoNegativoCents: '0', diferencaPostergadaCents: '0', status: 'CONFIRMED',
  supersedesId: null, provisaoPendente: false, tabelaVersao: 'v1', parametrosSha256: 'abc123', avisoParametroLegal: null,
  memoria: [{ codigo: 'BASE', descricao: 'Base presumida', valorCents: '100000', fonte: 'Lei 9.249 art. 15' }],
  confirmedAt: '2026-04-10T12:00:00.000Z', ...extra,
});

const AVISO = 'Parâmetro legal mudou depois do pagamento — reconfirme.';
const irpjVelha = ta('irpj-v1', { status: 'SUPERSEDED', avisoParametroLegal: AVISO, aPagarCents: '14000', confirmedAt: '2026-04-01T00:00:00.000Z' });
const irpjViva = ta('irpj-v2', { supersedesId: 'irpj-v1' });
const csll = ta('csll-1', { tributo: 'CSLL', codigoReceita: '237201', aPagarCents: '9000', provisaoPendente: true });
const pis = ta('pis-1', { tributo: 'PIS', periodo: 'M01', modo: 'CUMULATIVO', codigoReceita: '810901', aPagarCents: '650' });
const linhas = [irpjViva, irpjVelha, csll, pis];

describe('helpers da grade (itens 2, 3)', () => {
  it('ordena períodos (trimestre antes de mês do PIS) e escolhe a viva', () => {
    const g = montarGrade(linhas);
    expect(g.map((c) => c.periodo)).toEqual(['T01', 'M01']);
    expect(g[0].tributos.IRPJ?.atual.id).toBe('irpj-v2');
    expect(g[0].tributos.IRPJ?.versoes.map((v) => v.id)).toEqual(['irpj-v1', 'irpj-v2']);
  });

  it('F-5 a: aviso só na SUPERSEDED marca a célula; pendente marca a célula', () => {
    const g = montarGrade(linhas);
    expect(g[0].tributos.IRPJ?.aviso).toBe(true);
    expect(g[0].tributos.CSLL?.aviso).toBe(false);
    expect(g[0].tributos.CSLL?.pendente).toBe(true);
    expect(g[0]).toMatchObject({ aviso: true, pendente: true });
  });

  it('sem viva, a célula mostra a substituída mais recente', () => {
    expect(montarGrade([irpjVelha])[0].tributos.IRPJ?.atual.id).toBe('irpj-v1');
  });

  it('formata centavos string sem passar por number', () => {
    expect(formatCentsStr('15000')).toBe('R$ 150,00');
    expect(formatCentsStr('5')).toBe('R$ 0,05');
    expect(formatCentsStr('-123456789')).toBe('-R$ 1.234.567,89');
    expect(formatCentsStr('9007199254740993')).toBe('R$ 90.071.992.547.409,93');
  });
});

describe('TaxAssessmentPanel', () => {
  beforeEach(() => {
    list.mockResolvedValue(linhas);
    get.mockImplementation(async (id: string) => linhas.find((l) => l.id === id));
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('item 2: carrega o ano corrente da unidade e mostra a pagar, status e selos por célula', async () => {
    render(<TaxAssessmentPanel unitId="u1" />);
    const cel = await screen.findByTestId('celula-T01-IRPJ');
    expect(list).toHaveBeenCalledWith({ unitId: 'u1', anoCalendario: new Date().getFullYear() });
    expect(cel).toHaveTextContent('R$ 150,00');
    expect(cel).toHaveTextContent('Confirmada');
    expect(cel).toHaveTextContent('Parâmetro legal');
    expect(screen.getByTestId('celula-T01-CSLL')).toHaveTextContent('Provisão pendente');
    expect(screen.getByTestId('celula-M01-PIS')).toHaveTextContent('R$ 6,50');
    expect(screen.getByTestId('celula-M01-IRPJ')).toHaveTextContent('—');
  });

  it('item 2: trocar o ano recarrega', async () => {
    render(<TaxAssessmentPanel unitId="u1" />);
    await screen.findByTestId('celula-T01-IRPJ');
    fireEvent.change(screen.getByLabelText('Ano-calendário'), { target: { value: '2025' } });
    await waitFor(() => expect(list).toHaveBeenLastCalledWith({ unitId: 'u1', anoCalendario: 2025 }));
  });

  it('vazio: mensagem sem grade', async () => {
    list.mockResolvedValue([]);
    render(<TaxAssessmentPanel unitId="u1" />);
    expect(await screen.findByText('Nenhuma apuração gravada neste ano.')).toBeInTheDocument();
  });

  it('itens 3–4: detalhe com memória, snapshot, histórico e a faixa do aviso da SUPERSEDED', async () => {
    render(<TaxAssessmentPanel unitId="u1" />);
    fireEvent.click(within(await screen.findByTestId('celula-T01-IRPJ')).getByRole('button'));
    await waitFor(() => expect(get).toHaveBeenCalledWith('irpj-v2', { unitId: 'u1' }));
    expect(await screen.findByText('Lei 9.249 art. 15')).toBeInTheDocument();
    expect(screen.getByText('abc123')).toBeInTheDocument();
    expect(screen.getByText('v1')).toBeInTheDocument();
    // a viva não tem aviso: sem faixa
    expect(screen.queryByRole('alert')).toBeNull();
    // histórico lista as 2 versões; a substituída mostra o texto do BE
    expect(within(screen.getByTestId('versao-irpj-v1')).getByText(AVISO)).toBeInTheDocument();
    expect(screen.getByTestId('versao-irpj-v2')).toHaveTextContent('substitui irpj-v1');
    // abrir a substituída mostra a faixa de destaque
    fireEvent.click(within(screen.getByTestId('versao-irpj-v1')).getByText(/Substituída/));
    expect(await screen.findByRole('alert')).toHaveTextContent(AVISO);
  });

  it('snapshot ausente (anterior ao LEGAL-PARAMS PR-4) aparece como tal', async () => {
    list.mockResolvedValue([ta('x', { parametrosSha256: null })]);
    get.mockResolvedValue(ta('x', { parametrosSha256: null }));
    render(<TaxAssessmentPanel unitId="u1" />);
    fireEvent.click(within(await screen.findByTestId('celula-T01-IRPJ')).getByRole('button'));
    expect(await screen.findByText('— (anterior ao snapshot)')).toBeInTheDocument();
  });

  it('item 7: reconciliar a provisão pendente chama o BE e recarrega a grade', async () => {
    reconcileProvisao.mockResolvedValue({ ...csll, provisaoPendente: false });
    render(<TaxAssessmentPanel unitId="u1" />);
    fireEvent.click(within(await screen.findByTestId('celula-T01-CSLL')).getByRole('button'));
    fireEvent.click(await screen.findByRole('button', { name: 'Reconciliar provisão' }));
    await waitFor(() => expect(reconcileProvisao).toHaveBeenCalledWith('csll-1', { unitId: 'u1' }));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
  });

  it('item 7: erro do BE no reconcile aparece no modal', async () => {
    reconcileProvisao.mockRejectedValue({ status: 403, error: 'Sem permissão' });
    render(<TaxAssessmentPanel unitId="u1" />);
    fireEvent.click(within(await screen.findByTestId('celula-T01-CSLL')).getByRole('button'));
    fireEvent.click(await screen.findByRole('button', { name: 'Reconciliar provisão' }));
    expect(await screen.findByText('Sem permissão')).toBeInTheDocument();
  });

  it('linha sem provisão pendente não tem o botão', async () => {
    render(<TaxAssessmentPanel unitId="u1" />);
    fireEvent.click(within(await screen.findByTestId('celula-T01-IRPJ')).getByRole('button'));
    await screen.findByTestId('versao-irpj-v2');
    expect(screen.queryByRole('button', { name: 'Reconciliar provisão' })).toBeNull();
  });
});
