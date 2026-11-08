import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

/**
 * H2 C7 achado 23-h1 (03/11, PR #982): depois do PUT direto (sem contador), a faixa "aguardando o contador" seguia na
 * tela. O servidor já marca a PROPOSED órfã como SUPERSEDED nesse PUT (BRIEF POLICY-VERSION item 11,
 * `policyVersionApply.ts`), mas o hook só relia a pendente depois de PROPOR. Guarda: o PUT direto relê a pendente.
 */
const { list } = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('../../../../lib/services/policyVersions.service', () => ({ policyVersionsService: { list } }));
vi.mock('../useActiveAssignment', () => ({ useActiveAssignment: () => null }));
vi.mock('../../lib/useAccountingT', () => ({
  useAccountingT: () => ({ t: (_k: string, d?: string) => d ?? _k, tRef: { current: (_k: string, d?: string) => d ?? _k } }),
}));

import { useGovernedSave } from '../useGovernedSave';

const orfa = { id: 'pv-orfa', unitId: 'u1', target: 'FISCAL_PROFILE', version: 2, status: 'PROPOSED', payload: {} };

describe('useGovernedSave — PUT direto relê a proposta pendente (H2 23-h1)', () => {
  beforeEach(() => list.mockReset());
  afterEach(() => cleanup());

  it('com PROPOSED órfã e sem contador, depois do PUT a faixa some (pending = null)', async () => {
    list.mockResolvedValueOnce([orfa]).mockResolvedValue([]);
    const put = vi.fn(async () => {});
    const { result } = renderHook(() =>
      useGovernedSave<{ x: number }>({ unitId: 'u1', target: 'FISCAL_PROFILE', put, propose: vi.fn(), saveErrorFallback: 'erro' }),
    );
    await waitFor(() => expect(result.current.pending?.id).toBe('pv-orfa'));

    await act(async () => {
      await result.current.submit({ x: 1 });
    });

    expect(put).toHaveBeenCalledWith({ x: 1 });
    expect(result.current.savedDirect).toBe(true);
    expect(result.current.pending).toBeNull();
  });
});
