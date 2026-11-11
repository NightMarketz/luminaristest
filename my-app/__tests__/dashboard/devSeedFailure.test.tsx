import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

// F1-N3 (BRD F-73.2, resíduo do #1206): o botão de seed do painel (`pages/dashboard/index.tsx`, ligado por
// NEXT_PUBLIC_ENABLE_DEV_SEED ou `?devSeed=1`) engole a falha:
//   1. o seed que falha só vai ao console — `runDevSeed` recebe `() => {}` como canal de mensagem, então o
//      "ERRO FATAL" dele também se perde, e o botão volta ao normal como se tivesse dado certo;
//   2. a releitura das tabelas depois do seed troca a falha por `{ data: [] }` e zera o painel
//      ("Categoria Vazia"), embora as tabelas já carregadas continuem existindo.

vi.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'pt' } }),
}));
vi.mock('next-i18next/serverSideTranslations', () => ({ serverSideTranslations: vi.fn() }));
vi.mock('next/router', () => ({
  useRouter: () => ({ query: { category: 'Vendas' }, push: vi.fn(), replace: vi.fn(), isReady: true, pathname: '/dashboard' }),
}));
vi.mock('next/head', () => ({ default: () => null }));
vi.mock('next/dynamic', () => ({ default: () => () => <div data-testid="category-view" /> }));
// `user` estável: a página relê as tabelas a cada troca de `user` (efeito com `[user]`).
const auth = vi.hoisted(() => ({ user: { id: 'u1' }, isLoading: false }));
vi.mock('../../lib/context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../lib/services/dynamic-table.service', () => ({ DynamicTableService: { getTables: vi.fn() } }));
vi.mock('../../features/dev/seed', () => ({ runDevSeed: vi.fn() }));
vi.mock('../../features/dashboard/components/DashboardOverview', () => ({ default: () => null }));
vi.mock('../../features/dashboard/DashboardSidebar', () => ({
  DashboardSidebar: ({ onSeed }: { onSeed?: () => void }) => <button onClick={onSeed}>seed</button>,
}));

import DashboardPage from '../../pages/dashboard/index';
import { DynamicTableService } from '../../lib/services/dynamic-table.service';
import { runDevSeed } from '../../features/dev/seed';
import type { IDynamicTable } from '../../features/dashboard/components/shared/dynamic-tables.client';

const tables = [{ id: 't1', name: 'Vendas', category: 'Vendas' }] as unknown as IDynamicTable[];
const getTables = vi.mocked(DynamicTableService.getTables);
const seed = vi.mocked(runDevSeed);

describe('F1-N3 — seed do painel não engole a falha', () => {
  let notices: Array<{ message: string; type?: string }>;
  const onNotify = (e: Event) => notices.push((e as CustomEvent).detail);

  beforeEach(() => {
    notices = [];
    window.addEventListener('app:notify', onNotify);
    getTables.mockReset();
    seed.mockReset();
  });
  afterEach(() => {
    window.removeEventListener('app:notify', onNotify);
    cleanup();
  });

  it('seed que falha avisa o usuário com o motivo', async () => {
    getTables.mockResolvedValue({ data: tables } as never);
    seed.mockRejectedValue(new Error('tabela de clientes ausente'));
    render(<DashboardPage allTables={tables} />);
    fireEvent.click(screen.getByText('seed'));
    await waitFor(() => expect(seed).toHaveBeenCalled());
    await waitFor(() =>
      expect(notices).toContainEqual(expect.objectContaining({ type: 'error', message: expect.stringContaining('tabela de clientes ausente') })),
    );
  });

  it('seed que falha num erro já notificado pelo apiClient não repete o toast', async () => {
    getTables.mockResolvedValue({ data: tables } as never);
    const httpError = Object.defineProperty(Object.assign(new Error('Erro 500'), { status: 500 }), 'notified', { value: true });
    seed.mockRejectedValue(httpError);
    render(<DashboardPage allTables={tables} />);
    fireEvent.click(screen.getByText('seed'));
    await waitFor(() => expect(seed).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(notices).toEqual([]);
  });

  it('releitura das tabelas que falha depois do seed mantém o painel', async () => {
    getTables.mockResolvedValueOnce({ data: tables } as never).mockRejectedValueOnce(new Error('Erro 500'));
    seed.mockResolvedValue(undefined);
    render(<DashboardPage allTables={tables} />);
    await waitFor(() => expect(getTables).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByText('seed'));
    await waitFor(() => expect(getTables).toHaveBeenCalledTimes(2));
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByText('emptyCategoryTitle')).toBeNull();
    expect(screen.getByTestId('category-view')).toBeInTheDocument();
  });
});
