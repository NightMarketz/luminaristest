import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reconcilePendingService } from '../reconcilePending.service';
import { notify } from '../../notifications/notify';

/** BE-INCR-ONBOARDING-ACTIVATION item 17 (I5 PR-3): URL, query e body exatos (o BE é `.strict()`); o serviço não notifica. */
vi.mock('cookies-next', () => ({ getCookie: () => 'tok-1' }));
vi.mock('../../notifications/notify', () => ({ notify: vi.fn() }));

const ok = (data: unknown) => ({ ok: true, status: 200, text: async () => JSON.stringify({ success: true, data }) }) as unknown as Response;
function last(): { url: string; method: string; body: unknown } {
  const calls = vi.mocked(globalThis.fetch).mock.calls;
  const [url, init] = calls[calls.length - 1] as [string, RequestInit];
  return { url, method: init.method ?? 'GET', body: init.body ? JSON.parse(init.body as string) : undefined };
}

describe('reconcilePendingService', () => {
  beforeEach(() => {
    vi.mocked(notify).mockReset();
    globalThis.fetch = vi.fn();
  });

  it('list: unitId, reasonCode, includeResolved, cursor e limit na query; devolve o data do envelope', async () => {
    const page = { items: [], nextCursor: 'c-2' };
    vi.mocked(globalThis.fetch).mockResolvedValue(ok(page));
    const r = await reconcilePendingService.list({ unitId: 'u 1', reasonCode: 'NO_MAPPER_FOR_UNIT', includeResolved: true, cursor: 'c-1', limit: 50 });
    expect(last()).toEqual({
      url: expect.stringMatching(/\/reconcile-pending\?unitId=u\+1&reasonCode=NO_MAPPER_FOR_UNIT&includeResolved=true&cursor=c-1&limit=50$/),
      method: 'GET',
      body: undefined,
    });
    expect(r).toEqual(page);
  });

  it('list: filtros ausentes não entram na query', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(ok({ items: [], nextCursor: null }));
    await reconcilePendingService.list({ unitId: 'u1' });
    expect(last().url).toMatch(/\/reconcile-pending\?unitId=u1$/);
  });

  it('rescan: POST /reconcile-pending/rescan com o body exato; devolve o resumo; sem notificação (quem chama avisa)', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(ok({ attempted: 2, resolved: 1, stillPending: 1 }));
    const r = await reconcilePendingService.rescan({ unitId: 'u1' });
    expect(last()).toEqual({ url: expect.stringMatching(/\/reconcile-pending\/rescan$/), method: 'POST', body: { unitId: 'u1' } });
    expect(r).toEqual({ attempted: 2, resolved: 1, stillPending: 1 });
    expect(notify).not.toHaveBeenCalled();
  });
});
