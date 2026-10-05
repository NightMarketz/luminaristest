import { describe, it, expect, vi, beforeEach } from 'vitest';
import { accountingService } from '../accounting.service';
import { accountingReviewService } from '../accountingReview.service';
import { dataExchangeService } from '../dataExchange.service';
import { accountantAssignmentsService } from '../accountantAssignments.service';
import { resolveErrorWithCode } from '../../../features/accounting/lib/resolveError';

/**
 * FE-INCR-ACCOUNTANT-GOVERNANCE item 13a — `ownerUserId` (F-GOV-7) só viaja quando o chamador o passa, e a lista
 * fecha nos 9 handlers. Ausente, a chamada fica byte a byte igual à de hoje (query/corpo SEM a chave).
 */
vi.mock('cookies-next', () => ({ getCookie: () => 'tok-1' }));
vi.mock('../../notifications/notify', () => ({ notify: vi.fn() }));

const ok = (data: unknown) =>
  ({ ok: true, status: 200, text: async () => JSON.stringify({ success: true, data }), blob: async () => new Blob(['x']) }) as unknown as Response;

function last(): { url: string; method: string; body: unknown } {
  const calls = vi.mocked(globalThis.fetch).mock.calls;
  const [url, init] = calls[calls.length - 1] as [string, RequestInit];
  return { url, method: init.method ?? 'GET', body: init.body ? JSON.parse(init.body as string) : undefined };
}

const OWNER = 'owner-1';

describe('ownerUserId nos 9 handlers do F-GOV-7', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
    vi.mocked(globalThis.fetch).mockResolvedValue(ok({}));
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    HTMLAnchorElement.prototype.click = vi.fn(); // jsdom não navega; só o download não pode vazar ruído
  });

  it('listPeriods: query só tem ownerUserId quando recebe', async () => {
    await accountingService.listPeriods('u1', 2026);
    expect(last().url).toMatch(/\/accounting\/u1\/periods\?year=2026$/);
    await accountingService.listPeriods('u1', 2026, OWNER);
    expect(last().url).toMatch(/\/accounting\/u1\/periods\?year=2026&ownerUserId=owner-1$/);
  });

  it('openPeriod: corpo só tem ownerUserId quando recebe', async () => {
    await accountingService.openPeriod('p1', 'u1');
    expect(last().body).toEqual({ unitId: 'u1' });
    expect(Object.keys(last().body as object)).not.toContain('ownerUserId');
    await accountingService.openPeriod('p1', 'u1', OWNER);
    expect(last().body).toEqual({ unitId: 'u1', ownerUserId: OWNER });
  });

  it('reopenPeriod: corpo só tem ownerUserId quando recebe', async () => {
    await accountingService.reopenPeriod('p1', 'u1', 'motivo');
    expect(last().body).toEqual({ unitId: 'u1', periodId: 'p1', reason: 'motivo' });
    await accountingService.reopenPeriod('p1', 'u1', 'motivo', OWNER);
    expect(last().body).toEqual({ unitId: 'u1', periodId: 'p1', reason: 'motivo', ownerUserId: OWNER });
  });

  it('review list/get: query só tem ownerUserId quando recebe', async () => {
    await accountingReviewService.list('u1', { year: 2025, status: 'OPEN' });
    expect(last().url).toMatch(/\/accounting\/reviews\?unitId=u1&year=2025&status=OPEN$/);
    await accountingReviewService.list('u1', { year: 2025 }, OWNER);
    expect(last().url).toMatch(/\/accounting\/reviews\?unitId=u1&year=2025&ownerUserId=owner-1$/);
    await accountingReviewService.get('r1', 'u1');
    expect(last().url).toMatch(/\/accounting\/reviews\/r1\?unitId=u1$/);
    await accountingReviewService.get('r1', 'u1', OWNER);
    expect(last().url).toMatch(/\/accounting\/reviews\/r1\?unitId=u1&ownerUserId=owner-1$/);
  });

  it('review signOff/reject: o ownerUserId vai no corpo do DTO, tal como o chamador o montou', async () => {
    await accountingReviewService.signOff('r1', { unitId: 'u1', reviewerName: 'Ana', reviewerCrc: 'SP-1/O-1', statement: 's' });
    expect(Object.keys(last().body as object)).not.toContain('ownerUserId');
    await accountingReviewService.signOff('r1', { unitId: 'u1', reviewerName: 'Ana', reviewerCrc: 'SP-1/O-1', statement: 's', ownerUserId: OWNER });
    expect(last().body).toMatchObject({ ownerUserId: OWNER });
    await accountingReviewService.reject('r1', { unitId: 'u1', reason: 'r', ownerUserId: OWNER });
    expect(last().body).toEqual({ unitId: 'u1', reason: 'r', ownerUserId: OWNER });
  });

  it('getJob/downloadArtifact: query só tem ownerUserId quando recebe', async () => {
    await dataExchangeService.getJob('j1', 'u1');
    expect(last().url).toMatch(/\/data-exchange\/jobs\/j1\?unitId=u1$/);
    await dataExchangeService.getJob('j1', 'u1', OWNER);
    expect(last().url).toMatch(/\/data-exchange\/jobs\/j1\?unitId=u1&ownerUserId=owner-1$/);

    await dataExchangeService.downloadArtifact('j1', 'u1', 'f.txt');
    expect(last().url).toMatch(/\/data-exchange\/jobs\/j1\/download\?unitId=u1$/);
    await dataExchangeService.downloadArtifact('j1', 'u1', 'f.txt', OWNER);
    expect(last().url).toMatch(/\/data-exchange\/jobs\/j1\/download\?unitId=u1&ownerUserId=owner-1$/);
  });
});

describe('accountantAssignmentsService', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
    vi.mocked(globalThis.fetch).mockResolvedValue(ok({}));
  });

  it('rota, método e corpo exatos de cada comando', async () => {
    await accountantAssignmentsService.invite({ unitId: 'u1', accountingContactId: 'c1', accountantEmail: 'a@b.com' });
    expect(last()).toEqual({ url: expect.stringMatching(/\/accounting\/accountant-assignments$/), method: 'POST', body: { unitId: 'u1', accountingContactId: 'c1', accountantEmail: 'a@b.com' } });
    await accountantAssignmentsService.listByScope('u 1');
    expect(last()).toMatchObject({ method: 'GET', url: expect.stringMatching(/\/accountant-assignments\?unitId=u%201$/) });
    await accountantAssignmentsService.listMine();
    expect(last().url).toMatch(/\/accountant-assignments\/mine$/);
    await accountantAssignmentsService.accept('a1');
    expect(last()).toEqual({ url: expect.stringMatching(/\/accountant-assignments\/a1\/accept$/), method: 'POST', body: { declaresWrittenContract: true } });
    await accountantAssignmentsService.end('a1', { reason: 'fim' });
    expect(last()).toEqual({ url: expect.stringMatching(/\/accountant-assignments\/a1\/end$/), method: 'POST', body: { reason: 'fim' } });
  });
});

describe('o apiClient propaga o `code` do corpo no objeto lançado (§1, "precisa de prova")', () => {
  it('um 403 ACCOUNTANT_REQUIRED chega ao resolveErrorWithCode com o code', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: async () => JSON.stringify({ success: false, error: 'bloqueado', code: 'ACCOUNTANT_REQUIRED' }),
    } as unknown as Response);
    const thrown = await accountingService.reopenPeriod('p1', 'u1').catch((e: unknown) => e);
    expect(thrown).toMatchObject({ code: 'ACCOUNTANT_REQUIRED', status: 403 });
    expect(resolveErrorWithCode(thrown, 'fallback')).toEqual({ message: 'bloqueado', code: 'ACCOUNTANT_REQUIRED' });
  });
});
