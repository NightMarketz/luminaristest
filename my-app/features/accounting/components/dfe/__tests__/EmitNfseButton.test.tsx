import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { EmitNfseButton } from '../EmitNfseButton';
import { dfeService, type PreviewResult } from '../../../../../lib/services/dfe.service';
import { doc } from './fixtures';

/**
 * EmitNfseButton (FE-INCR-DFE item 15): visível só com venda finalizada E emissor habilitado; `ok=false` lista os
 * faltantes do BE íntegros e não chama `emit`; `ok=true` mostra quantos documentos, o total e os avisos; confirmar chama
 * `emit` com `{ unitId, saleId, kind: 'NFSE' }` e entrega os documentos a quem montou.
 */
vi.mock('../../../../../lib/services/dfe.service', () => ({
  dfeService: { getStatus: vi.fn(), preview: vi.fn(), emit: vi.fn() },
}));

const preview = (over: Partial<PreviewResult> = {}): PreviewResult => ({
  ok: true,
  faltantes: [],
  competenciaAlerta: false,
  payloads: [{}, {}],
  tieOut: { vServCents: '15000', ledgerCents: '15000', matches: true },
  ...over,
});

function renderBtn(isFinalized = true, onEmitted = vi.fn()) {
  render(<EmitNfseButton unitId="u1" saleId="s1" isFinalized={isFinalized} label="Emitir NFS-e" onEmitted={onEmitted} />);
  return onEmitted;
}

describe('EmitNfseButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dfeService.getStatus).mockResolvedValue({ enabled: true, partner: 'manual', ambiente: 'homologacao' });
  });
  afterEach(async () => { await new Promise((r) => setTimeout(r, 0)); cleanup(); });

  it('venda não finalizada: sem botão e sem consultar o status', async () => {
    renderBtn(false);
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByRole('button', { name: 'Emitir NFS-e' })).not.toBeInTheDocument();
    expect(dfeService.getStatus).not.toHaveBeenCalled();
  });

  it('emissor desabilitado (status.enabled=false): sem botão', async () => {
    vi.mocked(dfeService.getStatus).mockResolvedValue({ enabled: false, partner: null, ambiente: null, reason: 'DFE_PARTNER ausente' });
    renderBtn();
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByRole('button', { name: 'Emitir NFS-e' })).not.toBeInTheDocument();
  });

  it('ok=false: lista os faltantes do BE íntegros e não chama emit', async () => {
    vi.mocked(dfeService.preview).mockResolvedValue(
      preview({ ok: false, payloads: [], faltantes: ['Serviço "Corte" sem perfil fiscal (cTribNac).', 'Cliente sem CPF/CNPJ.'] }),
    );
    renderBtn();
    fireEvent.click(await screen.findByRole('button', { name: 'Emitir NFS-e' }));
    expect(await screen.findByText('Serviço "Corte" sem perfil fiscal (cTribNac).')).toBeInTheDocument();
    expect(screen.getByText('Cliente sem CPF/CNPJ.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirmar' })).not.toBeInTheDocument();
    expect(dfeService.preview).toHaveBeenCalledWith({ unitId: 'u1', saleId: 's1', kind: 'NFSE' });
    expect(dfeService.emit).not.toHaveBeenCalled();
  });

  it('ok=true: quantos documentos, total; confirmar chama emit e entrega os documentos', async () => {
    vi.mocked(dfeService.preview).mockResolvedValue(preview());
    const created = [doc({ id: 'd1' }), doc({ id: 'd2', cTribNac: '060102' })];
    vi.mocked(dfeService.emit).mockResolvedValue(created);
    const onEmitted = renderBtn();
    fireEvent.click(await screen.findByRole('button', { name: 'Emitir NFS-e' }));
    expect(await screen.findByTestId('emit-count')).toHaveTextContent('2');
    expect(screen.getByTestId('emit-total').textContent).toMatch(/150,00/);
    expect(screen.queryByTestId('emit-tieout')).not.toBeInTheDocument();
    expect(screen.queryByTestId('emit-competencia')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await screen.findByRole('button', { name: 'Emitir NFS-e' });
    await vi.waitFor(() => expect(screen.queryByTestId('emit-resumo')).not.toBeInTheDocument());
    expect(dfeService.emit).toHaveBeenCalledWith({ unitId: 'u1', saleId: 's1', kind: 'NFSE' });
    expect(onEmitted).toHaveBeenCalledWith(created);
  });

  it('ok=true com tieOut divergente e competência fora do mês: os dois avisos', async () => {
    vi.mocked(dfeService.preview).mockResolvedValue(
      preview({ competenciaAlerta: true, tieOut: { vServCents: '15000', ledgerCents: '14000', matches: false } }),
    );
    renderBtn();
    fireEvent.click(await screen.findByRole('button', { name: 'Emitir NFS-e' }));
    expect(await screen.findByTestId('emit-tieout')).toBeInTheDocument();
    expect(screen.getByTestId('emit-competencia')).toBeInTheDocument();
  });

  it('erro do emit fica no modal, que continua aberto', async () => {
    vi.mocked(dfeService.preview).mockResolvedValue(preview());
    vi.mocked(dfeService.emit).mockRejectedValue({ status: 409, error: 'Já existe documento vivo para esta venda.' });
    const onEmitted = renderBtn();
    fireEvent.click(await screen.findByRole('button', { name: 'Emitir NFS-e' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByText('Já existe documento vivo para esta venda.')).toBeInTheDocument();
    expect(screen.getByTestId('emit-resumo')).toBeInTheDocument();
    expect(onEmitted).not.toHaveBeenCalled();
  });
});
