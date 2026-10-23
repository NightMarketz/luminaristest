import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// O painel não faz `import React` (runtime clássico) — expõe React global só no teste.
(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, waitFor, fireEvent, within } from '@testing-library/react';
import { PaymentProviderPanel } from '../PaymentProviderPanel';
import { paymentAccountsService, type PaymentAccountView } from '../../../../lib/services/paymentAccounts.service';
import { accountingService } from '../../../../lib/services/accounting.service';

// `t` com interpolação (sem instância i18next o fallback volta cru) — mesmo molde do GovernedSave.policy.test.
vi.mock('next-i18next', () => {
  const t = (key: string, fallback?: unknown, vars?: Record<string, string>) =>
    typeof fallback === 'string' ? fallback.replace(/\{\{(\w+)\}\}/g, (_m, n: string) => vars?.[n] ?? '') : key;
  return { useTranslation: () => ({ t }) };
});
vi.mock('../../../../lib/services/paymentAccounts.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../lib/services/paymentAccounts.service')>();
  return {
    ...actual,
    paymentAccountsService: {
      list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), setCredential: vi.fn(),
      unblockReleaseReport: vi.fn(), remove: vi.fn(),
    },
  };
});
vi.mock('../../../../lib/services/accounting.service', () => ({
  accountingService: { getAccounts: vi.fn() },
}));

const leaf = { id: 'g1', code: '1.1.9', name: 'Saldo MP', nature: 'Asset', acceptsEntries: true };

const account = (over: Partial<PaymentAccountView> = {}): PaymentAccountView => ({
  id: 'pa1', unitId: 'u1', provider: 'MERCADO_PAGO', label: 'Conta MP', glAccountId: 'g1', providerAccountRef: null,
  config: { provider: 'MERCADO_PAGO', credentialSource: 'OWN' }, status: 'ACTIVE', credentialSetAt: '2026-10-01T00:00:00Z',
  credentialExpiresAt: null, accessTokenLast4: '9876', releaseReportBlockedReason: null,
  createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z', ...over,
});

// Token de fixture: nunca pode aparecer no DOM nem no console (itens 6 e 30).
const TOKEN = 'APP_USR-fixture-token-0000000000009876';
const SECRET = 'whsec-fixture-0000000';

describe('PaymentProviderPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    vi.mocked(accountingService.getAccounts).mockResolvedValue({ accounts: [leaf] } as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it('item 4: sem conta ⇒ estado vazio com "Cadastrar conta Mercado Pago"', async () => {
    vi.mocked(paymentAccountsService.list).mockResolvedValue([]);
    render(<PaymentProviderPanel unitId="u1" />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Cadastrar conta Mercado Pago/ })).toBeInTheDocument());
  });

  it('item 4: os 4 status têm rótulo próprio; folha "código — nome"; credencial só com os 4 últimos dígitos', async () => {
    vi.mocked(paymentAccountsService.list).mockResolvedValue([
      account({ id: 'a', status: 'DRAFT', credentialSetAt: null, accessTokenLast4: null }),
      account({ id: 'b', status: 'ACTIVE' }),
      account({ id: 'c', status: 'CREDENTIAL_INVALID' }),
      account({ id: 'd', status: 'DISABLED' }),
    ]);
    const { container } = render(<PaymentProviderPanel unitId="u1" />);
    await waitFor(() => expect(screen.getByText('Rascunho')).toBeInTheDocument());
    for (const label of ['Ativa', 'Credencial recusada', 'Desativada']) expect(screen.getByText(label)).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText('1.1.9 — Saldo MP').length).toBe(4));
    expect(container.textContent).toContain('•••• 9876');
    expect(container.textContent).toContain('Sem credencial gravada');
    expect(container.querySelector('.rounded-2xl')).not.toBeNull();
  });

  it('item 5: criar manda o corpo exato (provedor e config fixos, sem OAUTH nem campo extra)', async () => {
    vi.mocked(paymentAccountsService.list).mockResolvedValue([]);
    vi.mocked(paymentAccountsService.create).mockResolvedValue(account());
    render(<PaymentProviderPanel unitId="u1" />);
    fireEvent.click(await screen.findByRole('button', { name: /Cadastrar conta Mercado Pago/ }));
    expect(screen.getByText(/não pode ser trocada depois; para trocar, crie outra conta/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Rótulo'), { target: { value: ' Conta MP ' } });
    await waitFor(() => expect(screen.getByRole('option', { name: '1.1.9 — Saldo MP' })).toBeInTheDocument());
    fireEvent.change(screen.getByRole('combobox', { name: /Conta contábil do saldo/ }), { target: { value: 'g1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar' }));
    await waitFor(() => expect(paymentAccountsService.create).toHaveBeenCalledTimes(1));
    expect(vi.mocked(paymentAccountsService.create).mock.calls[0][0]).toStrictEqual({
      unitId: 'u1', provider: 'MERCADO_PAGO', label: 'Conta MP', glAccountId: 'g1',
      config: { provider: 'MERCADO_PAGO', credentialSource: 'OWN' },
    });
  });

  async function openCredential() {
    fireEvent.click(within(await screen.findByTestId('payment-account-pa1')).getAllByRole('button', { name: /Gravar credencial/ })[0]);
    const inputs = document.querySelectorAll('input[type="password"]');
    expect(inputs).toHaveLength(2);
    inputs.forEach((i) => {
      expect(i).toHaveAttribute('autocomplete', 'off');
      expect((i as HTMLInputElement).value).toBe('');
    });
    fireEvent.change(inputs[0], { target: { value: TOKEN } });
    fireEvent.change(inputs[1], { target: { value: SECRET } });
    return inputs;
  }

  it('item 6/30: depois do sucesso a credencial some do DOM e não vai para o console', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
    vi.mocked(paymentAccountsService.list).mockResolvedValue([account({ status: 'DRAFT', credentialSetAt: null, accessTokenLast4: null })]);
    vi.mocked(paymentAccountsService.setCredential).mockResolvedValue(account());
    const { container } = render(<PaymentProviderPanel unitId="u1" />);
    await openCredential();
    vi.mocked(paymentAccountsService.list).mockResolvedValue([account()]);
    fireEvent.click(screen.getByRole('button', { name: 'Gravar' }));
    await waitFor(() => expect(paymentAccountsService.setCredential).toHaveBeenCalledWith('pa1', { unitId: 'u1', accessToken: TOKEN, webhookSecret: SECRET }));
    await waitFor(() => expect(container.textContent).toContain('•••• 9876'));
    expect(document.body.innerHTML).not.toContain(TOKEN);
    expect(document.body.innerHTML).not.toContain(SECRET);
    for (const s of spies) expect(JSON.stringify(s.mock.calls)).not.toContain(TOKEN);
  });

  it('item 6: 503 sem chave ⇒ texto do M2; os valores digitados não ficam no DOM', async () => {
    vi.mocked(paymentAccountsService.list).mockResolvedValue([account({ status: 'DRAFT' })]);
    vi.mocked(paymentAccountsService.setCredential).mockRejectedValue(
      Object.assign(new Error('x'), { status: 503, code: 'payment_credential_key_missing', message: 'payment_credential_key_missing' }),
    );
    render(<PaymentProviderPanel unitId="u1" />);
    await openCredential();
    fireEvent.click(screen.getByRole('button', { name: 'Gravar' }));
    await waitFor(() => expect(screen.getByText(/chave de cifra da instância não está provisionada/)).toBeInTheDocument());
    expect(document.body.innerHTML).not.toContain(TOKEN);
    expect(document.body.innerHTML).not.toContain(SECRET);
  });

  it('item 6: 409 payment_account_already_active ⇒ "desative-a antes"', async () => {
    vi.mocked(paymentAccountsService.list).mockResolvedValue([account({ status: 'DRAFT' })]);
    vi.mocked(paymentAccountsService.setCredential).mockRejectedValue(
      Object.assign(new Error('x'), { status: 409, code: 'payment_account_already_active', message: 'payment_account_already_active: ...' }),
    );
    render(<PaymentProviderPanel unitId="u1" />);
    await openCredential();
    fireEvent.click(screen.getByRole('button', { name: 'Gravar' }));
    await waitFor(() => expect(screen.getByText(/Já existe uma conta ativa nesta unidade; desative-a antes/)).toBeInTheDocument());
  });

  it('item 7: CREDENTIAL_INVALID mostra o callout com o botão de gravar credencial', async () => {
    vi.mocked(paymentAccountsService.list).mockResolvedValue([account({ status: 'CREDENTIAL_INVALID' })]);
    render(<PaymentProviderPanel unitId="u1" />);
    const alert = await screen.findByText(/O Mercado Pago recusou a credencial/);
    expect(within(alert.closest('[role="alert"]') as HTMLElement).getByRole('button', { name: /Gravar credencial/ })).toBeInTheDocument();
  });

  it('item 8: DRAFT não oferece "Ativar"; ACTIVE oferece só "Desativar"; o clique manda o PATCH', async () => {
    vi.mocked(paymentAccountsService.list).mockResolvedValue([account({ status: 'DRAFT' })]);
    render(<PaymentProviderPanel unitId="u1" />);
    await screen.findByText('Rascunho');
    expect(screen.queryByRole('button', { name: 'Ativar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Desativar' })).toBeNull();

    cleanup();
    vi.mocked(paymentAccountsService.list).mockResolvedValue([account({ status: 'ACTIVE' })]);
    vi.mocked(paymentAccountsService.update).mockResolvedValue(account({ status: 'DISABLED' }));
    render(<PaymentProviderPanel unitId="u1" />);
    await screen.findByText('Ativa');
    expect(screen.queryByRole('button', { name: 'Ativar' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Desativar' }));
    await waitFor(() => expect(paymentAccountsService.update).toHaveBeenCalledWith('pa1', { unitId: 'u1', status: 'DISABLED' }));
  });

  it('item 8: 409 no PATCH mostra a mensagem do BE', async () => {
    vi.mocked(paymentAccountsService.list).mockResolvedValue([account({ status: 'DISABLED' })]);
    vi.mocked(paymentAccountsService.update).mockRejectedValue(
      Object.assign(new Error('x'), { status: 409, code: 'payment_account_already_active', message: 'payment_account_already_active: outra conta ativa' }),
    );
    render(<PaymentProviderPanel unitId="u1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Ativar' }));
    await waitFor(() => expect(screen.getByText('payment_account_already_active: outra conta ativa')).toBeInTheDocument());
  });

  it('item 8: excluir pede confirmação no Modal e manda o DELETE', async () => {
    vi.mocked(paymentAccountsService.list).mockResolvedValue([account()]);
    vi.mocked(paymentAccountsService.remove).mockResolvedValue(undefined);
    render(<PaymentProviderPanel unitId="u1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Excluir' }));
    expect(paymentAccountsService.remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Sim, excluir' }));
    await waitFor(() => expect(paymentAccountsService.remove).toHaveBeenCalledWith('pa1', 'u1'));
  });

  it('item 9: mostra a URL do webhook da conta', async () => {
    vi.mocked(paymentAccountsService.list).mockResolvedValue([account()]);
    render(<PaymentProviderPanel unitId="u1" />);
    expect(await screen.findByTestId('webhook-url')).toHaveTextContent(/\/payment-collection\/webhook\/MERCADO_PAGO\/pa1$/);
  });

  it('item 10: com motivo ⇒ callout verbatim + "Destravar" que manda { unitId }; sem motivo ⇒ nada', async () => {
    vi.mocked(paymentAccountsService.list).mockResolvedValue([account({ releaseReportBlockedReason: 'release_report_overlap: SOURCE_ID 123 repetido' })]);
    vi.mocked(paymentAccountsService.unblockReleaseReport).mockResolvedValue(account());
    render(<PaymentProviderPanel unitId="u1" />);
    expect(await screen.findByText('release_report_overlap: SOURCE_ID 123 repetido')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Destravar' }));
    await waitFor(() => expect(paymentAccountsService.unblockReleaseReport).toHaveBeenCalledWith('pa1', { unitId: 'u1' }));
    await waitFor(() => expect(paymentAccountsService.list).toHaveBeenCalledTimes(2)); // recarrega

    cleanup();
    vi.mocked(paymentAccountsService.list).mockResolvedValue([account()]);
    render(<PaymentProviderPanel unitId="u1" />);
    await screen.findByText('Ativa');
    expect(screen.queryByText('Relatório de liberações bloqueado')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Destravar' })).toBeNull();
  });

  it('403 num comando esconde as ações de gerir', async () => {
    vi.mocked(paymentAccountsService.list).mockResolvedValue([account({ releaseReportBlockedReason: 'motivo' })]);
    vi.mocked(paymentAccountsService.unblockReleaseReport).mockRejectedValue(Object.assign(new Error('x'), { status: 403, message: 'proibido' }));
    render(<PaymentProviderPanel unitId="u1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Destravar' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Destravar' })).toBeNull());
    expect(screen.queryByRole('button', { name: 'Desativar' })).toBeNull();
  });

  it('item 24: "Ver extratos e baixas" devolve a folha da conta', async () => {
    vi.mocked(paymentAccountsService.list).mockResolvedValue([account()]);
    const onOpen = vi.fn();
    render(<PaymentProviderPanel unitId="u1" onOpenReconciliation={onOpen} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Ver extratos e baixas' }));
    expect(onOpen).toHaveBeenCalledWith('g1');
  });
});
