import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { ReceivableChargesDrawer } from '../ReceivableChargesDrawer';
import { collectionChargesService, type CollectionChargeView } from '../../../../lib/services/collectionCharges.service';

vi.mock('next-i18next', () => {
  const t = (key: string, fallback?: unknown, vars?: Record<string, string>) =>
    typeof fallback === 'string' ? fallback.replace(/\{\{(\w+)\}\}/g, (_m, n: string) => vars?.[n] ?? '') : key;
  return { useTranslation: () => ({ t }) };
});
vi.mock('../../../../lib/services/collectionCharges.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../lib/services/collectionCharges.service')>();
  return { ...actual, collectionChargesService: { listByReceivable: vi.fn(), get: vi.fn(), cancel: vi.fn() } };
});

const FUTURE = '2099-01-01T00:00:00Z';
const PAST = '2020-01-01T00:00:00Z';
const charge = (over: Partial<CollectionChargeView>): CollectionChargeView => ({
  id: 'c1', unitId: 'u1', receivableId: 'r1', paymentAccountId: 'pa1', kind: 'BOLETO', amountCents: '150000',
  expiresAt: FUTURE, status: 'PENDING', providerRef: 'o1', providerPaymentRef: null,
  providerStatus: 'action_required', providerStatusDetail: 'waiting_payment', paidAt: null, failReason: null,
  instrument: { digitableLine: '2379' }, createdAt: '2026-10-23T00:00:00Z', updatedAt: '2026-10-23T10:00:00Z', ...over,
});

function renderDrawer(receivableOpen = true) {
  return render(
    <table><tbody><ReceivableChargesDrawer unitId="u1" receivableId="r1" receivableOpen={receivableOpen} colSpan={7} /></tbody></table>,
  );
}

describe('ReceivableChargesDrawer (item 16)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('lista tipo, valor, vencimento, status e o estado cru do provedor', async () => {
    vi.mocked(collectionChargesService.listByReceivable).mockResolvedValue([charge({})]);
    renderDrawer();
    await waitFor(() => expect(screen.getByText('Boleto')).toBeInTheDocument());
    expect(collectionChargesService.listByReceivable).toHaveBeenCalledWith('r1', 'u1');
    expect(screen.getByText('1.500,00', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Pendente')).toBeInTheDocument();
    expect(screen.getByText('action_required / waiting_payment')).toBeInTheDocument();
  });

  it('"Cancelar cobrança" só em PENDING com providerRef', async () => {
    vi.mocked(collectionChargesService.listByReceivable).mockResolvedValue([
      charge({ id: 'a', status: 'PENDING', providerRef: 'o1' }),
      charge({ id: 'b', status: 'PENDING', providerRef: null }),
      charge({ id: 'c', status: 'CREATING', providerRef: null }),
      charge({ id: 'd', status: 'PAID' }),
    ]);
    renderDrawer();
    await waitFor(() => expect(screen.getAllByRole('button', { name: /Detalhe/ })).toHaveLength(4));
    expect(screen.getAllByRole('button', { name: /Cancelar cobrança/ })).toHaveLength(1);
  });

  it('cancelar devolvendo PAID mostra PAID, não "cancelada"', async () => {
    vi.mocked(collectionChargesService.listByReceivable).mockResolvedValue([charge({})]);
    vi.mocked(collectionChargesService.cancel).mockResolvedValue(charge({ status: 'PAID' }));
    renderDrawer();
    fireEvent.click(await screen.findByRole('button', { name: /Cancelar cobrança/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Sim, cancelar' }));
    await waitFor(() => expect(collectionChargesService.cancel).toHaveBeenCalledWith('c1', { unitId: 'u1' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('O provedor informou que a cobrança já estava Pago no provedor.'));
    expect(screen.queryByText('Cobrança cancelada.')).toBeNull();
  });

  it('409 CHARGE_NOT_PENDING ⇒ mensagem e recarga', async () => {
    vi.mocked(collectionChargesService.listByReceivable).mockResolvedValue([charge({})]);
    vi.mocked(collectionChargesService.cancel).mockRejectedValue(Object.assign(new Error('x'), { status: 409, code: 'CHARGE_NOT_PENDING', message: 'x' }));
    renderDrawer();
    fireEvent.click(await screen.findByRole('button', { name: /Cancelar cobrança/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Sim, cancelar' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/não está mais pendente/));
    expect(collectionChargesService.listByReceivable).toHaveBeenCalledTimes(2);
  });

  it('detalhe: pagador quando o BE o devolve (gestor), "visto pago em" e a nota de atualização', async () => {
    vi.mocked(collectionChargesService.listByReceivable).mockResolvedValue([charge({ status: 'PAID' })]);
    vi.mocked(collectionChargesService.get).mockResolvedValue(charge({
      status: 'PAID', paidAt: '2026-10-23T11:00:00Z',
      payer: { firstName: 'Ana', lastName: 'Lima', email: 'ana@ex.com', identification: { type: 'CPF', number: '12345678901' } },
    }));
    renderDrawer();
    fireEvent.click(await screen.findByRole('button', { name: /Detalhe/ }));
    await waitFor(() => expect(screen.getByTestId('charge-payer')).toHaveTextContent('Ana Lima'));
    expect(screen.getByText('Visto pago em')).toBeInTheDocument();
    expect(screen.getByText(/re-consulta a cada 15 min/)).toBeInTheDocument();
  });
});

describe('ReceivableChargesDrawer — textos por status (item 17)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('PAID com título aberto ⇒ "Pago no provedor, aguardando confirmação" + nota da Conciliação', async () => {
    vi.mocked(collectionChargesService.listByReceivable).mockResolvedValue([charge({ status: 'PAID' })]);
    renderDrawer(true);
    await waitFor(() => expect(screen.getByText('Pago no provedor, aguardando confirmação')).toBeInTheDocument());
    expect(screen.getByTestId('charge-banner-paid_awaiting_settlement')).toHaveTextContent(/Baixas por retorno/);
  });

  it('PARTIALLY_REFUNDED, CHARGED_BACK, REFUNDED ⇒ aviso "sem efeito no razão"', async () => {
    vi.mocked(collectionChargesService.listByReceivable).mockResolvedValue([
      charge({ id: 'a', status: 'PARTIALLY_REFUNDED' }), charge({ id: 'b', status: 'CHARGED_BACK' }), charge({ id: 'c', status: 'REFUNDED' }),
    ]);
    renderDrawer();
    await waitFor(() => expect(screen.getAllByTestId('charge-banner-no_ledger_effect')).toHaveLength(3));
  });

  it('EXPIRED, CANCELLED, FAILED ⇒ aviso terminal', async () => {
    vi.mocked(collectionChargesService.listByReceivable).mockResolvedValue([
      charge({ id: 'a', status: 'EXPIRED' }), charge({ id: 'b', status: 'CANCELLED' }), charge({ id: 'c', status: 'FAILED' }),
    ]);
    renderDrawer();
    await waitFor(() => expect(screen.getAllByTestId('charge-banner-terminal')).toHaveLength(3));
  });

  it('PENDING vencida ⇒ selo "Vencida — aguardando o provedor" e Cancelar em destaque', async () => {
    vi.mocked(collectionChargesService.listByReceivable).mockResolvedValue([charge({ expiresAt: PAST })]);
    renderDrawer();
    await waitFor(() => expect(screen.getByText('Vencida — aguardando o provedor')).toBeInTheDocument());
    expect(screen.getByTestId('charge-banner-overdue_pending')).toHaveTextContent(/Cancele para não deixar a cobrança aberta/);
    expect(screen.getByRole('button', { name: /Cancelar cobrança/ }).className).toMatch(/amber/);
  });

  it('status desconhecido ⇒ rótulo cru, nunca "pago"', async () => {
    vi.mocked(collectionChargesService.listByReceivable).mockResolvedValue([charge({ status: 'IN_MEDIATION' })]);
    renderDrawer();
    await waitFor(() => expect(screen.getByText('IN_MEDIATION')).toBeInTheDocument());
    expect(screen.queryByText(/pago/i)).toBeNull();
  });
});
