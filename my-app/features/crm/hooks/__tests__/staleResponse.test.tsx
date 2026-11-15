import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

vi.mock('../../../../lib/services/crm.service', () => ({
  CrmService: { getAnalytics: vi.fn(), listAttachments: vi.fn() },
}));

import { useCrmAnalytics } from '../useCrmAnalytics';
import { useLeadAttachments } from '../useLeadAttachments';
import { CrmService } from '../../../../lib/services/crm.service';

const getAnalytics = CrmService.getAnalytics as unknown as ReturnType<typeof vi.fn>;
const listAttachments = CrmService.listAttachments as unknown as ReturnType<typeof vi.fn>;

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}
const bundle = (v: number) => ({ success: true, data: { cards: [{ name: 'leads', value: v }], funnel: [], source: [], status: [], bant: [], proposals: [], activities: [] } });

// L-20261113-152232-fd34: trocar período/lead rápido deixava a resposta antiga sobrescrever a nova.
describe('resposta velha não sobrescreve a nova', () => {
  beforeEach(() => vi.clearAllMocks());

  it('useCrmAnalytics: período A responde depois de B → fica B', async () => {
    const a = deferred<unknown>();
    const b = deferred<unknown>();
    getAnalytics.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
    const { result } = renderHook(() => useCrmAnalytics());
    act(() => result.current.setDatePreset('lastMonth' as never));
    await act(async () => { b.resolve(bundle(2)); });
    await waitFor(() => expect(result.current.data.cards[0]?.value).toBe(2));
    await act(async () => { a.resolve(bundle(1)); });
    expect(result.current.data.cards[0]?.value).toBe(2);
    expect(result.current.loading).toBe(false);
  });

  it('useLeadAttachments: lead A responde depois de B → fica B', async () => {
    const a = deferred<unknown>();
    const b = deferred<unknown>();
    listAttachments.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
    const { result, rerender } = renderHook(({ id }) => useLeadAttachments(id), { initialProps: { id: 'A' } });
    rerender({ id: 'B' });
    await act(async () => { b.resolve({ data: [{ id: 'b1', fileName: 'b' }] }); });
    await waitFor(() => expect(result.current.attachments).toHaveLength(1));
    await act(async () => { a.resolve({ data: [{ id: 'a1', fileName: 'a' }, { id: 'a2', fileName: 'a2' }] }); });
    expect(result.current.attachments.map((x) => x.id)).toEqual(['b1']);
  });
});
