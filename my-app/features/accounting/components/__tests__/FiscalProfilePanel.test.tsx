import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { FiscalProfilePanel } from '../FiscalProfilePanel';
import { fiscalProfileService, type FiscalProfileView } from '../../../../lib/services/fiscalProfile.service';
import { accountingService, type Account } from '../../../../lib/services/accounting.service';

/**
 * FiscalProfilePanel (FE-INCR-DFE PR-0 itens 3, 5, 6): SIMPLES trava ICMS/PIS-COFINS; trocar para PRESUMIDO esconde o
 * pTotTribSN e mostra os três; o PUT sem mexer devolve cada campo (série 7, BLOQUEAR); perfil ausente → formulário
 * em branco + aviso; `faltantes` traduzidos com fallback ao nome cru; o 409 do contador ativo aparece íntegro.
 */
vi.mock('../../../../lib/services/fiscalProfile.service', () => ({
  fiscalProfileService: { getUnitProfile: vi.fn(), putUnitProfile: vi.fn() },
}));
vi.mock('../../../../lib/services/accounting.service', () => ({
  accountingService: { getAccounts: vi.fn() },
}));

const accounts: Account[] = [
  { id: 'a-icms', code: '1.1.7.01', name: 'ICMS a recuperar', nature: 'Asset', acceptsEntries: true },
  { id: 'a-sint', code: '1.1', name: 'Circulante (sintética)', nature: 'Asset', acceptsEntries: false },
  { id: 'a-desp', code: '4.1.1.01', name: 'Despesa', nature: 'Expense', acceptsEntries: true },
];

const view = (over: Partial<FiscalProfileView> = {}): FiscalProfileView => ({
  unitId: 'u1', regimeTributario: 'SIMPLES', icmsContribuinte: false, pisCofinsRegime: 'SIMPLES',
  pisCofinsCreditExcludesIcms: true, pisCofinsCreditIncludesIpi: false, pisCofinsCreditFromSimplesSupplier: false,
  icmsRecuperavelAccountId: null, pisCofinsRecuperavelAccountId: null, insumoExpenseAccountId: null,
  irpjDespesaAccountId: null, csllDespesaAccountId: null, irpjRecolherAccountId: null, csllRecolherAccountId: null,
  partnerAccountRef: null, codMun: '3550308', inscricaoMunicipal: null, cnae: null,
  dpsSerie: 7, regEspTrib: 0, regApTribSN: 1, issAliquotaBp: 200, issRetidoTomadorPj: false,
  pacoteFatoGerador: 'CONSUMO', pacoteCTribNac: null, pacoteCNBS: null,
  ibsCbsInformar: false, ibsCbsCst: null, ibsCbsClassTrib: null,
  pTotTribFedCent: null, pTotTribEstCent: null, pTotTribMunCent: null, pTotTribSNCent: 1550,
  emissaoForaDoMes: 'BLOQUEAR', d1fConfirmado: true,
  emissao: { completo: true, faltantes: [], pendingExternalValidation: [] }, updatedAt: '2026-10-05T00:00:00.000Z',
  ...over,
});

const wire = (fn: unknown) => JSON.parse(JSON.stringify((fn as { mock: { calls: unknown[][] } }).mock.calls[0][0]));

describe('FiscalProfilePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    vi.mocked(fiscalProfileService.getUnitProfile).mockResolvedValue(view());
    vi.mocked(accountingService.getAccounts).mockResolvedValue({ accounts });
  });
  // Dreno: respostas em voo não podem aterrissar depois do teardown do jsdom.
  afterEach(async () => { await new Promise((r) => setTimeout(r, 0)); cleanup(); });

  const ready = async () => { render(<FiscalProfilePanel unitId="u1" />); await screen.findByRole('button', { name: 'Salvar perfil' }); };

  it('lê o perfil do unitId recebido e hidrata o formulário (série 7, BLOQUEAR, 15,50 %)', async () => {
    await ready();
    expect(fiscalProfileService.getUnitProfile).toHaveBeenCalledWith('u1');
    expect(screen.getByLabelText('Série da DPS')).toHaveValue('7');
    expect(screen.getByLabelText('Competência fora do mês')).toHaveValue('BLOQUEAR');
    expect(screen.getByLabelText('Simples Nacional')).toHaveValue('15,50');
    expect(screen.getByLabelText('Alíquota do ISS (%)')).toHaveValue('2,00');
  });

  it('SIMPLES desabilita icmsContribuinte e trava PIS/COFINS; PRESUMIDO esconde o Simples e mostra os três tributos', async () => {
    await ready();
    expect(screen.getByLabelText('Contribuinte de ICMS')).toBeDisabled();
    expect(screen.getByLabelText('Regime de PIS/COFINS')).toBeDisabled();
    expect(screen.getByLabelText('Simples Nacional', { selector: 'input' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Federal')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Regime tributário'), { target: { value: 'PRESUMIDO' } });
    expect(screen.queryByLabelText('Simples Nacional', { selector: 'input' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Federal')).toBeInTheDocument();
    expect(screen.getByLabelText('Estadual')).toBeInTheDocument();
    expect(screen.getByLabelText('Municipal')).toBeInTheDocument();
    expect(screen.getByLabelText('Contribuinte de ICMS')).toBeEnabled();
    // saiu de SIMPLES → obriga a escolher o regime de PIS/COFINS
    expect(screen.getByLabelText('Regime de PIS/COFINS')).toHaveValue('');
  });

  it('PUT sem mexer: o corpo leva série 7 e BLOQUEAR (a classe "default do Zod reseta o campo")', async () => {
    vi.mocked(fiscalProfileService.putUnitProfile).mockResolvedValue(view());
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }));
    await waitFor(() => expect(fiscalProfileService.putUnitProfile).toHaveBeenCalledTimes(1));
    expect(wire(fiscalProfileService.putUnitProfile)).toMatchObject({
      unitId: 'u1', dpsSerie: 7, emissaoForaDoMes: 'BLOQUEAR', issAliquotaBp: 200, pTotTribSNCent: 1550, regApTribSN: 1,
    });
  });

  it('depois do PUT a tela usa a view devolvida (faltantes novos aparecem)', async () => {
    vi.mocked(fiscalProfileService.putUnitProfile).mockResolvedValue(
      view({ emissao: { completo: false, faltantes: ['codMun'], pendingExternalValidation: [] } }),
    );
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }));
    expect(await screen.findByText('Município do emitente (código IBGE)')).toBeInTheDocument();
  });

  it('perfil ausente (GET null): formulário em branco + aviso "nenhuma venda emite"; regime vazio barra o salvar', async () => {
    vi.mocked(fiscalProfileService.getUnitProfile).mockResolvedValue(null);
    await ready();
    expect(screen.getByRole('status')).toHaveTextContent(/nenhuma venda emite/);
    expect(screen.getByLabelText('Regime tributário')).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Escolha o regime tributário.');
    expect(fiscalProfileService.putUnitProfile).not.toHaveBeenCalled();
  });

  it('emissao: faltante conhecido sai pelo rótulo; frase desconhecida sai como veio; D1f pendente avisa', async () => {
    vi.mocked(fiscalProfileService.getUnitProfile).mockResolvedValue(
      view({ emissao: { completo: false, faltantes: ['codMun', 'regime MEI — emissão fora do escopo (opSimpNac=2)'], pendingExternalValidation: ['issAliquotaBp'] } }),
    );
    await ready();
    expect(screen.getByText('Perfil incompleto para emitir NFS-e')).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'O que falta' });
    expect(within(list).getByText('Município do emitente (código IBGE)')).toBeInTheDocument();
    expect(within(list).getByText('regime MEI — emissão fora do escopo (opSimpNac=2)')).toBeInTheDocument();
    expect(screen.getByText(/ainda não confirmados \(D1f\)/)).toHaveTextContent('issAliquotaBp');
  });

  it('o 409 do contador ativo (política versionada) aparece íntegro, sem esconder o formulário', async () => {
    vi.mocked(fiscalProfileService.putUnitProfile).mockRejectedValue({ status: 409, error: 'Há contador responsável ativo: proponha a mudança.' });
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Há contador responsável ativo: proponha a mudança.');
    expect(screen.getByLabelText('Série da DPS')).toHaveValue('7');
  });

  it('só contas folha de Ativo chegam aos selects; o valor da conta é o id', async () => {
    vi.mocked(fiscalProfileService.putUnitProfile).mockResolvedValue(view());
    await ready();
    const select = screen.getByLabelText('Conta de ICMS a recuperar');
    const labels = within(select).getAllByRole('option').map((o) => o.textContent);
    expect(labels).toContain('1.1.7.01 — ICMS a recuperar');
    expect(labels).not.toContain('1.1 — Circulante (sintética)');
    expect(labels).not.toContain('4.1.1.01 — Despesa');
    fireEvent.change(select, { target: { value: 'a-icms' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }));
    await waitFor(() => expect(fiscalProfileService.putUnitProfile).toHaveBeenCalled());
    expect(wire(fiscalProfileService.putUnitProfile)).toMatchObject({ icmsRecuperavelAccountId: 'a-icms' });
  });

  it('ISS retido pelo tomador PJ marcado → aviso de que a emissão recusa hoje', async () => {
    await ready();
    expect(screen.queryByText(/a emissão recusa hoje/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('ISS retido pelo tomador pessoa jurídica'));
    expect(screen.getByText(/a emissão recusa hoje/)).toBeInTheDocument();
  });

  it('IPI no crédito de PIS/COFINS fica desmarcado e desabilitado (regra fixa do DTO)', async () => {
    await ready();
    const ipi = screen.getByLabelText(/inclui o IPI/);
    expect(ipi).toBeDisabled();
    expect(ipi).not.toBeChecked();
  });
});
