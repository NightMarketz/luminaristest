import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { ServiceFiscalProfilesPanel } from '../ServiceFiscalProfilesPanel';
import { fiscalProfileService, type ServiceFiscalProfileView } from '../../../../lib/services/fiscalProfile.service';
import { loadServiceOptions } from '../../lib/loadServiceOptions';

/**
 * ServiceFiscalProfilesPanel (FE-INCR-DFE PR-0 item 7): serviço sem perfil mostra o badge; `01.07.01` colado vai como
 * `010701`; excluir pede confirmação e chama o DELETE com o unitId; o 400 do BE aparece íntegro.
 */
vi.mock('../../../../lib/services/fiscalProfile.service', () => ({
  fiscalProfileService: { listServiceProfiles: vi.fn(), putServiceProfile: vi.fn(), deleteServiceProfile: vi.fn() },
}));
vi.mock('../../lib/loadServiceOptions', () => ({ loadServiceOptions: vi.fn() }));

const profile = (over: Partial<ServiceFiscalProfileView> = {}): ServiceFiscalProfileView => ({
  serviceRef: 's-corte', cTribNac: '060101', cTribNacDescricao: 'Barbearia, cabeleireiros, manicuros, pedicuros e congêneres',
  cTribMun: null, cNBS: '123456789', cIndOp: '100301', cLocPrestacao: null, xDescServ: null, updatedAt: '2026-10-05T00:00:00.000Z', ...over,
});

const wire = (fn: unknown) => JSON.parse(JSON.stringify((fn as { mock: { calls: unknown[][] } }).mock.calls[0]));
const rowOf = (name: string) => screen.getByText(name).closest('tr') as HTMLElement;

describe('ServiceFiscalProfilesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    vi.mocked(loadServiceOptions).mockResolvedValue([
      { id: 's-corte', name: 'Corte' },
      { id: 's-barba', name: 'Barba' },
    ]);
    vi.mocked(fiscalProfileService.listServiceProfiles).mockResolvedValue([profile()]);
  });
  afterEach(async () => { await new Promise((r) => setTimeout(r, 0)); cleanup(); });

  it('lista os serviços do tenant cruzados com os perfis: código + descrição no que tem; badge "sem perfil" no que não tem', async () => {
    render(<ServiceFiscalProfilesPanel unitId="u1" />);
    await screen.findByText('Corte');
    expect(fiscalProfileService.listServiceProfiles).toHaveBeenCalledWith('u1');
    expect(within(rowOf('Corte')).getByText('060101')).toBeInTheDocument();
    expect(within(rowOf('Corte')).getByText(/Barbearia, cabeleireiros/)).toBeInTheDocument();
    expect(within(rowOf('Corte')).getByText('123456789')).toBeInTheDocument();
    expect(within(rowOf('Barba')).getByText('sem perfil')).toBeInTheDocument();
    expect(within(rowOf('Corte')).queryByText('sem perfil')).not.toBeInTheDocument();
  });

  it('configurar: 01.07.01 colado vira cTribNac 010701; cIndOp vazio é omitido; o serviceRef é o id da linha', async () => {
    vi.mocked(fiscalProfileService.putServiceProfile).mockResolvedValue(profile({ serviceRef: 's-barba', cTribNac: '010701' }));
    render(<ServiceFiscalProfilesPanel unitId="u1" />);
    await screen.findByText('Barba');
    fireEvent.click(within(rowOf('Barba')).getByRole('button', { name: /Configurar/ }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Código de tributação nacional/), { target: { value: '01.07.01' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(fiscalProfileService.putServiceProfile).toHaveBeenCalledTimes(1));
    const [serviceRef, body] = wire(fiscalProfileService.putServiceProfile);
    expect(serviceRef).toBe('s-barba');
    expect(body).toEqual({ unitId: 'u1', cTribNac: '010701', cTribMun: null, cNBS: null, cLocPrestacao: null, xDescServ: null });
    // ao salvar o modal fecha e a linha troca o badge pelo perfil
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(within(rowOf('Barba')).queryByText('sem perfil')).not.toBeInTheDocument();
  });

  it('editar hidrata o formulário do perfil existente', async () => {
    render(<ServiceFiscalProfilesPanel unitId="u1" />);
    await screen.findByText('Corte');
    fireEvent.click(within(rowOf('Corte')).getByRole('button', { name: /Editar/ }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText(/Código de tributação nacional/)).toHaveValue('060101');
    expect(within(dialog).getByLabelText(/NBS \(9 dígitos\)/)).toHaveValue('123456789');
    expect(within(dialog).getByLabelText(/Indicador da operação/)).toHaveValue('100301');
  });

  it('o 400 "cTribNac fora da lista nacional" aparece íntegro no modal, que continua aberto', async () => {
    vi.mocked(fiscalProfileService.putServiceProfile).mockRejectedValue({ status: 400, error: 'cTribNac fora da lista nacional de serviços (Anexo I MUN.INCID_INFO.SERV.)' });
    render(<ServiceFiscalProfilesPanel unitId="u1" />);
    await screen.findByText('Barba');
    fireEvent.click(within(rowOf('Barba')).getByRole('button', { name: /Configurar/ }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Salvar' }));
    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('cTribNac fora da lista nacional de serviços');
  });

  it('excluir pede confirmação e chama DELETE com serviceRef + unitId; a linha volta a "sem perfil"', async () => {
    vi.mocked(fiscalProfileService.deleteServiceProfile).mockResolvedValue(undefined);
    render(<ServiceFiscalProfilesPanel unitId="u1" />);
    await screen.findByText('Corte');
    fireEvent.click(within(rowOf('Corte')).getByRole('button', { name: /Excluir/ }));
    expect(fiscalProfileService.deleteServiceProfile).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Remover' }));
    await waitFor(() => expect(fiscalProfileService.deleteServiceProfile).toHaveBeenCalledWith('s-corte', 'u1'));
    await waitFor(() => expect(within(rowOf('Corte')).getByText('sem perfil')).toBeInTheDocument());
  });

  it('falha no DELETE aparece na tela e o perfil continua na lista', async () => {
    vi.mocked(fiscalProfileService.deleteServiceProfile).mockRejectedValue({ status: 403, error: 'Sem permissão para remover.' });
    render(<ServiceFiscalProfilesPanel unitId="u1" />);
    await screen.findByText('Corte');
    fireEvent.click(within(rowOf('Corte')).getByRole('button', { name: /Excluir/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Remover' }));
    expect(await screen.findByText('Sem permissão para remover.')).toBeInTheDocument();
    expect(within(rowOf('Corte')).getByText('060101')).toBeInTheDocument();
  });

  it('sem serviços cadastrados mostra o vazio; erro de carga aparece', async () => {
    vi.mocked(loadServiceOptions).mockResolvedValue([]);
    vi.mocked(fiscalProfileService.listServiceProfiles).mockResolvedValue([]);
    render(<ServiceFiscalProfilesPanel unitId="u1" />);
    expect(await screen.findByText('Nenhum serviço cadastrado.')).toBeInTheDocument();
    cleanup();
    vi.mocked(fiscalProfileService.listServiceProfiles).mockRejectedValue({ status: 403, error: 'Sem permissão.' });
    render(<ServiceFiscalProfilesPanel unitId="u1" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem permissão.');
  });
});
