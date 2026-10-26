import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { AccountingKitTab } from '../AccountingKitTab';
import { accountingKitService, type KitInstallationView, type KitUpgradePendingView } from '../../../../lib/services/accountingKit.service';
import { accountingBindingService } from '../../../../lib/services/accountingBinding.service';
import { notify } from '../../../../lib/notifications/notify';

/**
 * Aba "Kit de setor" (EMENDA-2 da LAC-B, itens 5–9 do §2 com as substituições do §10). Cada ramo espera o DOM, não a
 * chamada (memória handler-async-closure-stale-x-waitfor-tohavebeencalled).
 */
vi.mock('../../../../lib/services/accountingKit.service', () => ({
  accountingKitService: { getKit: vi.fn(), listPending: vi.fn(), acceptPending: vi.fn(), rejectPending: vi.fn() },
}));
vi.mock('../../../../lib/services/accountingBinding.service', () => ({
  accountingBindingService: { listActive: vi.fn(), activateDefault: vi.fn() },
}));
vi.mock('../../../../lib/notifications/notify', () => ({ notify: vi.fn() }));
vi.mock('../../lib/useAccountingT', () => {
  const t = (_key: string, fallback: string, opts?: Record<string, string>) =>
    fallback.replace(/\{\{(\w+)\}\}/g, (_m: string, name: string) => opts?.[name] ?? `{{${name}}}`);
  return { useAccountingT: () => ({ t, tRef: { current: t } }) };
});

const kit = (over: Partial<KitInstallationView> = {}): KitInstallationView => ({
  kitKey: 'beautySalon',
  kitVersion: 6,
  latestVersion: 6,
  status: 'INSTALLED',
  lastRun: null,
  openPendingCount: 0,
  changelog: [],
  steps: { lastCompletedStep: 7, warnings: [] },
  ...over,
});

const pending = (over: Partial<KitUpgradePendingView> = {}): KitUpgradePendingView => ({
  id: 'p1',
  kitKey: 'beautySalon',
  toVersion: 7,
  runId: 'r1',
  itemKey: 'role:receita-servico',
  reason: 'override',
  kitValue: null,
  tenantValue: null,
  status: 'OPEN',
  decidedById: null,
  decidedAt: null,
  motivo: null,
  createdAt: '2026-10-26T00:00:00.000Z',
  ...over,
});

const lastRun = (status: 'APPLIED' | 'FAILED') => ({
  id: 'r1', mode: 'APPLY' as const, status, fromVersion: 5, toVersion: 6, deployId: 'd1',
  startedAt: '2026-10-26T00:00:00.000Z', finishedAt: null, counts: { additive: 0, forward: 0, conflicts: 0 },
});

const renderTab = (onActivationChanged = vi.fn()) => render(<AccountingKitTab unitId="u1" onActivationChanged={onActivationChanged} />);

describe('AccountingKitTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    vi.mocked(accountingKitService.listPending).mockResolvedValue([]);
  });
  afterEach(async () => {
    await new Promise((r) => setTimeout(r, 0));
    cleanup();
  });

  it('item 5: setor do salão e da clínica pelo rótulo; chave fora do registry cai na kitKey crua', async () => {
    vi.mocked(accountingKitService.getKit).mockResolvedValue(kit());
    renderTab();
    expect(await screen.findByTestId('accounting-kit-sector')).toHaveTextContent('Salão de beleza');
    expect(screen.getByTestId('accounting-kit-version')).toHaveTextContent('Versão 6');
    cleanup();

    vi.mocked(accountingKitService.getKit).mockResolvedValue(kit({ kitKey: 'aestheticClinic' }));
    renderTab();
    expect(await screen.findByTestId('accounting-kit-sector')).toHaveTextContent('Clínica de estética');
    cleanup();

    vi.mocked(accountingKitService.getKit).mockResolvedValue(kit({ kitKey: 'padaria' }));
    renderTab();
    expect(await screen.findByTestId('accounting-kit-sector')).toHaveTextContent('padaria');
  });

  it('item 6: versão mais nova ⇒ "N instalada · M disponível" + changelog recolhido que abre', async () => {
    vi.mocked(accountingKitService.getKit).mockResolvedValue(
      kit({ kitVersion: 5, latestVersion: 7, changelog: [{ kitVersion: 6, entries: ['v6: nova conta'] }, { kitVersion: 7, entries: ['v7: referencial'] }] }),
    );
    renderTab();
    expect(await screen.findByTestId('accounting-kit-version')).toHaveTextContent('Versão 5 instalada · versão 7 disponível');
    expect(screen.queryByTestId('accounting-kit-changelog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /O que muda nas versões novas/ }));
    const log = screen.getByTestId('accounting-kit-changelog');
    expect(log).toHaveTextContent('v6: nova conta');
    expect(log).toHaveTextContent('v7: referencial');
    expect(screen.queryByTestId('accounting-kit-last-run-failed')).not.toBeInTheDocument();
  });

  it('item 6: lastRun FAILED ⇒ "a última atualização falhou"', async () => {
    vi.mocked(accountingKitService.getKit).mockResolvedValue(kit({ kitVersion: 5, latestVersion: 6, lastRun: lastRun('FAILED') }));
    renderTab();
    expect(await screen.findByTestId('accounting-kit-last-run-failed')).toHaveTextContent('A última atualização do kit falhou.');
  });

  it('item 6: versão igual à última ⇒ só a versão, sem changelog nem falha', async () => {
    vi.mocked(accountingKitService.getKit).mockResolvedValue(kit({ lastRun: lastRun('APPLIED') }));
    renderTab();
    expect(await screen.findByTestId('accounting-kit-version')).toHaveTextContent(/^Versão 6$/);
    expect(screen.queryByRole('button', { name: /O que muda/ })).not.toBeInTheDocument();
    expect(screen.queryByTestId('accounting-kit-last-run-failed')).not.toBeInTheDocument();
  });

  it('item 7: contador 0 ⇒ sem bloco e sem chamada à rota de pendências', async () => {
    vi.mocked(accountingKitService.getKit).mockResolvedValue(kit());
    renderTab();
    await screen.findByTestId('accounting-kit-tab');
    expect(screen.queryByTestId('accounting-kit-pending')).not.toBeInTheDocument();
    expect(accountingKitService.listPending).not.toHaveBeenCalled();
  });

  it('item 7: abrir a aba com pendências chama listPending(unitId, OPEN) uma vez; lista com motivo; código desconhecido cru', async () => {
    vi.mocked(accountingKitService.getKit).mockResolvedValue(kit({ openPendingCount: 2 }));
    vi.mocked(accountingKitService.listPending).mockResolvedValue([
      pending(),
      pending({ id: 'p2', itemKey: 'account:2.1.3', reason: 'motivo_novo' as KitUpgradePendingView['reason'] }),
    ]);
    renderTab();
    const block = await screen.findByTestId('accounting-kit-pending');
    expect(block).toHaveTextContent('Pendências da atualização do kit: 2');
    expect(await within(block).findByText('role:receita-servico')).toBeInTheDocument();
    expect(within(block).getByText('A conta do papel foi ajustada nesta unidade')).toBeInTheDocument();
    expect(within(block).getByText('motivo_novo')).toBeInTheDocument();
    expect(accountingKitService.listPending).toHaveBeenCalledTimes(1);
    expect(accountingKitService.listPending).toHaveBeenCalledWith('u1', 'OPEN');
    // PR-2: cada linha ganha "Aceitar" e "Recusar"
    expect(within(block).getAllByRole('button', { name: 'Aceitar' })).toHaveLength(2);
    expect(within(block).getAllByRole('button', { name: 'Recusar' })).toHaveLength(2);
  });

  it('item 8: INSTALLING ⇒ "em andamento", sem botão de retomada', async () => {
    vi.mocked(accountingKitService.getKit).mockResolvedValue(kit({ status: 'INSTALLING', steps: { lastCompletedStep: 3, warnings: [] } }));
    renderTab();
    expect(await screen.findByTestId('accounting-kit-installing')).toHaveTextContent('Instalação do kit em andamento.');
    expect(screen.queryByRole('button', { name: 'Retomar instalação' })).not.toBeInTheDocument();
  });

  it('item 8: INSTALLED ⇒ sem aviso de falha nem botão', async () => {
    vi.mocked(accountingKitService.getKit).mockResolvedValue(kit());
    renderTab();
    await screen.findByTestId('accounting-kit-tab');
    expect(screen.queryByTestId('accounting-kit-failed')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retomar instalação' })).not.toBeInTheDocument();
  });

  it('item 8: FAILED ⇒ aviso com o passo; confirmar chama activateDefault com o kitKey e recarrega kit e ativação', async () => {
    vi.mocked(accountingKitService.getKit)
      .mockResolvedValueOnce(kit({ kitKey: 'aestheticClinic', status: 'FAILED', steps: { lastCompletedStep: 6, warnings: [] } }))
      .mockResolvedValueOnce(kit({ kitKey: 'aestheticClinic' }));
    vi.mocked(accountingBindingService.activateDefault).mockResolvedValue({
      status: 'Active', bindingVersion: 1, kit: { kitKey: 'aestheticClinic', kitVersion: 6, status: 'INSTALLED' },
    });
    const onActivationChanged = vi.fn();
    renderTab(onActivationChanged);
    expect(await screen.findByTestId('accounting-kit-failed')).toHaveTextContent('parou no meio, no passo 7 de 7');
    fireEvent.click(screen.getByRole('button', { name: 'Retomar instalação' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('continua do passo 7');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Retomar' }));

    await waitFor(() => expect(screen.queryByTestId('accounting-kit-failed')).not.toBeInTheDocument());
    expect(accountingBindingService.activateDefault).toHaveBeenCalledWith({
      unitId: 'u1',
      sectorKey: 'aestheticClinic',
      installChartIfEmpty: true,
      openCurrentPeriodIfMissing: true,
    });
    expect(accountingKitService.getKit).toHaveBeenCalledTimes(2);
    expect(onActivationChanged).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith('Instalação do kit concluída.', 'success');
  });

  it('item 8: retomada que volta Draft ⇒ lista os bloqueantes com o render da faixa', async () => {
    vi.mocked(accountingKitService.getKit).mockResolvedValue(kit({ status: 'FAILED', steps: { lastCompletedStep: 6, warnings: [] } }));
    vi.mocked(accountingBindingService.activateDefault).mockResolvedValue({
      status: 'Draft',
      blocking: [
        { code: 'ACCOUNTING_PERIOD_NOT_OPEN', period: '2026-10', message: 'x' },
        { code: 'KIT_INSTALL_STEP_FAILED', step: 7, message: 'A instalação do kit falhou no passo 7: boom' },
      ],
    });
    renderTab();
    fireEvent.click(await screen.findByRole('button', { name: 'Retomar instalação' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Retomar' }));
    const list = await screen.findByTestId('accounting-activation-blocking');
    expect(list).toHaveTextContent('O período 2026-10 está fechado');
    expect(list).toHaveTextContent('A instalação do kit falhou no passo 7: boom');
  });

  it('item 8: erro da retomada ⇒ mensagem pelo resolveError', async () => {
    vi.mocked(accountingKitService.getKit).mockResolvedValue(kit({ status: 'FAILED', steps: { lastCompletedStep: 5, warnings: [] } }));
    vi.mocked(accountingBindingService.activateDefault).mockRejectedValue({ error: 'Conflito de setor', status: 409 });
    renderTab();
    fireEvent.click(await screen.findByRole('button', { name: 'Retomar instalação' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Retomar' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('item 9: cada aviso do referencial vira o seu texto; lista vazia ⇒ nada', async () => {
    vi.mocked(accountingKitService.getKit).mockResolvedValue(
      kit({ steps: { lastCompletedStep: 7, warnings: ['KIT_REFERENTIAL_SKIPPED_NO_REGIME', 'KIT_REFERENTIAL_SKIPPED_NO_CATALOG'] } }),
    );
    renderTab();
    const w = await screen.findByTestId('accounting-kit-warnings');
    expect(w).toHaveTextContent('a empresa não tem regime definido');
    expect(w).toHaveTextContent('Não há referencial publicado para o ano.');
    cleanup();

    vi.mocked(accountingKitService.getKit).mockResolvedValue(kit());
    renderTab();
    await screen.findByTestId('accounting-kit-tab');
    expect(screen.queryByTestId('accounting-kit-warnings')).not.toBeInTheDocument();
  });

  describe('PR-2 — decidir pendências (itens 16–18)', () => {
    async function openDecision(button: 'Aceitar' | 'Recusar', rows: KitUpgradePendingView[] = [pending()]) {
      vi.mocked(accountingKitService.getKit).mockResolvedValue(kit({ openPendingCount: rows.length }));
      vi.mocked(accountingKitService.listPending).mockResolvedValue(rows);
      renderTab(onActivationChanged);
      const block = await screen.findByTestId('accounting-kit-pending');
      fireEvent.click((await within(block).findAllByRole('button', { name: button }))[0]);
      return screen.getByRole('dialog');
    }
    const confirmButton = (dialog: HTMLElement, name: 'Aceitar' | 'Recusar') => within(dialog).getByRole('button', { name });
    const MOTIVO = 'conferido com o contador';
    let onActivationChanged = vi.fn();
    beforeEach(() => { onActivationChanged = vi.fn(); });

    it('item 16: motivo com 9 caracteres (ou só espaços) ⇒ confirmar desabilitado; com 10 ⇒ habilitado', async () => {
      const dialog = await openDecision('Recusar');
      const textarea = within(dialog).getByLabelText(/Motivo/);
      expect(confirmButton(dialog, 'Recusar')).toBeDisabled();
      fireEvent.change(textarea, { target: { value: 'x'.repeat(9) } });
      expect(confirmButton(dialog, 'Recusar')).toBeDisabled();
      fireEvent.change(textarea, { target: { value: ` ${'x'.repeat(9)}  ` } });
      expect(confirmButton(dialog, 'Recusar')).toBeDisabled();
      fireEvent.change(textarea, { target: { value: 'x'.repeat(10) } });
      expect(confirmButton(dialog, 'Recusar')).toBeEnabled();
    });

    it.each([
      ['override', 'remove o ajuste da conta deste papel e recompila'],
      ['account_deleted_by_user', 'restaura a conta apagada e recompila'],
      ['account_changed_in_use', 'renomeia a conta para o nome do kit'],
      ['field_set_by_user', 'grava a conta do kit por cima'],
      ['referential_year_frozen', 'aceitar não é possível, só recusar'],
      ['referential_mapped_differently', 'troca o código referencial'],
      ['motivo_novo', 'altera o plano ou o binding da unidade'],
    ])('item 16: aceitar %s mostra o efeito antes de confirmar', async (reason, effect) => {
      const dialog = await openDecision('Aceitar', [pending({ reason: reason as KitUpgradePendingView['reason'] })]);
      expect(dialog).toHaveTextContent(effect);
    });

    it('item 16: recusar diz que mantém o valor da unidade', async () => {
      const dialog = await openDecision('Recusar');
      expect(dialog).toHaveTextContent('Recusar mantém o valor desta unidade');
    });

    it('item 17: aceitar override ⇒ POST com unitId e motivo aparado, notify, recarrega lista e kit, e a ativação (recompilou)', async () => {
      const dialog = await openDecision('Aceitar');
      vi.mocked(accountingKitService.acceptPending).mockResolvedValue(pending({ status: 'ACCEPTED' }));
      vi.mocked(accountingKitService.listPending).mockResolvedValue([]);
      fireEvent.change(within(dialog).getByLabelText(/Motivo/), { target: { value: `  ${MOTIVO}  ` } });
      fireEvent.click(confirmButton(dialog, 'Aceitar'));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(accountingKitService.acceptPending).toHaveBeenCalledWith('p1', { unitId: 'u1', motivo: MOTIVO });
      expect(notify).toHaveBeenCalledWith('Pendência aceita.', 'success');
      expect(accountingKitService.listPending).toHaveBeenCalledTimes(2);
      expect(accountingKitService.getKit).toHaveBeenCalledTimes(2);
      expect(onActivationChanged).toHaveBeenCalledTimes(1);
    });

    it('item 17: recusar ⇒ rejectPending, recarrega lista e kit, sem reler a ativação', async () => {
      const dialog = await openDecision('Recusar');
      vi.mocked(accountingKitService.rejectPending).mockResolvedValue(pending({ status: 'REJECTED' }));
      fireEvent.change(within(dialog).getByLabelText(/Motivo/), { target: { value: MOTIVO } });
      fireEvent.click(confirmButton(dialog, 'Recusar'));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(accountingKitService.rejectPending).toHaveBeenCalledWith('p1', { unitId: 'u1', motivo: MOTIVO });
      expect(notify).toHaveBeenCalledWith('Pendência recusada.', 'success');
      expect(accountingKitService.listPending).toHaveBeenCalledTimes(2);
      expect(accountingKitService.getKit).toHaveBeenCalledTimes(2);
      expect(onActivationChanged).not.toHaveBeenCalled();
    });

    it.each([
      ['KIT_PENDING_NOT_OPEN', 409, 'já foi decidida por outra pessoa', true],
      ['KIT_PENDING_NOT_FOUND', 404, 'Pendência não encontrada', true],
      ['KIT_PENDING_FROZEN_YEAR', 422, 'só dá para recusar', false],
      ['VALIDATION_ERROR', 400, 'A conta do kit não está viva', false],
    ] as const)('item 18: %s vira a mensagem certa (recarrega a lista: %s)', async (code, status, text, reloads) => {
      const dialog = await openDecision('Aceitar');
      const message = code === 'VALIDATION_ERROR' ? 'ACCOUNT_NOT_FOUND: a conta 4.8 do kit não está viva' : 'msg do BE';
      vi.mocked(accountingKitService.acceptPending).mockRejectedValue({ code, status, message });
      fireEvent.change(within(dialog).getByLabelText(/Motivo/), { target: { value: MOTIVO } });
      fireEvent.click(confirmButton(dialog, 'Aceitar'));
      expect(await screen.findByTestId('accounting-kit-decide-error')).toHaveTextContent(text);
      expect(accountingKitService.listPending).toHaveBeenCalledTimes(reloads ? 2 : 1);
    });

    it('item 18: KIT_PENDING_COMPILE_DRAFT lista os bloqueantes com o render da faixa', async () => {
      const dialog = await openDecision('Aceitar', [pending({ reason: 'account_deleted_by_user' })]);
      vi.mocked(accountingKitService.acceptPending).mockRejectedValue({
        code: 'KIT_PENDING_COMPILE_DRAFT',
        status: 422,
        message: 'A recompilação depois de aceitar a pendência reprovou; nada foi aplicado.',
        details: { binding: { status: 'Draft', bindingVersion: 3 }, blocking: [{ code: 'ROLE_SLOT_ACCOUNT_MISSING', message: 'Conta 4.8 ausente' }], missingEventKeys: [] },
      });
      fireEvent.change(within(dialog).getByLabelText(/Motivo/), { target: { value: MOTIVO } });
      fireEvent.click(confirmButton(dialog, 'Aceitar'));
      expect(await screen.findByTestId('accounting-kit-decide-error')).toHaveTextContent('A recompilação do binding reprovou');
      expect(screen.getByTestId('accounting-activation-blocking')).toHaveTextContent('Conta 4.8 ausente');
      expect(onActivationChanged).not.toHaveBeenCalled();
    });
  });

  it('erro na leitura do kit ⇒ aviso e a tela segue de pé', async () => {
    vi.mocked(accountingKitService.getKit).mockRejectedValue({ error: 'boom', status: 500 });
    renderTab();
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o kit de setor da unidade.');
  });
});
