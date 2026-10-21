import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { PresumidoServicosSection } from '../PresumidoServicosSection';
import { perfilAno } from './simplesFixtures';

(globalThis as unknown as { React: typeof React }).React = React;

const getPerfil = vi.fn();
const putPerfil = vi.fn();
vi.mock('../../../../lib/services/companyFiscalProfile.service', () => ({
  companyFiscalProfileService: { get: (...a: unknown[]) => getPerfil(...a), put: (...a: unknown[]) => putPerfil(...a) },
}));

const ano = new Date().getFullYear();

/** FE-INCR-PERFIL-FISCAL-PRESUMIDO — prestadora exclusiva + texto de ajuda do item 11 (Lei 9.250 art. 40). */
describe('PresumidoServicosSection', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('confirmação só aparece com a flag, com o texto de ajuda da Lei 9.250', async () => {
    getPerfil.mockResolvedValue(perfilAno(ano, { regime: 'PRESUMIDO' }));
    render(<PresumidoServicosSection unitId="u1" />);
    const flag = await screen.findByRole('checkbox', { name: /Prestadora exclusiva de serviços/ });
    expect(screen.queryByText(/9\.250/)).toBeNull();
    fireEvent.click(flag);
    expect(screen.getByText(/Lei 9\.250\/1995 art\. 40 parágrafo único/)).toBeInTheDocument();
    expect(getPerfil).toHaveBeenCalledWith(ano, 'u1');
  });

  it('PRESUMIDO + flag sem confirmação: não envia e mostra o erro', async () => {
    getPerfil.mockResolvedValue(perfilAno(ano, { regime: 'PRESUMIDO' }));
    render(<PresumidoServicosSection unitId="u1" />);
    fireEvent.click(await screen.findByRole('checkbox', { name: /Prestadora exclusiva de serviços/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar prestação de serviços' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Lei 9\.250/);
    expect(putPerfil).not.toHaveBeenCalled();
  });

  it('salvar envia os 2 campos', async () => {
    const view = perfilAno(ano, { regime: 'PRESUMIDO' });
    getPerfil.mockResolvedValue(view);
    putPerfil.mockImplementation(async (_a: number, b: object) => ({ ...view, ...b }));
    render(<PresumidoServicosSection unitId="u1" />);
    fireEvent.click(await screen.findByRole('checkbox', { name: /Prestadora exclusiva de serviços/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /profissão legalmente regulamentada/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar prestação de serviços' }));
    await waitFor(() => expect(putPerfil).toHaveBeenCalledTimes(1));
    expect(putPerfil.mock.calls[0][1]).toMatchObject({ unitId: 'u1', regime: 'PRESUMIDO', prestadoraExclusivaServicos: true, declaraNaoProfissaoRegulamentada: true });
  });

  it('forma travada: checkboxes e salvar desabilitados, com aviso', async () => {
    getPerfil.mockResolvedValue(perfilAno(ano, { regime: 'REAL', formaApuracaoTravadaEm: '2026-04-30T12:00:00.000Z' }));
    render(<PresumidoServicosSection unitId="u1" />);
    expect(await screen.findByText(/Forma de apuração travada desde/)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Prestadora exclusiva de serviços/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Salvar prestação de serviços' })).toBeDisabled();
  });

  it('erro do PUT aparece com o texto do BE', async () => {
    getPerfil.mockResolvedValue(perfilAno(ano, { regime: 'REAL' }));
    putPerfil.mockRejectedValue({ status: 400, message: 'FORMA_TRAVADA: a forma de 2026 está travada.' });
    render(<PresumidoServicosSection unitId="u1" />);
    fireEvent.click(await screen.findByRole('checkbox', { name: /Prestadora exclusiva de serviços/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar prestação de serviços' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('FORMA_TRAVADA: a forma de 2026 está travada.');
  });

  it('regime fora de Presumido/Real: só o aviso', async () => {
    getPerfil.mockResolvedValue(perfilAno(ano, { regime: 'MEI' }));
    render(<PresumidoServicosSection unitId="u1" />);
    expect(await screen.findByText(/só vale no Lucro Presumido ou Real/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Salvar prestação de serviços' })).toBeNull();
  });
});
