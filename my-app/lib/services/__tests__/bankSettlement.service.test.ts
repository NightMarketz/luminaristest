import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bankSettlementService } from '../bankSettlement.service';
import { notify } from '../../notifications/notify';

/** FE-INCR-BANK-SETTLEMENT item 1: URL e body exatos (o BE é `.strict()`); só comando notifica. */
vi.mock('cookies-next', () => ({ getCookie: () => 'tok-1' }));
vi.mock('../../notifications/notify', () => ({ notify: vi.fn() }));

const ok = (data: unknown) => ({ ok: true, status: 200, text: async () => JSON.stringify({ success: true, data }) }) as unknown as Response;
function last(): { url: string; method: string; body: unknown } {
  const calls = vi.mocked(globalThis.fetch).mock.calls;
  const [url, init] = calls[calls.length - 1] as [string, RequestInit];
  return { url, method: init.method ?? 'GET', body: init.body ? JSON.parse(init.body as string) : undefined };
}

describe('bankSettlementService', () => {
  beforeEach(() => {
    vi.mocked(notify).mockReset();
    globalThis.fetch = vi.fn();
    vi.mocked(globalThis.fetch).mockResolvedValue(ok({ items: [], total: 0, page: 1, limit: 20 }));
  });

  it('list: statementId/status/page/limit na query; sem notificação', async () => {
    await bankSettlementService.list('u1', { statementId: 's1', status: 'PENDING', page: 2, limit: 20 });
    expect(last().url).toMatch(/\/bank-settlements\?unitId=u1&statementId=s1&status=PENDING&page=2&limit=20$/);
    expect(notify).not.toHaveBeenCalled();
  });

  it('scan/confirm/reject/retry: rota e body exatos', async () => {
    await bankSettlementService.scan('u1', 's1');
    expect(last()).toEqual({ url: expect.stringMatching(/\/bank-settlements\/scan$/), method: 'POST', body: { unitId: 'u1', statementId: 's1' } });
    await bankSettlementService.confirm('b 1', { unitId: 'u1', method: 'Pix' });
    expect(last()).toEqual({ url: expect.stringMatching(/\/bank-settlements\/b%201\/confirm$/), method: 'POST', body: { unitId: 'u1', method: 'Pix' } });
    await bankSettlementService.reject('b1', { unitId: 'u1', reason: 'não é nosso' });
    expect(last().body).toEqual({ unitId: 'u1', reason: 'não é nosso' });
    await bankSettlementService.retry('b1', { unitId: 'u1', method: 'TED' });
    expect(last().url).toMatch(/\/bank-settlements\/b1\/retry$/);
    expect(notify).toHaveBeenCalledTimes(3);
  });
});
