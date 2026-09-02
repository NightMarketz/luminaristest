import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../../api/api-client';
import { salesService } from '../sales.service';

/**
 * FE-INCR-SALE-ACTIONS (LAC-A) — o service das transições dedicadas da venda.
 * Os DTOs do servidor são `.strict()`: o teste asserta o BODY EXATO (campo extra = 400 lá),
 * e que o alvo é a rota dedicada (/sales/pay|cancel|return), nunca o PUT genérico do motor.
 */

vi.mock('../../api/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));
vi.mock('../../notifications/notify', () => ({ notify: vi.fn() }));

function lastPost(): [string, Record<string, unknown>] {
  const calls = vi.mocked(apiClient.post).mock.calls;
  return calls[calls.length - 1] as [string, Record<string, unknown>];
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiClient.post).mockResolvedValue({ success: true, data: { id: 's1', data: {} } });
});

describe('salesService.paySale', () => {
  it('POSTa /sales/pay com o shape exato do DTO (tableId + saleId + paymentMethod)', async () => {
    await salesService.paySale({ tableId: 'tbl-1', saleId: 's1', paymentMethod: 'Pix' });
    const [url, body] = lastPost();
    expect(url).toBe('/sales/pay');
    expect(body).toEqual({ tableId: 'tbl-1', saleId: 's1', paymentMethod: 'Pix' });
  });

  it('Package Balance carrega packageId; referência opcional entra quando presente', async () => {
    await salesService.paySale({
      tableId: 'tbl-1',
      saleId: 's1',
      paymentMethod: 'Package Balance',
      packageId: 'pkg-9',
      paymentReference: 'ref-1',
    });
    const [, body] = lastPost();
    expect(body).toEqual({
      tableId: 'tbl-1',
      saleId: 's1',
      paymentMethod: 'Package Balance',
      packageId: 'pkg-9',
      paymentReference: 'ref-1',
    });
  });
});

describe('salesService.cancelSale / returnSale', () => {
  it('cancel POSTa /sales/cancel; reason ausente NÃO vira chave no body (DTO .strict())', async () => {
    await salesService.cancelSale({ tableId: 'tbl-1', saleId: 's1' });
    const [url, body] = lastPost();
    expect(url).toBe('/sales/cancel');
    expect(body).toEqual({ tableId: 'tbl-1', saleId: 's1' });
    expect('reason' in body).toBe(false);
  });

  it('return POSTa /sales/return com reason quando informado', async () => {
    await salesService.returnSale({ tableId: 'tbl-1', saleId: 's1', reason: 'cliente desistiu' });
    const [url, body] = lastPost();
    expect(url).toBe('/sales/return');
    expect(body).toEqual({ tableId: 'tbl-1', saleId: 's1', reason: 'cliente desistiu' });
  });
});
