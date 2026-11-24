import React from 'react';
import { describe, it, expect, vi } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, fireEvent } from '@testing-library/react';

/**
 * SOT F-23.1 — o subtotal do detalhe da venda segue a regra do formulário.
 *
 * O formulário de criação (`useSalesCreateForm.ts`, `subtotal` e o recálculo do `submit`) soma as linhas arredondando
 * cada uma a centavos: Σ round(qtd × preço × 100) / 100. O detalhe (`SalesView.tsx`, `computedSubtotal`) somava
 * qtd × preço em ponto flutuante, sem arredondar. Com 2 linhas de 3 × R$ 0,335: o formulário dá R$ 2,02; a soma
 * crua dá 2,0100000000000002 (R$ 2,01). Comportamento correto: o detalhe dá o mesmo número do formulário.
 * O valor do subtotal chega ao `SaleDetailPanel` (fallback quando a venda não tem `subtotal` gravado).
 */

const sale = { id: 's1', status: 'Draft', subtotal: null, totalAmount: null };
const items = [
    { id: 'i1', saleId: 's1', productId: 'p1', quantity: 3, unitPrice: 0.335 },
    { id: 'i2', saleId: 's1', productId: 'p2', quantity: 3, unitPrice: 0.335 },
];

vi.mock('../../hooks', () => ({
    useSalesData: () => ({
        salesTable: null, saleItemsTable: null, itemsList: items,
        analytics: { paidTotal: 0, saleIdToSubtotal: {} },
        isLoading: false, refetch: vi.fn(), refetchItems: vi.fn(),
        productNameMap: {}, serviceNameMap: {}, packageNameMap: {}, customerNameMap: {}, unitNameMap: {},
        salesList: [sale], stockIndex: {}, updating: null,
        updateSale: vi.fn(), paySale: vi.fn(), cancelSale: vi.fn(), returnSale: vi.fn(),
    }),
    useSalesLogic: () => ({
        query: '', setQuery: vi.fn(), statusFilter: 'all', setStatusFilter: vi.fn(),
        periodFilter: 'all', setPeriodFilter: vi.fn(), periodLabels: {},
        currentPage: 1, setCurrentPage: vi.fn(), totalPages: 1,
        filteredSales: [sale], paginatedSales: [sale], itemsPerPage: 10,
    }),
}));

vi.mock('../../components/sales', () => ({
    SalesFilterBar: () => null,
    SalesTable: ({ sales, onSelectSale }: { sales: unknown[]; onSelectSale: (s: unknown) => void }) => (
        <button type="button" onClick={() => onSelectSale(sales[0])}>selecionar</button>
    ),
    SaleDetailPanel: ({ computedSubtotal }: { computedSubtotal: number }) => (
        <span data-testid="computed-subtotal">{String(computedSubtotal)}</span>
    ),
}));
vi.mock('../../components/sales/SalesCreateModal', () => ({ default: () => null }));
vi.mock('../../components/sales/SaleActionModals', () => ({ SalePaymentModal: () => null, SaleReasonModal: () => null }));
vi.mock('@/features/dashboard/shared/components/StandardPagination', () => ({ StandardPagination: () => null }));
vi.mock('@/components/ui/feedback/useConfirmModal', () => ({ useConfirmModal: () => ({ confirmNode: null, confirm: vi.fn() }) }));
vi.mock('../../../shared/hooks/useFilterPersistence', () => ({ useFilterPersistence: () => ({ isOpen: false }) }));
vi.mock('next-i18next', () => ({ useTranslation: () => ({ t: (_k: string, d?: string) => d ?? _k }) }));

import { SalesView } from '../SalesView';

describe('SOT F-23.1 — subtotal do detalhe da venda', () => {
    it('SOT F-23.1: o detalhe soma as linhas arredondadas a centavos, como o formulário (2 × 3 × 0,335 = 2,02)', () => {
        render(<SalesView tables={[]} />);
        fireEvent.click(screen.getByRole('button', { name: 'selecionar' }));
        expect(
            Number(screen.getByTestId('computed-subtotal').textContent),
            'SOT F-23.1: o detalhe deve dar o subtotal do formulário (Σ round(qtd × preço × 100) / 100 = 2,02); 2,0100000000000002 = soma crua em ponto flutuante',
        ).toBe(2.02);
    });
});
