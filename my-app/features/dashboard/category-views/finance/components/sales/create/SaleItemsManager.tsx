'use client';

import React, { useMemo } from 'react';
import { useTranslation } from 'next-i18next';
import { HiX, HiShoppingCart, HiCog, HiGift } from 'react-icons/hi';
import RelationSelector from '@/features/dashboard/components/forms/RelationSelector';
import { QuantityInput, CurrencyInput } from './inputs';
import type { SchemaField, StockIndexEntry } from './types';
import type { NewSaleItem, WizardVariant } from '../../../types/sales.types';
import type { IDynamicTableData } from '../../../../../components/shared/dynamic-tables.client';
import { isBelowCatalog, lineQuantity, type PackageCatalog, type PackageSaleIssue } from '../../../utils/packageSale';

// ─────────────────────────────────────────────────────────────
// Module-level constants
// ─────────────────────────────────────────────────────────────

const SELECTOR_CLASS = 'w-full min-w-[140px] px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-900 dark:text-white transition-all duration-200';

const TH_CLASS = 'px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400';

// Pacote inativo não é escolhível (BRIEF item 3; I1 = filtro opcional no RelationSelector, dono 05/10).
// Módulo-level: referência estável, o seletor não refaz a carga a cada render.
const isActivePackage = (record: IDynamicTableData) => (record.data as Record<string, unknown> | undefined)?.active !== false;

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────

interface SaleItemsManagerProps {
    items: NewSaleItem[];
    variant: WizardVariant;
    unitId: string;
    saleItemsFields: SchemaField[];
    stockIndex: Record<string, StockIndexEntry>;
    packageCatalog?: PackageCatalog;
    packageIssue?: PackageSaleIssue | null;
    onAddItem: () => void;
    onRemoveItem: (tempId: string) => void;
    onUpdateItem: (tempId: string, patch: Partial<NewSaleItem>) => void;
    discountAmount: number;
    onDiscountChange: (val: number) => void;
    subtotal: number;
    totalAmount: number;
    formatCurrency: (val: number) => string;
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

/**
 * SaleItemsManager — ERP-grade table for sale items.
 * Products: Produto | Qtd | Preço Unit. | Total | [×]
 * Services: Serviço | Responsável | Preço | Total | [×]
 * Packages: Pacote | Qtd | Preço Unit. | Total | [×]
 */
export function SaleItemsManager({
    items,
    variant,
    unitId,
    saleItemsFields,
    stockIndex,
    packageCatalog = {},
    packageIssue = null,
    onAddItem,
    onRemoveItem,
    onUpdateItem,
    discountAmount,
    onDiscountChange,
    subtotal,
    totalAmount,
    formatCurrency,
}: SaleItemsManagerProps) {
    const { t } = useTranslation(['finance_view', 'common']);
    const isProduct = variant === 'products';
    const isPackage = variant === 'packages';
    const hasQuantity = !!(isProduct || isPackage);

    // Memoizado — recalcula só quando o schema da tabela de itens muda
    const { productTargetTable, serviceTargetTable, packageTargetTable, employeeTargetTable } = useMemo(() => ({
        productTargetTable:  saleItemsFields.find(f => f.name === 'productId')?.relation?.targetTable ?? '',
        serviceTargetTable:  saleItemsFields.find(f => f.name === 'serviceId')?.relation?.targetTable ?? '',
        packageTargetTable:  saleItemsFields.find(f => f.name === 'packageId')?.relation?.targetTable ?? '',
        employeeTargetTable: saleItemsFields.find(f => f.name === 'responsibleEmployeeId')?.relation?.targetTable ?? '',
    }), [saleItemsFields]);

    const addLabel = isPackage
        ? t('finance_view:sales.items.add_package', 'Adicionar pacote')
        : isProduct
        ? t('finance_view:sales.items.add_product', 'Adicionar produto')
        : t('finance_view:sales.items.add_service', 'Adicionar serviço');

    return (
        <div className="space-y-5">

            {/* ─── Empty state ─── */}
            {items.length === 0 ? (
                <div className="py-14 flex flex-col items-center gap-4 border-2 border-dashed border-gray-200 dark:border-gray-700/60 rounded-2xl">
                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center">
                        {isPackage
                            ? <HiGift size={22} className="text-gray-400 dark:text-gray-500" />
                            : isProduct
                            ? <HiShoppingCart size={22} className="text-gray-400 dark:text-gray-500" />
                            : <HiCog size={22} className="text-gray-400 dark:text-gray-500" />}
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                            {t('finance_view:sales.wizard.no_items', 'Nenhum item adicionado')}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {t('finance_view:sales.items.empty_hint', 'Clique abaixo para começar')}
                        </p>
                    </div>
                    <button
                        onClick={onAddItem}
                        className="px-5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-sm font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
                    >
                        +&nbsp;
                        {addLabel}
                    </button>
                </div>
            ) : (
                <>
                    {/* ─── Items table ─── */}
                    <div className="overflow-x-auto rounded-2xl border border-gray-200/60 dark:border-gray-800">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50/80 dark:bg-neutral-800/80 border-b border-gray-200/60 dark:border-gray-800">
                                    <th className={TH_CLASS}>
                                        {isPackage
                                            ? t('finance_view:sales.items.package', 'Pacote')
                                            : isProduct
                                            ? t('finance_view:sales.items.product', 'Produto')
                                            : t('finance_view:sales.items.service', 'Serviço')}
                                    </th>
                                    {hasQuantity && (
                                        <th className={`${TH_CLASS} w-28`}>
                                            {t('finance_view:sales.items.quantity', 'Qtd')}
                                        </th>
                                    )}
                                    {variant === 'services' && !!employeeTargetTable && (
                                        <th className={`${TH_CLASS} w-44`}>
                                            {t('finance_view:sales.items.responsible', 'Responsável')}
                                        </th>
                                    )}
                                    <th className={`${TH_CLASS} w-36`}>
                                        {t('finance_view:sales.items.unit_price', 'Preço Unit.')}
                                    </th>
                                    <th className={`${TH_CLASS} w-28 text-right`}>
                                        {t('finance_view:sales.items.total', 'Total')}
                                    </th>
                                    <th className="w-10" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 bg-white dark:bg-neutral-900">
                                {items.map(item => {
                                    const lineTotal = lineQuantity(item) * (item.unitPrice || 0);
                                    const belowCatalog = isPackage && isBelowCatalog(item, packageCatalog);
                                    // Compute stock availability directly from stockIndex — no intermediate stockInfo state needed
                                    const stockEntry = (isProduct && item.productId && unitId)
                                        ? stockIndex[`${item.productId}|${unitId}`] : null;
                                    const available = stockEntry ? Math.max(0, stockEntry.stock - stockEntry.reserved) : null;

                                    return (
                                        <tr key={item.id} className="group hover:bg-blue-50/20 dark:hover:bg-neutral-700/20 transition-colors align-top">
                                            {/* Product / Service selector */}
                                            <td className="px-4 py-2 align-top">
                                                <RelationSelector
                                                    name={isPackage ? 'packageId' : isProduct ? 'productId' : 'serviceId'}
                                                    value={(isPackage ? item.packageId : isProduct ? item.productId : item.serviceId) || ''}
                                                    filterRecord={isPackage ? isActivePackage : undefined}
                                                    onChange={(_: string, v: string | string[] | null) => {
                                                        const val = String(v || '');
                                                        if (isPackage) {
                                                            // F-FE-VP-1: o preço vem do catálogo (editável só para cima)
                                                            const entry = packageCatalog[val];
                                                            onUpdateItem(item.id, {
                                                                packageId: val,
                                                                ...(entry ? { unitPrice: entry.price } : {}),
                                                            });
                                                        } else if (isProduct) {
                                                            // Batch productId + salePrice into a single setState call
                                                            const entry = stockIndex[`${val}|${unitId}`];
                                                            onUpdateItem(item.id, {
                                                                productId: val,
                                                                ...(entry?.salePrice ? { unitPrice: entry.salePrice } : {}),
                                                            });
                                                        } else {
                                                            onUpdateItem(item.id, { serviceId: val });
                                                        }
                                                    }}
                                                    targetTable={isPackage ? packageTargetTable : isProduct ? productTargetTable : serviceTargetTable}
                                                    className={SELECTOR_CLASS}
                                                />
                                                {/* Stock availability badge — tight margin to avoid row-height bloat */}
                                                {isProduct && item.productId && available !== null && (
                                                    <span className={`mt-0.5 text-[9px] inline-block px-1.5 py-0 rounded font-bold leading-tight ${
                                                        available > 0
                                                            ? 'text-emerald-600 dark:text-emerald-400'
                                                            : 'text-red-500 dark:text-red-400'
                                                    }`}>
                                                        {available > 0
                                                            ? `${available} disp.`
                                                            : t('finance_view:sales.items.out_of_stock', 'Sem estoque')}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Quantity — products and packages (F-FE-VP-3 b) */}
                                            {hasQuantity && (
                                                <td className="px-4 py-2 w-28">
                                                    <QuantityInput
                                                        value={item.quantity || 1}
                                                        onChange={qty => onUpdateItem(item.id, { quantity: qty })}
                                                        min={1}
                                                    />
                                                </td>
                                            )}

                                            {/* Responsible employee — services only */}
                                            {variant === 'services' && !!employeeTargetTable && (
                                                <td className="px-4 py-2 w-44">
                                                    <RelationSelector
                                                        name="responsibleEmployeeId"
                                                        value={item.responsibleEmployeeId || ''}
                                                        onChange={(_: string, v: string | string[] | null) =>
                                                            onUpdateItem(item.id, { responsibleEmployeeId: String(v || '') || undefined })
                                                        }
                                                        targetTable={employeeTargetTable}
                                                        className={SELECTOR_CLASS}
                                                    />
                                                </td>
                                            )}

                                            {/* Unit price */}
                                            <td className="px-4 py-2 w-36">
                                                <CurrencyInput
                                                    value={item.unitPrice || 0}
                                                    onChange={price => onUpdateItem(item.id, { unitPrice: price })}
                                                />
                                                {belowCatalog && (
                                                    <p className="mt-0.5 text-[10px] font-semibold text-red-500 dark:text-red-400">
                                                        {t('finance_view:sales.package.below_catalog', 'Para cobrar menos que o catálogo, use o campo Desconto.')}
                                                    </p>
                                                )}
                                            </td>

                                            {/* Line total */}
                                            <td className="px-4 py-2 w-28 text-right font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                                                {formatCurrency(lineTotal)}
                                            </td>

                                            {/* Remove */}
                                            <td className="px-3 py-2 w-10 text-center">
                                                <button
                                                    onClick={() => onRemoveItem(item.id)}
                                                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                                                    title={t('common:remove', 'Remover')}
                                                >
                                                    <HiX size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* ─── Add item button ─── */}
                    <button
                        onClick={onAddItem}
                        className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors px-1"
                    >
                        <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xs font-black flex-shrink-0">
                            +
                        </span>
                        {addLabel}
                    </button>
                    {isPackage && packageIssue === 'mixed_packages' && (
                        <p className="text-xs font-semibold text-red-500 dark:text-red-400 px-1">
                            {t('finance_view:sales.package.one_package', 'Uma venda leva um único pacote. Para outro pacote, crie outra venda.')}
                        </p>
                    )}
                </>
            )}

            {/* ─── Totals section ─── */}
            {items.length > 0 && (
                <div className="rounded-2xl bg-gray-50/80 dark:bg-neutral-800/40 border border-gray-200/60 dark:border-gray-800 p-5 space-y-3">
                    {/* Subtotal */}
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 dark:text-gray-400 font-medium">
                            {t('finance_view:sales.labels.subtotal', 'Subtotal')}
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                            {formatCurrency(subtotal)}
                        </span>
                    </div>

                    {/* Discount */}
                    <div className="flex justify-between items-center text-sm gap-4">
                        <span className="text-gray-500 dark:text-gray-400 font-medium flex-shrink-0">
                            {t('finance_view:sales.labels.discount', 'Desconto')}
                        </span>
                        <div className="w-36">
                            <CurrencyInput
                                value={discountAmount}
                                onChange={onDiscountChange}
                                className="w-full px-3 py-1.5 rounded-lg bg-transparent border border-dashed border-gray-300 dark:border-gray-600 text-sm text-right font-semibold text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:bg-white dark:focus:bg-neutral-800 focus:border-solid transition-all duration-200"
                            />
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-200 dark:border-gray-700" />

                    {/* Total */}
                    <div className="flex justify-between items-center">
                        <span className="text-base font-black uppercase tracking-wide text-gray-700 dark:text-gray-200">
                            {t('finance_view:sales.labels.total', 'Total')}
                        </span>
                        <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {formatCurrency(totalAmount)}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
