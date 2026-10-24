import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSalesCreateForm } from '../useSalesCreateForm';

/**
 * Teste-guarda — ACHADOS-2026-10-19 §3.5 item 13 (FIX-FE-DASHBOARD).
 *
 * `subtotal` (e o total recalculado no `submit`) é `quantidade × unitPrice` em float: 3 × 0,10 = 0,30000000000000004.
 * Esperado: o subtotal é exato em centavos — 3 × R$ 0,10 = R$ 0,30.
 */
vi.mock('../../../services/FinanceService', () => ({ FinanceService: {} }));

describe('useSalesCreateForm — dinheiro', () => {
  it('3 × 0,10 dá subtotal 0,30 exato', () => {
    const { result } = renderHook(() => useSalesCreateForm());
    act(() => result.current.addItem());
    const id = result.current.state.items[0].id;
    act(() => result.current.updateItem(id, { quantity: 3, unitPrice: 0.1 }));
    expect(result.current.state.items[0]).toMatchObject({ quantity: 3, unitPrice: 0.1 });
    expect(result.current.subtotal).toBe(0.3);
  });
});
