import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { FiscalProfilePanel } from '../FiscalProfilePanel';
import { FixedAssetAccountsSection } from '../FixedAssetAccountsSection';
import { fiscalProfileService, type FiscalProfileView } from '../../../../lib/services/fiscalProfile.service';
import { accountingService, type Account } from '../../../../lib/services/accounting.service';
import {
  accountantAssignmentsService,
  type AccountantAssignmentView,
} from '../../../../lib/services/accountantAssignments.service';
import { accountingContactsService } from '../../../../lib/services/accountingContacts.service';
import { policyVersionsService, type PolicyVersionView } from '../../../../lib/services/policyVersions.service';

/**
 * FE-INCR-ACCOUNTING-POLICY-VERSION 12b e 12f — lado do dono, nos dois painéis: com ACTIVE o botão diz "Enviar ao
 * contador" e o clique chama `propose`, nunca o PUT; sem ACTIVE, o PUT de hoje. A rede de corrida nos dois sentidos
 * (409 `POLICY_APPROVAL_REQUIRED` no PUT → "Enviar como proposta" com o MESMO corpo; 409 `POLICY_NO_ACCOUNTANT` na
 * proposta → "Salvar direto"). A faixa da pendente mostra a versão e o aviso de substituição.
 */
// Sem instância i18next o `t` devolve o fallback cru; aqui ele interpola `{{x}}` para o teste ler versão/nome/CRC.
vi.mock('next-i18next', () => {
  const t = (key: string, fallback?: unknown, vars?: Record<string, string>) =>
    typeof fallback === 'string' ? fallback.replace(/\{\{(\w+)\}\}/g, (_m, n: string) => vars?.[n] ?? '') : key;
  return { useTranslation: () => ({ t }) };
});
vi.mock('../../../../lib/services/fiscalProfile.service', () => ({
  fiscalProfileService: { getUnitProfile: vi.fn(), putUnitProfile: vi.fn() },
}));
vi.mock('../../../../lib/services/accounting.service', () => ({
  accountingService: { getAccounts: vi.fn(), getSettings: vi.fn(), updateSettings: vi.fn() },
}));
vi.mock('../../../../lib/services/accountantAssignments.service', () => ({
  accountantAssignmentsService: { listByScope: vi.fn() },
}));
vi.mock('../../../../lib/services/accountingContacts.service', () => ({
  accountingContactsService: { listContacts: vi.fn() },
}));
vi.mock('../../../../lib/services/policyVersions.service', () => ({
  policyVersionsService: { list: vi.fn(), propose: vi.fn(), get: vi.fn() },
}));

const accounts: Account[] = [
  { id: 'a-desp', code: '4.1.1.01', name: 'Despesa de depreciação', nature: 'Expense', acceptsEntries: true },
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

const activeRow: AccountantAssignmentView = {
  id: 'as-1', unitId: 'u1', status: 'ACTIVE', accountingContactId: 'c1', accountantUserId: 'acc-1',
  crcNumber: 'SP-123456/O-3', crcUf: 'SP', activeFrom: '2026-10-01T00:00:00Z', activeUntil: null, endReason: null,
  createdAt: '2026-10-01T00:00:00Z',
};

const version = (over: Partial<PolicyVersionView> = {}): PolicyVersionView => ({
  id: 'pv-1', unitId: 'u1', target: 'FISCAL_PROFILE', version: 3, status: 'PROPOSED', payload: {},
  appliedSnapshot: null, proposedById: 'owner-1', decidedById: null, assignmentId: 'as-1', decisionReason: null,
  decidedAt: null, createdAt: '2026-10-08T12:00:00.000Z', ...over,
});

const conflict = (code: string) => ({ status: 409, error: `server ${code}`, code });
const wire = (fn: unknown, i = 0) => JSON.parse(JSON.stringify((fn as { mock: { calls: unknown[][] } }).mock.calls[i][0]));

function withActive(active: boolean) {
  vi.mocked(accountantAssignmentsService.listByScope).mockResolvedValue(active ? [activeRow] : []);
}

beforeEach(() => {
  vi.clearAllMocks();
  cleanup();
  vi.mocked(fiscalProfileService.getUnitProfile).mockResolvedValue(view());
  vi.mocked(accountingService.getAccounts).mockResolvedValue({ accounts: [] });
  vi.mocked(accountingService.getSettings).mockResolvedValue({
    unitId: 'u1', depreciationExpenseAccountId: null, disposalGainAccountId: null, disposalLossAccountId: null,
  } as never);
  vi.mocked(accountingContactsService.listContacts).mockResolvedValue([{ id: 'c1', name: 'Maria Contadora' }] as never);
  vi.mocked(policyVersionsService.list).mockResolvedValue([]);
});
// Dreno: respostas em voo não podem aterrissar depois do teardown do jsdom.
afterEach(async () => { await new Promise((r) => setTimeout(r, 0)); cleanup(); });

describe('FiscalProfilePanel — proposta com contador ativo (12b)', () => {
  it('com ACTIVE: aviso com nome e CRC, botão "Enviar ao contador" e o clique chama propose (payload sem unitId), nunca o PUT', async () => {
    withActive(true);
    vi.mocked(policyVersionsService.propose).mockResolvedValue(version({ version: 4 }));
    render(<FiscalProfilePanel unitId="u1" />);
    const btn = await screen.findByRole('button', { name: 'Enviar ao contador para aprovação' });
    expect(screen.getByTestId('policy-active-notice')).toHaveTextContent('Maria Contadora, SP-123456/O-3');

    fireEvent.click(btn);
    expect(await screen.findByText(/Proposta v4 enviada\. O perfil abaixo continua o vigente/)).toBeInTheDocument();
    expect(fiscalProfileService.putUnitProfile).not.toHaveBeenCalled();
    const body = wire(policyVersionsService.propose);
    expect(body).toMatchObject({ unitId: 'u1', target: 'FISCAL_PROFILE' });
    expect(body.payload).not.toHaveProperty('unitId');
    expect(body.payload).toMatchObject({ dpsSerie: 7, emissaoForaDoMes: 'BLOQUEAR' });
    // F-FE-POL-4 a: o formulário relê o vigente depois de propor.
    await waitFor(() => expect(fiscalProfileService.getUnitProfile).toHaveBeenCalledTimes(2));
  });

  it('sem ACTIVE: "Salvar perfil" chama o PUT, como hoje', async () => {
    withActive(false);
    vi.mocked(fiscalProfileService.putUnitProfile).mockResolvedValue(view());
    render(<FiscalProfilePanel unitId="u1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Salvar perfil' }));
    await waitFor(() => expect(fiscalProfileService.putUnitProfile).toHaveBeenCalledTimes(1));
    expect(policyVersionsService.propose).not.toHaveBeenCalled();
  });

  it('corrida: PUT dá 409 POLICY_APPROVAL_REQUIRED → texto traduzido + "Enviar como proposta", que manda o MESMO corpo', async () => {
    withActive(false);
    vi.mocked(fiscalProfileService.putUnitProfile).mockRejectedValue(conflict('POLICY_APPROVAL_REQUIRED'));
    vi.mocked(policyVersionsService.propose).mockResolvedValue(version({ version: 5 }));
    render(<FiscalProfilePanel unitId="u1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Salvar perfil' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('a mudança precisa da aprovação dele');
    expect(policyVersionsService.propose).not.toHaveBeenCalled(); // nada reenvia sozinho

    fireEvent.click(screen.getByRole('button', { name: 'Enviar como proposta' }));
    await waitFor(() => expect(policyVersionsService.propose).toHaveBeenCalledTimes(1));
    const { unitId, ...put } = wire(fiscalProfileService.putUnitProfile);
    expect(wire(policyVersionsService.propose)).toEqual({ unitId, target: 'FISCAL_PROFILE', payload: put });
  });

  it('corrida: proposta dá 409 POLICY_NO_ACCOUNTANT → "Salvar direto" reenvia o mesmo corpo pelo PUT', async () => {
    withActive(true);
    vi.mocked(policyVersionsService.propose).mockRejectedValue(conflict('POLICY_NO_ACCOUNTANT'));
    vi.mocked(fiscalProfileService.putUnitProfile).mockResolvedValue(view());
    render(<FiscalProfilePanel unitId="u1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Enviar ao contador para aprovação' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('não tem mais contador responsável ativo');
    expect(fiscalProfileService.putUnitProfile).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Salvar direto' }));
    await waitFor(() => expect(fiscalProfileService.putUnitProfile).toHaveBeenCalledTimes(1));
    const proposal = wire(policyVersionsService.propose);
    expect(wire(fiscalProfileService.putUnitProfile)).toEqual({ unitId: proposal.unitId, ...proposal.payload });
  });

  it('12f: com 1 PROPOSED, a faixa mostra a versão e o aviso de substituição por inteiro; o formulário segue no vigente', async () => {
    withActive(true);
    vi.mocked(policyVersionsService.list).mockResolvedValue([version({ version: 3 })]);
    render(<FiscalProfilePanel unitId="u1" />);
    const banner = await screen.findByTestId('policy-pending-banner');
    expect(banner).toHaveTextContent('Proposta v3 aguardando o contador');
    expect(banner).toHaveTextContent('Enviar outra substitui esta por inteiro.');
    expect(policyVersionsService.list).toHaveBeenCalledWith({ unitId: 'u1', target: 'FISCAL_PROFILE', status: 'PROPOSED' });
    expect(screen.getByLabelText('Série da DPS')).toHaveValue('7');
  });
});

describe('FixedAssetAccountsSection — proposta com contador ativo (12b)', () => {
  it('com ACTIVE: chama propose com SÓ as 3 chaves do imobilizado; a mensagem é "enviadas ao contador", nunca "Contas salvas"', async () => {
    withActive(true);
    vi.mocked(policyVersionsService.propose).mockResolvedValue(version({ target: 'SCOPE_SETTINGS', version: 2 }));
    render(<FixedAssetAccountsSection unitId="u1" accounts={accounts} />);
    const btn = await screen.findByRole('button', { name: 'Enviar ao contador para aprovação' });
    await waitFor(() => expect(btn).toBeEnabled());
    fireEvent.change(screen.getByLabelText('Despesa de depreciação'), { target: { value: 'a-desp' } });
    fireEvent.click(btn);

    expect(await screen.findByText(/Contas enviadas ao contador \(proposta v2\)/)).toBeInTheDocument();
    expect(screen.queryByText('Contas salvas.')).not.toBeInTheDocument();
    expect(accountingService.updateSettings).not.toHaveBeenCalled();
    expect(wire(policyVersionsService.propose)).toEqual({
      unitId: 'u1',
      target: 'SCOPE_SETTINGS',
      payload: { depreciationExpenseAccountId: 'a-desp', disposalGainAccountId: null, disposalLossAccountId: null },
    });
    // F-FE-POL-4 a: relê o vigente.
    await waitFor(() => expect(accountingService.getSettings).toHaveBeenCalledTimes(2));
  });

  it('sem ACTIVE: "Salvar" chama o PUT e diz "Contas salvas."', async () => {
    withActive(false);
    vi.mocked(accountingService.updateSettings).mockResolvedValue({} as never);
    render(<FixedAssetAccountsSection unitId="u1" accounts={accounts} />);
    const btn = await screen.findByRole('button', { name: 'Salvar' });
    await waitFor(() => expect(btn).toBeEnabled());
    fireEvent.click(btn);
    expect(await screen.findByText('Contas salvas.')).toBeInTheDocument();
    expect(policyVersionsService.propose).not.toHaveBeenCalled();
  });

  it('corrida: PUT dá 409 POLICY_APPROVAL_REQUIRED → "Enviar como proposta" com o mesmo patch', async () => {
    withActive(false);
    vi.mocked(accountingService.updateSettings).mockRejectedValue(conflict('POLICY_APPROVAL_REQUIRED'));
    vi.mocked(policyVersionsService.propose).mockResolvedValue(version({ target: 'SCOPE_SETTINGS' }));
    render(<FixedAssetAccountsSection unitId="u1" accounts={accounts} />);
    const btn = await screen.findByRole('button', { name: 'Salvar' });
    await waitFor(() => expect(btn).toBeEnabled());
    fireEvent.click(btn);
    expect(await screen.findByRole('alert')).toHaveTextContent('a mudança precisa da aprovação dele');
    fireEvent.click(screen.getByRole('button', { name: 'Enviar como proposta' }));
    await waitFor(() => expect(policyVersionsService.propose).toHaveBeenCalledTimes(1));
    const { unitId, ...patch } = wire(accountingService.updateSettings);
    expect(wire(policyVersionsService.propose)).toEqual({ unitId, target: 'SCOPE_SETTINGS', payload: patch });
    expect(screen.queryByText('Contas salvas.')).not.toBeInTheDocument();
  });

  it('corrida: proposta dá 409 POLICY_NO_ACCOUNTANT → "Salvar direto" pelo PUT', async () => {
    withActive(true);
    vi.mocked(policyVersionsService.propose).mockRejectedValue(conflict('POLICY_NO_ACCOUNTANT'));
    vi.mocked(accountingService.updateSettings).mockResolvedValue({} as never);
    render(<FixedAssetAccountsSection unitId="u1" accounts={accounts} />);
    const btn = await screen.findByRole('button', { name: 'Enviar ao contador para aprovação' });
    await waitFor(() => expect(btn).toBeEnabled());
    fireEvent.click(btn);
    fireEvent.click(await screen.findByRole('button', { name: 'Salvar direto' }));
    await waitFor(() => expect(accountingService.updateSettings).toHaveBeenCalledTimes(1));
  });

  it('12f: a faixa da pendente avisa que a proposta é parcial', async () => {
    withActive(true);
    vi.mocked(policyVersionsService.list).mockResolvedValue([version({ target: 'SCOPE_SETTINGS', version: 2 })]);
    render(<FixedAssetAccountsSection unitId="u1" accounts={accounts} />);
    const banner = await screen.findByTestId('policy-pending-banner');
    expect(banner).toHaveTextContent('Proposta v2');
    expect(banner).toHaveTextContent('só as contas enviadas mudam');
  });
});
