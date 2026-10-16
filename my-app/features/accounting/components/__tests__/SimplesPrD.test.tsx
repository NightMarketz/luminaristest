import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { SimplesApuracaoPanel } from '../SimplesApuracaoPanel';
import type { Apuracao, SimplesDasnSimeiView, SimplesDefisView } from '../../../../lib/services/simples.service';
import { aliquotasSimples, apuracaoMei, apuracaoSimples, perfilAno } from './simplesFixtures';

(globalThis as unknown as { React: typeof React }).React = React;

/** FE-INCR-SIMPLES PR-D — itens 13 (DASN-SIMEI), 14 (DEFIS) e 15 (alíquotas sugeridas). */
const obterApuracao = vi.fn();
const obterAliquotas = vi.fn();
const obterDasnSimei = vi.fn();
const salvarDasnSimei = vi.fn();
const obterDefis = vi.fn();
const salvarDefis = vi.fn();
vi.mock('../../../../lib/services/simples.service', async (orig) => ({
  ...(await orig<typeof import('../../../../lib/services/simples.service')>()),
  simplesService: {
    obterApuracao: (...a: unknown[]) => obterApuracao(...a),
    calcularApuracao: vi.fn(),
    listParcerias: async () => [],
    obterAliquotas: (...a: unknown[]) => obterAliquotas(...a),
    obterDasnSimei: (...a: unknown[]) => obterDasnSimei(...a),
    salvarDasnSimei: (...a: unknown[]) => salvarDasnSimei(...a),
    obterDefis: (...a: unknown[]) => obterDefis(...a),
    salvarDefis: (...a: unknown[]) => salvarDefis(...a),
  },
}));
// Duas tabelas de pessoas: o sócio gravado (`c-1`) está na do CRM, que vem depois na lista do BE.
vi.mock('../../../../lib/services/dynamic-table.service', () => ({
  DynamicTableService: {
    getTables: async () => ({ data: [{ id: 'tbl-emp', internalName: 'employees', name: 'Funcionários' }, { id: 'tbl-crm', internalName: 'crmContacts', name: 'Contatos' }] }),
  },
}));
const LINHAS: Record<string, Array<{ id: string; data: { name: string } }>> = {
  'tbl-emp': [{ id: 'emp-1', data: { name: 'Ana' } }],
  'tbl-crm': [{ id: 'c-1', data: { name: 'Carla' } }, { id: 'c-2', data: { name: 'Davi' } }],
};
vi.mock('@/features/dashboard/components/shared/relation-utils.client', () => ({
  fetchRelatedTableData: async (id: string) => LINHAS[id] ?? [],
  formatRelatedDisplayValue: (r: { data: { name: string } }) => r.data.name,
}));
// RelationSelector canônico substituído por um <select> sobre as linhas da tabela recebida.
vi.mock('@/features/dashboard/components/forms/RelationSelector', () => ({
  default: ({ name, value, onChange, targetTable }: { name: string; value: string; onChange: (n: string, v: string) => void; targetTable: string }) => (
    <select aria-label={name} data-tabela={targetTable} value={value} onChange={(e) => onChange(name, e.target.value)}>
      <option value="">—</option>
      {(LINHAS[targetTable] ?? []).map((l) => <option key={l.id} value={l.id}>{l.data.name}</option>)}
    </select>
  ),
}));

const ANO = 2026;
const comp = (m: number) => `${ANO}-${String(m).padStart(2, '0')}`;
const SIMPLES = { ...perfilAno(ANO), regime: 'SIMPLES' as const };
const MEI = { ...perfilAno(ANO), regime: 'MEI' as const, meiContribuinteIcms: false, meiContribuinteIss: true };
async function grade() {
  await waitFor(() => expect(screen.getByTestId(`simples-${comp(12)}`)).not.toHaveAttribute('data-estado', 'carregando'));
}

const dasnView = (extra: Partial<SimplesDasnSimeiView> = {}): SimplesDasnSimeiView => ({
  ano: ANO, prazo: '2027-05-31', receitaBrutaTotalCents: 6543210, receitaIcmsCents: 1234500, mesesSemSubrazao: ['2026-11', '2026-12'], digitado: null, ...extra,
});
const defisView = (extra: Partial<SimplesDefisView> = {}): SimplesDefisView => ({
  ano: ANO,
  prazo: '2027-03-31',
  mesesApurados: ['2026-01', '2026-02'],
  lucroContabil: { valorCents: 5000000, limiteIsencaoCents: 3200000, informar: true, calculo: 'PRESUNCAO', avisos: ['Atividade sem presunção na tabela: limite calculado sem ela.'] },
  estoqueInicialCents: 100000,
  estoqueFinalCents: 250000,
  digitado: {
    empregadosInicio: 2, empregadosFim: 3, ganhosCapitalCents: 0, ganhosRendaVariavelCents: 12345, exportacaoDiretaCents: 0,
    exportacaoComercial: [], cotasTesourariaBp: 1000,
    socios: [{ contactId: 'c-1', rendimentosIsentosCents: 100000, rendimentosTributaveisCents: 50000, participacaoBp: 9000, irrfCents: 0 }],
    doacoesEleitorais: [],
  },
  ...extra,
});

describe('PR-D item 13 — DASN-SIMEI (ano MEI)', () => {
  beforeEach(() => {
    obterApuracao.mockImplementation(async (c: string): Promise<Apuracao> => apuracaoMei(c));
    obterDasnSimei.mockResolvedValue(dasnView());
  });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('cabeçalho do ano MEI tem DASN-SIMEI (e não DEFIS); mostra prazo, receitas e meses sem subrazão como aviso', async () => {
    render(<SimplesApuracaoPanel unitId="u1" ano={ANO} perfil={MEI} />);
    await grade();
    expect(screen.queryByRole('button', { name: 'DEFIS' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'DASN-SIMEI' }));
    const modal = await screen.findByTestId('dasn-modal');
    await waitFor(() => expect(obterDasnSimei).toHaveBeenCalledWith(ANO, { unitId: 'u1' }));
    expect(await within(modal).findByTestId('dasn-prazo')).toHaveTextContent('31/05/2027');
    expect(within(modal).getByTestId('dasn-receita')).toHaveTextContent('65.432,10');
    expect(within(modal).getByTestId('dasn-icms')).toHaveTextContent('12.345,00');
    expect(within(modal).getByTestId('dasn-meses-sem-subrazao')).toHaveTextContent('2026-11, 2026-12');
    expect(obterAliquotas).not.toHaveBeenCalled();
  });

  it('exige a resposta e grava contratouEmpregado pelo PUT', async () => {
    salvarDasnSimei.mockResolvedValue(dasnView({ digitado: { contratouEmpregado: true } }));
    render(<SimplesApuracaoPanel unitId="u1" ano={ANO} perfil={MEI} />);
    await grade();
    fireEvent.click(screen.getByRole('button', { name: 'DASN-SIMEI' }));
    const modal = await screen.findByTestId('dasn-modal');
    await within(modal).findByTestId('dasn-prazo');
    fireEvent.click(within(modal).getByRole('button', { name: 'Salvar DASN-SIMEI' }));
    expect(within(modal).getByRole('alert')).toHaveTextContent('Responda se o MEI contratou empregado no ano.');
    expect(salvarDasnSimei).not.toHaveBeenCalled();
    fireEvent.click(within(modal).getByLabelText('Sim'));
    fireEvent.click(within(modal).getByRole('button', { name: 'Salvar DASN-SIMEI' }));
    await waitFor(() => expect(salvarDasnSimei).toHaveBeenCalledWith(ANO, { unitId: 'u1', contratouEmpregado: true }));
    expect(await within(modal).findByText('DASN-SIMEI salva.')).toBeInTheDocument();
  });

  it('403 ao salvar esconde a ação de gerir', async () => {
    obterDasnSimei.mockResolvedValue(dasnView({ digitado: { contratouEmpregado: false } }));
    salvarDasnSimei.mockRejectedValue({ status: 403, message: 'Você não tem permissão para editar as declarações do Simples Nacional.' });
    render(<SimplesApuracaoPanel unitId="u1" ano={ANO} perfil={MEI} />);
    await grade();
    fireEvent.click(screen.getByRole('button', { name: 'DASN-SIMEI' }));
    const modal = await screen.findByTestId('dasn-modal');
    await within(modal).findByTestId('dasn-prazo');
    expect(within(modal).getByLabelText('Não')).toBeChecked();
    fireEvent.click(within(modal).getByRole('button', { name: 'Salvar DASN-SIMEI' }));
    expect(await within(modal).findByText('Você não tem permissão para editar as declarações do Simples Nacional.')).toBeInTheDocument();
    expect(within(modal).queryByRole('button', { name: 'Salvar DASN-SIMEI' })).toBeNull();
  });
});

describe('PR-D item 14 — DEFIS (ano SIMPLES)', () => {
  beforeEach(() => {
    obterApuracao.mockImplementation(async (c: string): Promise<Apuracao> => apuracaoSimples(c));
    obterAliquotas.mockImplementation(async (c: string) => aliquotasSimples(c));
    obterDefis.mockResolvedValue(defisView());
  });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  async function abrirDefis() {
    render(<SimplesApuracaoPanel unitId="u1" ano={ANO} perfil={SIMPLES} />);
    await grade();
    expect(screen.queryByRole('button', { name: 'DASN-SIMEI' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'DEFIS' }));
    const modal = await screen.findByTestId('defis-modal');
    await within(modal).findByTestId('defis-prazo');
    return modal;
  }

  it('do razão, só leitura: prazo, meses, lucro com limite/informar/avisos e estoques', async () => {
    const modal = await abrirDefis();
    expect(obterDefis).toHaveBeenCalledWith(ANO, { unitId: 'u1' });
    expect(within(modal).getByTestId('defis-prazo')).toHaveTextContent('31/03/2027');
    expect(within(modal).getByTestId('defis-meses')).toHaveTextContent('2026-01, 2026-02');
    expect(within(modal).getByTestId('defis-lucro')).toHaveTextContent('50.000,00');
    expect(within(modal).getByTestId('defis-limite')).toHaveTextContent('32.000,00');
    expect(within(modal).getByTestId('defis-informar')).toHaveTextContent('Sim');
    expect(within(modal).getByTestId('defis-avisos-lucro')).toHaveTextContent('Atividade sem presunção na tabela: limite calculado sem ela.');
    expect(within(modal).getByTestId('defis-estoque-inicial')).toHaveTextContent('1.000,00');
    expect(within(modal).getByTestId('defis-estoque-final')).toHaveTextContent('2.500,00');
  });

  it('pré-preenche o digitado; acha a tabela que contém o sócio gravado; mostra a soma sócios + tesouraria', async () => {
    const modal = await abrirDefis();
    expect(within(modal).getByLabelText('Empregados no início do ano')).toHaveValue('2');
    expect(within(modal).getByLabelText('Ganhos líquidos em renda variável')).toHaveValue('123,45');
    expect(within(modal).getByLabelText('Cotas em tesouraria (%)')).toHaveValue('10,00');
    await waitFor(() => expect(within(modal).getByLabelText('Tabela de onde vêm os sócios')).toHaveValue('tbl-crm'));
    expect(within(modal).getByLabelText('socio-1')).toHaveValue('c-1');
    expect(within(modal).getByTestId('defis-soma')).toHaveTextContent('100,00%');
    fireEvent.change(within(modal).getByLabelText('Cotas em tesouraria (%)'), { target: { value: '5' } });
    expect(within(modal).getByTestId('defis-soma')).toHaveTextContent('95,00%');
  });

  it('salvar envia o corpo completo do DTO (CNPJ sem máscara, % → bp, R$ → centavos)', async () => {
    salvarDefis.mockImplementation(async () => defisView());
    const modal = await abrirDefis();
    await waitFor(() => expect(within(modal).getByLabelText('Tabela de onde vêm os sócios')).toHaveValue('tbl-crm'));
    fireEvent.change(within(modal).getByLabelText('Ganhos de capital'), { target: { value: '1.000,50' } });
    fireEvent.click(within(modal).getByRole('button', { name: 'Adicionar sócio' }));
    fireEvent.change(within(modal).getByLabelText('socio-2'), { target: { value: 'c-2' } });
    const s2 = within(modal).getByTestId('socio-2');
    fireEvent.change(within(s2).getByLabelText('Participação (%)'), { target: { value: '5' } });
    fireEvent.change(within(modal).getByLabelText('Cotas em tesouraria (%)'), { target: { value: '5,00' } });
    // No vitest o `t` não interpola (sem instância i18next): o rótulo sai cru, e a linha é escolhida pelo testid.
    fireEvent.click(within(modal).getByRole('button', { name: 'Adicionar comercial exportadora' }));
    const e1 = within(modal).getByTestId('exportacao-1');
    fireEvent.change(within(e1).getByLabelText('CNPJ da comercial exportadora {{n}}'), { target: { value: '11.222.333/0001-81' } });
    fireEvent.change(within(e1).getByLabelText('Valor exportado {{n}}'), { target: { value: '2.000,00' } });
    fireEvent.click(within(modal).getByRole('button', { name: 'Adicionar doação' }));
    const d1 = within(modal).getByTestId('doacao-1');
    fireEvent.change(within(d1).getByLabelText('CNPJ do beneficiário {{n}}'), { target: { value: '11222333000181' } });
    fireEvent.change(within(d1).getByLabelText('Tipo de beneficiário {{n}}'), { target: { value: 'PARTIDO_POLITICO' } });
    fireEvent.change(within(d1).getByLabelText('Forma da doação {{n}}'), { target: { value: 'TRANSFERENCIA_ELETRONICA' } });
    fireEvent.change(within(d1).getByLabelText('Valor da doação {{n}}'), { target: { value: '300' } });
    fireEvent.click(within(modal).getByRole('button', { name: 'Salvar DEFIS' }));
    await waitFor(() => expect(salvarDefis).toHaveBeenCalledWith(ANO, {
      unitId: 'u1',
      empregadosInicio: 2,
      empregadosFim: 3,
      ganhosCapitalCents: 100050,
      ganhosRendaVariavelCents: 12345,
      exportacaoDiretaCents: 0,
      exportacaoComercial: [{ cnpj: '11222333000181', valorCents: 200000 }],
      cotasTesourariaBp: 500,
      socios: [
        { contactId: 'c-1', rendimentosIsentosCents: 100000, rendimentosTributaveisCents: 50000, participacaoBp: 9000, irrfCents: 0 },
        { contactId: 'c-2', rendimentosIsentosCents: 0, rendimentosTributaveisCents: 0, participacaoBp: 500, irrfCents: 0 },
      ],
      doacoesEleitorais: [{ cnpj: '11222333000181', tipoBeneficiario: 'PARTIDO_POLITICO', formaDoacao: 'TRANSFERENCIA_ELETRONICA', valorCents: 30000 }],
    }));
    expect(await within(modal).findByText('DEFIS salva.')).toBeInTheDocument();
  });

  it('forma inválida não chama o BE; a regra da soma = 100% é do BE e o texto dele aparece', async () => {
    salvarDefis.mockRejectedValue({ status: 400, message: 'a soma das participações dos sócios mais as cotas em tesouraria deve ser 100% (manual 9.4.3.1 itens 7.3 e 8)' });
    const modal = await abrirDefis();
    fireEvent.click(within(modal).getByRole('button', { name: 'Adicionar sócio' }));
    fireEvent.click(within(modal).getByRole('button', { name: 'Salvar DEFIS' }));
    expect(within(modal).getByRole('alert')).toHaveTextContent('Escolha o sócio da linha');
    expect(salvarDefis).not.toHaveBeenCalled();
    fireEvent.click(within(within(modal).getByTestId('socio-2')).getByRole('button', { name: 'Remover' }));
    fireEvent.change(within(modal).getByLabelText('Cotas em tesouraria (%)'), { target: { value: '0' } });
    // 90% + 0%: a tela não bloqueia (F-FS-8 c — a regra está no BE).
    fireEvent.click(within(modal).getByRole('button', { name: 'Salvar DEFIS' }));
    await waitFor(() => expect(salvarDefis).toHaveBeenCalledTimes(1));
    expect(await within(modal).findByText(/deve ser 100% \(manual 9\.4\.3\.1 itens 7\.3 e 8\)/)).toBeInTheDocument();
  });

  it('ano ≥ 2027 (ou sem mês apurado): o 400 do BE substitui o formulário', async () => {
    obterDefis.mockRejectedValue({
      status: 400,
      message: 'A DEFIS espelho cobre até o ano-calendário 2026; a partir de 2027 a declaração muda (LC 123 art. 25, red. LC 214) e aguarda regulamentação.',
    });
    render(<SimplesApuracaoPanel unitId="u1" ano={2027} perfil={{ ...perfilAno(2027), regime: 'SIMPLES' }} />);
    await waitFor(() => expect(screen.getByTestId('simples-2027-12')).not.toHaveAttribute('data-estado', 'carregando'));
    fireEvent.click(screen.getByRole('button', { name: 'DEFIS' }));
    const modal = await screen.findByTestId('defis-modal');
    expect(await within(modal).findByTestId('defis-indisponivel')).toHaveTextContent('a partir de 2027 a declaração muda (LC 123 art. 25, red. LC 214)');
    expect(within(modal).queryByRole('button', { name: 'Salvar DEFIS' })).toBeNull();
    expect(within(modal).queryByLabelText('Empregados no início do ano')).toBeNull();
  });
});

describe('PR-D item 15 — alíquotas sugeridas do mês', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('ano SIMPLES: seção do detalhe com selo "Sugestão", regra, atividade e avisos do BE verbatim', async () => {
    obterApuracao.mockImplementation(async (c: string): Promise<Apuracao> => apuracaoSimples(c));
    obterAliquotas.mockImplementation(async (c: string) => aliquotasSimples(c, {
      regra: 'INICIO_ATIVIDADE',
      atividades: [{
        anexo: 'III', natureza: 'SERVICO', cTribNac: '060101', faixa: 2, fatorR: null, aliquotaEfetiva: '8.5750', issRetencao: '2.7355',
        beneficioMunicipal: { legislacao: 'Lei Municipal 123/2020', tipo: 'REDUCAO_ALIQUOTA', pisoAplicado: true, excecaoPiso: false },
        pTotTribSNSugerido: '8.5750', creditoAdquirente: { ICMS: null, IBS: '0.1000', CBS: '0.9000' },
      }],
      avisos: ['Sugestão: a alíquota informada no documento fiscal é responsabilidade do prestador.'],
    }));
    render(<SimplesApuracaoPanel unitId="u1" ano={ANO} perfil={SIMPLES} />);
    await grade();
    fireEvent.click(screen.getByText(comp(3)));
    const dlg = await screen.findByRole('dialog');
    const sec = within(dlg).getByTestId('aliquotas');
    await waitFor(() => expect(obterAliquotas).toHaveBeenCalledWith(comp(3), { unitId: 'u1' }));
    expect(within(sec).getByTestId('selo-sugestao')).toHaveTextContent('Sugestão');
    expect(await within(sec).findByTestId('aliquotas-regra')).toHaveTextContent('Mês de início de atividade (2%)');
    const l1 = within(sec).getByTestId('aliquota-1');
    expect(l1).toHaveTextContent('8,5750%');
    expect(l1).toHaveTextContent('2,7355%');
    expect(l1).toHaveTextContent('IBS 0,1000%');
    expect(l1).toHaveTextContent('Lei Municipal 123/2020');
    expect(l1).toHaveTextContent('piso de 2% aplicado');
    expect(within(sec).getByTestId('aliquotas-avisos')).toHaveTextContent('Sugestão: a alíquota informada no documento fiscal é responsabilidade do prestador.');
  });

  it('ano MEI: não aparece (o BE daria 400)', async () => {
    obterApuracao.mockImplementation(async (c: string): Promise<Apuracao> => apuracaoMei(c));
    render(<SimplesApuracaoPanel unitId="u1" ano={ANO} perfil={MEI} />);
    await grade();
    fireEvent.click(screen.getByText(comp(3)));
    const dlg = await screen.findByRole('dialog');
    expect(within(dlg).queryByTestId('aliquotas')).toBeNull();
    expect(obterAliquotas).not.toHaveBeenCalled();
  });
});
