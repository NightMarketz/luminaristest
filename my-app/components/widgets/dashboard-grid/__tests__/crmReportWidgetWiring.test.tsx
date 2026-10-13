import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('next-i18next', async () => (await import('@/features/crm/components/reports/__tests__/i18nPt')).nextI18nextPt());
const { ssrNamespaces } = vi.hoisted(() => ({ ssrNamespaces: [] as string[][] }));
vi.mock('next-i18next/serverSideTranslations', () => ({
  serverSideTranslations: async (_locale: string, ns: string[]) => {
    ssrNamespaces.push(ns);
    return {};
  },
}));
vi.mock('@/components/widgets/dashboard-grid', () => ({ default: () => null }));
vi.mock('@/lib/hoc/withAuth', () => ({ default: <T,>(c: T) => c }));
vi.mock('@/lib/context/AuthContext', () => ({ useAuth: () => ({ user: null }) }));

import { DASHBOARD_GRID_CONFIG } from '../dashboard-grid.config';
import { getWidgetDimensions } from '../utils/dashboard-grid.utils';
import FloatingAddWidgetButton from '../FloatingAddWidgetButton';
import { getServerSideProps } from '@/pages/index';

/**
 * Widget `crm-report` no grid do dashboard — FE-INCR-CRM-REPORT-BUILDER PR-D (item 20): tipo, dimensões
 * ([[D-2026-10-13-FE-CRM-RB-PR-B-D-LACUNAS]]: 6×12, mínimo 3×8), menu de adicionar (sempre) e o namespace `crm` no SSR
 * da página do dashboard (item 21; sem ele o widget fica sem texto no SSR).
 */
describe('widget crm-report no dashboard', () => {
  afterEach(() => cleanup());

  it('tipo e dimensões', () => {
    expect(DASHBOARD_GRID_CONFIG.WIDGET_TYPES.CRM_REPORT).toBe('crm-report');
    expect(getWidgetDimensions('crm-report')).toEqual({ W: 6, H: 12, MIN_W: 3, MIN_H: 8 });
  });

  it('o menu de adicionar oferece "Relatório do CRM" e adiciona o tipo crm-report', () => {
    const onAddWidget = vi.fn();
    render(<FloatingAddWidgetButton onAddWidget={onAddWidget} onClearLayout={vi.fn()} />);
    fireEvent.click(screen.getByText('Relatório do CRM'));
    expect(onAddWidget).toHaveBeenCalledWith('crm-report');
  });

  it('a página do dashboard carrega o namespace crm no SSR', async () => {
    await getServerSideProps({ locale: 'pt' } as Parameters<typeof getServerSideProps>[0]);
    expect(ssrNamespaces[ssrNamespaces.length - 1]).toContain('crm');
  });
});
