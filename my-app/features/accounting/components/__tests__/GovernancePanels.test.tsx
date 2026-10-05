import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { PeriodsPanel } from '../PeriodsPanel';
import { ReviewPanel } from '../ReviewPanel';
import { accountingService, type AccountingPeriod } from '../../../../lib/services/accounting.service';
import {
  accountingReviewService,
  type AccountingReview,
  type ReviewDetail,
} from '../../../../lib/services/accountingReview.service';
import { dataExchangeService } from '../../../../lib/services/dataExchange.service';
import { accountantAssignmentsService } from '../../../../lib/services/accountantAssignments.service';
import { accountingContactsService } from '../../../../lib/services/accountingContacts.service';
import type { GovernanceScope } from '../../governance/GovernanceScope';

/**
 * FE-INCR-ACCOUNTANT-GOVERNANCE itens 9–12 (13c nos painéis, 13e, 13f, 13g): o modo delegado repassa o
 * `ownerUserId` só nos 9 handlers e ESCONDE o resto; o dono vê o erro nomeado traduzido e o banner. Remover a
 * condição de `governance` de qualquer um destes pontos derruba um teste daqui.
 * i18n sem instância devolve o fallback SEM interpolar — o texto com `{{x}}` aparece cru nas asserções.
 */
vi.mock('../../../../lib/services/accounting.service', () => ({
  accountingService: {
    listPeriods: vi.fn(), seedYear: vi.fn(), openPeriod: vi.fn(), softClosePeriod: vi.fn(), hardClosePeriod: vi.fn(),
    reopenPeriod: vi.fn(), closeExercise: vi.fn(), getAccounts: vi.fn(),
  },
}));
vi.mock('../../../../lib/services/accountingReview.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../lib/services/accountingReview.service')>();
  return {
    ...actual,
    accountingReviewService: {
      list: vi.fn(), get: vi.fn(), open: vi.fn(), addFinding: vi.fn(), resolveFinding: vi.fn(),
      postAdjustment: vi.fn(), replaceJobs: vi.fn(), signOff: vi.fn(), reject: vi.fn(),
    },
  };
});
vi.mock('../../../../lib/services/dataExchange.service', () => ({
  dataExchangeService: { listJobs: vi.fn(), downloadArtifact: vi.fn() },
}));
vi.mock('../../../../lib/services/accountantAssignments.service', () => ({
  accountantAssignmentsService: { listByScope: vi.fn() },
}));
vi.mock('../../../../lib/services/accountingContacts.service', () => ({
  accountingContactsService: { listContacts: vi.fn() },
}));

const GOV: GovernanceScope = {
  assignmentId: 'a1', ownerUserId: 'owner-9', ownerEmail: 'dono@x.com', unitId: 'u1', crcNumber: 'SP-123456/O-3', crcUf: 'SP',
};
const ACTIVE_ROW = {
  id: 'a1', unitId: 'u1', status: 'ACTIVE' as const, accountingContactId: 'c1', accountantUserId: 'x',
  crcNumber: 'SP-1/O-1', crcUf: 'SP', activeFrom: null, activeUntil: null, endReason: null, createdAt: '',
};

const period = (month: number, status: AccountingPeriod['status']): AccountingPeriod => ({
  id: `p${month}`, userId: 'o1', unitId: 'u1', year: 2026, month, status,
  openedAt: null, closedAt: null, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
});

const review = (o: Partial<AccountingReview> = {}): AccountingReview => ({
  id: 'r1', unitId: 'u1', year: 2025, ecdJobId: 'jobecd000001', ecfJobId: 'jobecf000001', status: 'OPEN', reviewerUserId: 'o',
  reviewerName: null, reviewerCrc: null, statement: null, closeReason: null, openedAt: '2025-06-01T12:00:00.000Z', updatedAt: '', closedAt: null, ...o,
});
const finding = (resolved: boolean) => ({
  id: 'f1', reviewId: 'r1', register: 'I050' as const, locator: '1.1', description: 'd', severity: 'NOTE' as const,
  resolution: resolved ? ('DATA_EDIT' as const) : null, resolutionTargetType: resolved ? 'account' : null, resolutionTargetId: resolved ? 'acc1' : null,
  resolutionNote: null, resolvedById: null, resolvedAt: resolved ? '2025-06-02T12:00:00Z' : null, createdById: 'o', createdAt: '',
});
const detail = (r = review(), findings = [finding(false)]): ReviewDetail => ({
  review: { ...r, findings },
  findings: findings.map((f) => ({ finding: f, targetAuditEvents: [] })),
});

describe('PeriodsPanel — modo cliente (governance)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    vi.mocked(accountantAssignmentsService.listByScope).mockResolvedValue([]);
  });

  it('repassa o ownerUserId em listPeriods, openPeriod e reopenPeriod', async () => {
    vi.mocked(accountingService.listPeriods).mockResolvedValue([period(1, 'FUTURE'), period(2, 'SOFT_CLOSED')]);
    vi.mocked(accountingService.openPeriod).mockResolvedValue(period(1, 'OPEN'));
    vi.mocked(accountingService.reopenPeriod).mockResolvedValue(period(2, 'OPEN'));
    render(<PeriodsPanel unitId="u1" governance={GOV} />);

    await waitFor(() => expect(accountingService.listPeriods).toHaveBeenCalledWith('u1', new Date().getFullYear(), 'owner-9'));
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir' }));
    await waitFor(() => expect(accountingService.openPeriod).toHaveBeenCalledWith('p1', 'u1', 'owner-9'));

    fireEvent.click(await screen.findByRole('button', { name: 'Reabrir' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(accountingService.reopenPeriod).toHaveBeenCalledWith('p2', 'u1', undefined, 'owner-9'));
  });

  it('13c: ESCONDE semear, fechar parcial/definitivo e encerrar exercício (fora dos 9 handlers)', async () => {
    vi.mocked(accountingService.listPeriods).mockResolvedValue([period(1, 'OPEN'), period(2, 'SOFT_CLOSED')]);
    render(<PeriodsPanel unitId="u1" governance={GOV} />);
    await screen.findByText('Aberto');
    expect(screen.queryByRole('button', { name: /Fechar parcial/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Fechar definitivo/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Encerrar exercício/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reabrir' })).toBeInTheDocument();
  });

  it('13c: sem períodos, não oferece semear (texto próprio do modo cliente) nem lê o escopo do dono', async () => {
    vi.mocked(accountingService.listPeriods).mockResolvedValue([]);
    render(<PeriodsPanel unitId="u1" governance={GOV} />);
    expect(await screen.findByText(/Nenhum período criado para/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Semear/ })).not.toBeInTheDocument();
    expect(screen.queryByTestId('active-assignment-banner')).not.toBeInTheDocument();
    expect(accountantAssignmentsService.listByScope).not.toHaveBeenCalled();
  });

  it('ACCOUNTANT_NOT_ASSIGNED: mensagem da atribuição + avisa o pai (volta a "Meus livros")', async () => {
    vi.mocked(accountingService.listPeriods).mockRejectedValue({ error: 'raw', code: 'ACCOUNTANT_NOT_ASSIGNED', status: 403 });
    const onLost = vi.fn();
    render(<PeriodsPanel unitId="u1" governance={GOV} onAssignmentLost={onLost} />);
    expect(await screen.findByText('Sua atribuição com este cliente não está mais ativa.')).toBeInTheDocument();
    expect(onLost).toHaveBeenCalled();
  });
});

describe('PeriodsPanel — modo próprio (dono)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    vi.mocked(accountantAssignmentsService.listByScope).mockResolvedValue([]);
  });

  it('com ACTIVE no escopo: banner informativo e os botões CONTINUAM visíveis (F-FE-GOV-4 a)', async () => {
    vi.mocked(accountantAssignmentsService.listByScope).mockResolvedValue([ACTIVE_ROW]);
    vi.mocked(accountingContactsService.listContacts).mockResolvedValue([]);
    vi.mocked(accountingService.listPeriods).mockResolvedValue([period(1, 'OPEN'), period(2, 'SOFT_CLOSED')]);
    render(<PeriodsPanel unitId="u1" />);
    expect(await screen.findByTestId('active-assignment-banner')).toHaveTextContent(/Contador responsável ativo/);
    expect(screen.getByRole('button', { name: 'Reabrir' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fechar parcial/ })).toBeInTheDocument();
    expect(accountingService.listPeriods).toHaveBeenCalledWith('u1', new Date().getFullYear(), undefined);
  });

  it('13f: ACCOUNTANT_REQUIRED no reabrir mostra o texto do item 12, não o fallback', async () => {
    vi.mocked(accountingService.listPeriods).mockResolvedValue([period(2, 'SOFT_CLOSED')]);
    vi.mocked(accountingService.reopenPeriod).mockRejectedValue({ error: 'raw', code: 'ACCOUNTANT_REQUIRED', status: 403 });
    render(<PeriodsPanel unitId="u1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Reabrir' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByText(/Este escopo tem contador responsável ativo/)).toBeInTheDocument();
    expect(screen.queryByText('Erro na transição de período.')).not.toBeInTheDocument();
    expect(accountingService.reopenPeriod).toHaveBeenCalledWith('p2', 'u1', undefined, undefined);
  });

  it('PERIOD_STATUS_CHANGED: mensagem + recarrega a lista', async () => {
    vi.mocked(accountingService.listPeriods).mockResolvedValue([period(2, 'SOFT_CLOSED')]);
    vi.mocked(accountingService.reopenPeriod).mockRejectedValue({ error: 'raw', code: 'PERIOD_STATUS_CHANGED', status: 409 });
    render(<PeriodsPanel unitId="u1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Reabrir' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByText('O período mudou de estado enquanto você agia; recarregado.')).toBeInTheDocument();
    await waitFor(() => expect(accountingService.listPeriods).toHaveBeenCalledTimes(2));
  });

  it('um erro sem code mostra a mensagem crua do servidor (o apiClient lança objeto puro, não Error)', async () => {
    vi.mocked(accountingService.listPeriods).mockResolvedValue([period(2, 'SOFT_CLOSED')]);
    vi.mocked(accountingService.reopenPeriod).mockRejectedValue({ error: 'Período já reaberto', status: 422 });
    render(<PeriodsPanel unitId="u1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Reabrir' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByText('Período já reaberto')).toBeInTheDocument();
  });
});

async function openDetail(governance?: GovernanceScope, r = review(), findings = [finding(false)]) {
  vi.mocked(accountingReviewService.get).mockResolvedValue(detail(r, findings));
  render(<ReviewPanel unitId="u1" onNavigateTab={vi.fn()} governance={governance} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Abrir' }));
  return within(await screen.findByTestId('review-detail'));
}

async function fillSignOff() {
  fireEvent.change(await screen.findByLabelText('Nome do revisor'), { target: { value: 'Ana Contadora' } });
  fireEvent.change(screen.getByLabelText('Declaração'), { target: { value: 'revisei' } });
}

describe('ReviewPanel / ReviewDetailModal — modo cliente (governance)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    vi.mocked(accountantAssignmentsService.listByScope).mockResolvedValue([]);
    vi.mocked(accountingReviewService.list).mockResolvedValue([review()]);
  });

  it('repassa o ownerUserId em list e get', async () => {
    await openDetail(GOV);
    expect(accountingReviewService.list).toHaveBeenCalledWith('u1', { year: expect.any(Number), status: undefined }, 'owner-9');
    expect(accountingReviewService.get).toHaveBeenCalledWith('r1', 'u1', 'owner-9');
  });

  it('13c: esconde abrir revisão, achado, resolver, acerto e trocar jobs; não chama getAccounts nem listJobs', async () => {
    const view = await openDetail(GOV);
    expect(screen.queryByRole('button', { name: /Abrir revisão/ })).not.toBeInTheDocument();
    expect(view.queryByRole('button', { name: 'Adicionar achado' })).not.toBeInTheDocument();
    expect(view.queryByRole('button', { name: 'Trocar jobs' })).not.toBeInTheDocument();
    expect(view.queryByRole('button', { name: 'Apontar dado editado' })).not.toBeInTheDocument();
    expect(view.queryByRole('button', { name: 'Lançar acerto' })).not.toBeInTheDocument();
    expect(view.queryByRole('button', { name: 'Sem ação' })).not.toBeInTheDocument();
    expect(view.getByRole('button', { name: 'Assinar' })).toBeInTheDocument();
    expect(view.getByRole('button', { name: 'Rejeitar' })).toBeInTheDocument();
    expect(accountingService.getAccounts).not.toHaveBeenCalled();
    expect(dataExchangeService.listJobs).not.toHaveBeenCalled();
  });

  it('o link "abrir no painel dono" some (a aba dona não existe no modo cliente)', async () => {
    const view = await openDetail(GOV, review(), [finding(true)]);
    expect(view.queryByText(/no painel dono/)).not.toBeInTheDocument();
  });

  it('13e: sign-off com CRC pré-preenchido do snapshot e SÓ-LEITURA; o corpo leva o ownerUserId', async () => {
    vi.mocked(accountingReviewService.signOff).mockResolvedValue(review({ status: 'SIGNED_OFF' }));
    const view = await openDetail(GOV);
    fireEvent.click(view.getByRole('button', { name: 'Assinar' }));
    const crc = (await screen.findByDisplayValue('SP-123456/O-3')) as HTMLInputElement;
    expect(crc.readOnly).toBe(true);
    await fillSignOff();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() =>
      expect(accountingReviewService.signOff).toHaveBeenCalledWith('r1', {
        unitId: 'u1', reviewerName: 'Ana Contadora', reviewerCrc: 'SP-123456/O-3', statement: 'revisei', ownerUserId: 'owner-9',
      }),
    );
  });

  it('13e: REVIEWER_CRC_MISMATCH mostra a mensagem do CRC esperado (traduzida, não a crua)', async () => {
    vi.mocked(accountingReviewService.signOff).mockRejectedValue({ error: 'raw', code: 'REVIEWER_CRC_MISMATCH', status: 400 });
    const view = await openDetail(GOV);
    fireEvent.click(view.getByRole('button', { name: 'Assinar' }));
    await fillSignOff();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByText(/O CRC informado não confere com o da atribuição/)).toBeInTheDocument();
  });

  it('o REVIEW_STALE não oferece "Trocar jobs" ao contador (a ação está escondida no modo cliente)', async () => {
    vi.mocked(accountingReviewService.signOff).mockRejectedValue({ error: 'desatualizada', code: 'REVIEW_STALE', status: 409 });
    const view = await openDetail(GOV);
    fireEvent.click(view.getByRole('button', { name: 'Assinar' }));
    await fillSignOff();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByText('desatualizada')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Trocar jobs' })).not.toBeInTheDocument();
  });

  it('rejeitar leva o ownerUserId no corpo', async () => {
    vi.mocked(accountingReviewService.reject).mockResolvedValue(review({ status: 'REJECTED' }));
    const view = await openDetail(GOV);
    fireEvent.click(view.getByRole('button', { name: 'Rejeitar' }));
    fireEvent.change(await screen.findByLabelText('Motivo'), { target: { value: 'inconsistente' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(accountingReviewService.reject).toHaveBeenCalledWith('r1', { unitId: 'u1', reason: 'inconsistente', ownerUserId: 'owner-9' }));
  });

  it('13g: o download do par chama downloadArtifact com o ownerUserId', async () => {
    vi.mocked(dataExchangeService.downloadArtifact).mockResolvedValue(undefined);
    const view = await openDetail(GOV);
    fireEvent.click(view.getByRole('button', { name: 'Baixar ECD' }));
    expect(dataExchangeService.downloadArtifact).toHaveBeenCalledWith('jobecd000001', 'u1', 'sped-ecd-2025.txt', 'owner-9');
    fireEvent.click(view.getByRole('button', { name: 'Baixar ECF' }));
    expect(dataExchangeService.downloadArtifact).toHaveBeenCalledWith('jobecf000001', 'u1', 'sped-ecf-2025.txt', 'owner-9');
  });

  it('ACCOUNTANT_NOT_ASSIGNED na lista avisa o pai', async () => {
    vi.mocked(accountingReviewService.list).mockRejectedValue({ error: 'raw', code: 'ACCOUNTANT_NOT_ASSIGNED', status: 403 });
    const onLost = vi.fn();
    render(<ReviewPanel unitId="u1" onNavigateTab={vi.fn()} governance={GOV} onAssignmentLost={onLost} />);
    await waitFor(() => expect(onLost).toHaveBeenCalled());
  });
});

describe('ReviewDetailModal — modo próprio (dono)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    vi.mocked(accountantAssignmentsService.listByScope).mockResolvedValue([]);
    vi.mocked(accountingReviewService.list).mockResolvedValue([review()]);
    vi.mocked(accountingService.getAccounts).mockResolvedValue({ accounts: [] } as never);
    vi.mocked(dataExchangeService.listJobs).mockResolvedValue({ items: [], total: 0, page: 1, limit: 100 });
  });

  it('mantém tudo (achado, trocar jobs, getAccounts) e o sign-off sem ownerUserId; CRC editável', async () => {
    vi.mocked(accountingReviewService.signOff).mockResolvedValue(review({ status: 'SIGNED_OFF' }));
    const view = await openDetail(undefined);
    expect(view.getByRole('button', { name: 'Adicionar achado' })).toBeInTheDocument();
    expect(view.getByRole('button', { name: 'Trocar jobs' })).toBeInTheDocument();
    expect(accountingService.getAccounts).toHaveBeenCalled();
    expect(accountingReviewService.get).toHaveBeenCalledWith('r1', 'u1', undefined);

    fireEvent.click(view.getByRole('button', { name: 'Assinar' }));
    const crc = (await screen.findByPlaceholderText('SP-123456/O-1')) as HTMLInputElement;
    expect(crc.readOnly).toBe(false);
    fireEvent.change(crc, { target: { value: 'SP-123456/O-3' } });
    await fillSignOff();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(accountingReviewService.signOff).toHaveBeenCalled());
    expect(Object.keys(vi.mocked(accountingReviewService.signOff).mock.calls[0][1])).not.toContain('ownerUserId');
  });

  it('13f: ACCOUNTANT_REQUIRED no assinar mostra o texto do item 12, não o fallback', async () => {
    vi.mocked(accountingReviewService.signOff).mockRejectedValue({ error: 'raw', code: 'ACCOUNTANT_REQUIRED', status: 403 });
    const view = await openDetail(undefined);
    fireEvent.click(view.getByRole('button', { name: 'Assinar' }));
    fireEvent.change(await screen.findByPlaceholderText('SP-123456/O-1'), { target: { value: 'SP-123456/O-3' } });
    await fillSignOff();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByText(/Este escopo tem contador responsável ativo/)).toBeInTheDocument();
    expect(screen.queryByText('Não foi possível concluir a operação.')).not.toBeInTheDocument();
  });

  it('13g: o botão de download só existe com o job; sem ecdJobId não há "Baixar ECD" e o dono baixa sem ownerUserId', async () => {
    vi.mocked(dataExchangeService.downloadArtifact).mockResolvedValue(undefined);
    const view = await openDetail(undefined, review({ ecdJobId: null }));
    expect(view.queryByRole('button', { name: 'Baixar ECD' })).not.toBeInTheDocument();
    fireEvent.click(view.getByRole('button', { name: 'Baixar ECF' }));
    expect(dataExchangeService.downloadArtifact).toHaveBeenCalledWith('jobecf000001', 'u1', 'sped-ecf-2025.txt', undefined);
  });

  it('banner do dono com ACTIVE no escopo, na revisão', async () => {
    vi.mocked(accountantAssignmentsService.listByScope).mockResolvedValue([ACTIVE_ROW]);
    vi.mocked(accountingContactsService.listContacts).mockResolvedValue([]);
    render(<ReviewPanel unitId="u1" onNavigateTab={vi.fn()} />);
    expect(await screen.findByTestId('active-assignment-banner')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Abrir revisão/ })).toBeInTheDocument();
  });
});
