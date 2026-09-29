import { describe, it, expect, vi, beforeEach } from 'vitest';
import { accountingReviewService } from '../accountingReview.service';
import { notify } from '../../notifications/notify';

/**
 * accountingReview.service (FE-INCR-REVIEW item 1): URL e body de cada comando sobre `/api/accounting/reviews`;
 * o `resolveFinding` manda UM dos dois shapes da union (NO_ACTION nunca leva `targetType`); só mutação notifica.
 */
vi.mock('cookies-next', () => ({ getCookie: () => 'tok-1' }));
vi.mock('../../notifications/notify', () => ({ notify: vi.fn() }));

const ok = (data: unknown) => ({ ok: true, status: 200, text: async () => JSON.stringify({ success: true, data }) }) as unknown as Response;
function last(): { url: string; method: string; body: unknown } {
  const calls = vi.mocked(globalThis.fetch).mock.calls;
  const [url, init] = calls[calls.length - 1] as [string, RequestInit];
  return { url, method: init.method ?? 'GET', body: init.body ? JSON.parse(init.body as string) : undefined };
}

describe('accountingReviewService', () => {
  beforeEach(() => {
    vi.mocked(notify).mockReset();
    globalThis.fetch = vi.fn();
    vi.mocked(globalThis.fetch).mockResolvedValue(ok({}));
  });

  it('list/get: GET com unitId, year e status; sem notificação', async () => {
    await accountingReviewService.list('u1', { year: 2025, status: 'OPEN' });
    expect(last().url).toMatch(/\/accounting\/reviews\?unitId=u1&year=2025&status=OPEN$/);
    await accountingReviewService.get('r 1', 'u1');
    expect(last().url).toMatch(/\/accounting\/reviews\/r%201\?unitId=u1$/);
    expect(notify).not.toHaveBeenCalled();
  });

  it('open / addFinding / replaceJobs / signOff / reject: método, rota e body exatos', async () => {
    await accountingReviewService.open({ unitId: 'u1', year: 2025, ecdJobId: 'j1' });
    expect(last()).toEqual({ url: expect.stringMatching(/\/accounting\/reviews$/), method: 'POST', body: { unitId: 'u1', year: 2025, ecdJobId: 'j1' } });
    await accountingReviewService.addFinding('r1', { unitId: 'u1', register: 'I050', locator: '1.1', description: 'd', severity: 'BLOCKER' });
    expect(last().url).toMatch(/\/reviews\/r1\/findings$/);
    await accountingReviewService.replaceJobs('r1', { unitId: 'u1', ecfJobId: 'j2' });
    expect(last()).toMatchObject({ method: 'PATCH', body: { unitId: 'u1', ecfJobId: 'j2' } });
    await accountingReviewService.signOff('r1', { unitId: 'u1', reviewerName: 'Ana', reviewerCrc: 'SP-123456/O-1', statement: 's' });
    expect(last().url).toMatch(/\/reviews\/r1\/sign-off$/);
    await accountingReviewService.reject('r1', { unitId: 'u1', reason: 'r' });
    expect(last().url).toMatch(/\/reviews\/r1\/reject$/);
    expect(notify).toHaveBeenCalledTimes(5);
  });

  it('resolveFinding: NO_ACTION não leva targetType; DATA_EDIT não leva resolutionNote', async () => {
    await accountingReviewService.resolveFinding('r1', 'f1', { unitId: 'u1', resolution: 'NO_ACTION', resolutionNote: 'n' });
    expect(last().url).toMatch(/\/reviews\/r1\/findings\/f1\/resolve$/);
    expect(last().body).toEqual({ unitId: 'u1', resolution: 'NO_ACTION', resolutionNote: 'n' });
    await accountingReviewService.resolveFinding('r1', 'f1', { unitId: 'u1', resolution: 'DATA_EDIT', targetType: 'account', targetId: 'a1' });
    expect(last().body).toEqual({ unitId: 'u1', resolution: 'DATA_EDIT', targetType: 'account', targetId: 'a1' });
  });

  it('postAdjustment: POST …/adjustment com as linhas do postEntry', async () => {
    const body = {
      unitId: 'u1', postingDate: '2025-12-31', description: 'acerto',
      lines: [{ accountCode: '1.1', debitCents: 100, creditCents: 0 }, { accountCode: '2.1', debitCents: 0, creditCents: 100 }] as [
        { accountCode: string; debitCents: number; creditCents: number },
        { accountCode: string; debitCents: number; creditCents: number },
      ],
    };
    await accountingReviewService.postAdjustment('r1', 'f1', body);
    expect(last()).toEqual({ url: expect.stringMatching(/\/reviews\/r1\/findings\/f1\/adjustment$/), method: 'POST', body });
  });
});
