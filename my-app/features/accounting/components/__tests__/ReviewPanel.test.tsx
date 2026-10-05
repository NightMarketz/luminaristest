import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { ReviewPanel } from '../ReviewPanel';
import { REGISTER_LABEL, TARGET_TAB } from '../ReviewDetailModal';
import {
  REVIEW_REGISTERS,
  RESOLUTION_TARGETS,
  accountingReviewService,
  type AccountingReview,
  type AccountingReviewFinding,
  type ReviewDetail,
} from '../../../../lib/services/accountingReview.service';
import { dataExchangeService } from '../../../../lib/services/dataExchange.service';

/**
 * FE-INCR-REVIEW (BRIEF §1 itens 3–14): lista + abrir revisão com jobs EXPORTED (body só com o job escolhido;
 * 409 recarrega), detalhe com os 3 estados de achado, NO_ACTION exige nota, acerto com `reverseOriginal` só em
 * I200, sign-off desabilitado com BLOCKER aberto, 409 REVIEW_STALE oferece "Trocar jobs", 403 na lista esconde tudo.
 */
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
vi.mock('../../../../lib/services/dataExchange.service', () => ({ dataExchangeService: { listJobs: vi.fn() } }));
vi.mock('../../../../lib/services/accounting.service', () => ({
  accountingService: { getAccounts: vi.fn(async () => ({ accounts: [{ id: 'a1', code: '1.1', name: 'Caixa', acceptsEntries: true, nature: 'Asset' }] })) },
}));

// Os painéis leem a atribuição do escopo (modo dono) — sem rede nos testes antigos.
vi.mock('../../../../lib/services/accountantAssignments.service', () => ({
  accountantAssignmentsService: { listByScope: vi.fn(async () => []), listMine: vi.fn(async () => []) },
}));

const review = (o: Partial<AccountingReview> = {}): AccountingReview => ({
  id: 'r1', unitId: 'u1', year: 2025, ecdJobId: 'jobecd000001', ecfJobId: null, status: 'OPEN', reviewerUserId: 'o',
  reviewerName: null, reviewerCrc: null, statement: null, closeReason: null, openedAt: '2025-06-01T12:00:00.000Z', updatedAt: '', closedAt: null, ...o,
});
const finding = (o: Partial<AccountingReviewFinding>): AccountingReviewFinding => ({
  id: 'f1', reviewId: 'r1', register: 'I050', locator: '1.1', description: 'd', severity: 'BLOCKER', resolution: null,
  resolutionTargetType: null, resolutionTargetId: null, resolutionNote: null, resolvedById: null, resolvedAt: null, createdById: 'o', createdAt: '', ...o,
});
const detail = (findings: AccountingReviewFinding[], r = review()): ReviewDetail => ({
  review: { ...r, findings },
  findings: findings.map((f) => ({ finding: f, targetAuditEvents: [] })),
});
const job = { id: 'jobecd000002', direction: 'EXPORT', kind: 'EXPORT_SPED_ECD', status: 'EXPORTED', fileName: 'x', mimeType: null, sizeBytes: 1, sha256: null, totalRows: 0, validRows: 0, invalidRows: 0, committedRows: 0, createdAt: '2025-06-01T10:00:00.000Z', supersedesJobId: null, supersededByJobId: null };

async function openDetail(findings: AccountingReviewFinding[]) {
  vi.mocked(accountingReviewService.get).mockResolvedValue(detail(findings));
  render(<ReviewPanel unitId="u1" onNavigateTab={vi.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Abrir' }));
  return within(await screen.findByTestId('review-detail'));
}

describe('ReviewPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    vi.mocked(accountingReviewService.list).mockResolvedValue([review()]);
    vi.mocked(dataExchangeService.listJobs).mockImplementation(async (_u, f) => ({ items: f?.kind === 'EXPORT_SPED_ECD' ? [job] : [], total: 1, page: 1, limit: 100 }));
  });

  it('mapa de registros cobre REVIEW_REGISTERS e cada alvo tem aba dona', () => {
    expect(Object.keys(REGISTER_LABEL).sort()).toEqual([...REVIEW_REGISTERS].sort());
    expect(Object.keys(TARGET_TAB).sort()).toEqual([...RESOLUTION_TARGETS].sort());
  });

  it('abrir revisão manda só o job escolhido; 409 mostra a mensagem e recarrega a lista', async () => {
    vi.mocked(accountingReviewService.open).mockRejectedValue({ success: false, error: "Já existe revisão aberta 'r1' para este par.", code: 'REVIEW_ALREADY_OPEN', status: 409 });
    render(<ReviewPanel unitId="u1" onNavigateTab={vi.fn()} />);
    await waitFor(() => expect(accountingReviewService.list).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: /Abrir revisão/ }));
    const select = await screen.findByLabelText('Arquivo da ECD (EXPORTED)');
    await waitFor(() => expect((select as HTMLSelectElement).options.length).toBe(2));
    fireEvent.change(select, { target: { value: 'jobecd000002' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Abrir' }).at(-1) as HTMLElement); // o do modal (o outro é a linha da lista)
    await waitFor(() => expect(accountingReviewService.open).toHaveBeenCalledWith({ unitId: 'u1', year: expect.any(Number), ecdJobId: 'jobecd000002' }));
    expect(await screen.findByText(/Já existe revisão aberta/)).toBeTruthy();
    await waitFor(() => expect(accountingReviewService.list).toHaveBeenCalledTimes(2));
  });

  it('403 na lista: aviso e nada mais (sem "Abrir revisão")', async () => {
    vi.mocked(accountingReviewService.list).mockRejectedValue({ success: false, error: 'Sem permissão.', status: 403 });
    render(<ReviewPanel unitId="u1" onNavigateTab={vi.fn()} />);
    expect(await screen.findByText('Sem permissão.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Abrir revisão/ })).toBeNull();
  });

  it('detalhe: 3 estados de achado; assinar desabilitado com BLOCKER aberto', async () => {
    const d = await openDetail([
      finding({ id: 'f1' }),
      finding({ id: 'f2', severity: 'NOTE', resolution: 'DATA_EDIT', resolutionTargetType: 'account', resolutionTargetId: 'a1', resolvedAt: '2025-06-02T00:00:00.000Z' }),
      finding({ id: 'f3', severity: 'NOTE', resolution: 'NO_ACTION', resolutionNote: 'irrelevante', resolvedAt: '2025-06-02T00:00:00.000Z' }),
    ]);
    expect(within(d.getByTestId('finding-f1')).getByText('aberto')).toBeTruthy();
    expect(within(d.getByTestId('finding-f2')).getByText(/no painel dono/)).toBeTruthy();
    expect(within(d.getByTestId('finding-f3')).getByText('irrelevante')).toBeTruthy();
    expect(d.getByTestId('review-blockers').dataset.count).toBe('1');
    expect((d.getByRole('button', { name: 'Assinar' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('sem ação: nota obrigatória; o body não leva targetType', async () => {
    vi.mocked(accountingReviewService.resolveFinding).mockResolvedValue(finding({}));
    const d = await openDetail([finding({})]);
    fireEvent.click(d.getByRole('button', { name: 'Sem ação' }));
    const confirm = screen.getByRole('button', { name: 'Confirmar' }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Justificativa \(obrigatória\)/), { target: { value: 'não se aplica' } });
    fireEvent.click(confirm);
    await waitFor(() => expect(accountingReviewService.resolveFinding).toHaveBeenCalledWith('r1', 'f1', { unitId: 'u1', resolution: 'NO_ACTION', resolutionNote: 'não se aplica' }));
  });

  it('acerto: a opção de estornar o original só aparece para I200', async () => {
    const d = await openDetail([finding({ id: 'f1', register: 'I050' }), finding({ id: 'f2', register: 'I200' })]);
    fireEvent.click(within(d.getByTestId('finding-f1')).getByRole('button', { name: 'Lançar acerto' }));
    expect(screen.queryByLabelText(/Estornar também o lançamento original/)).toBeNull();
    cleanup();
    const d2 = await openDetail([finding({ id: 'f2', register: 'I200' })]);
    fireEvent.click(within(d2.getByTestId('finding-f2')).getByRole('button', { name: 'Lançar acerto' }));
    expect(screen.getByLabelText(/Estornar também o lançamento original/)).toBeTruthy();
  });

  it('409 REVIEW_STALE no sign-off: mensagem íntegra + "Trocar jobs"', async () => {
    vi.mocked(accountingReviewService.signOff).mockRejectedValue({ success: false, error: 'Revisão desatualizada — regere e troque os jobs (PATCH /jobs).', code: 'REVIEW_STALE', status: 409 });
    const d = await openDetail([finding({ severity: 'NOTE', resolution: 'NO_ACTION', resolutionNote: 'n', resolvedAt: '2025-06-02T00:00:00.000Z' })]);
    fireEvent.click(d.getByRole('button', { name: 'Assinar' }));
    fireEvent.change(screen.getByLabelText('Nome do revisor'), { target: { value: 'Ana Contadora' } });
    fireEvent.change(screen.getByLabelText(/^CRC/), { target: { value: 'SP-123456/O-1' } });
    fireEvent.change(screen.getByLabelText('Declaração'), { target: { value: 'Revisei.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByText(/Revisão desatualizada/)).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'Trocar jobs' }).at(-1) as HTMLElement); // o do erro do sign-off
    expect(await screen.findByText(/review.jobs_replaced/)).toBeTruthy();
  });

  it('adicionar achado: body exato do AddFindingSchema', async () => {
    vi.mocked(accountingReviewService.addFinding).mockResolvedValue(finding({}));
    const d = await openDetail([]);
    fireEvent.click(d.getByRole('button', { name: 'Adicionar achado' }));
    fireEvent.change(screen.getByLabelText('Registro'), { target: { value: 'I200' } });
    fireEvent.change(screen.getByLabelText('Localizador'), { target: { value: ' 42 ' } });
    fireEvent.change(screen.getByLabelText(/^Descrição/), { target: { value: 'histórico genérico' } });
    fireEvent.change(screen.getByLabelText('Severidade'), { target: { value: 'BLOCKER' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(accountingReviewService.addFinding).toHaveBeenCalledWith('r1', { unitId: 'u1', register: 'I200', locator: '42', description: 'histórico genérico', severity: 'BLOCKER' }));
  });

  it('trocar jobs: body só com o job trocado', async () => {
    vi.mocked(accountingReviewService.replaceJobs).mockResolvedValue(review());
    const d = await openDetail([]);
    fireEvent.click(d.getByRole('button', { name: 'Trocar jobs' }));
    const select = screen.getByLabelText('Arquivo da ECD (EXPORTED)') as HTMLSelectElement;
    await waitFor(() => expect(select.options.length).toBe(2));
    fireEvent.change(select, { target: { value: 'jobecd000002' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(accountingReviewService.replaceJobs).toHaveBeenCalledWith('r1', { unitId: 'u1', ecdJobId: 'jobecd000002' }));
  });
});
