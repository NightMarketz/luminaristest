import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { SimplesApuracaoPanel } from '../SimplesApuracaoPanel';
import type { Apuracao, SalaoParceriaContrato } from '../../../../lib/services/simples.service';
import { aliquotasSimples, apuracaoMei, apuracaoSimples, perfilAno } from './simplesFixtures';

(globalThis as unknown as { React: typeof React }).React = React;

const obterApuracao = vi.fn();
const calcularApuracao = vi.fn();
const registrarDas = vi.fn();
const listParcerias = vi.fn();
const criarParceria = vi.fn();
const atualizarParceria = vi.fn();
const removerParceria = vi.fn();
vi.mock('../../../../lib/services/simples.service', async (orig) => ({
  ...(await orig<typeof import('../../../../lib/services/simples.service')>()),
  simplesService: {
    obterApuracao: (...a: unknown[]) => obterApuracao(...a),
    calcularApuracao: (...a: unknown[]) => calcularApuracao(...a),
    registrarDas: (...a: unknown[]) => registrarDas(...a),
    listParcerias: (...a: unknown[]) => listParcerias(...a),
    obterAliquotas: async (c: string) => aliquotasSimples(c), // PR-D item 15: seção do detalhe em ano SIMPLES
    criarParceria: (...a: unknown[]) => criarParceria(...a),
    atualizarParceria: (...a: unknown[]) => atualizarParceria(...a),
    removerParceria: (...a: unknown[]) => removerParceria(...a),
  },
}));
const getTables = vi.fn();
vi.mock('../../../../lib/services/dynamic-table.service', () => ({ DynamicTableService: { getTables: (...a: unknown[]) => getTables(...a) } }));
vi.mock('@/features/dashboard/components/shared/relation-utils.client', () => ({
  fetchRelatedTableData: async () => [{ id: 'emp-1', data: { name: 'Ana' } }, { id: 'emp-2', data: { name: 'Bia' } }],
  formatRelatedDisplayValue: (r: { data: { name: string } }) => r.data.name,
}));
// RelationSelector canônico substituído por um <select> (o componente real busca a tabela no BE).
vi.mock('@/features/dashboard/components/forms/RelationSelector', () => ({
  default: ({ name, value, onChange }: { name: string; value: string; onChange: (n: string, v: string) => void }) => (
    <select aria-label="Profissional" value={value} onChange={(e) => onChange(name, e.target.value)}>
      <option value="">—</option>
      <option value="emp-1">Ana</option>
      <option value="emp-2">Bia</option>
    </select>
  ),
}));

const ANO = 2026;
const comp = (m: number) => `${ANO}-${String(m).padStart(2, '0')}`;
async function abrir(m: number) {
  await waitFor(() => expect(screen.getByTestId(`simples-${comp(m)}`)).not.toHaveAttribute('data-estado', 'carregando'));
  fireEvent.click(screen.getByText(comp(m)));
  return screen.findByRole('dialog');
}
const das = { id: 'd1', numeroDocumento: '07202603', valorCents: 257250, vencimento: '2026-04-20', provisaoPendente: false };
const parceria = (id: string, extra: Partial<SalaoParceriaContrato> = {}): SalaoParceriaContrato => ({
  id, unitId: 'u1', profissionalContactId: 'emp-1', cotaSalaoBp: 4000, naturezaCota: 'ALUGUEL_BEM_MOVEL', homologadoEm: '2026-01-10',
  sindicato: 'Sindicato X', vigenteDesde: '2026-01-15', vigenteAte: null, createdAt: '', updatedAt: '', ...extra,
});

function preencherDas(dlg: HTMLElement, numero: string, valor: string) {
  fireEvent.click(within(dlg).getByRole('button', { name: /Registrar (DAS oficial|outro DAS)/ }));
  fireEvent.change(within(dlg).getByLabelText('Número do documento'), { target: { value: numero } });
  fireEvent.change(within(dlg).getByLabelText('Valor oficial'), { target: { value: valor } });
}

describe('PR-B item 9 — registrar o DAS oficial', () => {
  beforeEach(() => {
    getTables.mockResolvedValue({ data: [] });
    listParcerias.mockResolvedValue([]);
    obterApuracao.mockImplementation(async (c: string): Promise<Apuracao> => apuracaoSimples(c));
    calcularApuracao.mockImplementation(async (c: string): Promise<Apuracao> => apuracaoSimples(c));
  });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('F-4 (a): sem Calcular nesta sessão o registro fica travado', async () => {
    render(<SimplesApuracaoPanel unitId="u1" ano={ANO} perfil={{ ...perfilAno(ANO), regime: 'SIMPLES' }} />);
    const dlg = await abrir(3);
    expect(within(dlg).getByRole('button', { name: 'Registrar DAS oficial' })).toBeDisabled();
    expect(within(dlg).getByText(/Calcule antes de registrar/)).toBeInTheDocument();
  });

  it('F-4 (a): prévia com bloqueante não libera o registro', async () => {
    calcularApuracao.mockResolvedValue(apuracaoSimples(comp(3), { alertas: [{ codigo: 'RBT12_INCOMPLETO', detalhe: 'x', severity: 'WARNING' }] }));
    render(<SimplesApuracaoPanel unitId="u1" ano={ANO} perfil={{ ...perfilAno(ANO), regime: 'SIMPLES' }} />);
    const dlg = await abrir(3);
    fireEvent.click(within(dlg).getByRole('button', { name: 'Calcular' }));
    expect(await within(dlg).findByText(/alerta que bloqueia o registro/)).toBeInTheDocument();
    expect(within(dlg).getByRole('button', { name: 'Registrar DAS oficial' })).toBeDisabled();
  });

  it('calcular → lado a lado → PUT em centavos com vencimento sugerido; a linha vira registrada', async () => {
    registrarDas.mockResolvedValue(apuracaoSimples(comp(3), { dasOficial: das, divergenciaCents: 0 }));
    render(<SimplesApuracaoPanel unitId="u1" ano={ANO} perfil={{ ...perfilAno(ANO), regime: 'SIMPLES' }} />);
    const dlg = await abrir(3);
    fireEvent.click(within(dlg).getByRole('button', { name: 'Calcular' }));
    await waitFor(() => expect(within(dlg).getByRole('button', { name: 'Registrar DAS oficial' })).toBeEnabled());
    preencherDas(dlg, '07202603', '2.600,00');
    expect(within(dlg).getByLabelText('Vencimento')).toHaveValue('2026-04-20');
    const lado = within(dlg).getByTestId('das-lado-a-lado');
    expect(lado).toHaveTextContent('R$ 2.572,50');
    expect(lado).toHaveTextContent('R$ 2.600,00');
    expect(lado).toHaveTextContent('R$ 27,50');
    fireEvent.click(within(dlg).getByRole('button', { name: 'Confirmar registro' }));
    await waitFor(() => expect(registrarDas).toHaveBeenCalledWith(comp(3), { unitId: 'u1', numeroDocumento: '07202603', valorCents: 260000, vencimento: '2026-04-20' }));
    await waitFor(() => expect(screen.getByTestId(`simples-${comp(3)}`)).toHaveAttribute('data-estado', 'registrado'));
  });

  it('409: avisa que as entradas mudaram e recalcula sozinho', async () => {
    registrarDas.mockRejectedValue({ status: 409, code: 'CONFLICT', message: 'As entradas de 2026-03 mudaram depois do cálculo' });
    render(<SimplesApuracaoPanel unitId="u1" ano={ANO} perfil={{ ...perfilAno(ANO), regime: 'SIMPLES' }} />);
    const dlg = await abrir(3);
    fireEvent.click(within(dlg).getByRole('button', { name: 'Calcular' }));
    await waitFor(() => expect(within(dlg).getByRole('button', { name: 'Registrar DAS oficial' })).toBeEnabled());
    preencherDas(dlg, '1', '10,00');
    fireEvent.click(within(dlg).getByRole('button', { name: 'Confirmar registro' }));
    expect(await within(dlg).findByText(/As entradas mudaram depois do cálculo — calculamos de novo/)).toBeInTheDocument();
    await waitFor(() => expect(calcularApuracao).toHaveBeenCalledTimes(2));
  });

  it('400 com details.alertas: lista os bloqueantes do BE', async () => {
    registrarDas.mockRejectedValue({
      status: 400, code: 'VALIDATION_ERROR', message: 'A apuração de 2026-03 não pode ser registrada: TIEOUT_DIVERGENTE (x).',
      details: { alertas: [{ codigo: 'TIEOUT_DIVERGENTE', detalhe: 'subrazão 0 × razão 10', severity: 'WARNING' }] },
    });
    render(<SimplesApuracaoPanel unitId="u1" ano={ANO} perfil={{ ...perfilAno(ANO), regime: 'SIMPLES' }} />);
    const dlg = await abrir(3);
    fireEvent.click(within(dlg).getByRole('button', { name: 'Calcular' }));
    await waitFor(() => expect(within(dlg).getByRole('button', { name: 'Registrar DAS oficial' })).toBeEnabled());
    preencherDas(dlg, '1', '10,00');
    fireEvent.click(within(dlg).getByRole('button', { name: 'Confirmar registro' }));
    const erro = await within(within(dlg).getByTestId('das-registro')).findByRole('alert');
    expect(erro).toHaveTextContent('não pode ser registrada');
    expect(within(erro).getByTestId('alerta-TIEOUT_DIVERGENTE')).toHaveTextContent('subrazão 0 × razão 10');
  });

  it('403: esconde o registro e mostra o texto do BE', async () => {
    registrarDas.mockRejectedValue({ status: 403, code: 'FORBIDDEN', message: 'Você não tem permissão para registrar a apuração do Simples Nacional.' });
    render(<SimplesApuracaoPanel unitId="u1" ano={ANO} perfil={{ ...perfilAno(ANO), regime: 'SIMPLES' }} />);
    const dlg = await abrir(3);
    fireEvent.click(within(dlg).getByRole('button', { name: 'Calcular' }));
    await waitFor(() => expect(within(dlg).getByRole('button', { name: 'Registrar DAS oficial' })).toBeEnabled());
    preencherDas(dlg, '1', '10,00');
    fireEvent.click(within(dlg).getByRole('button', { name: 'Confirmar registro' }));
    expect(await within(dlg).findByText('Você não tem permissão para registrar a apuração do Simples Nacional.')).toBeInTheDocument();
    expect(within(dlg).queryByTestId('das-registro')).toBeNull();
  });

  it('P4-7: re-registro avisa substituição; mesmo número e valor avisa só completar a provisão', async () => {
    obterApuracao.mockImplementation(async (c: string) => apuracaoSimples(c, { dasOficial: das }));
    calcularApuracao.mockImplementation(async (c: string) => apuracaoSimples(c, { dasOficial: das }));
    render(<SimplesApuracaoPanel unitId="u1" ano={ANO} perfil={{ ...perfilAno(ANO), regime: 'SIMPLES' }} />);
    const dlg = await abrir(3);
    fireEvent.click(within(dlg).getByRole('button', { name: 'Calcular' }));
    await waitFor(() => expect(within(dlg).getByRole('button', { name: 'Registrar outro DAS' })).toBeEnabled());
    preencherDas(dlg, '07202603', '2.572,50');
    expect(within(dlg).getByRole('status')).toHaveTextContent('só completa a provisão pendente');
    fireEvent.change(within(dlg).getByLabelText('Valor oficial'), { target: { value: '2.600,00' } });
    expect(within(dlg).getByRole('status')).toHaveTextContent('substitui o anterior e estorna a provisão dele');
  });

  it('MEI registra pela mesma rota', async () => {
    obterApuracao.mockImplementation(async (c: string) => apuracaoMei(c));
    calcularApuracao.mockImplementation(async (c: string) => apuracaoMei(c));
    registrarDas.mockResolvedValue(apuracaoMei(comp(2), { dasOficial: { ...das, valorCents: 8090 }, divergenciaCents: 0 }));
    render(<SimplesApuracaoPanel unitId="u1" ano={ANO} perfil={{ ...perfilAno(ANO), regime: 'MEI', meiContribuinteIcms: false, meiContribuinteIss: true }} />);
    const dlg = await abrir(2);
    fireEvent.click(within(dlg).getByRole('button', { name: 'Calcular' }));
    await waitFor(() => expect(within(dlg).getByRole('button', { name: 'Registrar DAS oficial' })).toBeEnabled());
    preencherDas(dlg, '1', '80,90');
    fireEvent.click(within(dlg).getByRole('button', { name: 'Confirmar registro' }));
    await waitFor(() => expect(registrarDas).toHaveBeenCalledWith(comp(2), expect.objectContaining({ valorCents: 8090, vencimento: '2026-03-20' })));
  });
});

describe('PR-B item 10 — parcerias salão-parceiro', () => {
  beforeEach(() => {
    obterApuracao.mockImplementation(async (c: string): Promise<Apuracao> => apuracaoSimples(c));
    getTables.mockResolvedValue({ data: [{ id: 'tbl-emp', internalName: 'employees' }] });
    listParcerias.mockResolvedValue([parceria('p1')]);
  });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('ano SIMPLES: lista da unidade com o nome do profissional, cota em %, homologação e vigência', async () => {
    render(<SimplesApuracaoPanel unitId="u1" ano={ANO} perfil={{ ...perfilAno(ANO), regime: 'SIMPLES' }} />);
    const linha = await screen.findByTestId('parceria-p1');
    await waitFor(() => expect(linha).toHaveTextContent('Ana'));
    expect(listParcerias).toHaveBeenCalledWith({ unitId: 'u1' });
    expect(linha).toHaveTextContent('40,00%');
    expect(linha).toHaveTextContent('Aluguel de bens móveis');
    expect(linha).toHaveTextContent('10/01/2026');
    expect(linha).toHaveTextContent('Sindicato X');
    expect(linha).toHaveTextContent('sem fim');
  });

  it('P4-4: some em ano MEI', async () => {
    obterApuracao.mockImplementation(async (c: string) => apuracaoMei(c));
    render(<SimplesApuracaoPanel unitId="u1" ano={ANO} perfil={{ ...perfilAno(ANO), regime: 'MEI', meiContribuinteIcms: false, meiContribuinteIss: true }} />);
    await waitFor(() => expect(screen.getByTestId(`simples-${comp(12)}`)).not.toHaveAttribute('data-estado', 'carregando'));
    expect(screen.queryByTestId('simples-parcerias')).toBeNull();
    expect(listParcerias).not.toHaveBeenCalled();
  });

  it('nova parceria: valida, envia o corpo do DTO e recarrega', async () => {
    criarParceria.mockResolvedValue(parceria('p2'));
    render(<SimplesApuracaoPanel unitId="u1" ano={ANO} perfil={{ ...perfilAno(ANO), regime: 'SIMPLES' }} />);
    await screen.findByTestId('parceria-p1');
    fireEvent.click(screen.getByRole('button', { name: 'Nova parceria' }));
    const dlg = await screen.findByRole('dialog');
    fireEvent.click(within(dlg).getByRole('button', { name: 'Salvar parceria' }));
    expect(within(dlg).getByRole('alert')).toHaveTextContent('Escolha o profissional-parceiro.');
    fireEvent.change(within(dlg).getByLabelText('Profissional'), { target: { value: 'emp-2' } });
    fireEvent.change(within(dlg).getByLabelText('Cota do salão (%)'), { target: { value: '35' } });
    fireEvent.change(within(dlg).getByLabelText('Natureza da cota'), { target: { value: 'GESTAO' } });
    fireEvent.change(within(dlg).getByLabelText('Homologado em'), { target: { value: '2026-02-01' } });
    fireEvent.change(within(dlg).getByLabelText('Sindicato'), { target: { value: 'Sind. Beleza' } });
    fireEvent.change(within(dlg).getByLabelText('Vigente desde'), { target: { value: '2026-02-01' } });
    fireEvent.click(within(dlg).getByRole('button', { name: 'Salvar parceria' }));
    await waitFor(() => expect(criarParceria).toHaveBeenCalledWith({
      unitId: 'u1', profissionalContactId: 'emp-2', cotaSalaoBp: 3500, naturezaCota: 'GESTAO', homologadoEm: '2026-02-01',
      sindicato: 'Sind. Beleza', vigenteDesde: '2026-02-01', vigenteAte: null,
    }));
    await waitFor(() => expect(listParcerias).toHaveBeenCalledTimes(2));
  });

  it('409 do BE (sobreposição) aparece no formulário', async () => {
    atualizarParceria.mockRejectedValue({ status: 409, code: 'CONFLICT', message: 'O profissional já tem contrato de parceria vigente no período (2026-01-01 a sem fim).' });
    render(<SimplesApuracaoPanel unitId="u1" ano={ANO} perfil={{ ...perfilAno(ANO), regime: 'SIMPLES' }} />);
    fireEvent.click(within(await screen.findByTestId('parceria-p1')).getByRole('button', { name: 'Editar' }));
    const dlg = await screen.findByRole('dialog');
    expect(within(dlg).getByLabelText('Cota do salão (%)')).toHaveValue('40,00');
    fireEvent.click(within(dlg).getByRole('button', { name: 'Salvar parceria' }));
    expect(await within(dlg).findByRole('alert')).toHaveTextContent('já tem contrato de parceria vigente');
    expect(atualizarParceria).toHaveBeenCalledWith('p1', expect.objectContaining({ unitId: 'u1', cotaSalaoBp: 4000 }));
  });

  it('remover pede confirmação e faz o DELETE com unitId', async () => {
    removerParceria.mockResolvedValue(undefined);
    render(<SimplesApuracaoPanel unitId="u1" ano={ANO} perfil={{ ...perfilAno(ANO), regime: 'SIMPLES' }} />);
    fireEvent.click(within(await screen.findByTestId('parceria-p1')).getByRole('button', { name: 'Remover' }));
    expect(removerParceria).not.toHaveBeenCalled();
    const confirmar = (await screen.findAllByRole('button', { name: 'Remover' })).pop();
    fireEvent.click(confirmar!);
    await waitFor(() => expect(removerParceria).toHaveBeenCalledWith('p1', { unitId: 'u1' }));
  });

  it('403 numa escrita esconde as ações de gerir', async () => {
    removerParceria.mockRejectedValue({ status: 403, message: 'Você não tem permissão para alterar as entradas do Simples Nacional.' });
    render(<SimplesApuracaoPanel unitId="u1" ano={ANO} perfil={{ ...perfilAno(ANO), regime: 'SIMPLES' }} />);
    fireEvent.click(within(await screen.findByTestId('parceria-p1')).getByRole('button', { name: 'Remover' }));
    fireEvent.click((await screen.findAllByRole('button', { name: 'Remover' })).pop()!);
    expect(await screen.findByText('Você não tem permissão para alterar as entradas do Simples Nacional.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nova parceria' })).toBeNull();
    expect(within(screen.getByTestId('parceria-p1')).queryByRole('button', { name: 'Editar' })).toBeNull();
  });
});
