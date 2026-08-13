import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../../api/api-client';
import { accountsPayableService } from '../accountsPayable.service';

/**
 * Query-string probes for the BE-INCR-SUBLEDGER-FILTERS FE (C4) — mocks `apiClient`
 * directly so assertions land on the actual URL `listPayables` builds, not on the
 * caller's params object (buildQuery is what turns `overdue?: boolean` into a
 * string, and that's exactly the step the "never `overdue=false`" rule guards).
 */

vi.mock('../../api/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));
vi.mock('../../notifications/notify', () => ({ notify: vi.fn() }));

function lastUrl(): string {
  const calls = vi.mocked(apiClient.get).mock.calls;
  return calls[calls.length - 1][0] as string;
}

describe('accountsPayableService.listPayables — filter query string', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockResolvedValue({ success: true, data: { payables: [], total: 0 } });
  });

  it('overdue disabled (undefined) — the URL never contains overdue=false or any overdue param', async () => {
    await accountsPayableService.listPayables({ unitId: 'u1', limit: 200, overdue: undefined });
    const url = lastUrl();
    expect(url).not.toContain('overdue=false');
    expect(url).not.toContain('overdue=');
  });

  it('overdue enabled — the URL carries overdue=true', async () => {
    await accountsPayableService.listPayables({ unitId: 'u1', limit: 200, overdue: true });
    expect(lastUrl()).toContain('overdue=true');
  });

  it('combined filters (counterpartyId + dueFrom + dueTo + q + overdue) all land in the same call', async () => {
    await accountsPayableService.listPayables({
      unitId: 'u1',
      limit: 200,
      counterpartyId: 'cp1',
      dueFrom: '2026-06-01',
      dueTo: '2026-06-30',
      q: 'aluguel',
      overdue: true,
    });
    const url = lastUrl();
    expect(url).toContain('counterpartyId=cp1');
    expect(url).toContain('dueFrom=2026-06-01');
    expect(url).toContain('dueTo=2026-06-30');
    expect(url).toContain('q=aluguel');
    expect(url).toContain('overdue=true');
  });

  it('omits counterpartyId/dueFrom/dueTo/q entirely when unset (buildQuery drops undefined)', async () => {
    await accountsPayableService.listPayables({ unitId: 'u1', limit: 200 });
    const url = lastUrl();
    expect(url).not.toContain('counterpartyId=');
    expect(url).not.toContain('dueFrom=');
    expect(url).not.toContain('dueTo=');
    expect(url).not.toContain('q=');
  });
});
