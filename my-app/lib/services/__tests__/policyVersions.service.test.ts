import { describe, it, expect, vi, beforeEach } from 'vitest';
import { policyVersionsService } from '../policyVersions.service';
import { notify } from '../../notifications/notify';

/**
 * policyVersions.service — FE-INCR-ACCOUNTING-POLICY-VERSION 12a: URL, método e corpo por rota; `ownerUserId`
 * ausente não vira chave na query nem no corpo; `notify` de sucesso só nas escritas.
 */
vi.mock('cookies-next', () => ({ getCookie: () => 'tok-1' }));
vi.mock('../../notifications/notify', () => ({ notify: vi.fn() }));

function okResponse(data?: unknown): Response {
  return { ok: true, status: 200, text: async () => JSON.stringify({ success: true, data }) } as unknown as Response;
}
function lastCall(): { url: string; init: RequestInit } {
  const calls = vi.mocked(globalThis.fetch).mock.calls;
  const [url, init] = calls[calls.length - 1] as [string, RequestInit];
  return { url, init };
}

describe('policyVersionsService', () => {
  beforeEach(() => {
    vi.mocked(notify).mockReset();
    globalThis.fetch = vi.fn();
    vi.mocked(globalThis.fetch).mockResolvedValue(okResponse({}));
  });

  it('propose: POST /accounting/policy-versions com {unitId, target, payload} e payload sem unitId', async () => {
    await policyVersionsService.propose({ unitId: 'u1', target: 'SCOPE_SETTINGS', payload: { depreciationExpenseAccountId: 'a1' } });
    const { url, init } = lastCall();
    expect(url).toMatch(/\/accounting\/policy-versions$/);
    expect(init.method).toBe('POST');
    const body = JSON.parse(String(init.body));
    expect(body).toEqual({ unitId: 'u1', target: 'SCOPE_SETTINGS', payload: { depreciationExpenseAccountId: 'a1' } });
    expect(body.payload).not.toHaveProperty('unitId');
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it('list: sem ownerUserId nem filtros, a query só leva unitId; sem notify', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(okResponse([]));
    await policyVersionsService.list({ unitId: 'u 1' });
    const { url, init } = lastCall();
    expect(url).toMatch(/\/accounting\/policy-versions\?unitId=u\+1$/);
    expect(url).not.toContain('ownerUserId');
    expect(init.method).toBe('GET');
    expect(notify).not.toHaveBeenCalled();
  });

  it('list: com filtros e ownerUserId, todos na query', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(okResponse([]));
    await policyVersionsService.list({ unitId: 'u1', target: 'FISCAL_PROFILE', status: 'PROPOSED', ownerUserId: 'o9' });
    expect(lastCall().url).toMatch(/\?unitId=u1&target=FISCAL_PROFILE&status=PROPOSED&ownerUserId=o9$/);
  });

  it('get: id codificado no path; ownerUserId só quando presente', async () => {
    await policyVersionsService.get('pv/1', { unitId: 'u1' });
    expect(lastCall().url).toMatch(/\/accounting\/policy-versions\/pv%2F1\?unitId=u1$/);
    await policyVersionsService.get('pv1', { unitId: 'u1', ownerUserId: 'o9' });
    expect(lastCall().url).toMatch(/\/pv1\?unitId=u1&ownerUserId=o9$/);
  });

  it('approve/reject: POST no subcaminho com o corpo exato (sem ownerUserId quando ausente)', async () => {
    await policyVersionsService.approve('pv1', { unitId: 'u1' });
    let c = lastCall();
    expect(c.url).toMatch(/\/policy-versions\/pv1\/approve$/);
    expect(c.init.method).toBe('POST');
    expect(JSON.parse(String(c.init.body))).toEqual({ unitId: 'u1' });

    await policyVersionsService.reject('pv1', { unitId: 'u1', ownerUserId: 'o9', reason: 'conta errada' });
    c = lastCall();
    expect(c.url).toMatch(/\/policy-versions\/pv1\/reject$/);
    expect(JSON.parse(String(c.init.body))).toEqual({ unitId: 'u1', ownerUserId: 'o9', reason: 'conta errada' });
    expect(notify).toHaveBeenCalledTimes(2);
  });
});
