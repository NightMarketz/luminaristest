import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

// DashboardKpiCard não importa React (jsx preserve + runtime clássico): shim só no teste (my-app/CLAUDE.md).
(globalThis as unknown as { React: typeof React }).React = React;

import DashboardKpiCard from '../DashboardKpiCard';

/**
 * GAP-MAP Nível 5 — badge ▼ vermelho em tendência FLAT (memória `dashboard-kpi-card-flat-badge`).
 *
 * `DashboardKpiCard.tsx` só conhecia dois estados (`trend === 'up' ? '▲' : '▼'`): variação 0,00% saía como queda,
 * em vermelho. Esperado: flat não mostra seta de queda nem de alta, nem a cor de alerta.
 */
describe('DashboardKpiCard — trend flat', () => {
  afterEach(cleanup);

  const base = { title: 'Receita', value: 'R$ 1,0K', details: [], showGraph: false };

  it('flat com 0.00% não mostra ▼ nem ▲ e não usa a cor de queda', () => {
    const { container } = render(<DashboardKpiCard {...base} change="0.00%" trend="flat" />);

    expect(container.textContent).not.toContain('▼');
    expect(container.textContent).not.toContain('▲');
    expect(container.querySelector('.text-red-700')).toBeNull();
  });

  it('controle: down mostra ▼ e up mostra ▲', () => {
    const down = render(<DashboardKpiCard {...base} change="-5.00%" trend="down" />);
    expect(down.container.textContent).toContain('▼');
    cleanup();
    const up = render(<DashboardKpiCard {...base} change="+5.00%" trend="up" />);
    expect(up.container.textContent).toContain('▲');
  });
});
