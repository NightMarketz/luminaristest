import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { renderHook, cleanup, act } from '@testing-library/react';
import { useSalesWizard, type UseSalesWizardOptions } from '../useSalesWizard';
import { FinanceService } from '../../../services/FinanceService';
import type { PackageCatalog } from '../../../utils/packageSale';
import type { SaleData } from '../../../types/sales.types';

vi.mock('../../../services/FinanceService', () => ({
    FinanceService: { createSaleWithItems: vi.fn(async () => 'sale-1') },
}));

const catalog: PackageCatalog = {
    pkgA: { name: 'Pacote A', price: 300, validityDays: 180, active: true },
    pkgB: { name: 'Pacote B', price: 500, validityDays: 90, active: true },
};

function setup(opts: UseSalesWizardOptions = { packageCatalog: catalog, canFlagAboveCatalog: true }) {
    const hook = renderHook((o: UseSalesWizardOptions) => useSalesWizard(o), { initialProps: opts });
    act(() => {
        hook.result.current.setUnitId('u1');
        hook.result.current.setCustomerId('c1');
        hook.result.current.setVariant('packages');
    });
    return hook;
}

function addPackage(hook: ReturnType<typeof setup>, packageId: string, unitPrice: number, quantity = 1) {
    act(() => hook.result.current.addItem());
    const id = hook.result.current.state.items.at(-1)!.id;
    act(() => hook.result.current.updateItem(id, { packageId, unitPrice, quantity }));
}

const lastSaleData = (): SaleData => vi.mocked(FinanceService.createSaleWithItems).mock.calls.at(-1)![2];

describe('useSalesWizard — variante packages (FE-INCR-VENDA-PACOTE)', () => {
    beforeEach(() => vi.mocked(FinanceService.createSaleWithItems).mockClear());
    afterEach(() => cleanup());

    it('item 1/5: trocar para packages limpa os itens e desliga o cliente avulso', () => {
        const { result } = renderHook(() => useSalesWizard());
        act(() => { result.current.setSimpleCustomer(true); result.current.addItem(); });
        act(() => result.current.setVariant('packages'));
        expect(result.current.state.items).toHaveLength(0);
        expect(result.current.state.simpleCustomer).toBe(false);
        act(() => result.current.setSimpleCustomer(true));
        expect(result.current.state.simpleCustomer).toBe(false);
    });

    it('item 3: addItem cria Package; a quantidade N entra no subtotal', () => {
        const hook = setup();
        addPackage(hook, 'pkgA', 300, 3);
        expect(hook.result.current.state.items[0].itemType).toBe('Package');
        expect(hook.result.current.subtotal).toBe(900);
        expect(hook.result.current.canSubmit).toBe(true);
    });

    it('item 5: sem cliente não submete', () => {
        const hook = setup();
        addPackage(hook, 'pkgA', 300);
        act(() => hook.result.current.setCustomerId(''));
        expect(hook.result.current.canSubmit).toBe(false);
        expect(hook.result.current.packageIssue).toBe('customer_required');
    });

    it('item 4: segundo pacote diferente é recusado na tela', () => {
        const hook = setup();
        addPackage(hook, 'pkgA', 300);
        addPackage(hook, 'pkgB', 500);
        expect(hook.result.current.packageIssue).toBe('mixed_packages');
        expect(hook.result.current.canSubmit).toBe(false);
    });

    it('item 3a: abaixo do catálogo bloqueia; igual ou acima passa', () => {
        const hook = setup();
        addPackage(hook, 'pkgA', 299.99);
        expect(hook.result.current.canSubmit).toBe(false);
        act(() => hook.result.current.updateItem(hook.result.current.state.items[0].id, { unitPrice: 300 }));
        expect(hook.result.current.canSubmit).toBe(true);
        act(() => hook.result.current.updateItem(hook.result.current.state.items[0].id, { unitPrice: 320 }));
        expect(hook.result.current.canSubmit).toBe(true);
    });

    it('item 3b: payload grava aboveCatalogPrice true acima e false no preço do catálogo', async () => {
        const hook = setup();
        addPackage(hook, 'pkgA', 320);
        await act(() => hook.result.current.submit('sales', 'items', true));
        expect(lastSaleData().aboveCatalogPrice).toBe(true);

        act(() => hook.result.current.updateItem(hook.result.current.state.items[0].id, { unitPrice: 300 }));
        await act(() => hook.result.current.submit('sales', 'items', true));
        expect(lastSaleData().aboveCatalogPrice).toBe(false);
        expect(lastSaleData().subtotal).toBe(300);
    });

    it('item 3b × I3: tabela sem o campo → acima do catálogo bloqueia e o campo não vai no payload', async () => {
        const hook = setup({ packageCatalog: catalog, canFlagAboveCatalog: false });
        addPackage(hook, 'pkgA', 320);
        expect(hook.result.current.packageIssue).toBe('above_catalog_unsupported');
        expect(hook.result.current.canSubmit).toBe(false);

        act(() => hook.result.current.updateItem(hook.result.current.state.items[0].id, { unitPrice: 300 }));
        await act(() => hook.result.current.submit('sales', 'items', true));
        expect('aboveCatalogPrice' in lastSaleData()).toBe(false);
    });

    it('fora da variante packages o campo nunca vai', async () => {
        const { result } = renderHook(() => useSalesWizard({ packageCatalog: catalog, canFlagAboveCatalog: true }));
        act(() => { result.current.setUnitId('u1'); result.current.setCustomerId('c1'); result.current.setVariant('services'); });
        await act(() => result.current.submit('sales', 'items', false));
        expect('aboveCatalogPrice' in lastSaleData()).toBe(false);
    });
});
