import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { AccountingActivationBanner } from '../AccountingActivationBanner';
import { accountingBindingService } from '../../../../lib/services/accountingBinding.service';
import { notify } from '../../../../lib/notifications/notify';
import { ACTIVATION_SECTORS, DEFAULT_ACTIVATION_SECTOR } from '../../lib/activationSectors';

/**
 * Faixa de ativação (LAC-B, FE-INCR-BINDING-ACTIVATION-screen-brief itens 3, 5, 6, 8, 9 + EMENDA-1). Cada ramo espera o
 * DOM, não a chamada (memória handler-async-closure-stale-x-waitfor-tohavebeencalled).
 */
vi.mock('../../../../lib/services/accountingBinding.service', () => ({
  accountingBindingService: { listActive: vi.fn(), activateDefault: vi.fn() },
}));
vi.mock('../../../../lib/notifications/notify', () => ({ notify: vi.fn() }));

const active = [{ id: 'b1', sectorKey: 'beautySalon', bindingVersion: 1, status: 'Active' as const }];

async function openConfirm() {
  fireEvent.click(await screen.findByRole('button', { name: 'Ativar contabilidade' }));
  return screen.getByRole('dialog');
}

describe('AccountingActivationBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    vi.mocked(accountingBindingService.listActive).mockResolvedValue([]);
  });
  afterEach(async () => {
    await new Promise((r) => setTimeout(r, 0));
    cleanup();
  });

  it('item 9: os setores espelham o SECTOR_BINDING_REGISTRY do server, padrão salão', () => {
    expect([...ACTIVATION_SECTORS]).toEqual(['beautySalon', 'aestheticClinic']);
    expect(DEFAULT_ACTIVATION_SECTOR).toBe('beautySalon');
  });

  it('item 3: unidade sem binding Active ⇒ faixa com o aviso, o seletor de setor e o botão', async () => {
    render(<AccountingActivationBanner unitId="u1" onNavigateToPeriods={vi.fn()} />);
    const banner = await screen.findByTestId('accounting-activation-banner');
    expect(within(banner).getByText(/as vendas não geram lançamento/)).toBeInTheDocument();
    const select = within(banner).getByLabelText('Setor') as HTMLSelectElement;
    expect(select.value).toBe('beautySalon');
    expect([...select.options].map((o) => o.textContent)).toEqual(['Salão de beleza', 'Clínica de estética']);
  });

  it('item 3: unidade com binding Active ⇒ nada renderiza', async () => {
    vi.mocked(accountingBindingService.listActive).mockResolvedValue(active);
    const { container } = render(<AccountingActivationBanner unitId="u1" onNavigateToPeriods={vi.fn()} />);
    await waitFor(() => expect(accountingBindingService.listActive).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(container).toBeEmptyDOMElement();
  });

  it('item 5: a confirmação lista o setor e os 2 efeitos, e confirmar manda as duas flags true com o setor escolhido', async () => {
    vi.mocked(accountingBindingService.activateDefault).mockResolvedValue({ status: 'Active', bindingVersion: 1 });
    render(<AccountingActivationBanner unitId="u1" onNavigateToPeriods={vi.fn()} />);
    fireEvent.change(await screen.findByLabelText('Setor'), { target: { value: 'aestheticClinic' } });
    const dialog = await openConfirm();
    expect(dialog.textContent).toMatch(/plano de contas padrão/);
    expect(dialog.textContent).toMatch(/período do mês corrente/);
    expect(dialog.textContent).toMatch(/Clínica de estética|\{\{sector\}\}/);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Ativar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(accountingBindingService.activateDefault).toHaveBeenCalledWith({
      unitId: 'u1',
      sectorKey: 'aestheticClinic',
      installChartIfEmpty: true,
      openCurrentPeriodIfMissing: true,
    });
  });

  it('item 5: em voo os botões ficam desabilitados — duplo clique não manda duas vezes', async () => {
    let resolve!: (v: { status: 'Active'; bindingVersion: number }) => void;
    vi.mocked(accountingBindingService.activateDefault).mockImplementation(() => new Promise((r) => { resolve = r; }));
    render(<AccountingActivationBanner unitId="u1" onNavigateToPeriods={vi.fn()} />);
    const dialog = await openConfirm();
    const confirm = within(dialog).getByRole('button', { name: 'Ativar' });
    fireEvent.click(confirm);
    await waitFor(() => expect(within(screen.getByRole('dialog')).getAllByRole('button').filter((b) => b.hasAttribute('disabled')).length).toBeGreaterThan(0));
    fireEvent.click(confirm);
    expect(accountingBindingService.activateDefault).toHaveBeenCalledTimes(1);
    resolve({ status: 'Active', bindingVersion: 1 });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it.each(['Active', 'already-active'] as const)('item 6: %s ⇒ notify de sucesso e a faixa some (reload do estado)', async (status) => {
    vi.mocked(accountingBindingService.listActive).mockResolvedValueOnce([]).mockResolvedValueOnce(active);
    vi.mocked(accountingBindingService.activateDefault).mockResolvedValue({ status, bindingVersion: 1 });
    render(<AccountingActivationBanner unitId="u1" onNavigateToPeriods={vi.fn()} />);
    fireEvent.click(within(await openConfirm()).getByRole('button', { name: 'Ativar' }));
    await waitFor(() => expect(screen.queryByTestId('accounting-activation-banner')).not.toBeInTheDocument());
    expect(notify).toHaveBeenCalledWith(expect.stringMatching(/ativada/), 'success');
    expect(accountingBindingService.listActive).toHaveBeenCalledTimes(2);
  });

  it('item 6: Draft ⇒ a faixa mostra os bloqueantes — rótulo i18n nos conhecidos, message do BE nos demais; período leva a Períodos', async () => {
    const onNavigateToPeriods = vi.fn();
    vi.mocked(accountingBindingService.activateDefault).mockResolvedValue({
      status: 'Draft',
      blocking: [
        { code: 'ACCOUNTING_PERIOD_NOT_OPEN', period: '2026-10', message: 'O período 2026-10 está fechado (SOFT_CLOSED); reabra-o antes de ativar o binding.' },
        { code: 'KIT_FISCAL_PROFILE_REQUIRED', message: 'A unidade não tem perfil fiscal.' },
      ],
    });
    render(<AccountingActivationBanner unitId="u1" onNavigateToPeriods={onNavigateToPeriods} />);
    fireEvent.click(within(await openConfirm()).getByRole('button', { name: 'Ativar' }));
    const list = await screen.findByTestId('accounting-activation-blocking');
    expect(within(list).getByText(/está fechado — reabra-o/)).toBeInTheDocument();
    expect(within(list).getByText('A unidade não tem perfil fiscal.')).toBeInTheDocument();
    fireEvent.click(within(list).getByRole('button', { name: 'Ir para Períodos' }));
    expect(onNavigateToPeriods).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('accounting-activation-banner')).toBeInTheDocument();
    expect(notify).not.toHaveBeenCalled();
  });

  it('item 6 + PR-0: 409 BINDING_SECTOR_CONFLICT ⇒ a mensagem do BE na faixa, que continua aberta', async () => {
    vi.mocked(accountingBindingService.activateDefault).mockRejectedValue({
      code: 'BINDING_SECTOR_CONFLICT',
      message: "A unidade 'u1' já tem a contabilidade do setor 'beautySalon'; um setor por unidade — não ativa 'aestheticClinic'.",
      status: 409,
    });
    render(<AccountingActivationBanner unitId="u1" onNavigateToPeriods={vi.fn()} />);
    fireEvent.click(within(await openConfirm()).getByRole('button', { name: 'Ativar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/já tem a contabilidade do setor 'beautySalon'/);
    expect(screen.getByTestId('accounting-activation-banner')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('item 8: com a aba Pendências, o sucesso traz o link que troca a aba', async () => {
    const onNavigateToPendencias = vi.fn();
    vi.mocked(accountingBindingService.listActive).mockResolvedValueOnce([]).mockResolvedValueOnce(active);
    vi.mocked(accountingBindingService.activateDefault).mockResolvedValue({ status: 'Active', bindingVersion: 1 });
    render(<AccountingActivationBanner unitId="u1" onNavigateToPeriods={vi.fn()} onNavigateToPendencias={onNavigateToPendencias} />);
    fireEvent.click(within(await openConfirm()).getByRole('button', { name: 'Ativar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Ver pendências da unidade' }));
    expect(onNavigateToPendencias).toHaveBeenCalledTimes(1);
  });

  it('item 8: sem a aba Pendências, o link não renderiza', async () => {
    vi.mocked(accountingBindingService.listActive).mockResolvedValueOnce([]).mockResolvedValueOnce(active);
    vi.mocked(accountingBindingService.activateDefault).mockResolvedValue({ status: 'Active', bindingVersion: 1 });
    render(<AccountingActivationBanner unitId="u1" onNavigateToPeriods={vi.fn()} />);
    fireEvent.click(within(await openConfirm()).getByRole('button', { name: 'Ativar' }));
    await waitFor(() => expect(screen.queryByTestId('accounting-activation-banner')).not.toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Ver pendências da unidade' })).not.toBeInTheDocument();
  });
});
