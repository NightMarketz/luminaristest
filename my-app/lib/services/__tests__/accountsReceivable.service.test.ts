import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../../api/api-client';
import { accountsReceivableService } from '../accountsReceivable.service';

/**
 * Query-string probes for the BE-INCR-SUBLEDGER-FILTERS FE (C4) — mirror of
 * accountsPayable.service.test.ts. Mocks `apiClient` directly so assertions land
 * on the actual URL `listReceivables` builds.
 */

vi.mock('../../api/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));
vi.mock('../../notifications/notify', () => ({ notify: vi.fn() }));

function lastUrl(): string {
  const calls = vi.mocked(apiClient.get).mock.calls;
  return calls[calls.length - 1][0] as string;
}

describe('accountsReceivableService.listReceivables — filter query string', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockResolvedValue({ success: true, data: { receivables: [], total: 0 } });
  });

  it('overdue disabled (undefined) — the URL never contains overdue=false or any overdue param', async () => {
    await accountsReceivableService.listReceivables({ unitId: 'u1', limit: 200, overdue: undefined });
    const url = lastUrl();
    expect(url).not.toContain('overdue=false');
    expect(url).not.toContain('overdue=');
  });

  it('overdue enabled — the URL carries overdue=true', async () => {
    await accountsReceivableService.listReceivables({ unitId: 'u1', limit: 200, overdue: true });
    expect(lastUrl()).toContain('overdue=true');
  });

  it('combined filters (counterpartyId + dueFrom + dueTo + q + overdue) all land in the same call', async () => {
    await accountsReceivableService.listReceivables({
      unitId: 'u1',
      limit: 200,
      counterpartyId: 'cp1',
      dueFrom: '2026-06-01',
      dueTo: '2026-06-30',
      q: 'servico',
      overdue: true,
    });
    const url = lastUrl();
    expect(url).toContain('counterpartyId=cp1');
    expect(url).toContain('dueFrom=2026-06-01');
    expect(url).toContain('dueTo=2026-06-30');
    expect(url).toContain('q=servico');
    expect(url).toContain('overdue=true');
  });

  it('omits counterpartyId/dueFrom/dueTo/q entirely when unset (buildQuery drops undefined)', async () => {
    await accountsReceivableService.listReceivables({ unitId: 'u1', limit: 200 });
    const url = lastUrl();
    expect(url).not.toContain('counterpartyId=');
    expect(url).not.toContain('dueFrom=');
    expect(url).not.toContain('dueTo=');
    expect(url).not.toContain('q=');
  });
});
