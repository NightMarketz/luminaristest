import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, renderHook, screen, waitFor, cleanup } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

// BRD F-73.2 — pontos do front que engolem a falha de carga e mostram painel vazio no lugar de erro.
// Triagem dos 9 pontos que a ficha nomeia (INVENTARIO-BRD.md, BRD-73). Os 4 cobertos aqui reproduzem; os outros 5
// são intencionais ou inalcançáveis, e a lista está no GAP-MAP:
//   1. `fetchAllRows` (`lib/dynamicTableFetch.ts`): página que falha vira `[]` (ou corta a lista no meio).
//   2. `useKanbanData`: na primeira carga, se todas as tabelas falham, o quadro fica vazio e sem `error`.
//   3. `usePeopleData` + `InternalPeopleView`: tabela que falha aparece como "Nenhum resultado".
//   4. `ErpViewWidget`: falha ao listar as tabelas mostra o módulo vazio.
// O erro é de rede (`TypeError: Failed to fetch`) porque nesse caso o apiClient não mostra toast (BRD F-72.1).

vi.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, d?: unknown) => (typeof d === 'string' ? d : k),
    i18n: { language: 'pt' },
  }),
}));
vi.mock('next/router', () => ({
  useRouter: () => ({ query: {}, push: vi.fn(), replace: vi.fn(), isReady: true, pathname: '/' }),
}));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' }, isLoading: false }) }));
vi.mock('../context/CurrencyContext', () => ({
  useCurrency: () => ({
    currency: 'BRL',
    locale: 'pt-BR',
    formatCurrency: (v: number | null | undefined) => String(v ?? ''),
    setCurrency: vi.fn(),
  }),
}));
vi.mock('../services/dynamic-table.service', () => ({
  DynamicTableService: {
    getTables: vi.fn(),
    getTableById: vi.fn(),
    getTableData: vi.fn(),
  },
}));
// O widget só precisa chegar ao ramo de visualização; as visões em si ficam fora do caso.
vi.mock('@/features/dashboard/category-views/people/PeopleView', () => ({
  PeopleView: () => <div data-testid="people-view" />,
}));

import { DynamicTableService } from '../services/dynamic-table.service';
import { fetchAllRows } from '../dynamicTableFetch';
import { useKanbanData } from '../../features/dashboard/category-views/kanban/hooks/useKanbanData';
import InternalPeopleView from '../../features/dashboard/category-views/people/InternalPeopleView';
import ErpViewWidget from '../../components/widgets/erp-view/ErpViewWidget';
import type { IDynamicTable } from '../../features/dashboard/components/shared/dynamic-tables.client';

const offline = () => new TypeError('Failed to fetch');

describe('BRD F-73.2 — falha de carga chega ao usuário em vez de painel vazio', () => {
  beforeEach(() => {
    vi.mocked(DynamicTableService.getTables).mockReset();
    vi.mocked(DynamicTableService.getTableById).mockReset();
    vi.mocked(DynamicTableService.getTableData).mockReset();
    localStorage.clear();
    // jsdom não implementa scrollTo (CategoryTabs rola a aba ativa para a vista).
    Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
  });
  afterEach(() => cleanup());

  it('fetchAllRows: página que falha rejeita, em vez de devolver a lista vazia ou cortada', async () => {
    vi.mocked(DynamicTableService.getTableData).mockRejectedValueOnce(offline());
    await expect(fetchAllRows('t1')).rejects.toThrow('Failed to fetch');

    vi.mocked(DynamicTableService.getTableData)
      .mockResolvedValueOnce({ success: true, data: [{ id: 'r1', data: {} }], totalPages: 2 } as never)
      .mockRejectedValueOnce(offline());
    await expect(fetchAllRows('t1')).rejects.toThrow('Failed to fetch');
  });

  it('useKanbanData: primeira carga com todas as tabelas falhando preenche `error`', async () => {
    vi.mocked(DynamicTableService.getTableById).mockRejectedValue(offline());
    vi.mocked(DynamicTableService.getTableData).mockRejectedValue(offline());
    const tables = [{ id: 'k1', name: 'Tasks', category: 'kanban', schema: { fields: [] } }] as unknown as IDynamicTable[];

    const { result } = renderHook(() => useKanbanData(tables));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.tasks).toEqual([]);
    expect(result.current.error).not.toBeNull();
  });

  it('InternalPeopleView: tabela que falha mostra erro, não "Nenhum resultado"', async () => {
    vi.mocked(DynamicTableService.getTableData).mockRejectedValue(offline());
    const tables = [{ id: 'p1', name: 'Clientes', category: 'people', schema: { fields: [] } }] as unknown as IDynamicTable[];

    render(<InternalPeopleView tables={tables} />);

    expect(await screen.findByText('Erro ao carregar os dados.')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum resultado')).toBeNull();
  });

  it('ErpViewWidget: falha ao listar as tabelas mostra erro, não o módulo vazio', async () => {
    vi.mocked(DynamicTableService.getTables).mockRejectedValue(offline());
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<ErpViewWidget id="w1" initialConfig={{ categoryId: 'people' }} />);

    expect(await screen.findByText('Erro ao carregar os dados.')).toBeInTheDocument();
    expect(screen.queryByTestId('people-view')).toBeNull();
  });
});
