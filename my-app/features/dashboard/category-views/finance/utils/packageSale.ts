/**
 * Regras de tela da venda de pacote pré-pago (FE-INCR-VENDA-PACOTE).
 *
 * Fonte: docs/accounting/FE-INCR-VENDA-PACOTE-brief.md §3 (itens 3–6) e as cédulas de
 * D-2026-10-05-FE-PACOTE-VALIDADE-FORKS (F-FE-VP-1/1b/3). Valem só no wizard: pela tabela
 * genérica ou pela API o servidor não as aplica (BRIEF §8).
 */

import type { NewSaleItem, SaleItemKind } from '../types/sales.types';

export interface PackageCatalogEntry {
    name: string;
    price: number;
    validityDays: number | null;
    active: boolean;
}

export type PackageCatalog = Record<string, PackageCatalogEntry>;

/** Quantidade que conta no subtotal: serviço é sempre 1; produto e pacote (F-FE-VP-3 b) usam a quantidade. */
export function lineQuantity(item: { itemType?: SaleItemKind; type?: SaleItemKind; serviceId?: string; quantity?: number }): number {
    const kind = item.itemType ?? item.type ?? (item.serviceId ? 'Service' : undefined);
    return kind === 'Service' ? 1 : Number(item.quantity || 1);
}

const toCents = (v: number) => Math.round(Number(v || 0) * 100);

/** Preço unitário acima do catálogo (comparado em centavos: evita ruído de float). */
export function isAboveCatalog(item: NewSaleItem, catalog: PackageCatalog): boolean {
    const entry = item.packageId ? catalog[item.packageId] : undefined;
    return !!entry && toCents(item.unitPrice ?? 0) > toCents(entry.price);
}

/** Abaixo do catálogo é proibido: desconto só pelo campo Desconto da venda (F-FE-VP-1). */
export function isBelowCatalog(item: NewSaleItem, catalog: PackageCatalog): boolean {
    const entry = item.packageId ? catalog[item.packageId] : undefined;
    return !!entry && toCents(item.unitPrice ?? 0) < toCents(entry.price);
}

export type PackageSaleIssue =
    | 'customer_required'          // item 5: o saldo fica no nome do cliente (V7)
    | 'mixed_packages'             // item 4: um packageId por venda (V4)
    | 'package_not_in_catalog'     // sem o preço de referência as regras 3a/3b não valem: recusa (review 05/10)
    | 'below_catalog'              // item 3a
    | 'above_catalog_unsupported'; // item 3b × I3: tabela de vendas sem o campo aboveCatalogPrice

/**
 * Primeiro impedimento da venda de pacote, ou null. `canFlagAboveCatalog` = a tabela de vendas
 * tem o campo `aboveCatalogPrice`; sem ele a marca se perderia (o servidor descarta chave fora do
 * schema), então a venda acima do catálogo é recusada até o admin sincronizar o preset (I3, dono 05/10).
 */
export function packageSaleIssue(
    items: NewSaleItem[],
    customerId: string,
    catalog: PackageCatalog,
    canFlagAboveCatalog: boolean,
): PackageSaleIssue | null {
    if (!customerId) return 'customer_required';
    const ids = new Set(items.map(i => i.packageId).filter(Boolean));
    if (ids.size > 1) return 'mixed_packages';
    // Catálogo que falhou, ainda carregando ou desatualizado: sem referência não há como garantir
    // "abaixo do catálogo nunca sai" nem a marca acima do catálogo.
    if (items.some(i => i.packageId && !catalog[i.packageId])) return 'package_not_in_catalog';
    if (items.some(i => isBelowCatalog(i, catalog))) return 'below_catalog';
    if (!canFlagAboveCatalog && items.some(i => isAboveCatalog(i, catalog))) return 'above_catalog_unsupported';
    return null;
}
