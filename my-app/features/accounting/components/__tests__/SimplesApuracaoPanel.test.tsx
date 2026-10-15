import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { TaxAssessmentPanel } from '../TaxAssessmentPanel';
import type { Apuracao } from '../../../../lib/services/simples.service';
import { apuracaoMei, apuracaoSimples, perfilAno } from './simplesFixtures';

(globalThis as unknown as { React: typeof React }).React = React;

const getPerfil = vi.fn();
vi.mock('../../../../lib/services/companyFiscalProfile.service', () => ({
  companyFiscalProfileService: { get: (...a: unknown[]) => getPerfil(...a) },
}));
const list = vi.fn();
vi.mock('../../../../lib/services/taxAssessments.service', () => ({
  taxAssessmentsService: { list: (...a: unknown[]) => list(...a), get: vi.fn(), reconcileProvisao: vi.fn() },
}));
const obterApuracao = vi.fn();
const calcularApuracao = vi.fn();
vi.mock('../../../../lib/services/simples.service', async (orig) => ({
  ...(await orig<typeof import('../../../../lib/services/simples.service')>()),
  simplesService: {
    obterApuracao: (...a: unknown[]) => obterApuracao(...a),
    calcularApuracao: (...a: unknown[]) => calcularApuracao(...a),
    listParcerias: async () => [],
  },
}));
// PR-B: o sub-painel de parcerias (ano SIMPLES) procura a tabela `employees`.
vi.mock('../../../../lib/services/dynamic-table.service', () => ({ DynamicTableService: { getTables: async () => ({ data: [] }) } }));

const ANO = new Date().getFullYear();
const comp = (m: number) => `${ANO}-${String(m).padStart(2, '0')}`;
/** Abre o detalhe da competência depois que a linha saiu de "carregando" (linha carregando não abre). */
async function abrir(m: number) {
  await waitFor(() => expect(screen.getByTestId(`simples-${comp(m)}`)).not.toHaveAttribute('data-estado', 'carregando'));
  fireEvent.click(screen.getByText(comp(m)));
  return screen.findByRole('dialog');
}

/** FE-INCR-SIMPLES PR-A — aba Apuração em ano SIMPLES/MEI (itens 1–8). */
describe('Apuração do Simples (PR-A)', () => {
  beforeEach(() => {
    list.mockResolvedValue([]);
    obterApuracao.mockImplementation(async (c: string): Promise<Apuracao> => apuracaoSimples(c));
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('item 1: ano SIMPLES → 12 linhas com coluna DAS e nenhuma chamada ao X7/X8', async () => {
    getPerfil.mockResolvedValue(perfilAno(ANO));
    render(<TaxAssessmentPanel unitId="u1" />);
    await waitFor(() => expect(screen.getByTestId(`simples-${comp(12)}`)).toHaveAttribute('data-estado', 'calculado'));
    expect(getPerfil).toHaveBeenCalledWith(ANO, 'u1');
    expect(screen.getAllByRole('row')).toHaveLength(13);
    expect(screen.getByRole('columnheader', { name: 'DAS' })).toBeInTheDocument();
    expect(obterApuracao).toHaveBeenCalledTimes(12);
    expect(obterApuracao).toHaveBeenCalledWith(comp(1), { unitId: 'u1' });
    expect(list).not.toHaveBeenCalled();
    expect(screen.getByTestId(`simples-${comp(1)}`)).toHaveTextContent('R$ 2.572,50');
  });

  it('item 1: ano MEI → coluna DAS-MEI', async () => {
    getPerfil.mockResolvedValue(perfilAno(ANO, { regime: 'MEI', meiContribuinteIcms: false, meiContribuinteIss: true }));
    obterApuracao.mockImplementation(async (c: string) => apuracaoMei(c));
    render(<TaxAssessmentPanel unitId="u1" />);
    expect(await screen.findByRole('columnheader', { name: 'DAS-MEI' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId(`simples-${comp(3)}`)).toHaveTextContent('R$ 80,90'));
    expect(list).not.toHaveBeenCalled();
  });

  it('item 1: ano PRESUMIDO → grade X7/X8 de sempre, sem GET do Simples', async () => {
    getPerfil.mockResolvedValue(perfilAno(ANO, { regime: 'PRESUMIDO' }));
    render(<TaxAssessmentPanel unitId="u1" />);
    expect(await screen.findByText('Nenhuma apuração gravada neste ano.')).toBeInTheDocument();
    expect(list).toHaveBeenCalledWith({ unitId: 'u1', anoCalendario: ANO });
    expect(obterApuracao).not.toHaveBeenCalled();
  });

  it('item 1: sem perfil do ano → aviso só em texto, sem grade nem atalho', async () => {
    getPerfil.mockResolvedValue(null);
    render(<TaxAssessmentPanel unitId="u1" />);
    // sem instância i18next (vitest) o fallback não interpola o {{ano}}; em produção o JSON interpola
    expect(await screen.findByTestId('sem-perfil-ano')).toHaveTextContent(/Perfil fiscal de .+ não cadastrado/);
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(list).not.toHaveBeenCalled();
    expect(obterApuracao).not.toHaveBeenCalled();
  });

  it('item 2: no máximo 3 GETs em voo (F-FS-3 a) e estado por célula', async () => {
    getPerfil.mockResolvedValue(perfilAno(ANO));
    let emVoo = 0;
    let pico = 0;
    obterApuracao.mockImplementation(async (c: string) => {
      emVoo += 1;
      pico = Math.max(pico, emVoo);
      await new Promise((r) => setTimeout(r, 2));
      emVoo -= 1;
      if (c === comp(1)) throw { status: 400, code: 'VALIDATION_ERROR', message: 'Cadastre o perfil fiscal…' };
      if (c === comp(2)) throw { status: 422, code: 'SIMPLES_REGRA_NAO_REGULAMENTADA', message: 'não regulamentada' };
      if (c === comp(3)) throw { status: 500 };
      if (c === comp(4)) {
        return apuracaoSimples(c, {
          dasOficial: { id: 'd', numeroDocumento: '1', valorCents: 257300, vencimento: `${ANO}-05-20`, provisaoPendente: true },
          divergenciaCents: 50,
          alertas: [{ codigo: 'TIEOUT_DIVERGENTE', detalhe: 'x', severity: 'WARNING' }],
        });
      }
      return apuracaoSimples(c);
    });
    render(<TaxAssessmentPanel unitId="u1" />);
    await waitFor(() => expect(screen.getByTestId(`simples-${comp(12)}`)).toHaveAttribute('data-estado', 'calculado'));
    expect(pico).toBe(3);
    expect(screen.getByTestId(`simples-${comp(1)}`)).toHaveAttribute('data-estado', 'semPerfil');
    expect(screen.getByTestId(`simples-${comp(2)}`)).toHaveAttribute('data-estado', 'naoRegulamentada');
    expect(screen.getByTestId(`simples-${comp(3)}`)).toHaveAttribute('data-estado', 'erro');
    const c4 = screen.getByTestId(`simples-${comp(4)}`);
    expect(c4).toHaveAttribute('data-estado', 'registrado');
    expect(c4).toHaveTextContent('Bloqueia o registro do DAS');
    expect(c4).toHaveTextContent('Provisão pendente');
    expect(c4).toHaveTextContent('Alerta');
    expect(c4).toHaveTextContent('Divergente');
    expect(c4).toHaveTextContent('R$ 0,50');
  });

  it('item 4: detalhe ME/EPP mostra RBT12, janela, atividade, espelho, tie-out, DAS oficial e tabela de lei', async () => {
    getPerfil.mockResolvedValue(perfilAno(ANO));
    obterApuracao.mockImplementation(async (c: string) =>
      apuracaoSimples(c, {
        dasOficial: { id: 'd', numeroDocumento: '07202601', valorCents: 257300, vencimento: `${ANO}-02-20`, provisaoPendente: false },
        divergenciaCents: 50,
      }),
    );
    render(<TaxAssessmentPanel unitId="u1" />);
    const dlg = await abrir(1);
    expect(within(dlg).getByText('R$ 360.000,00')).toBeInTheDocument();
    expect(within(dlg).getByText(/2025-03 → 2026-02/)).toBeInTheDocument();
    expect(within(dlg).getByText('8,5750%')).toBeInTheDocument();
    expect(within(dlg).getByText('11,20%')).toBeInTheDocument();
    expect(within(dlg).getByText('7 - Prestação de Serviços, exceto para o exterior')).toBeInTheDocument();
    expect(within(dlg).getByText('Conferência subrazão × razão')).toBeInTheDocument();
    expect(within(dlg).getByText('07202601')).toBeInTheDocument();
    expect(within(dlg).getByText(`20/02/${ANO}`)).toBeInTheDocument();
    expect(within(dlg).getByTestId('divergencia')).toHaveTextContent('R$ 0,50');
    expect(within(dlg).getByText(/LC 123 Anexo III/)).toBeInTheDocument();
  });

  it('item 5: detalhe MEI — CPP 12% do transportador, selo, CBS/IBS em milésimos, acumulado × limite', async () => {
    getPerfil.mockResolvedValue(perfilAno(ANO, { regime: 'MEI', meiContribuinteIcms: true, meiContribuinteIss: false, meiTransportadorCargas: true }));
    obterApuracao.mockImplementation(async (c: string) =>
      apuracaoMei(c, {
        transportadorCargas: true,
        cppAliquotaBp: 1200,
        tributos: { CPP: 18216, ICMS: 100 },
        tributosMilesimos: { CBS: 1234, IBS: 5 },
        enquadramento: { contribuinteIcms: true, contribuinteIss: false },
        receitaAcumuladaAnoCents: 9000000,
        limiteAnoCents: 8100000,
      }),
    );
    render(<TaxAssessmentPanel unitId="u1" />);
    const dlg = await abrir(2);
    expect(within(dlg).getByTestId('selo-transportador')).toHaveTextContent('Transportador autônomo de cargas');
    expect(within(dlg).getByTestId('cpp-aliquota')).toHaveTextContent('12%');
    expect(within(dlg).getByTestId('milesimos-CBS')).toHaveTextContent('R$ 1,234');
    expect(within(dlg).getByTestId('milesimos-IBS')).toHaveTextContent('R$ 0,005');
    expect(within(dlg).getByText('R$ 182,16')).toBeInTheDocument();
    expect(within(dlg).getByTestId('acumulado')).toHaveTextContent('R$ 90.000,00');
    expect(within(dlg).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('item 6: alertas ordenados por severidade, código traduzido, detalhe verbatim, motivo e bloqueante', async () => {
    getPerfil.mockResolvedValue(perfilAno(ANO));
    obterApuracao.mockImplementation(async (c: string) =>
      apuracaoSimples(c, {
        alertas: [
          { codigo: 'NFSE_DIVERGE_RECEITA', detalhe: 'NFS-e R$ 10 a mais', severity: 'INFO', motivoInformativo: 'DOCUMENTO_MUNICIPAL_TRANSIÇÃO' },
          { codigo: 'RBT12_INCOMPLETO', detalhe: 'falta 2025-04', severity: 'WARNING' },
        ],
      }),
    );
    render(<TaxAssessmentPanel unitId="u1" />);
    const dlg = await abrir(1);
    const itens = within(within(dlg).getByRole('list', { name: 'Alertas' })).getAllByRole('listitem');
    expect(itens.map((li) => li.getAttribute('data-testid'))).toEqual(['alerta-RBT12_INCOMPLETO', 'alerta-NFSE_DIVERGE_RECEITA']);
    expect(itens[0]).toHaveTextContent('RBT12 incompleto');
    expect(itens[0]).toHaveTextContent('falta 2025-04');
    expect(itens[0]).toHaveTextContent('Bloqueia o registro do DAS');
    expect(itens[1]).toHaveTextContent('Documento municipal (transição)');
    expect(itens[1]).not.toHaveTextContent('Bloqueia');
  });

  it('item 7: Calcular faz POST com {unitId} e o resultado substitui a leitura', async () => {
    getPerfil.mockResolvedValue(perfilAno(ANO));
    calcularApuracao.mockImplementation(async (c: string) => apuracaoSimples(c, { totalCalculadoCents: 300000 }));
    render(<TaxAssessmentPanel unitId="u1" />);
    const dlg = await abrir(5);
    expect(within(dlg).getByTestId('total-calculado')).toHaveTextContent('R$ 2.572,50');
    fireEvent.click(within(dlg).getByRole('button', { name: 'Calcular' }));
    await waitFor(() => expect(within(dlg).getByTestId('total-calculado')).toHaveTextContent('R$ 3.000,00'));
    expect(calcularApuracao).toHaveBeenCalledWith(comp(5), { unitId: 'u1' });
    expect(screen.getByTestId(`simples-${comp(5)}`)).toHaveTextContent('R$ 3.000,00');
  });

  it('item 8: MEI sem enquadramento declarado — o 400 do BE ganha atalho para o perfil fiscal do ano', async () => {
    getPerfil.mockResolvedValue(perfilAno(ANO, { regime: 'MEI' }));
    const msg = `Declare no perfil fiscal de ${ANO} se o MEI é contribuinte de ICMS e de ISS…`;
    obterApuracao.mockRejectedValue({ status: 400, code: 'VALIDATION_ERROR', message: msg });
    const ir = vi.fn();
    render(<TaxAssessmentPanel unitId="u1" onIrParaEnquadramentoMei={ir} />);
    await waitFor(() => expect(screen.getByTestId(`simples-${comp(1)}`)).toHaveAttribute('data-estado', 'semPerfil'));
    fireEvent.click(screen.getByText(comp(1)));
    const dlg = await screen.findByRole('dialog');
    expect(within(dlg).getByRole('alert')).toHaveTextContent(msg);
    fireEvent.click(within(dlg).getByRole('button', { name: 'Declarar o enquadramento do MEI no perfil fiscal' }));
    expect(ir).toHaveBeenCalledWith(ANO);
  });

  it('item 8: com o enquadramento declarado, o 400 não oferece o atalho', async () => {
    getPerfil.mockResolvedValue(perfilAno(ANO, { regime: 'MEI', meiContribuinteIcms: false, meiContribuinteIss: true }));
    obterApuracao.mockRejectedValue({ status: 400, message: 'Não há parâmetro legal publicado para o SIMEI' });
    render(<TaxAssessmentPanel unitId="u1" onIrParaEnquadramentoMei={vi.fn()} />);
    await waitFor(() => expect(screen.getByTestId(`simples-${comp(1)}`)).toHaveAttribute('data-estado', 'semPerfil'));
    fireEvent.click(screen.getByText(comp(1)));
    const dlg = await screen.findByRole('dialog');
    expect(within(dlg).queryByRole('button', { name: /Declarar o enquadramento/ })).toBeNull();
  });
});
