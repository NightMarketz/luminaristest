import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useUnitKit } from '../useUnitKit';
import { accountingKitService, type KitInstallationView } from '../../../../lib/services/accountingKit.service';

/** EMENDA-2 da LAC-B, itens 2 e 4 — estado do kit da unidade a partir do `getKit`. */
vi.mock('../../../../lib/services/accountingKit.service', () => ({
  accountingKitService: { getKit: vi.fn(), listPending: vi.fn() },
}));

const kit = (over: Partial<KitInstallationView> = {}): KitInstallationView => ({
  kitKey: 'beautySalon',
  kitVersion: 6,
  latestVersion: 6,
  status: 'INSTALLED',
  lastRun: null,
  openPendingCount: 0,
  changelog: [],
  steps: { lastCompletedStep: 7, warnings: [] },
  ...over,
});

describe('useUnitKit', () => {
  beforeEach(() => vi.clearAllMocks());

  it('null do BE ⇒ none', async () => {
    vi.mocked(accountingKitService.getKit).mockResolvedValue(null);
    const { result } = renderHook(() => useUnitKit('u1', { enabled: true }));
    await waitFor(() => expect(result.current.state).toBe('none'));
    expect(accountingKitService.getKit).toHaveBeenCalledWith('u1');
  });

  it('kit ⇒ loaded com a view', async () => {
    vi.mocked(accountingKitService.getKit).mockResolvedValue(kit());
    const { result } = renderHook(() => useUnitKit('u1', { enabled: true }));
    await waitFor(() => expect(result.current).toMatchObject({ state: 'loaded', kit: { kitKey: 'beautySalon' } }));
  });

  it('erro ⇒ error (não lança)', async () => {
    vi.mocked(accountingKitService.getKit).mockRejectedValue({ error: 'boom', status: 500 });
    const { result } = renderHook(() => useUnitKit('u1', { enabled: true }));
    await waitFor(() => expect(result.current.state).toBe('error'));
  });

  it('item 4: enabled false (modo cliente) ⇒ none e zero chamada à rota', async () => {
    const { result } = renderHook(() => useUnitKit('u1', { enabled: false }));
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    expect(result.current.state).toBe('none');
    expect(accountingKitService.getKit).not.toHaveBeenCalled();
  });

  it('troca de unidade descarta a resposta atrasada da anterior', async () => {
    let resolveOld!: (v: KitInstallationView | null) => void;
    vi.mocked(accountingKitService.getKit)
      .mockImplementationOnce(() => new Promise((r) => { resolveOld = r; }))
      .mockResolvedValueOnce(null);
    const { result, rerender } = renderHook(({ unitId }) => useUnitKit(unitId, { enabled: true }), { initialProps: { unitId: 'u-old' } });
    rerender({ unitId: 'u-new' });
    await waitFor(() => expect(result.current.state).toBe('none'));
    await act(async () => {
      resolveOld(kit());
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(result.current.state).toBe('none');
  });

  it('reload de unidade carregada relê sem passar por loading', async () => {
    let resolveSecond!: (v: KitInstallationView | null) => void;
    vi.mocked(accountingKitService.getKit)
      .mockResolvedValueOnce(kit({ status: 'FAILED' }))
      .mockImplementationOnce(() => new Promise((r) => { resolveSecond = r; }));
    const { result } = renderHook(() => useUnitKit('u1', { enabled: true }));
    await waitFor(() => expect(result.current).toMatchObject({ state: 'loaded', kit: { status: 'FAILED' } }));
    act(() => result.current.reload());
    expect(result.current).toMatchObject({ state: 'loaded', kit: { status: 'FAILED' } });
    await act(async () => { resolveSecond(kit()); });
    await waitFor(() => expect(result.current).toMatchObject({ state: 'loaded', kit: { status: 'INSTALLED' } }));
  });
});
