import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

/**
 * H2 C7 achado 21-4 (03/11, PR #982): o primeiro login de usuário novo criou DOIS dashboards. Causa: o efeito que
 * carrega as abas dependia do OBJETO `user`, e o AuthContext refaz `setUser` com objeto novo a cada
 * `routeChangeComplete` (`checkAuthState({ silent: true })`). Duas cargas concorrentes viam a lista vazia e as duas
 * criavam a aba padrão. Guarda: o mesmo usuário com objeto novo, antes de a lista chegar, cria a aba uma vez só.
 */

const auth = vi.hoisted(() => ({ user: { id: 'u-novo', username: 'novo', role: 'USER' } as Record<string, unknown> }));
const layoutSvc = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  saveConfig: vi.fn(),
  rename: vi.fn(),
  activate: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@/lib/context/AuthContext', () => ({ useAuth: () => ({ user: auth.user }) }));
vi.mock('@/lib/services/dashboardLayout.service', () => ({ DashboardLayoutService: layoutSvc }));
vi.mock('react-grid-layout', () => ({
  WidthProvider: (C: unknown) => C,
  Responsive: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('react-grid-layout/css/styles.css', () => ({}));
vi.mock('react-resizable/css/styles.css', () => ({}));
vi.mock('../../chat/components/DocumentChatWidget', () => ({ default: () => null }));
vi.mock('../../generic-chat/components/GenericChatWidget', () => ({ default: () => null }));
vi.mock('../../analytics/AnalyticsWidget', () => ({ default: () => null }));
vi.mock('../../erp-view/ErpViewWidget', () => ({ default: () => null }));
vi.mock('../../crm-report/CrmReportWidget', () => ({ default: () => null }));
vi.mock('../DashboardTabsBar', () => ({ default: () => null }));
vi.mock('../FloatingAddWidgetButton', () => ({ default: () => null }));

import DashboardGrid from '../dashboard-grid';

class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof NoopResizeObserver }).ResizeObserver = NoopResizeObserver;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('DashboardGrid — primeiro login cria a aba padrão uma vez (H2 21-4)', () => {
  it('o AuthContext troca o objeto do mesmo usuário com a lista ainda em voo: create é chamado 1 vez', async () => {
    const pending: Array<(v: unknown[]) => void> = [];
    layoutSvc.list.mockImplementation(() => new Promise((resolve) => pending.push(resolve)));
    layoutSvc.create.mockImplementation(async (name: string) => ({
      id: 'l-1', userId: 'u-novo', name, isActive: true, type: 'GRID', config: { positions: [], columns: 12, widgets: [] },
    }));

    const { rerender } = render(<DashboardGrid />);
    // checkAuthState({ silent: true }) do routeChangeComplete: mesmo usuário, objeto novo.
    auth.user = { ...auth.user };
    rerender(<DashboardGrid />);

    await act(async () => {
      for (const resolve of pending) resolve([]);
    });

    expect(layoutSvc.create).toHaveBeenCalledTimes(1);
  });
});
