import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { FixedAssetFormModal } from '../FixedAssetFormModal';
import { fixedAssetsService, type DepreciationRate, type FixedAsset, type FixedAssetClass } from '../../../../lib/services/fixedAssets.service';

/**
 * FixedAssetFormModal (FE-INCR-FIXED-ASSETS itens 8–10, 32): o corpo é EXATAMENTE o DTO — taxa do catálogo envia
 * `rateId` e NUNCA `annualRateBp`; taxa explícita, o inverso (XOR); dinheiro por `parseBrl`; residual ≥ custo e taxa
 * contábil sem justificativa bloqueiam o envio; a edição manda só o que mudou.
 * (Sem instância i18next no harness, as mensagens locais caem no fallback = sufixo da chave `fixedAssets.asset.error.*`.)
 */
vi.mock('../../../../lib/services/fixedAssets.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../lib/services/fixedAssets.service')>();
  return {
    ...actual,
    fixedAssetsService: { listRates: vi.fn(), createAsset: vi.fn(), updateAsset: vi.fn() },
  };
});

const classes: FixedAssetClass[] = [
  { id: 'c1', code: 'MAQ', name: 'Máquinas', depreciable: true, costAccountId: 'a1', accumulatedDepreciationAccountId: 'a2' },
];
const rates: DepreciationRate[] = [
  { id: 'rate-1', ncm: '8471', description: 'Computadores', lifeYears: 5, annualRateBp: 2000, source: 'ANEXO_III_IN_1700_2017', sourceUrl: null, justification: null, hiddenAt: null },
];
const asset = (over: Partial<FixedAsset>): FixedAsset => ({
  id: 'fa1', unitId: 'u1', classId: 'c1', code: 'PC-01', description: 'Notebook', ncmPrefix: null, quantity: 1,
  costCents: 500000, residualValueCents: 0, rateId: 'rate-1', annualRateBp: 2000, bookAnnualRateBp: null, bookRateJustification: null,
  openingAccumulatedCents: 0, accumulatedDepreciationCents: 0, status: 'PENDING_ACTIVATION',
  acquiredAt: '2026-03-01T00:00:00.000Z', activatedAt: null, disposedAt: null, disposalEntryId: null, sourceDocumentId: null, payableId: null,
  sourceItemRef: null, version: 1, ...over,
});

/** Payload como vai no fio (JSON): chave `undefined` não viaja. */
const wire = (fn: unknown, arg = 0) => JSON.parse(JSON.stringify((fn as { mock: { calls: unknown[][] } }).mock.calls[0][arg]));

async function fillBase() {
  fireEvent.change(screen.getByRole('combobox', { name: 'Classe' }), { target: { value: 'c1' } });
  fireEvent.change(screen.getByLabelText('Código'), { target: { value: 'PC-01' } });
  fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Notebook' } });
  fireEvent.change(screen.getByLabelText('Custo de aquisição (R$)'), { target: { value: '5.000,00' } });
  fireEvent.change(screen.getByLabelText('Data de aquisição'), { target: { value: '2026-03-01' } });
}

describe('FixedAssetFormModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    vi.mocked(fixedAssetsService.listRates).mockResolvedValue(rates);
    vi.mocked(fixedAssetsService.createAsset).mockResolvedValue(asset({}));
    vi.mocked(fixedAssetsService.updateAsset).mockResolvedValue(asset({}));
  });
  // Dreno: respostas em voo não podem aterrissar depois do teardown do jsdom.
  afterEach(async () => { await new Promise((r) => setTimeout(r, 0)); cleanup(); });

  it('taxa do catálogo: o corpo leva rateId e NÃO leva annualRateBp; custo 5.000,00 ⇒ 500000', async () => {
    const onSuccess = vi.fn();
    render(<FixedAssetFormModal isOpen onClose={() => {}} unitId="u1" classes={classes} onSuccess={onSuccess} />);
    await fillBase();
    const combo = screen.getByRole('combobox', { name: 'Taxa do catálogo' });
    await waitFor(() => expect(combo).not.toHaveAttribute('placeholder', 'Carregando catálogo…'));
    fireEvent.change(combo, { target: { value: 'rate-1' } });
    fireEvent.blur(combo);

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    const body = wire(vi.mocked(fixedAssetsService.createAsset));
    expect(body).toEqual({
      unitId: 'u1', classId: 'c1', code: 'PC-01', description: 'Notebook', quantity: 1, costCents: 500000,
      residualValueCents: 0, acquiredAt: '2026-03-01', rateId: 'rate-1',
    });
    expect(body).not.toHaveProperty('annualRateBp');
  });

  it('taxa explícita: o corpo leva annualRateBp (% × 100) e NÃO leva rateId; NCM vazio some', async () => {
    const onSuccess = vi.fn();
    render(<FixedAssetFormModal isOpen onClose={() => {}} unitId="u1" classes={classes} onSuccess={onSuccess} />);
    await fillBase();
    fireEvent.click(screen.getByRole('radio', { name: 'Explícita' }));
    fireEvent.change(screen.getByLabelText('Taxa explícita (% a.a.)'), { target: { value: '33,3' } });

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    const body = wire(vi.mocked(fixedAssetsService.createAsset));
    expect(body.annualRateBp).toBe(3330);
    expect(body).not.toHaveProperty('rateId');
    expect(body).not.toHaveProperty('ncmPrefix');
  });

  it('residual ≥ custo bloqueia o envio (forma do DTO) — nada vai ao servidor', async () => {
    render(<FixedAssetFormModal isOpen onClose={() => {}} unitId="u1" classes={classes} onSuccess={() => {}} />);
    await fillBase();
    fireEvent.click(screen.getByRole('radio', { name: 'Explícita' }));
    fireEvent.change(screen.getByLabelText('Taxa explícita (% a.a.)'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Valor residual (R$)'), { target: { value: '5.000,00' } });

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('residualTooHigh');
    expect(fixedAssetsService.createAsset).not.toHaveBeenCalled();
  });

  it('taxa contábil divergente sem justificativa bloqueia; com justificativa envia bookAnnualRateBp + bookRateJustification', async () => {
    const onSuccess = vi.fn();
    render(<FixedAssetFormModal isOpen onClose={() => {}} unitId="u1" classes={classes} onSuccess={onSuccess} />);
    await fillBase();
    fireEvent.click(screen.getByRole('radio', { name: 'Explícita' }));
    fireEvent.change(screen.getByLabelText('Taxa explícita (% a.a.)'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Taxa contábil divergente da fiscal' }));
    fireEvent.change(screen.getByLabelText('Taxa contábil (% a.a.)'), { target: { value: '12,5' } });

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('bookJustificationRequired');
    expect(fixedAssetsService.createAsset).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Justificativa (obrigatória)'), { target: { value: 'Vida útil econômica menor' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    const body = wire(vi.mocked(fixedAssetsService.createAsset));
    expect(body.bookAnnualRateBp).toBe(1250);
    expect(body.bookRateJustification).toBe('Vida útil econômica menor');
  });

  it('edição: PUT só com o que mudou (+ unitId/assetId); acquiredAt date-only não volta um dia', async () => {
    const onSuccess = vi.fn();
    render(<FixedAssetFormModal isOpen onClose={() => {}} unitId="u1" classes={classes} editing={asset({})} onSuccess={onSuccess} />);
    expect(screen.getByLabelText('Data de aquisição')).toHaveValue('2026-03-01');
    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Notebook 14"' } });

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(fixedAssetsService.updateAsset).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fixedAssetsService.updateAsset).mock.calls[0][0]).toBe('fa1');
    expect(wire(fixedAssetsService.updateAsset, 1)).toEqual({ unitId: 'u1', assetId: 'fa1', description: 'Notebook 14"' });
  });

  it('erro do BE no salvar aparece por resolveError e o modal fica aberto', async () => {
    vi.mocked(fixedAssetsService.createAsset).mockRejectedValue({ error: 'Código já existe.', status: 400 });
    const onSuccess = vi.fn();
    render(<FixedAssetFormModal isOpen onClose={() => {}} unitId="u1" classes={classes} onSuccess={onSuccess} />);
    await fillBase();
    fireEvent.click(screen.getByRole('radio', { name: 'Explícita' }));
    fireEvent.change(screen.getByLabelText('Taxa explícita (% a.a.)'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Código já existe.')).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
