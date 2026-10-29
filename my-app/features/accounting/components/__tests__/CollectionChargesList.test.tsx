import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, waitFor, fireEvent, within } from '@testing-library/react';
import { CollectionChargesList } from '../CollectionChargesList';
import { collectionChargesService, type CollectionChargeListItem } from '../../../../lib/services/collectionCharges.service';

/** FE-INCR-PAYMENT-PROVIDER-EMENDA-1 item 16b — lista global de cobranças da unidade (D-2026-10-29-F5-16B-E-P-RET-4). */

vi.mock('next-i18next', () => {
  const t = (key: string, fallback?: unknown, vars?: Record<string, string>) =>
    typeof fallback === 'string' ? fallback.replace(/\{\{(\w+)\}\}/g, (_m, n: string) => vars?.[n] ?? '') : key;
  return { useTranslation: () => ({ t }) };
});
vi.mock('../../../../lib/services/collectionCharges.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../lib/services/collectionCharges.service')>();
  return { ...actual, collectionChargesService: { listByUnit: vi.fn(), get: vi.fn() } };
});

const FUTURE = '2099-01-01T00:00:00Z';
const PAST = '2020-01-01T00:00:00Z';
const item = (over: Partial<CollectionChargeListItem>): CollectionChargeListItem => ({
  id: 'c1', unitId: 'u1', receivableId: 'r1', paymentAccountId: 'pa1', kind: 'BOLETO', amountCents: '150000',
  expiresAt: FUTURE, status: 'PENDING', providerRef: 'o1', providerPaymentRef: null,
  providerStatus: 'action_required', providerStatusDetail: null, paidAt: null, failReason: null,
  instrument: { digitableLine: '2379' }, createdAt: '2026-10-23T00:00:00Z', updatedAt: '2026-10-23T10:00:00Z',
  receivableDocumentNumber: 'FAT-777', ...over,
});
const page = (items: CollectionChargeListItem[], total = items.length) => ({ items, total, page: 1, limit: 20 });

describe('CollectionChargesList (16b)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('carrega a página 1 da unidade e mostra tipo, nº do título, valor, vencimento e status', async () => {
    vi.mocked(collectionChargesService.listByUnit).mockResolvedValue(page([item({})]));
    render(<CollectionChargesList unitId="u1" />);
    const row = await screen.findByTestId('collection-charge-row-c1');
    expect(collectionChargesService.listByUnit).toHaveBeenCalledWith({ unitId: 'u1', status: undefined, kind: undefined, page: 1, limit: 20 });
    expect(within(row).getByText('Boleto')).toBeInTheDocument();
    expect(within(row).getByText('FAT-777')).toBeInTheDocument();
    expect(within(row).getByText('1.500,00', { exact: false })).toBeInTheDocument();
    expect(within(row).getByText('Pendente')).toBeInTheDocument();
  });

  it('COB-7: PENDING vencida mostra o selo derivado "Vencida — aguardando o provedor"; PAID não afirma "aguardando"', async () => {
    vi.mocked(collectionChargesService.listByUnit).mockResolvedValue(page([item({ id: 'a', expiresAt: PAST }), item({ id: 'b', status: 'PAID' })]));
    render(<CollectionChargesList unitId="u1" />);
    expect(await within(await screen.findByTestId('collection-charge-row-a')).findByText('Vencida — aguardando o provedor')).toBeInTheDocument();
    expect(within(screen.getByTestId('collection-charge-row-b')).getByText('Pago no provedor')).toBeInTheDocument();
  });

  it('filtros de status e tipo vão ao servidor e voltam à página 1', async () => {
    vi.mocked(collectionChargesService.listByUnit).mockResolvedValue(page([item({})], 45));
    render(<CollectionChargesList unitId="u1" />);
    await screen.findByTestId('collection-charge-row-c1');
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'PAID' } });
    await waitFor(() => expect(collectionChargesService.listByUnit).toHaveBeenLastCalledWith({ unitId: 'u1', status: 'PAID', kind: undefined, page: 1, limit: 20 }));
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'PIX' } });
    await waitFor(() => expect(collectionChargesService.listByUnit).toHaveBeenLastCalledWith({ unitId: 'u1', status: 'PAID', kind: 'PIX', page: 1, limit: 20 }));
  });

  it('paginação pelo StandardPagination: página 2 pede page=2', async () => {
    vi.mocked(collectionChargesService.listByUnit).mockResolvedValue(page([item({})], 45));
    render(<CollectionChargesList unitId="u1" />);
    await screen.findByTestId('collection-charge-row-c1');
    fireEvent.click(screen.getByTitle('Next'));
    await waitFor(() => expect(collectionChargesService.listByUnit).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
  });

  it('clique na linha abre o detalhe por GET /collection-charges/:id', async () => {
    vi.mocked(collectionChargesService.listByUnit).mockResolvedValue(page([item({})]));
    vi.mocked(collectionChargesService.get).mockResolvedValue(item({ providerStatusDetail: 'waiting_payment' }));
    render(<CollectionChargesList unitId="u1" />);
    fireEvent.click(await screen.findByTestId('collection-charge-row-c1'));
    await waitFor(() => expect(collectionChargesService.get).toHaveBeenCalledWith('c1', 'u1'));
    expect(await screen.findByTestId('collection-charge-detail')).toHaveTextContent('action_required / waiting_payment');
  });

  it('o nº do título é link para o AR (sem abrir o detalhe); título sem nº mostra "sem nº"', async () => {
    const onOpen = vi.fn();
    vi.mocked(collectionChargesService.listByUnit).mockResolvedValue(page([item({}), item({ id: 'c2', receivableId: 'r2', receivableDocumentNumber: null })]));
    render(<CollectionChargesList unitId="u1" onOpenReceivable={onOpen} />);
    fireEvent.click(await screen.findByRole('button', { name: 'FAT-777' }));
    expect(onOpen).toHaveBeenCalledWith('r1', 'FAT-777');
    expect(collectionChargesService.get).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'sem nº' }));
    expect(onOpen).toHaveBeenLastCalledWith('r2', null);
  });

  it('vazio e erro', async () => {
    vi.mocked(collectionChargesService.listByUnit).mockResolvedValue(page([]));
    render(<CollectionChargesList unitId="u1" />);
    expect(await screen.findByText('Nenhuma cobrança nesta unidade com estes filtros.')).toBeInTheDocument();
    cleanup();
    vi.mocked(collectionChargesService.listByUnit).mockRejectedValue(new Error('boom'));
    render(<CollectionChargesList unitId="u1" />);
    expect(await screen.findByText(/boom|Erro ao carregar as cobranças da unidade/)).toBeInTheDocument();
  });
});
