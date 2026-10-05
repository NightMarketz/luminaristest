import { describe, it, expect, vi } from 'vitest';
import { toSaleItemPayload } from '../FinanceService';

vi.mock('@/lib/services/dynamic-table.service', () => ({ DynamicTableService: {} }));

describe('toSaleItemPayload (FE-INCR-VENDA-PACOTE item 6)', () => {
    it('pacote vai com type Package, packageId e a quantidade N', () => {
        expect(toSaleItemPayload('s1', { id: 't', itemType: 'Package', packageId: 'pkgA', quantity: 3, unitPrice: 300 }))
            .toMatchObject({ saleId: 's1', type: 'Package', packageId: 'pkgA', quantity: 3, unitPrice: 300, productId: undefined, serviceId: undefined });
    });
    it('serviço continua com quantidade 1', () => {
        expect(toSaleItemPayload('s1', { id: 't', itemType: 'Service', serviceId: 'sv', quantity: 4, unitPrice: 50 }).quantity).toBe(1);
    });
});
