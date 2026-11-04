import { describe, it, expect, vi } from 'vitest';
import { toSaleItemPayload } from '../FinanceService';

vi.mock('@/lib/services/dynamic-table.service', () => ({ DynamicTableService: {} }));

describe('toSaleItemPayload (FE-INCR-VENDA-PACOTE item 6)', () => {
    it('pacote vai com type Package, packageId e a quantidade N', () => {
        expect(toSaleItemPayload('s1', { id: 't', itemType: 'Package', packageId: 'pkgA', quantity: 3, unitPrice: 300 }))
            .toMatchObject({ saleId: 's1', type: 'Package', packageId: 'pkgA', quantity: 3, unitPrice: 300, productId: undefined, serviceId: undefined });
    });
    it('serviço grava a quantidade da linha (D-2026-11-04-VENDA-QUANTIDADE-SERVICO-E-PV-A)', () => {
        expect(toSaleItemPayload('s1', { id: 't', itemType: 'Service', serviceId: 'sv', quantity: 4, unitPrice: 50 }).quantity).toBe(4);
    });
});
