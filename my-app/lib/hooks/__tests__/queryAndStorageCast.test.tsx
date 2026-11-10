import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, renderHook, screen, waitFor, cleanup } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

// BRD F-75.1 — `localStorage` e `router.query` lidos por cast, sem conferir o valor contra a lista aceita.
// Dois pontos da ficha (INVENTARIO-BRD.md, BRD-75) que mordem:
//   1. `useTheme`: `localStorage.getItem('theme') as Theme` — um valor fora de light|dark vira o tema.
//   2. `pages/dashboard`: `router.query.category as string` — `?category=a&category=b` chega como array e o
//      `.toLowerCase()` do efeito de redirecionamento lança.
// O terceiro ponto citado (`pages/crm/leads/[id].tsx`, `String(router.query.id)`) não reproduz: `[id]` é segmento
// dinâmico simples, e o Next sempre entrega string nele (o parâmetro da rota vence o da query).

const routerState = vi.hoisted(() => ({
  query: {} as Record<string, string | string[] | undefined>,
}));

vi.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
vi.mock('next-i18next/serverSideTranslations', () => ({ serverSideTranslations: vi.fn() }));
vi.mock('next/router', () => ({
  useRouter: () => ({
    isReady: true,
    query: routerState.query,
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));
vi.mock('cookies-next', () => ({ getCookie: vi.fn(), deleteCookie: vi.fn() }));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, isLoading: false }),
}));
vi.mock('../../services/dynamic-table.service', () => ({
  DynamicTableService: { getTables: vi.fn(async () => ({ success: true, data: [] })) },
}));
vi.mock('../../../features/dashboard/DashboardSidebar', () => ({ DashboardSidebar: () => null }));
vi.mock('../../../features/dashboard/components/DashboardOverview', () => ({
  default: () => <div data-testid="overview" />,
}));
vi.mock('../../../features/dev/seed', () => ({ runDevSeed: vi.fn() }));

import { useTheme } from '../useTheme';
import DashboardPage from '../../../pages/dashboard/index';

function mockMatchMedia(prefersDark: boolean) {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: prefersDark && q === '(prefers-color-scheme: dark)',
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe('BRD F-75.1 — valor de localStorage e router.query conferido contra a lista aceita', () => {
  beforeEach(() => {
    localStorage.clear();
    routerState.query = {};
  });
  afterEach(() => {
    cleanup();
    document.documentElement.classList.remove('dark');
  });

  it('useTheme: tema gravado fora de light|dark cai na preferência do sistema', async () => {
    localStorage.setItem('theme', 'purple');
    mockMatchMedia(true);

    const { result } = renderHook(() => useTheme());

    await waitFor(() => expect(localStorage.getItem('theme')).not.toBeNull());
    expect(result.current.theme).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('dashboard: ?category em array é ignorado e a página mostra a visão geral', async () => {
    mockMatchMedia(false);
    routerState.query = { category: ['finance', 'people'] };
    const errors: unknown[] = [];
    const onError = (e: ErrorEvent) => {
      errors.push(e.error);
      e.preventDefault();
    };
    window.addEventListener('error', onError);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      render(<DashboardPage allTables={[]} />);
      await waitFor(() => expect(screen.getByTestId('overview')).toBeInTheDocument());
    } finally {
      window.removeEventListener('error', onError);
      consoleError.mockRestore();
    }
    expect(errors).toEqual([]);
  });
});
