import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, cleanup, act, screen, fireEvent } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

/**
 * L-20261113-152227-8ab8: o efeito de auto-save saía com `!!error`, e uma falha de save seta `error`: toda edição
 * seguinte se perdia em silêncio até recarregar. Guarda: depois de um saveConfig que falha, a próxima edição salva.
 */

const auth = vi.hoisted(() => ({ user: { id: 'u-1', username: 'u', role: 'USER' } as Record<string, unknown> }));
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
vi.mock('../FloatingAddWidgetButton', () => ({
  default: ({ onAddWidget }: { onAddWidget: (t: string) => void }) => (
    <button onClick={() => onAddWidget('analytics')}>add</button>
  ),
}));

import DashboardGrid from '../dashboard-grid';

class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof NoopResizeObserver }).ResizeObserver = NoopResizeObserver;

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  cleanup();
  vi.clearAllMocks();
});

describe('DashboardGrid — auto-save continua depois de uma falha', () => {
  it('saveConfig falha na 1ª edição; a 2ª edição ainda dispara saveConfig', async () => {
    layoutSvc.list.mockResolvedValue([
      { id: 'l-1', userId: 'u-1', name: 'Dashboard', isActive: true, type: 'GRID', config: { positions: [], columns: 12, widgets: [] } },
    ]);
    layoutSvc.saveConfig.mockRejectedValueOnce(new Error('rede')).mockResolvedValue(undefined);

    render(<DashboardGrid />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    fireEvent.click(screen.getByText('add'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
    });
    expect(layoutSvc.saveConfig).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert')).toHaveTextContent('rede');

    fireEvent.click(screen.getByText('add'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
    });
    expect(layoutSvc.saveConfig).toHaveBeenCalledTimes(2);
  });
});
