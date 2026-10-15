import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { MeiEnquadramentoSection } from '../MeiEnquadramentoSection';
import type { LegalParameter } from '../../../../lib/services/legalParameters.service';
import { perfilAno } from './simplesFixtures';

(globalThis as unknown as { React: typeof React }).React = React;

const getPerfil = vi.fn();
const putPerfil = vi.fn();
vi.mock('../../../../lib/services/companyFiscalProfile.service', () => ({
  companyFiscalProfileService: { get: (...a: unknown[]) => getPerfil(...a), put: (...a: unknown[]) => putPerfil(...a) },
}));
const listLp = vi.fn();
vi.mock('../../../../lib/services/legalParameters.service', () => ({
  legalParametersService: { list: (...a: unknown[]) => listLp(...a) },
}));

const linha = (chave: string, ocupacao: string, extra: Partial<LegalParameter> = {}): LegalParameter => ({
  id: `lp-${chave}`, tabela: 'MEI_ANEXO_XI', chave, discriminador: chave.slice(0, 1), valorInt: null, valorTexto: null,
  valorJson: { ocupacao, cnae: '9602-5/01', descricaoCnae: 'Cabeleireiros', iss: true, icms: false },
  fonte: 'Res. CGSN 140 Anexo XI', fonteUrl: null, fonteSha256: null, vigenteDesde: '2018-01-01', vigenteAte: null,
  ...extra,
} as LegalParameter);

/** FE-INCR-SIMPLES item 8 (F-FS-5 a) — enquadramento do MEI no perfil fiscal do ano. */
describe('MeiEnquadramentoSection', () => {
  beforeEach(() => {
    listLp.mockResolvedValue([
      linha('A-0002', 'MANICURE'),
      linha('A-0001', 'CABELEIREIRO(A)'),
      linha('B-0001', 'CAMINHONEIRO', { vigenteAte: '2019-12-31' }),
    ]);
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('ano MEI: lê o perfil do ano pedido e as ocupações vigentes no ano (a revogada some)', async () => {
    getPerfil.mockResolvedValue(perfilAno(2026, { regime: 'MEI', meiContribuinteIss: true, meiOcupacoes: ['A-0001'] }));
    render(<MeiEnquadramentoSection unitId="u1" anoInicial={2026} />);
    expect(await screen.findByText('CABELEIREIRO(A)')).toBeInTheDocument();
    expect(getPerfil).toHaveBeenCalledWith(2026, 'u1');
    expect(listLp).toHaveBeenCalledWith({ tabela: 'MEI_ANEXO_XI', status: 'PUBLISHED' });
    expect(screen.queryByText('CAMINHONEIRO')).toBeNull();
    expect(screen.getByLabelText('Contribuinte de ISS')).toHaveValue('true');
    expect(screen.getByLabelText('Contribuinte de ICMS')).toHaveValue('');
    expect(within(screen.getByTestId('ocupacoes-escolhidas')).getByText('A-0001 ×')).toBeInTheDocument();
  });

  it('salvar regrava o perfil do ano com só os 4 campos trocados', async () => {
    const view = perfilAno(2026, { regime: 'MEI', meiOcupacoes: ['A-0001'] });
    getPerfil.mockResolvedValue(view);
    putPerfil.mockImplementation(async (_ano: number, b: { meiContribuinteIcms: boolean | null }) => ({ ...view, ...b }));
    render(<MeiEnquadramentoSection unitId="u1" anoInicial={2026} />);
    await screen.findByText('MANICURE');
    fireEvent.change(screen.getByLabelText('Contribuinte de ICMS'), { target: { value: 'false' } });
    fireEvent.change(screen.getByLabelText('Contribuinte de ISS'), { target: { value: 'true' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /MANICURE/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar enquadramento' }));
    await waitFor(() => expect(putPerfil).toHaveBeenCalledTimes(1));
    const [ano, body] = putPerfil.mock.calls[0];
    expect(ano).toBe(2026);
    expect(body).toMatchObject({
      unitId: 'u1', regime: 'MEI', contadorContactId: 'c-1', inicioAtividadeEm: '2020-02-01',
      declarante: view.declarante, meiContribuinteIcms: false, meiContribuinteIss: true, meiTransportadorCargas: null,
      meiOcupacoes: ['A-0001', 'A-0002'],
    });
  });

  it('o filtro procura por ocupação', async () => {
    getPerfil.mockResolvedValue(perfilAno(2026, { regime: 'MEI' }));
    render(<MeiEnquadramentoSection unitId="u1" anoInicial={2026} />);
    await screen.findByText('MANICURE');
    fireEvent.change(screen.getByLabelText('Filtrar por ocupação, CNAE ou chave'), { target: { value: 'mani' } });
    expect(screen.queryByText('CABELEIREIRO(A)')).toBeNull();
    expect(screen.getByText('MANICURE')).toBeInTheDocument();
  });

  it('ano não MEI: só o aviso, sem formulário', async () => {
    getPerfil.mockResolvedValue(perfilAno(2026, { regime: 'SIMPLES' }));
    render(<MeiEnquadramentoSection unitId="u1" anoInicial={2026} />);
    expect(await screen.findByText(/o enquadramento do Anexo XI é só do MEI/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Salvar enquadramento' })).toBeNull();
  });

  it('sem perfil do ano: aviso', async () => {
    getPerfil.mockResolvedValue(null);
    render(<MeiEnquadramentoSection unitId="u1" anoInicial={2026} />);
    expect(await screen.findByText(/não cadastrado/)).toBeInTheDocument();
  });

  it('erro do PUT aparece com o texto do BE', async () => {
    getPerfil.mockResolvedValue(perfilAno(2026, { regime: 'MEI' }));
    putPerfil.mockRejectedValue({ status: 400, message: "Ocupação 'A-9999' não existe no Anexo XI de 2026." });
    render(<MeiEnquadramentoSection unitId="u1" anoInicial={2026} />);
    await screen.findByText('MANICURE');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar enquadramento' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("Ocupação 'A-9999' não existe no Anexo XI de 2026.");
  });
});
