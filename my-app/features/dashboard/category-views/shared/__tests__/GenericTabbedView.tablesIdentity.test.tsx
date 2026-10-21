import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, fireEvent, cleanup, screen } from '@testing-library/react';
import type { IDynamicTable } from '../../../components/shared/dynamic-tables.client';

/**
 * Teste-guarda — ACHADOS-2026-10-19 §3.5 item 6 (FIX-FE-DASHBOARD).
 *
 * O efeito de reset da `GenericTabbedView` depende de `[tables]` (identidade do array). Um pai que monta
 * `tables` a cada render (ex.: `.filter(...)` sem memo) passa um array novo com as MESMAS tabelas, e o efeito volta
 * a aba para a primeira e zera busca/filtros/página. Comportamento correto esperado: re-render do pai com as mesmas
 * tabelas (mesmos ids) mantém a aba escolhida.
 */
const activeIds: string[] = [];

vi.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (key: string, def?: unknown) => (typeof def === 'string' ? def : key) }),
}));
vi.mock('next/link', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../hooks/useGenericData', () => ({
  useGenericData: (activeTableId: string) => {
    activeIds.push(activeTableId);
    return { table: null, records: [], schema: null, isLoading: false, error: null, refetch: vi.fn(), relationLookups: {}, deleteRecord: vi.fn() };
  },
}));
vi.mock('../components/CategoryTabs', () => ({
  default: ({ tabs, activeTabId, onTabChange }: { tabs: { id: string; label: string }[]; activeTabId: string; onTabChange: (id: string) => void }) => (
    <div>
      {tabs.map((tab) => (
        <button key={tab.id} aria-pressed={tab.id === activeTabId} onClick={() => onTabChange(tab.id)}>{tab.label}</button>
      ))}
    </div>
  ),
}));
vi.mock('../components/GenericTable', () => ({ GenericTable: () => null }));
vi.mock('../components/GenericFilterBar', () => ({ GenericFilterBar: () => null }));
vi.mock('../components/CategoryHeader', () => ({ default: () => null }));
vi.mock('../components/SavedViewsMenu', () => ({ SavedViewsMenu: () => null }));
vi.mock('../hooks/useFilterPersistence', () => ({ useFilterPersistence: () => ({ isOpen: false, toggle: vi.fn() }) }));
vi.mock('../hooks/useTableViews', () => ({ useTableViews: () => ({ views: [], isLoading: false, saveView: vi.fn(), deleteView: vi.fn() }) }));
vi.mock('../../../../crm/hooks/useOwnerFilter', () => ({
  OWNER_FILTER_ALL: '__all__',
  useOwnerFilter: () => ({
    options: [], selectedOwnerId: '__all__', setSelectedOwnerId: vi.fn(), hasMultipleOwners: false,
    mine: false, setMine: vi.fn(), canUseMine: false, filterByOwner: (r: unknown[]) => r,
  }),
}));
vi.mock('../../../components/shared/FloatingActionButton', () => ({ default: () => null }));
vi.mock('../../../shared/components/StandardPagination', () => ({ StandardPagination: () => null }));
vi.mock('../../../shared/components/ConfirmDeleteModal', () => ({ ConfirmDeleteModal: () => null }));
vi.mock('../../../../../lib/services/dynamic-table.service', () => ({ DynamicTableService: {} }));

import GenericTabbedView from '../GenericTabbedView';

afterEach(() => cleanup());

const mk = () => [
  { id: 't1', name: 'Clientes', schema: { fields: [] } },
  { id: 't2', name: 'Fornecedores', schema: { fields: [] } },
] as unknown as IDynamicTable[];

describe('GenericTabbedView — identidade de `tables`', () => {
  it('re-render do pai com array novo das mesmas tabelas mantém a aba escolhida', () => {
    const { rerender } = render(<GenericTabbedView tables={mk()} title="T" description="D" />);
    fireEvent.click(screen.getByRole('button', { name: 'Fornecedores' }));
    expect(activeIds[activeIds.length - 1]).toBe('t2');

    rerender(<GenericTabbedView tables={mk()} title="T" description="D" />);
    expect(activeIds[activeIds.length - 1]).toBe('t2');
  });
});
