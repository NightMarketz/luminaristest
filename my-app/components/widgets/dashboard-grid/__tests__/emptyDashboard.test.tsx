import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, act, screen } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

/**
 * L-20261113-152224-3329: a página inicial ficava em branco sem widgets (sem h1, sem texto de vazio). Guarda: a grade
 * vazia explica o que fazer; com widgets, o aviso some.
 */

const auth = vi.hoisted(() => ({ user: { id: 'u-1', username: 'u', role: 'USER' } as Record<string, unknown> }));
const layoutSvc = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn(), saveConfig: vi.fn(), rename: vi.fn(), activate: vi.fn(), remove: vi.fn() }));

vi.mock('next-i18next', () => ({ useTranslation: () => ({ t: (_k: string, d?: string) => d ?? _k }) }));
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

describe('DashboardGrid — estado vazio', () => {
  it('sem widgets mostra o título e a dica', async () => {
    layoutSvc.list.mockResolvedValue([{ id: 'l-1', userId: 'u-1', name: 'Dashboard', isActive: true, type: 'GRID', config: { positions: [], columns: 12, widgets: [] } }]);
    render(<DashboardGrid />);
    await act(async () => {});
    expect(await screen.findByTestId('dashboard-empty')).toHaveTextContent('Seu dashboard está vazio');
    expect(screen.getByTestId('dashboard-empty')).toHaveTextContent('botão +');
  });
});
