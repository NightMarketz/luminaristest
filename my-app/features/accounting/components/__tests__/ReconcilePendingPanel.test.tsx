import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { ReconcilePendingPanel, REASON_LABELS } from '../ReconcilePendingPanel';
import { RECONCILE_PENDING_REASON_CODES, reconcilePendingService } from '../../../../lib/services/reconcilePending.service';
import { notify } from '../../../../lib/notifications/notify';
import type { ReconcilePendingItemViewDtoInput } from '@/types/contracts/accounting/ReconcilePendingDto.gen';

/**
 * BE-INCR-ONBOARDING-ACTIVATION itens 18 e 20 (I5 PR-3, F-I5-2 b + F-I5-4 a): a aba Pendências lista as pendências da
 * unidade com rótulo por motivo, filtra por motivo e "mostrar resolvidas", pagina por cursor e "Re-varrer" chama o
 * rescan, avisa o resumo e recarrega. Espera o DOM, não a chamada (memória handler-async × waitFor).
 */
vi.mock('../../../../lib/services/reconcilePending.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../lib/services/reconcilePending.service')>();
  return { ...actual, reconcilePendingService: { list: vi.fn(), rescan: vi.fn() } };
});
vi.mock('../../../../lib/notifications/notify', () => ({ notify: vi.fn() }));

const item = (id: string, o: Partial<ReconcilePendingItemViewDtoInput> = {}): ReconcilePendingItemViewDtoInput => ({
  id, sourceType: 'sale.finalized', sourceId: `sale-${id}`, reasonCode: 'NO_MAPPER_FOR_UNIT',
  reasonDetail: "Nenhum mapper registrado para o evento 'sale.finalized' na unidade 'u1'",
  firstSeenAt: '2026-10-01T10:00:00.000Z', lastSeenAt: '2026-10-02T10:00:00.000Z', resolvedAt: null, attempts: 3, ...o,
});

describe('ReconcilePendingPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    vi.mocked(reconcilePendingService.list).mockResolvedValue({ items: [item('p1')], nextCursor: null });
  });

  it('todo código do enum tem rótulo (o mapa fecha sobre o contrato gerado)', () => {
    expect(Object.keys(REASON_LABELS).sort()).toEqual([...RECONCILE_PENDING_REASON_CODES].sort());
    expect(RECONCILE_PENDING_REASON_CODES).toHaveLength(10);
  });

  it('lista a pendência com origem, id, rótulo do motivo, detalhe e tentativas', async () => {
    render(<ReconcilePendingPanel unitId="u1" />);
    const row = await screen.findByTestId('pending-p1');
    expect(within(row).getByText('sale.finalized')).toBeInTheDocument();
    expect(within(row).getByText('sale-p1')).toBeInTheDocument();
    // F-I5-3 a: o rótulo nomeia as duas causas e o que fazer, sem afirmar qual.
    expect(within(row).getByText(/ative a contabilidade da unidade ou recompile o binding; depois, Re-varrer/)).toBeInTheDocument();
    expect(within(row).getByText(/Nenhum mapper registrado/)).toBeInTheDocument();
    expect(within(row).getByText('3')).toBeInTheDocument();
    expect(reconcilePendingService.list).toHaveBeenCalledWith({ unitId: 'u1' });
  });

  it('estado vazio', async () => {
    vi.mocked(reconcilePendingService.list).mockResolvedValue({ items: [], nextCursor: null });
    render(<ReconcilePendingPanel unitId="u1" />);
    expect(await screen.findByText('Nenhuma pendência nesta unidade.')).toBeInTheDocument();
  });

  it('filtro por motivo e "mostrar resolvidas" vão para a query', async () => {
    render(<ReconcilePendingPanel unitId="u1" />);
    await screen.findByTestId('pending-p1');
    vi.mocked(reconcilePendingService.list).mockResolvedValue({ items: [item('p2', { reasonCode: 'FAILED' })], nextCursor: null });
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'FAILED' } });
    await screen.findByTestId('pending-p2');
    expect(screen.queryByTestId('pending-p1')).not.toBeInTheDocument(); // filtro novo SUBSTITUI a lista, não acumula
    expect(reconcilePendingService.list).toHaveBeenLastCalledWith({ unitId: 'u1', reasonCode: 'FAILED' });

    vi.mocked(reconcilePendingService.list).mockResolvedValue({
      items: [item('p3', { reasonCode: 'FAILED', resolvedAt: '2026-10-03T10:00:00.000Z' })],
      nextCursor: null,
    });
    fireEvent.click(screen.getByLabelText('Mostrar resolvidas'));
    const resolved = await screen.findByTestId('pending-p3');
    expect(within(resolved).getByText(/Resolvida/)).toBeInTheDocument();
    expect(reconcilePendingService.list).toHaveBeenLastCalledWith({ unitId: 'u1', reasonCode: 'FAILED', includeResolved: true });
  });

  it('"Carregar mais" segue o nextCursor e acumula as linhas', async () => {
    vi.mocked(reconcilePendingService.list).mockResolvedValueOnce({ items: [item('p1')], nextCursor: 'p1' });
    render(<ReconcilePendingPanel unitId="u1" />);
    await screen.findByTestId('pending-p1');
    vi.mocked(reconcilePendingService.list).mockResolvedValueOnce({ items: [item('p9')], nextCursor: null });
    fireEvent.click(screen.getByRole('button', { name: 'Carregar mais' }));
    await screen.findByTestId('pending-p9');
    expect(screen.getByTestId('pending-p1')).toBeInTheDocument();
    expect(reconcilePendingService.list).toHaveBeenLastCalledWith({ unitId: 'u1', cursor: 'p1' });
    expect(screen.queryByRole('button', { name: 'Carregar mais' })).not.toBeInTheDocument();
  });

  it('"Re-varrer" chama o rescan da unidade, avisa o resumo e recarrega a lista', async () => {
    vi.mocked(reconcilePendingService.rescan).mockResolvedValue({ attempted: 1, resolved: 1, stillPending: 0 });
    render(<ReconcilePendingPanel unitId="u1" />);
    await screen.findByTestId('pending-p1');
    vi.mocked(reconcilePendingService.list).mockResolvedValue({ items: [], nextCursor: null });
    fireEvent.click(screen.getByRole('button', { name: 'Re-varrer' }));
    expect(await screen.findByText('Nenhuma pendência nesta unidade.')).toBeInTheDocument();
    expect(reconcilePendingService.rescan).toHaveBeenCalledWith({ unitId: 'u1' });
    expect(notify).toHaveBeenCalledWith(expect.stringMatching(/1 tentada.*1 resolvida.*0 ainda pendente/), 'success', expect.any(String));
  });

  // Review independente do #686 (achado B): resposta velha nunca entra na lista do filtro novo.
  it('"Carregar mais" em voo + troca de filtro: a página velha é descartada', async () => {
    vi.mocked(reconcilePendingService.list).mockResolvedValueOnce({ items: [item('a1')], nextCursor: 'a1' });
    render(<ReconcilePendingPanel unitId="u1" />);
    await screen.findByTestId('pending-a1');
    let releaseOld!: (v: { items: ReconcilePendingItemViewDtoInput[]; nextCursor: string | null }) => void;
    vi.mocked(reconcilePendingService.list)
      .mockImplementationOnce(() => new Promise((r) => { releaseOld = r; }))
      .mockResolvedValueOnce({ items: [item('f1', { reasonCode: 'FAILED' })], nextCursor: null });
    fireEvent.click(screen.getByRole('button', { name: 'Carregar mais' }));
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'FAILED' } });
    await screen.findByTestId('pending-f1');
    releaseOld({ items: [item('a2')], nextCursor: 'a2' });
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByTestId('pending-a2')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Carregar mais' })).not.toBeInTheDocument();
  });

  it('filtro A lento + filtro B rápido: a resposta de A não sobrescreve a de B', async () => {
    render(<ReconcilePendingPanel unitId="u1" />);
    await screen.findByTestId('pending-p1');
    let releaseA!: (v: { items: ReconcilePendingItemViewDtoInput[]; nextCursor: string | null }) => void;
    vi.mocked(reconcilePendingService.list)
      .mockImplementationOnce(() => new Promise((r) => { releaseA = r; }))
      .mockResolvedValueOnce({ items: [item('b1', { reasonCode: 'MAX_CENTS_EXCEEDED' })], nextCursor: null });
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'FAILED' } });
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'MAX_CENTS_EXCEEDED' } });
    await screen.findByTestId('pending-b1');
    releaseA({ items: [item('n1', { reasonCode: 'FAILED' })], nextCursor: null });
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByTestId('pending-n1')).not.toBeInTheDocument();
    expect(screen.getByTestId('pending-b1')).toBeInTheDocument();
  });

  // Achado C: código que a tela não conhece (deploy fora de sincronia) mostra o código cru, não derruba a aba.
  it('motivo fora do enum conhecido mostra o código cru', async () => {
    vi.mocked(reconcilePendingService.list).mockResolvedValue({
      items: [item('x1', { reasonCode: 'CODIGO_FUTURO' as unknown as ReconcilePendingItemViewDtoInput['reasonCode'] })],
      nextCursor: null,
    });
    render(<ReconcilePendingPanel unitId="u1" />);
    const row = await screen.findByTestId('pending-x1');
    expect(within(row).getByText('CODIGO_FUTURO')).toBeInTheDocument();
  });

  // Achado D: falha de carga não diz "nenhuma pendência".
  it('erro de carga (não 403) mostra o erro e NÃO o estado vazio', async () => {
    vi.mocked(reconcilePendingService.list).mockRejectedValue({ status: 500, error: 'Falhou no servidor.' });
    render(<ReconcilePendingPanel unitId="u1" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Falhou no servidor.');
    expect(screen.queryByText('Nenhuma pendência nesta unidade.')).not.toBeInTheDocument();
  });

  it('403 na lista mostra o aviso e esconde a tela', async () => {
    vi.mocked(reconcilePendingService.list).mockRejectedValue({ status: 403, error: 'Sem permissão para ver pendências.' });
    render(<ReconcilePendingPanel unitId="u1" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem permissão para ver pendências.');
    expect(screen.queryByRole('button', { name: 'Re-varrer' })).not.toBeInTheDocument();
  });

  it('403 no Re-varrer mostra o aviso do BE', async () => {
    vi.mocked(reconcilePendingService.rescan).mockRejectedValue({ status: 403, error: 'Só o dono re-varre.' });
    render(<ReconcilePendingPanel unitId="u1" />);
    await screen.findByTestId('pending-p1');
    fireEvent.click(screen.getByRole('button', { name: 'Re-varrer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Só o dono re-varre.');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Re-varrer' })).not.toBeDisabled());
  });
});
