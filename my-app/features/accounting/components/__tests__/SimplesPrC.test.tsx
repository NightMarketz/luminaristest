import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { SimplesApuracaoPanel } from '../SimplesApuracaoPanel';
import type { Apuracao } from '../../../../lib/services/simples.service';
import { aliquotasSimples, apuracaoMei, apuracaoSimples, perfilAno } from './simplesFixtures';

(globalThis as unknown as { React: typeof React }).React = React;

const obterApuracao = vi.fn();
const obterHistorico = vi.fn();
const salvarHistorico = vi.fn();
const obterSegregacao = vi.fn();
const salvarSegregacao = vi.fn();
vi.mock('../../../../lib/services/simples.service', async (orig) => ({
  ...(await orig<typeof import('../../../../lib/services/simples.service')>()),
  simplesService: {
    obterApuracao: (...a: unknown[]) => obterApuracao(...a),
    calcularApuracao: vi.fn(),
    listParcerias: async () => [],
    obterAliquotas: async (c: string) => aliquotasSimples(c), // PR-D item 15: seção do detalhe em ano SIMPLES
    obterHistorico: (...a: unknown[]) => obterHistorico(...a),
    salvarHistorico: (...a: unknown[]) => salvarHistorico(...a),
    obterSegregacao: (...a: unknown[]) => obterSegregacao(...a),
    salvarSegregacao: (...a: unknown[]) => salvarSegregacao(...a),
  },
}));
vi.mock('../../../../lib/services/dynamic-table.service', () => ({ DynamicTableService: { getTables: async () => ({ data: [] }) } }));

const ANO = 2026;
const comp = (m: number) => `${ANO}-${String(m).padStart(2, '0')}`;
const SIMPLES = { ...perfilAno(ANO), regime: 'SIMPLES' as const };
async function abrir(m: number) {
  await waitFor(() => expect(screen.getByTestId(`simples-${comp(m)}`)).not.toHaveAttribute('data-estado', 'carregando'));
  fireEvent.click(screen.getByText(comp(m)));
  return screen.findByRole('dialog');
}

describe('PR-C item 11 — histórico pré-adoção', () => {
  beforeEach(() => {
    obterApuracao.mockImplementation(async (c: string): Promise<Apuracao> =>
      apuracaoSimples(c, { alertas: [{ codigo: 'RBT12_INCOMPLETO', detalhe: 'sem receita declarada em 2025-03, 2025-04', severity: 'WARNING' }] }),
    );
    obterHistorico.mockResolvedValue(null);
  });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('atalho do RBT12_INCOMPLETO: um botão por mês faltante; abre o modal no mês, vazio (404 → null)', async () => {
    render(<SimplesApuracaoPanel unitId="u1" ano={ANO} perfil={SIMPLES} />);
    const dlg = await abrir(5);
    const alerta = within(dlg).getByTestId('alerta-RBT12_INCOMPLETO');
    expect(within(alerta).getAllByRole('button').map((b) => b.textContent)).toEqual(['Declarar histórico de 2025-03', 'Declarar histórico de 2025-04']);
    fireEvent.click(within(alerta).getByRole('button', { name: 'Declarar histórico de 2025-04' }));
    const modal = await screen.findByTestId('historico-modal');
    expect(within(modal).getByLabelText('Competência')).toHaveValue('2025-04');
    await waitFor(() => expect(obterHistorico).toHaveBeenCalledWith('2025-04', { unitId: 'u1' }));
    expect(await within(modal).findByText('Sem histórico declarado neste mês.')).toBeInTheDocument();
  });

  it('pré-preenche pelo GET, grava pelo PUT e recarrega o ano (o RBT12 muda)', async () => {
    obterHistorico.mockResolvedValue({ id: 'h', unitId: 'u1', competencia: '2025-03', receitaBrutaCents: 1500000, folhaCents: 400000, sourceDocumentId: null, updatedAt: '' });
    salvarHistorico.mockImplementation(async (c: string, b: { receitaBrutaCents: number; folhaCents: number | null }) => ({ id: 'h', unitId: 'u1', competencia: c, ...b, sourceDocumentId: null, updatedAt: '' }));
    render(<SimplesApuracaoPanel unitId="u1" ano={ANO} perfil={SIMPLES} />);
    const dlg = await abrir(5);
    fireEvent.click(within(dlg).getByRole('button', { name: 'Declarar histórico de 2025-03' }));
    const modal = await screen.findByTestId('historico-modal');
    await waitFor(() => expect(within(modal).getByLabelText('Receita bruta do mês')).toHaveValue('15.000,00'));
    expect(within(modal).getByLabelText('Folha de salários (opcional)')).toHaveValue('4.000,00');
    fireEvent.change(within(modal).getByLabelText('Receita bruta do mês'), { target: { value: '16.000,00' } });
    fireEvent.change(within(modal).getByLabelText('Folha de salários (opcional)'), { target: { value: '' } });
    const antes = obterApuracao.mock.calls.length;
    fireEvent.click(within(modal).getByRole('button', { name: 'Salvar histórico' }));
    await waitFor(() => expect(salvarHistorico).toHaveBeenCalledWith('2025-03', { unitId: 'u1', receitaBrutaCents: 1600000, folhaCents: null }));
    await waitFor(() => expect(obterApuracao.mock.calls.length).toBe(antes + 12));
  });

  it('botão da grade abre o histórico em dezembro do ano anterior, com competência livre', async () => {
    render(<SimplesApuracaoPanel unitId="u1" ano={ANO} perfil={SIMPLES} />);
    fireEvent.click(screen.getByRole('button', { name: 'Histórico pré-adoção' }));
    const modal = await screen.findByTestId('historico-modal');
    expect(within(modal).getByLabelText('Competência')).toHaveValue('2025-12');
    fireEvent.change(within(modal).getByLabelText('Competência'), { target: { value: '2025-07' } });
    await waitFor(() => expect(obterHistorico).toHaveBeenLastCalledWith('2025-07', { unitId: 'u1' }));
  });

  it('403 no PUT esconde o botão de salvar e mostra o texto do BE', async () => {
    salvarHistorico.mockRejectedValue({ status: 403, message: 'Você não tem permissão para alterar as entradas do Simples Nacional.' });
    render(<SimplesApuracaoPanel unitId="u1" ano={ANO} perfil={SIMPLES} />);
    fireEvent.click(screen.getByRole('button', { name: 'Histórico pré-adoção' }));
    const modal = await screen.findByTestId('historico-modal');
    await within(modal).findByText('Sem histórico declarado neste mês.');
    fireEvent.change(within(modal).getByLabelText('Receita bruta do mês'), { target: { value: '10' } });
    fireEvent.click(within(modal).getByRole('button', { name: 'Salvar histórico' }));
    expect(await within(modal).findByRole('alert')).toHaveTextContent('não tem permissão');
    expect(within(modal).queryByRole('button', { name: 'Salvar histórico' })).toBeNull();
  });
});

describe('PR-C item 12 — segregação manual', () => {
  beforeEach(() => {
    obterApuracao.mockImplementation(async (c: string): Promise<Apuracao> => apuracaoSimples(c));
    obterSegregacao.mockResolvedValue({
      id: 's', unitId: 'u1', competencia: comp(4), updatedAt: '',
      parcelas: [{ natureza: 'REVENDA', receitaCents: 50000, motivo: 'MONOFASICO_E_ICMS_ST', excluir: ['PIS', 'COFINS', 'ICMS'] }],
    });
  });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('pré-preenche pelo GET e mostra os tributos excluídos que o BE devolveu; texto fixo do ISS de outro município', async () => {
    render(<SimplesApuracaoPanel unitId="u1" ano={ANO} perfil={SIMPLES} />);
    const dlg = await abrir(4);
    fireEvent.click(within(dlg).getByRole('button', { name: 'Ver / editar segregação' }));
    await waitFor(() => expect(obterSegregacao).toHaveBeenCalledWith(comp(4), { unitId: 'u1' }));
    const p1 = await within(dlg).findByTestId('parcela-1');
    expect(within(p1).getByLabelText('Natureza da parcela {{n}}')).toHaveValue('REVENDA');
    expect(within(p1).getByLabelText('Receita da parcela {{n}}')).toHaveValue('500,00');
    expect(within(dlg).getByTestId('excluir-1')).toHaveTextContent('PIS, COFINS, ICMS');
    expect(within(dlg).getByText(/continua no DAS \(LC 123 art\. 18 § 4º-A V\)/)).toBeInTheDocument();
  });

  it('o envio substitui o conjunto inteiro do mês e relê a competência', async () => {
    salvarSegregacao.mockImplementation(async (c: string, b: { parcelas: Array<{ natureza: string; receitaCents: number; motivo: string }> }) => ({
      id: 's', unitId: 'u1', competencia: c, updatedAt: '', parcelas: b.parcelas.map((p) => ({ ...p, excluir: p.motivo === 'ISS_RETIDO' ? ['ISS'] : [] })),
    }));
    render(<SimplesApuracaoPanel unitId="u1" ano={ANO} perfil={SIMPLES} />);
    const dlg = await abrir(4);
    fireEvent.click(within(dlg).getByRole('button', { name: 'Ver / editar segregação' }));
    await within(dlg).findByTestId('parcela-1');
    fireEvent.click(within(dlg).getByRole('button', { name: 'Adicionar parcela' }));
    const p2 = within(dlg).getByTestId('parcela-2');
    fireEvent.click(within(dlg).getByRole('button', { name: 'Salvar segregação' }));
    expect(within(dlg).getByRole('alert')).toHaveTextContent('Escolha a natureza da parcela');
    expect(salvarSegregacao).not.toHaveBeenCalled();
    fireEvent.change(within(p2).getByLabelText('Natureza da parcela {{n}}'), { target: { value: 'SERVICO' } });
    fireEvent.change(within(p2).getByLabelText('Receita da parcela {{n}}'), { target: { value: '200,00' } });
    fireEvent.change(within(p2).getByLabelText('Motivo da parcela {{n}}'), { target: { value: 'ISS_RETIDO' } });
    const antes = obterApuracao.mock.calls.length;
    fireEvent.click(within(dlg).getByRole('button', { name: 'Salvar segregação' }));
    await waitFor(() => expect(salvarSegregacao).toHaveBeenCalledWith(comp(4), {
      unitId: 'u1',
      parcelas: [
        { natureza: 'REVENDA', receitaCents: 50000, motivo: 'MONOFASICO_E_ICMS_ST' },
        { natureza: 'SERVICO', receitaCents: 20000, motivo: 'ISS_RETIDO' },
      ],
    }));
    await waitFor(() => expect(obterApuracao).toHaveBeenCalledTimes(antes + 1));
    expect(obterApuracao).toHaveBeenLastCalledWith(comp(4), { unitId: 'u1' });
    expect(await within(dlg).findByTestId('excluir-2')).toHaveTextContent('ISS');
  });

  it('ano MEI: sem segregação nem histórico', async () => {
    obterApuracao.mockImplementation(async (c: string) => apuracaoMei(c));
    render(<SimplesApuracaoPanel unitId="u1" ano={ANO} perfil={{ ...perfilAno(ANO), regime: 'MEI', meiContribuinteIcms: false, meiContribuinteIss: true }} />);
    const dlg = await abrir(4);
    expect(within(dlg).queryByTestId('segregacao')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Histórico pré-adoção' })).toBeNull();
  });
});
