import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

/**
 * L-20261113-152222-7199: o CRM mostrava erro de API como vazio ("Oportunidades não instaladas", "Nenhuma etapa",
 * "0 reuniões", KPIs 0) e sem "Tentar novamente". Guarda: a falha vira role=alert + retry e a tela não exibe o vazio
 * por baixo dela.
 */

const tr = vi.hoisted(() => ({
  value: {
    t: (k: string, d?: unknown) => (typeof d === 'string' ? d : ((d as { defaultValue?: string } | undefined)?.defaultValue ?? k)),
    i18n: { language: 'pt' },
  },
}));
vi.mock('next-i18next', () => ({ useTranslation: () => tr.value }));

const oppBoard = vi.hoisted(() => ({ reload: vi.fn() }));
vi.mock('../../hooks/useOppPipelineBoard', () => ({
  useOppPipelineBoard: () => ({
    loading: false,
    error: 'Falha de rede',
    notInstalled: true,
    pipelines: [],
    stages: [],
    activePipelineId: null,
    setActivePipelineId: vi.fn(),
    columns: [],
    opportunitiesByStage: new Map(),
    oppById: new Map(),
    activeOpportunity: null,
    ownerOptions: [],
    selectedOwnerId: '',
    setSelectedOwnerId: vi.fn(),
    showOwnerFilter: false,
    mine: false,
    setMine: vi.fn(),
    canUseMine: false,
    pendingProposal: null,
    handleDragStart: vi.fn(),
    handleDragEnd: vi.fn(),
    confirmProposal: vi.fn(),
    cancelProposal: vi.fn(),
    reload: oppBoard.reload,
  }),
}));

const analytics = vi.hoisted(() => ({ retry: vi.fn() }));
vi.mock('../../hooks/useCrmAnalytics', () => ({
  useCrmAnalytics: () => ({
    datePreset: 'thisYear',
    setDatePreset: vi.fn(),
    data: { cards: [], funnel: [], source: [], status: [], bant: [], proposals: [], activities: [] },
    loading: false,
    error: 'Falha no analytics',
    retry: analytics.retry,
  }),
}));

const crmTable = vi.hoisted(() => ({ reload: vi.fn(async () => {}) }));
vi.mock('../../hooks/useCrmTable', () => ({
  useCrmTable: () => ({ loading: false, error: 'Falha nas atividades', rows: [], table: null, reload: crmTable.reload }),
}));
vi.mock('@fullcalendar/react', () => ({ default: () => <div data-testid="calendar" /> }));
vi.mock('@fullcalendar/daygrid', () => ({ default: {} }));
vi.mock('@fullcalendar/timegrid', () => ({ default: {} }));
vi.mock('@fullcalendar/interaction', () => ({ default: {} }));

import { CrmLoadError } from '../CrmLoadError';
import { OppPipelineBoard } from '../OppPipelineBoard';
import { CrmAnalyticsDashboard } from '../analytics/CrmAnalyticsDashboard';
import { MeetingsCalendar } from '../MeetingsCalendar';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CRM — erro de carga não vira vazio', () => {
  it('CrmLoadError: role=alert e retry opcional', () => {
    const onRetry = vi.fn();
    render(<CrmLoadError message="x" onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('x');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('Oportunidades: erro mostra alerta + retry e NÃO "não instaladas" nem "sem etapas"', () => {
    render(<OppPipelineBoard />);
    expect(screen.getByRole('alert')).toHaveTextContent('Falha de rede');
    expect(screen.queryByText('Oportunidades não instaladas')).toBeNull();
    expect(screen.queryByText('Nenhuma etapa configurada.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(oppBoard.reload).toHaveBeenCalledTimes(1);
  });

  it('Analytics: erro mostra alerta + retry', () => {
    render(<CrmAnalyticsDashboard />);
    expect(screen.getByRole('alert')).toHaveTextContent('Falha no analytics');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(analytics.retry).toHaveBeenCalledTimes(1);
  });

  it('Reuniões: erro mostra alerta e não "0 reuniões encontradas"', () => {
    render(<MeetingsCalendar />);
    expect(screen.getByRole('alert')).toHaveTextContent('Falha nas atividades');
    expect(screen.queryByText(/reuniões encontradas/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(crmTable.reload).toHaveBeenCalled();
  });
});
