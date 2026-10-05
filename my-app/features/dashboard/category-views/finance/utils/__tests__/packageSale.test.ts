import { describe, it, expect } from 'vitest';
import { lineQuantity, isAboveCatalog, isBelowCatalog, packageSaleIssue, type PackageCatalog } from '../packageSale';
import type { NewSaleItem } from '../../types/sales.types';

const catalog: PackageCatalog = {
    pkgA: { name: 'Pacote A', price: 300, validityDays: 180, active: true },
    pkgB: { name: 'Pacote B', price: 500, validityDays: null, active: true },
};
const pkg = (over: Partial<NewSaleItem> = {}): NewSaleItem => ({
    id: 't1', itemType: 'Package', packageId: 'pkgA', quantity: 1, unitPrice: 300, ...over,
});

describe('lineQuantity (F-FE-VP-3 b: quantidade N do pacote conta)', () => {
    it('pacote e produto usam a quantidade; serviço é sempre 1', () => {
        expect(lineQuantity({ itemType: 'Package', quantity: 3 })).toBe(3);
        expect(lineQuantity({ itemType: 'Product', quantity: 2 })).toBe(2);
        expect(lineQuantity({ itemType: 'Service', quantity: 4 })).toBe(1);
    });
    it('linha gravada sem tipo: serviceId → 1; packageId → quantidade', () => {
        expect(lineQuantity({ serviceId: 's1', quantity: 5 })).toBe(1);
        expect(lineQuantity({ type: 'Package', quantity: 2 })).toBe(2);
    });
});

describe('preço contra o catálogo (F-FE-VP-1)', () => {
    it('igual ao catálogo não é acima nem abaixo; centavos decidem', () => {
        expect(isAboveCatalog(pkg(), catalog)).toBe(false);
        expect(isBelowCatalog(pkg(), catalog)).toBe(false);
        expect(isAboveCatalog(pkg({ unitPrice: 300.01 }), catalog)).toBe(true);
        expect(isBelowCatalog(pkg({ unitPrice: 299.99 }), catalog)).toBe(true);
    });
    it('pacote fora do índice não é julgado', () => {
        expect(isBelowCatalog(pkg({ packageId: 'x', unitPrice: 1 }), catalog)).toBe(false);
    });
});

describe('packageSaleIssue', () => {
    it('sem cliente → customer_required (item 5)', () => {
        expect(packageSaleIssue([pkg()], '', catalog, true)).toBe('customer_required');
    });
    it('dois pacotes diferentes → mixed_packages; o mesmo em duas linhas passa (item 4, V4)', () => {
        expect(packageSaleIssue([pkg(), pkg({ id: 't2', packageId: 'pkgB', unitPrice: 500 })], 'c1', catalog, true)).toBe('mixed_packages');
        expect(packageSaleIssue([pkg(), pkg({ id: 't2' })], 'c1', catalog, true)).toBeNull();
    });
    it('abaixo do catálogo → below_catalog (item 3a)', () => {
        expect(packageSaleIssue([pkg({ unitPrice: 250 })], 'c1', catalog, true)).toBe('below_catalog');
    });
    it('acima do catálogo sem o campo na tabela → bloqueia; com o campo → passa (I3)', () => {
        expect(packageSaleIssue([pkg({ unitPrice: 350 })], 'c1', catalog, false)).toBe('above_catalog_unsupported');
        expect(packageSaleIssue([pkg({ unitPrice: 350 })], 'c1', catalog, true)).toBeNull();
        expect(packageSaleIssue([pkg()], 'c1', catalog, false)).toBeNull();
    });
});
