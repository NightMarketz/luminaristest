import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { PolicyVersionsPanel } from '../PolicyVersionsPanel';
import { ClientModeStrip } from '../ClientModeBars';
import type { GovernanceScope } from '../GovernanceScope';
import {
  policyVersionsService,
  type PolicyVersionDetailView,
  type PolicyVersionView,
} from '../../../../lib/services/policyVersions.service';
import { accountantAssignmentsService } from '../../../../lib/services/accountantAssignments.service';
import { accountingContactsService } from '../../../../lib/services/accountingContacts.service';
import { accountingService } from '../../../../lib/services/accounting.service';
import { fiscalProfileService } from '../../../../lib/services/fiscalProfile.service';

/**
 * FE-INCR-ACCOUNTING-POLICY-VERSION 12c (a mordida do risco principal), 12d (decisão), 12e (diff na tela) e 12g
 * (aviso no strip). No modo cliente o painel e o detalhe NÃO chamam getAccounts/listByScope/getUnitProfile/getSettings
 * (resolveriam o escopo DO CONTADOR) e toda chamada leva `ownerUserId`. No modo próprio não há botão de decisão.
 */
vi.mock('next-i18next', () => {
  const t = (key: string, fallback?: unknown, vars?: Record<string, string>) =>
    typeof fallback === 'string' ? fallback.replace(/\{\{(\w+)\}\}/g, (_m, n: string) => vars?.[n] ?? '') : key;
  return { useTranslation: () => ({ t }) };
});
vi.mock('../../../../lib/services/policyVersions.service', () => ({
  policyVersionsService: { list: vi.fn(), get: vi.fn(), approve: vi.fn(), reject: vi.fn(), propose: vi.fn() },
}));
vi.mock('../../../../lib/services/accountantAssignments.service', () => ({
  accountantAssignmentsService: { listByScope: vi.fn(), end: vi.fn() },
}));
vi.mock('../../../../lib/services/accountingContacts.service', () => ({
  accountingContactsService: { listContacts: vi.fn() },
}));
vi.mock('../../../../lib/services/accounting.service', () => ({
  accountingService: { getAccounts: vi.fn(), getSettings: vi.fn() },
}));
vi.mock('../../../../lib/services/fiscalProfile.service', () => ({
  fiscalProfileService: { getUnitProfile: vi.fn() },
}));

const gov: GovernanceScope = {
  assignmentId: 'as-me', ownerUserId: 'owner-9', ownerEmail: 'dono@x.com', unitId: 'u1', crcNumber: 'SP-1/O-1', crcUf: 'SP',
};

const v = (over: Partial<PolicyVersionView> = {}): PolicyVersionView => ({
  id: 'pv-1', unitId: 'u1', target: 'FISCAL_PROFILE', version: 3, status: 'PROPOSED', payload: { dpsSerie: 8 },
  appliedSnapshot: null, proposedById: 'owner-9', decidedById: null, assignmentId: 'as-me', decisionReason: null,
  decidedAt: null, createdAt: '2026-10-08T12:00:00.000Z', ...over,
});
const detail = (over: Partial<PolicyVersionDetailView> = {}): PolicyVersionDetailView => ({
  ...v(),
  payload: { dpsSerie: 8, icmsRecuperavelAccountId: 'acc-gone-123', emissaoForaDoMes: 'AVISAR' },
  current: { dpsSerie: 7, icmsRecuperavelAccountId: null, emissaoForaDoMes: 'AVISAR' },
  accountLabels: {},
  ...over,
});

const forbiddenSpies = () => [
  accountingService.getAccounts,
  accountingService.getSettings,
  accountantAssignmentsService.listByScope,
  fiscalProfileService.getUnitProfile,
];

beforeEach(() => {
  vi.clearAllMocks();
  cleanup();
  vi.mocked(policyVersionsService.list).mockResolvedValue([v()]);
  vi.mocked(policyVersionsService.get).mockResolvedValue(detail());
  vi.mocked(accountantAssignmentsService.listByScope).mockResolvedValue([]);
  vi.mocked(accountingContactsService.listContacts).mockResolvedValue([]);
});
afterEach(async () => { await new Promise((r) => setTimeout(r, 0)); cleanup(); });

async function openDetail() {
  fireEvent.click(await screen.findByRole('button', { name: 'Ver' }));
  return screen.findByTestId('policy-diff');
}

describe('PolicyVersionsPanel — modo cliente (12c)', () => {
  it('zero chamadas a getAccounts/listByScope/getUnitProfile/getSettings; list/get/approve levam ownerUserId', async () => {
    vi.mocked(policyVersionsService.approve).mockResolvedValue(v({ status: 'APPLIED' }));
    render(<PolicyVersionsPanel unitId="u1" governance={gov} />);
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar' }));
    expect(await screen.findByText('Aprovar aplica estes valores agora no livro de dono@x.com.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar e aplicar' }));
    await waitFor(() => expect(policyVersionsService.approve).toHaveBeenCalledTimes(1));

    for (const spy of forbiddenSpies()) expect(spy).not.toHaveBeenCalled();
    expect(policyVersionsService.list).toHaveBeenCalledWith(expect.objectContaining({ unitId: 'u1', ownerUserId: 'owner-9' }));
    for (const call of vi.mocked(policyVersionsService.list).mock.calls) expect(call[0].ownerUserId).toBe('owner-9');
    for (const call of vi.mocked(policyVersionsService.get).mock.calls) expect(call[1]).toEqual({ unitId: 'u1', ownerUserId: 'owner-9' });
    expect(policyVersionsService.approve).toHaveBeenCalledWith('pv-1', { unitId: 'u1', ownerUserId: 'owner-9' });
  });

  it('"quem decidiu" no modo cliente: a própria atribuição vira "você", outra vira "outro contador"; PUT direto vira "aplicada direto"', async () => {
    vi.mocked(policyVersionsService.list).mockResolvedValue([
      v({ id: 'a', status: 'APPLIED', assignmentId: 'as-me', decidedAt: '2026-10-08T13:00:00Z' }),
      v({ id: 'b', status: 'REJECTED', assignmentId: 'as-other', decisionReason: 'conta errada', decidedAt: '2026-10-08T13:00:00Z' }),
      v({ id: 'c', status: 'APPLIED', proposedById: null, assignmentId: null }),
    ]);
    render(<PolicyVersionsPanel unitId="u1" governance={gov} />);
    expect(within(await screen.findByTestId('policy-row-a')).getByText('você')).toBeInTheDocument();
    expect(within(screen.getByTestId('policy-row-b')).getByText('outro contador')).toBeInTheDocument();
    expect(within(screen.getByTestId('policy-row-b')).getByText('conta errada')).toBeInTheDocument();
    expect(within(screen.getByTestId('policy-row-c')).getByText('aplicada direto (sem contador)')).toBeInTheDocument();
    expect(accountantAssignmentsService.listByScope).not.toHaveBeenCalled();
  });

  it('pendentes no topo', async () => {
    vi.mocked(policyVersionsService.list).mockResolvedValue([v({ id: 'old', status: 'APPLIED' }), v({ id: 'new', status: 'PROPOSED' })]);
    render(<PolicyVersionsPanel unitId="u1" governance={gov} />);
    await screen.findByTestId('policy-row-new');
    const ids = screen.getAllByTestId(/^policy-row-/).map((el) => el.getAttribute('data-testid'));
    expect(ids).toEqual(['policy-row-new', 'policy-row-old']);
  });
});

describe('PolicyVersionsPanel — modo próprio', () => {
  it('sem botão de decisão; get sem ownerUserId; quem decidiu cruza listByScope + contato', async () => {
    vi.mocked(accountantAssignmentsService.listByScope).mockResolvedValue([
      { id: 'as-me', accountingContactId: 'c1', crcNumber: 'SP-1/O-1' },
    ] as never);
    vi.mocked(accountingContactsService.listContacts).mockResolvedValue([{ id: 'c1', name: 'Maria' }] as never);
    vi.mocked(policyVersionsService.list).mockResolvedValue([v({ status: 'APPLIED', decidedAt: '2026-10-08T13:00:00Z' })]);
    render(<PolicyVersionsPanel unitId="u1" />);
    expect(await screen.findByText('Maria (SP-1/O-1)')).toBeInTheDocument();
    await openDetail();
    expect(screen.queryByRole('button', { name: 'Aprovar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rejeitar' })).not.toBeInTheDocument();
    expect(policyVersionsService.get).toHaveBeenCalledWith('pv-1', { unitId: 'u1' });
    expect(vi.mocked(policyVersionsService.list).mock.calls[0][0].ownerUserId).toBeUndefined();
  });
});

describe('Detalhe — decisão (12d)', () => {
  it('"Rejeitar" sem motivo não envia; com motivo, envia reason + ownerUserId', async () => {
    vi.mocked(policyVersionsService.reject).mockResolvedValue(v({ status: 'REJECTED' }));
    render(<PolicyVersionsPanel unitId="u1" governance={gov} />);
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: 'Rejeitar' }));
    const send = await screen.findByRole('button', { name: 'Rejeitar com este motivo' });
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Motivo (obrigatório)'), { target: { value: '   ' } });
    expect(send).toBeDisabled();
    fireEvent.click(send);
    expect(policyVersionsService.reject).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Motivo (obrigatório)'), { target: { value: 'conta errada' } });
    expect(screen.getByText('12/500')).toBeInTheDocument();
    fireEvent.click(send);
    await waitFor(() => expect(policyVersionsService.reject).toHaveBeenCalledWith('pv-1', { unitId: 'u1', ownerUserId: 'owner-9', reason: 'conta errada' }));
  });

  it('409 POLICY_VERSION_STATUS_CHANGED: texto de "proposta mudou" e recarrega lista e detalhe', async () => {
    vi.mocked(policyVersionsService.approve).mockRejectedValue({ status: 409, error: 'x', code: 'POLICY_VERSION_STATUS_CHANGED' });
    render(<PolicyVersionsPanel unitId="u1" governance={gov} />);
    await openDetail();
    const listCalls = vi.mocked(policyVersionsService.list).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Aprovar e aplicar' }));
    expect(await screen.findByText(/Esta proposta mudou/)).toBeInTheDocument();
    await waitFor(() => expect(policyVersionsService.get).toHaveBeenCalledTimes(2));
    expect(vi.mocked(policyVersionsService.list).mock.calls.length).toBeGreaterThan(listCalls);
  });

  it('400 da aprovação: mensagem do servidor + "segue pendente"; a linha continua pendente', async () => {
    vi.mocked(policyVersionsService.approve).mockRejectedValue({ status: 400, error: 'regime_divergente_da_empresa' });
    render(<PolicyVersionsPanel unitId="u1" governance={gov} />);
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Aprovar e aplicar' }));
    const alert = await screen.findByText(/regime_divergente_da_empresa/);
    expect(alert).toHaveTextContent('A proposta segue pendente; rejeite com o motivo se ela não puder valer.');
    expect(within(screen.getByTestId('policy-row-pv-1')).getByText('Aguardando o contador')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aprovar' })).toBeInTheDocument();
  });

  it('ACCOUNTANT_NOT_ASSIGNED: chama onAssignmentLost', async () => {
    const lost = vi.fn();
    vi.mocked(policyVersionsService.approve).mockRejectedValue({ status: 403, error: 'x', code: 'ACCOUNTANT_NOT_ASSIGNED' });
    render(<PolicyVersionsPanel unitId="u1" governance={gov} onAssignmentLost={lost} />);
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Aprovar e aplicar' }));
    await waitFor(() => expect(lost).toHaveBeenCalled());
  });
});

describe('Detalhe — diff na tela (12e)', () => {
  it('só chaves do payload; iguais recolhidas; conta sem rótulo vira "conta não encontrada"; rodapé "fora desta lista"', async () => {
    render(<PolicyVersionsPanel unitId="u1" governance={gov} />);
    await openDetail();
    expect(screen.getByTestId('diff-row-dpsSerie')).toHaveTextContent('78');
    expect(screen.getByTestId('diff-row-icmsRecuperavelAccountId')).toHaveTextContent('conta não encontrada (acc-gone…)');
    expect(screen.queryByTestId('diff-row-emissaoForaDoMes')).not.toBeInTheDocument();
    expect(screen.getByText('Campos fora desta lista não mudam.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar campos sem mudança (1)' }));
    expect(screen.getByTestId('diff-row-emissaoForaDoMes')).toHaveAttribute('data-changed', 'false');
  });

  it('versão APPLIED compara com o appliedSnapshot, não com o current', async () => {
    vi.mocked(policyVersionsService.list).mockResolvedValue([v({ status: 'APPLIED' })]);
    vi.mocked(policyVersionsService.get).mockResolvedValue(detail({
      status: 'APPLIED', payload: { dpsSerie: 8 }, current: { dpsSerie: 8 }, appliedSnapshot: { dpsSerie: 5 },
    }));
    render(<PolicyVersionsPanel unitId="u1" governance={gov} />);
    await openDetail();
    expect(screen.getByTestId('diff-row-dpsSerie')).toHaveAttribute('data-changed', 'true');
    expect(screen.getByTestId('diff-row-dpsSerie')).toHaveTextContent('58');
    expect(screen.getByText('Comparado com o que esta versão aplicou.')).toBeInTheDocument();
  });
});

describe('ClientModeStrip — aviso de proposta pendente (12g)', () => {
  it('com n pendentes, mostra n e leva à aba; a leitura usa ownerUserId', async () => {
    const open = vi.fn();
    vi.mocked(policyVersionsService.list).mockResolvedValue([v({ id: 'a' }), v({ id: 'b' })]);
    render(<ClientModeStrip governance={gov} onEnded={() => {}} onOpenPolicy={open} />);
    const link = await screen.findByTestId('policy-pending-strip');
    expect(link).toHaveTextContent('2 proposta(s) de política aguardando sua decisão');
    expect(policyVersionsService.list).toHaveBeenCalledWith({ unitId: 'u1', ownerUserId: 'owner-9', status: 'PROPOSED' });
    fireEvent.click(link);
    expect(open).toHaveBeenCalled();
  });

  it('falha da leitura: sem aviso e sem erro', async () => {
    vi.mocked(policyVersionsService.list).mockRejectedValue({ status: 500, error: 'boom' });
    render(<ClientModeStrip governance={gov} onEnded={() => {}} />);
    await waitFor(() => expect(policyVersionsService.list).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByTestId('policy-pending-strip')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(/boom/)).not.toBeInTheDocument();
  });
});
