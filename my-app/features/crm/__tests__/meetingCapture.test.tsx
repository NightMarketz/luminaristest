import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, renderHook, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';

vi.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (_k: string, d?: string) => d ?? _k }),
}));
vi.mock('next-i18next/serverSideTranslations', () => ({ serverSideTranslations: vi.fn() }));
vi.mock('next/router', () => ({ useRouter: () => ({ query: { id: 'l1' } }) }));
vi.mock('../../../lib/hoc/withAuth', () => ({ default: (C: unknown) => C }));
vi.mock('../../../lib/context/CrmContext', () => ({
  CrmProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../../../lib/context/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('../../../lib/notifications/notify', () => ({ notify: vi.fn() }));
vi.mock('../../../lib/services/dynamic-table.service', () => ({
  DynamicTableService: { getTableById: vi.fn(async () => ({ success: true, data: { schema: { fields: [] } } })) },
}));
vi.mock('../../../lib/services/crm.service', () => ({
  CrmService: { advanceStage: vi.fn(async () => ({ success: true })) },
}));
vi.mock('../components/CrmLayout', () => ({
  CrmLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
// Painéis do Lead360 buscam dados próprios — fora do escopo do avanço de etapa.
vi.mock('../components/LeadTasksPanel', () => ({ LeadTasksPanel: () => null }));
vi.mock('../components/LeadNotesPanel', () => ({ LeadNotesPanel: () => null }));
vi.mock('../components/LeadTimelinePanel', () => ({ LeadTimelinePanel: () => null }));
vi.mock('../components/LeadAttachmentsPanel', () => ({ LeadAttachmentsPanel: () => null }));
vi.mock('../components/LeadConvertModal', () => ({ LeadConvertModal: () => null }));
vi.mock('../components/OpportunityCreateModal', () => ({ OpportunityCreateModal: () => null }));

const { stages, lead, crmData } = vi.hoisted(() => {
  const pipelines = [{ id: 'p1', data: { name: 'Pipeline Padrão' } }];
  const stages = [
    { id: 's-init', data: { pipelineId: 'p1', name: 'Sem Contato', order: 1, type: 'init' } },
    { id: 's-meet', data: { pipelineId: 'p1', name: 'Reunião Agendada', order: 2, type: 'meeting' } },
  ];
  const lead = { id: 'l1', data: { pipelineId: 'p1', stageId: 's-init', leadName: 'Acme', status: 'Open' } };
  // Estável entre renders: arrays novos re-disparam os efeitos do board em loop.
  const crmData = {
    loading: false, error: null, leads: [lead], stages, pipelines, leadsTableId: 't-leads', reload: async () => {},
  };
  return { stages, lead, crmData };
});
vi.mock('../hooks/useCrmData', () => ({ useCrmData: () => crmData }));

import { CrmService } from '../../../lib/services/crm.service';
import { Lead360Modal } from '../components/Lead360Modal';
import { useCrmPipelineBoard } from '../hooks/useCrmPipelineBoard';
import LeadDetailPage from '../../../pages/crm/leads/[id]';

const advanceStage = CrmService.advanceStage as unknown as ReturnType<typeof vi.fn>;
const WHEN = '2099-01-15T10:30';

/** Após pedir o avanço: a data precisa ser capturada e ir como meetingAt (ISO). */
async function captureAndConfirm() {
  const input = await waitFor(() => {
    const el = document.querySelector('input[type="datetime-local"]');
    expect(el).not.toBeNull();
    return el as HTMLInputElement;
  });
  fireEvent.change(input, { target: { value: WHEN } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
  await waitFor(() =>
    expect(advanceStage).toHaveBeenCalledWith(
      expect.objectContaining({ leadId: 'l1', stageId: 's-meet', meetingAt: new Date(WHEN).toISOString() }),
    ),
  );
}

// Lacuna (build de produção 2026-09-26, GAP-MAP "avanço de lead para Reunião Agendada sem captura
// da data"): LeadsPlugin exige nextActionAt futuro ao entrar numa etapa `meeting`, mas nenhum dos 3
// caminhos de avanço pede a data nem envia `meetingAt` → 400 "A data/horário da reunião deve ser no futuro."
describe('avanço de lead para etapa de reunião captura a data', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('Lead360Modal pede a data e envia meetingAt', async () => {
    render(<Lead360Modal isOpen onClose={vi.fn()} lead={lead} stages={stages} onChanged={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Avançar para: Reunião Agendada/ }));
    await captureAndConfirm();
  });

  it('página do lead pede a data e envia meetingAt', async () => {
    render(<LeadDetailPage />);
    fireEvent.click(screen.getByRole('button', { name: /Avançar para: Reunião Agendada/ }));
    await captureAndConfirm();
  });

  it('quadro de leads: soltar numa etapa de reunião NÃO avança sem meetingAt', async () => {
    const { result } = renderHook(() => useCrmPipelineBoard());
    await waitFor(() => expect(result.current.columns.map((c) => c.id)).toContain('s-meet'));

    act(() => {
      result.current.handleDragEnd({ active: { id: 'l1' }, over: { id: 's-meet' } } as never);
    });

    await new Promise((r) => setTimeout(r, 0));
    const semData = advanceStage.mock.calls.filter(([p]) => typeof p?.meetingAt !== 'string');
    expect(semData).toEqual([]);
  });
});
