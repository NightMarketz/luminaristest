import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { getTables, getTableById } = vi.hoisted(() => ({ getTables: vi.fn(), getTableById: vi.fn() }));
vi.mock('../../../../lib/services/dynamic-table.service', () => ({ DynamicTableService: { getTables, getTableById } }));

import { useReportSources } from '../useReportSources';

/**
 * Fontes do builder — FE-INCR-CRM-REPORT-BUILDER PR-A, itens 3–4 (+ achado 5 do review: `fieldsOf` chamado antes da
 * lista de tabelas chegar espera por ela, em vez de devolver "sem campos").
 */
describe('useReportSources', () => {
  beforeEach(() => {
    getTables.mockReset();
    getTableById.mockReset();
  });

  it('só as fontes instaladas; os campos vêm do envelope { data: { schema } }', async () => {
    getTables.mockResolvedValue({ data: [{ id: 't1', internalName: 'leads' }, { id: 't2', internalName: 'employees' }] });
    getTableById.mockResolvedValue({ success: true, data: { schema: { fields: [{ name: 'status', type: 'select' }] } } });
    const { result } = renderHook(() => useReportSources());
    await act(async () => {});
    expect(result.current.sources).toEqual(['leads']);
    await expect(result.current.fieldsOf('leads')).resolves.toEqual([{ name: 'status', type: 'select' }]);
    expect(getTableById).toHaveBeenCalledWith('t1');
    await expect(result.current.fieldsOf('crmAccounts')).resolves.toBeNull();
  });

  it('review — achado 5: fieldsOf antes de getTables responder espera a lista', async () => {
    let release: (v: unknown) => void = () => {};
    getTables.mockReturnValue(new Promise((r) => (release = r)));
    getTableById.mockResolvedValue({ data: { schema: { fields: [{ name: 'amount', type: 'number' }] } } });
    const { result } = renderHook(() => useReportSources());
    const pending = result.current.fieldsOf('leadProposals');
    await act(async () => release({ data: [{ id: 'p1', internalName: 'leadProposals' }] }));
    await expect(pending).resolves.toEqual([{ name: 'amount', type: 'number' }]);
  });
});
