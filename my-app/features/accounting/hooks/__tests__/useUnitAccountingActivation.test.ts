import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUnitAccountingActivation } from '../useUnitAccountingActivation';
import { accountingBindingService } from '../../../../lib/services/accountingBinding.service';

/** LAC-B item 2 — estado da unidade a partir do `listActive`. */
vi.mock('../../../../lib/services/accountingBinding.service', () => ({
  accountingBindingService: { listActive: vi.fn(), activateDefault: vi.fn() },
}));

const row = (sectorKey: string) => ({ id: `b-${sectorKey}`, sectorKey, bindingVersion: 1, status: 'Active' as const });

describe('useUnitAccountingActivation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lista vazia ⇒ inactive', async () => {
    vi.mocked(accountingBindingService.listActive).mockResolvedValue([]);
    const { result } = renderHook(() => useUnitAccountingActivation('u1'));
    await waitFor(() => expect(result.current.state).toBe('inactive'));
    expect(accountingBindingService.listActive).toHaveBeenCalledWith('u1');
  });

  it('uma linha ⇒ active com o setor', async () => {
    vi.mocked(accountingBindingService.listActive).mockResolvedValue([row('aestheticClinic')]);
    const { result } = renderHook(() => useUnitAccountingActivation('u1'));
    await waitFor(() => expect(result.current).toMatchObject({ state: 'active', activeSectorKey: 'aestheticClinic' }));
  });

  it('erro ⇒ error (não lança)', async () => {
    vi.mocked(accountingBindingService.listActive).mockRejectedValue({ error: 'boom', status: 500 });
    const { result } = renderHook(() => useUnitAccountingActivation('u1'));
    await waitFor(() => expect(result.current.state).toBe('error'));
  });

  it('troca de unidade descarta a resposta atrasada da anterior', async () => {
    let resolveOld!: (v: ReturnType<typeof row>[]) => void;
    vi.mocked(accountingBindingService.listActive)
      .mockImplementationOnce(() => new Promise((r) => { resolveOld = r; }))
      .mockResolvedValueOnce([]);
    const { result, rerender } = renderHook(({ unitId }) => useUnitAccountingActivation(unitId), { initialProps: { unitId: 'u-old' } });
    rerender({ unitId: 'u-new' });
    await waitFor(() => expect(result.current.state).toBe('inactive'));
    resolveOld([row('beautySalon')]);
    await new Promise((r) => setTimeout(r, 0));
    expect(result.current.state).toBe('inactive');
  });

  it('reload relê o estado (a faixa some depois de ativar)', async () => {
    vi.mocked(accountingBindingService.listActive).mockResolvedValueOnce([]).mockResolvedValueOnce([row('beautySalon')]);
    const { result } = renderHook(() => useUnitAccountingActivation('u1'));
    await waitFor(() => expect(result.current.state).toBe('inactive'));
    result.current.reload();
    await waitFor(() => expect(result.current.state).toBe('active'));
  });
});
