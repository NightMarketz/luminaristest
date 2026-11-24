import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, cleanup, act } from '@testing-library/react';
import { useSalesCreateForm } from '../useSalesCreateForm';
import { FinanceService } from '../../../services/FinanceService';
import type { SaleData } from '../../../types/sales.types';

/**
 * Teste-guarda INV F-40.2 (tela): "Finalizar Venda" criava o cabeçalho já `Finalized` e só depois os itens — que o servidor
 * recusa para venda finalizada. Decisão do dono (questionário 2026-11-10, Q-11): a criação só aceita rascunho; a tela cria o
 * rascunho, cria os itens e finaliza por atualização.
 */
vi.mock('../../../services/FinanceService', () => ({
    FinanceService: { createSaleWithItems: vi.fn(async () => 'sale-1'), updateSale: vi.fn(async () => ({})) },
}));

describe('useSalesCreateForm — finalizar (INV F-40.2)', () => {
    afterEach(() => cleanup());

    it('INV F-40.2: finalize cria a venda em Draft e finaliza por updateSale depois dos itens', async () => {
        const { result } = renderHook(() => useSalesCreateForm());
        act(() => {
            result.current.setUnitId('u1');
            result.current.setCustomerId('c1');
            result.current.addItem();
        });
        const id = result.current.state.items[0].id;
        act(() => result.current.updateItem(id, { productId: 'p1', quantity: 2, unitPrice: 10 }));

        await act(async () => { await result.current.submit('sales-t', 'items-t', true); });

        const created = vi.mocked(FinanceService.createSaleWithItems).mock.calls.at(-1)![2] as SaleData;
        expect(created.status).toBe('Draft');
        expect(FinanceService.updateSale).toHaveBeenCalledWith('sales-t', 'sale-1', expect.objectContaining({ status: 'Finalized' }));
        expect(vi.mocked(FinanceService.createSaleWithItems).mock.invocationCallOrder[0])
            .toBeLessThan(vi.mocked(FinanceService.updateSale).mock.invocationCallOrder[0]);
    });
});
