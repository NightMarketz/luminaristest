'use client';

/**
 * useSalesWizard Hook - Gerencia estado do wizard de criação de venda
 *
 * @description
 * Hook principal para gerenciar todo o estado e lógica do wizard de vendas.
 * Inclui gerenciamento de items, cálculos e submissão.
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import type { NewSaleItem, SalesWizardState, SaleData, WizardVariant } from '../../types';
import { FinanceService } from '../../services/FinanceService';
import {
    lineQuantity,
    isAboveCatalog,
    packageSaleIssue,
    type PackageCatalog,
    type PackageSaleIssue,
} from '../../utils/packageSale';
import { scopeToday } from '../../../../shared/utils/formatters';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface UseSalesWizardReturn {
    // State
    state: SalesWizardState;

    // Header setters
    setDate: (date: string) => void;
    setCustomerId: (id: string) => void;
    setUnitId: (id: string) => void;
    setNotes: (notes: string) => void;
    setSimpleCustomer: (simple: boolean) => void;
    setSimpleCustomerName: (name: string) => void;
    setPaymentMethod: (method: string) => void;
    setPaymentTermDays: (days: number) => void;
    setVariant: (variant: WizardVariant) => void;
    setDiscount: (amount: number) => void;

    // Item management
    addItem: () => void;
    removeItem: (tempId: string) => void;
    updateItem: (tempId: string, updates: Partial<NewSaleItem>) => void;

    // Computed values
    subtotal: number;
    totalAmount: number;
    itemCount: number;

    // Validation
    canSubmit: boolean;
    /** Impedimento da venda de pacote (null fora da variante `packages`) */
    packageIssue: PackageSaleIssue | null;

    // Submission
    submit: (salesTableId: string, saleItemsTableId: string, finalize?: boolean) => Promise<void>;
    reset: () => void;
}

// ─────────────────────────────────────────────────────────────
// Initial State
// ─────────────────────────────────────────────────────────────

// A data da venda vira o dia do RECONHECIMENTO DE RECEITA na ponte contábil: `scopeToday()` (fuso do
// escopo), nunca `toISOString()` — das 21h às 23h59 BRT o dia UTC já é o de amanhã.

const createInitialState = (): SalesWizardState => ({
    date: scopeToday(),
    customerId: '',
    unitId: '',
    notes: '',
    simpleCustomer: false,
    simpleCustomerName: '',
    paymentMethod: '',
    paymentTermDays: 0,
    discountAmount: 0,
    variant: 'products',
    items: [],
    isSubmitting: false,
    error: null,
});

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export interface UseSalesWizardOptions {
    /** Índice do catálogo de pacotes (usePackageCatalog) — preço de referência da variante `packages` */
    packageCatalog?: PackageCatalog;
    /** A tabela de vendas tem o campo `aboveCatalogPrice` (F-FE-VP-1b) */
    canFlagAboveCatalog?: boolean;
}

const EMPTY_CATALOG: PackageCatalog = {};

/**
 * Hook para gerenciar o wizard de criação de vendas
 */
export function useSalesWizard(options: UseSalesWizardOptions = {}): UseSalesWizardReturn {
    const packageCatalog = options.packageCatalog ?? EMPTY_CATALOG;
    const canFlagAboveCatalog = options.canFlagAboveCatalog ?? false;
    const [state, setState] = useState<SalesWizardState>(createInitialState);

    // Ref de snapshot — permite que submit leia o estado atual sem dependência estável quebrada
    const stateRef = useRef(state);
    stateRef.current = state;
    const catalogRef = useRef(packageCatalog);
    catalogRef.current = packageCatalog;
    const canFlagRef = useRef(canFlagAboveCatalog);
    canFlagRef.current = canFlagAboveCatalog;

    // ─────────────────────────────────────────────────────────────
    // Header Setters
    // ─────────────────────────────────────────────────────────────

    const setDate = useCallback((date: string) => {
        setState(prev => ({ ...prev, date }));
    }, []);

    const setCustomerId = useCallback((customerId: string) => {
        setState(prev => ({ ...prev, customerId }));
    }, []);

    const setUnitId = useCallback((unitId: string) => {
        setState(prev => ({ ...prev, unitId }));
    }, []);

    const setNotes = useCallback((notes: string) => {
        setState(prev => ({ ...prev, notes }));
    }, []);

    const setSimpleCustomer = useCallback((simpleCustomer: boolean) => {
        setState(prev => {
            // Pacote exige cliente cadastrado: o saldo fica no nome dele (BRIEF item 5, V7)
            if (simpleCustomer && prev.variant === 'packages') return prev;
            return { ...prev, simpleCustomer, customerId: simpleCustomer ? '' : prev.customerId };
        });
    }, []);

    const setSimpleCustomerName = useCallback((simpleCustomerName: string) => {
        setState(prev => ({ ...prev, simpleCustomerName }));
    }, []);

    const setPaymentMethod = useCallback((paymentMethod: string) => {
        setState(prev => ({ ...prev, paymentMethod }));
    }, []);

    const setPaymentTermDays = useCallback((paymentTermDays: number) => {
        setState(prev => ({ ...prev, paymentTermDays }));
    }, []);

    const setDiscount = useCallback((discountAmount: number) => {
        setState(prev => ({ ...prev, discountAmount }));
    }, []);

    // Variant setter — clears items on change to enforce type homogeneity (backend rule).
    // Pacote desliga o cliente avulso (item 5).
    const setVariant = useCallback((variant: WizardVariant) => {
        setState(prev => ({
            ...prev,
            variant,
            items: [],
            ...(variant === 'packages' ? { simpleCustomer: false, simpleCustomerName: '' } : {}),
        }));
    }, []);

    // ─────────────────────────────────────────────────────────────
    // Item Management
    // ─────────────────────────────────────────────────────────────

    const addItem = useCallback(() => {
        setState(prev => {
            const itemType = prev.variant === 'services' ? 'Service' : prev.variant === 'packages' ? 'Package' : 'Product';
            const newItem: NewSaleItem = {
                id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                itemType,
                quantity: 1,
                unitPrice: 0,
            };
            return { ...prev, items: [...prev.items, newItem] };
        });
    }, []);

    const removeItem = useCallback((tempId: string) => {
        setState(prev => ({
            ...prev,
            items: prev.items.filter(item => item.id !== tempId),
        }));
    }, []);

    const updateItem = useCallback((tempId: string, updates: Partial<NewSaleItem>) => {
        setState(prev => ({
            ...prev,
            items: prev.items.map(item =>
                item.id === tempId ? { ...item, ...updates } : item
            ),
        }));
    }, []);

    // ─────────────────────────────────────────────────────────────
    // Computed Values
    // ─────────────────────────────────────────────────────────────

    const subtotal = useMemo(() => {
        return state.items.reduce((sum, item) => sum + lineQuantity(item) * Number(item.unitPrice || 0), 0);
    }, [state.items]);

    const totalAmount = useMemo(
        () => Math.max(0, subtotal - (state.discountAmount || 0)),
        [subtotal, state.discountAmount]
    );

    const itemCount = useMemo(() => state.items.length, [state.items]);

    // ─────────────────────────────────────────────────────────────
    // Validation
    // ─────────────────────────────────────────────────────────────

    const packageIssue = useMemo(
        () => state.variant === 'packages'
            ? packageSaleIssue(state.items, state.customerId, packageCatalog, canFlagAboveCatalog)
            : null,
        [state.variant, state.items, state.customerId, packageCatalog, canFlagAboveCatalog]
    );

    const canSubmit = useMemo(() => {
        if (!state.unitId) return false;
        if (!state.simpleCustomer && !state.customerId) return false;
        if (state.items.length === 0) return false;
        if (packageIssue) return false;
        const idField = state.variant === 'services' ? 'serviceId' : state.variant === 'packages' ? 'packageId' : 'productId';
        return state.items.every(item => {
            if (!item[idField]) return false;
            if (Number(item.unitPrice || 0) <= 0) return false;
            return true;
        });
    }, [state.unitId, state.simpleCustomer, state.customerId, state.items, state.variant, packageIssue]);

    // ─────────────────────────────────────────────────────────────
    // Submission — useRef snapshot pattern: deps vazios, referência estável
    // ─────────────────────────────────────────────────────────────

    const submit = useCallback(async (
        salesTableId: string,
        saleItemsTableId: string,
        finalize: boolean = false
    ): Promise<void> => {
        const s = stateRef.current;

        // Recompute totals from snapshot to avoid stale closure on subtotal/totalAmount
        const sub = s.items.reduce((acc, item) => acc + lineQuantity(item) * Number(item.unitPrice || 0), 0);
        const total = Math.max(0, sub - (s.discountAmount || 0));
        // F-FE-VP-1b: flag na venda, sem guardar o preço do catálogo. Só vai quando a tabela tem o
        // campo (`canFlagAboveCatalog`); sem ele, a venda acima já foi barrada por `packageIssue`.
        const aboveCatalog = s.variant === 'packages' && s.items.some(i => isAboveCatalog(i, catalogRef.current));

        setState(prev => ({ ...prev, isSubmitting: true, error: null }));

        try {
            const saleData: SaleData = {
                date: s.date,
                customerId: s.simpleCustomer ? undefined : (s.customerId || undefined),
                simpleCustomer: s.simpleCustomer,
                simpleCustomerName: s.simpleCustomer ? s.simpleCustomerName : undefined,
                unitId: s.unitId || undefined,
                status: finalize ? 'Finalized' : 'Draft',
                paymentStatus: 'Pending',
                subtotal: sub,
                totalAmount: total,
                discountAmount: s.discountAmount > 0 ? s.discountAmount : undefined,
                paymentMethod: s.paymentMethod || undefined,
                paymentTermDays: s.paymentTermDays || undefined,
                notes: s.notes || undefined,
                ...(s.variant === 'packages' && canFlagRef.current ? { aboveCatalogPrice: aboveCatalog } : {}),
            };

            await FinanceService.createSaleWithItems(salesTableId, saleItemsTableId, saleData, s.items);
            setState(prev => ({ ...prev, isSubmitting: false }));
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao criar venda';
            setState(prev => ({ ...prev, isSubmitting: false, error: message }));
            throw err; // re-throw so the modal catch block receives the real error
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps -- stateRef.current always fresh

    const reset = useCallback(() => {
        setState(createInitialState());
    }, []);

    // ─────────────────────────────────────────────────────────────
    // Return
    // ─────────────────────────────────────────────────────────────

    return {
        state,
        setDate,
        setCustomerId,
        setUnitId,
        setNotes,
        setSimpleCustomer,
        setSimpleCustomerName,
        setPaymentMethod,
        setPaymentTermDays,
        setVariant,
        setDiscount,
        addItem,
        removeItem,
        updateItem,
        subtotal,
        totalAmount,
        itemCount,
        canSubmit,
        packageIssue,
        submit,
        reset,
    };
}
