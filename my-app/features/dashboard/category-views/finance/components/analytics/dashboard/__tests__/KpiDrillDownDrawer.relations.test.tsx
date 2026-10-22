import React from 'react';
import { describe, it, expect, vi } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen } from '@testing-library/react';

/**
 * ACHADOS-2026-10-19 §3.5 item 30 (FIX-FE-DASHBOARD) — o drawer saiu do hook deprecado `useRelationLookups`
 * (Map único) para `useTableRelationLookups` (Map por campo). Guarda de regressão: campo `relation` do registro
 * detalhado mostra o nome do registro relacionado, não o id.
 */
vi.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (key: string, def?: unknown) => (typeof def === 'string' ? def : key) }),
}));

const schema = {
  id: 'sales',
  name: 'Vendas',
  schema: { fields: [{ name: 'client', label: 'Cliente', type: 'relation', relation: { targetTable: 'clients' } }] },
};
vi.mock('../../../../hooks/analytics/useDrillDownData', () => ({
  useDrillDownData: () => ({
    data: [{ id: 's1', data: { client: 'c1' } }],
    schema,
    pagination: null,
    loading: false,
    error: null,
  }),
}));

const getTableData = vi.fn().mockResolvedValue({ success: true, data: [{ id: 'c1', data: { name: 'Maria Souza' } }] });
vi.mock('../../../../../../../../lib/services/dynamic-table.service', () => ({
  DynamicTableService: { getTableData: (...args: unknown[]) => getTableData(...args) },
}));

import KpiDrillDownDrawer from '../KpiDrillDownDrawer';

describe('KpiDrillDownDrawer — relações', () => {
  it('resolve o campo relation para o nome do registro relacionado', async () => {
    render(<KpiDrillDownDrawer isOpen onClose={() => {}} tableId="sales" recordIds={['s1']} />);
    expect(await screen.findByText('Maria Souza')).toBeInTheDocument();
    expect(getTableData).toHaveBeenCalledWith('clients');
  });
});
