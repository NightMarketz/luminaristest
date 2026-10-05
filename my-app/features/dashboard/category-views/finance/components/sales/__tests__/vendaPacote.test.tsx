import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Shim obrigatório (jsx "preserve" + runtime clássico) — nunca em código de produção.
(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { wizardVariantsFor } from '../SalesCreateModal';
import { SalePaymentModal } from '../SaleActionModals';
import SaleDetailPanel from '../SaleDetailPanel';
import SalesTable from '../SalesTable';
import { buildPackageCatalog } from '../../../hooks/sales/usePackageCatalog';
import { packageBalancesService } from '@/lib/services/packageBalances.service';
import type { IDynamicTable, IDynamicTableData } from '@/features/dashboard/components/shared/dynamic-tables.client';
import type { SaleRecord, SaleItemRecord } from '../../../types/sales.types';

/** FE-INCR-VENDA-PACOTE — itens 1, 2, 3b, 7 e 8 do BRIEF. */

vi.mock('@/lib/context/CurrencyContext', () => ({
    useFormatCurrency: () => (v: number) => `R$ ${v.toFixed(2)}`,
}));
vi.mock('@/features/dashboard/shared/hooks/useRenderTypedValue', () => ({
    useRenderTypedValue: () => (v: unknown) => String(v),
}));
vi.mock('@/lib/services/packageBalances.service', () => ({
    packageBalancesService: { listBalances: vi.fn() },
}));

const field = (name: string) => ({ name, label: name, type: 'string' });
const itemsTable = (names: string[]) =>
    ({ id: 't', name: 'Sale Items', schema: { fields: names.map(field) } }) as unknown as IDynamicTable;

beforeEach(() => { cleanup(); vi.clearAllMocks(); });

describe('item 1 — a opção Pacotes só existe quando a tabela de itens tem packageId', () => {
    it('mista com packageId → 3 variantes; mista sem → 2; não mista → nenhuma', () => {
        expect(wizardVariantsFor(itemsTable(['productId', 'serviceId', 'packageId']))).toEqual(['products', 'services', 'packages']);
        expect(wizardVariantsFor(itemsTable(['productId', 'serviceId']))).toEqual(['products', 'services']);
        expect(wizardVariantsFor(itemsTable(['serviceId']))).toEqual([]);
    });
});

describe('item 2 — índice do catálogo', () => {
    it('id → { name, price, validityDays, active } a partir das linhas da tabela', () => {
        const rows = [
            { id: 'p1', data: { name: 'Pacote 10', price: 300, validityDays: 180, active: true } },
            { id: 'p2', data: { name: 'Antigo', price: '150', active: false } },
        ] as unknown as IDynamicTableData[];
        expect(buildPackageCatalog(rows)).toEqual({
            p1: { name: 'Pacote 10', price: 300, validityDays: 180, active: true },
            p2: { name: 'Antigo', price: 150, validityDays: null, active: false },
        });
    });
});

describe('item 7 — o pacote vendido não paga a si mesmo', () => {
    it('a lista de saldos da venda do pacote B não mostra o B', async () => {
        vi.mocked(packageBalancesService.listBalances).mockResolvedValue([
            { id: 'b1', customerId: 'c1', packageId: 'pkgA0000', unitId: 'u1', balanceCents: 50000 },
            { id: 'b2', customerId: 'c1', packageId: 'pkgB0000', unitId: 'u1', balanceCents: 30000 },
        ]);
        render(
            <SalePaymentModal
                sale={{ id: 's1', unitId: 'u1', customerId: 'c1', totalAmount: 300 } as SaleRecord}
                soldPackageId="pkgB0000"
                isOpen
                onClose={() => {}}
                onConfirm={async () => {}}
            />,
        );
        await waitFor(() => expect(packageBalancesService.listBalances).toHaveBeenCalled());
        fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'Package Balance' } });
        // O <select> do pacote só aparece com 'Package Balance'; as opções levam o packageId no value.
        await waitFor(() => expect(screen.getAllByRole('combobox')).toHaveLength(2));
        const values = Array.from(screen.getAllByRole('combobox')[1].querySelectorAll('option')).map(o => o.value);
        expect(values).toContain('pkgA0000');
        expect(values).not.toContain('pkgB0000');
    });
});

describe('item 3b — etiqueta na lista de vendas', () => {
    it('aparece só na venda com aboveCatalogPrice true', () => {
        const noop = () => {};
        render(
            <SalesTable
                sales={[
                    { id: 's1', status: 'Finalized', paymentStatus: 'Pending', totalAmount: 320, aboveCatalogPrice: true },
                    { id: 's2', status: 'Finalized', paymentStatus: 'Pending', totalAmount: 300, aboveCatalogPrice: false },
                ] as SaleRecord[]}
                saleIdToSubtotal={{}}
                customerNameMap={{}}
                onSelectSale={noop}
                onUpdateSale={async () => {}}
                onRequestPay={noop}
                onRequestCancel={noop}
                onRequestReturn={noop}
                onRefresh={noop}
            />,
        );
        expect(screen.getAllByText('Acima do catálogo')).toHaveLength(1);
    });
});

describe('itens 3b e 8 — detalhe da venda de pacote', () => {
    const renderPanel = (sale: SaleRecord, items: SaleItemRecord[]) => render(
        <SaleDetailPanel
            sale={sale}
            table={null}
            items={items}
            computedSubtotal={0}
            isUpdating={null}
            productNameMap={{}}
            serviceNameMap={{}}
            packageNameMap={{ pkgA: 'Pacote 10 sessões' }}
            customerNameMap={{}}
            unitNameMap={{}}
            onUpdateSale={async () => {}}
            onRequestPay={() => {}}
            onRequestCancel={() => {}}
            onRequestReturn={() => {}}
        />,
    );
    const sale = (over: Partial<SaleRecord> = {}) =>
        ({ id: 's1', status: 'Finalized', paymentStatus: 'Pending', totalAmount: 320, ...over }) as SaleRecord;
    const item = { id: 'i1', saleId: 's1', type: 'Package', packageId: 'pkgA', quantity: 2, unitPrice: 160 } as SaleItemRecord;

    it('mostra o tipo Pacote e o nome do pacote', () => {
        renderPanel(sale(), [item]);
        // Sem instância i18next o t() cai no default (o próprio tipo); a chave type_package traduz no app.
        expect(screen.getByText('Package')).toBeInTheDocument();
        expect(screen.getByText('Pacote 10 sessões')).toBeInTheDocument();
    });

    it('etiqueta "Acima do catálogo" só com aboveCatalogPrice true', () => {
        renderPanel(sale({ aboveCatalogPrice: true }), [item]);
        expect(screen.getByText('Acima do catálogo')).toBeInTheDocument();
        cleanup();
        renderPanel(sale({ aboveCatalogPrice: false }), [item]);
        expect(screen.queryByText('Acima do catálogo')).toBeNull();
    });
});
