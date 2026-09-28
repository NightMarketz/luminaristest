import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

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
    { id: 's-meet', data: { pipelineId: 'p1', name: 'Reunião Agendada', order: 1, type: 'meeting' } },
    { id: 's-prop', data: { pipelineId: 'p1', name: 'Proposta Enviada', order: 2, type: 'proposal' } },
  ];
  // Lead sem proposta gravada: nenhum latestProposal* no data.
  const lead = { id: 'l1', data: { pipelineId: 'p1', stageId: 's-meet', leadName: 'Acme', status: 'Open' } };
  const crmData = {
    loading: false, error: null, leads: [lead], stages, pipelines, leadsTableId: 't-leads', reload: async () => {},
  };
  return { stages, lead, crmData };
});
vi.mock('../hooks/useCrmData', () => ({ useCrmData: () => crmData }));

import { CrmService } from '../../../lib/services/crm.service';
import { ProposalCaptureModal } from '../components/ProposalCaptureModal';
import LeadDetailPage from '../../../pages/crm/leads/[id]';

const advanceStage = CrmService.advanceStage as unknown as ReturnType<typeof vi.fn>;

// Lacuna GAP-MAP linha 74: LeadsPlugin (server/.../LeadsPlugin.ts:171-183) exige
// latestProposalAmount (>= 0), latestProposalCurrency e latestProposalWinProbability (0-100) ao
// entrar numa etapa `proposal`. (a) pages/crm/leads/[id].tsx avança direto sem captura → 400
// "Informe o valor negociado…"; (b) ProposalCaptureModal deixa confirmar com Win % vazio → 400
// "Informe a probabilidade (0-100%) para avançar." (vale para Lead360Modal e quadro).
// Marcados it.fails até a sessão de correção: quando o fix entrar, remova o `.fails`.
describe('avanço de lead para etapa de proposta captura valor, moeda e Win %', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('(a) página do lead NÃO avança para proposal sem amount/currency/winProbability', async () => {
    render(<LeadDetailPage />);
    fireEvent.click(screen.getByRole('button', { name: /Avançar para: Proposta Enviada/ }));
    await new Promise((r) => setTimeout(r, 0));

    // Nenhuma chamada de avanço pode sair sem os três campos exigidos pela regra.
    const semProposta = advanceStage.mock.calls.filter(
      ([p]) => typeof p?.amount !== 'number' || !p?.currency || typeof p?.winProbability !== 'number',
    );
    expect(semProposta).toEqual([]);

    // E a captura precisa acontecer: preenche e confirma, o payload leva os 3 campos.
    const [amountInput, winInput] = await waitFor(() => {
      const els = document.querySelectorAll('input[type="number"]');
      expect(els.length).toBeGreaterThanOrEqual(2);
      return Array.from(els) as HTMLInputElement[];
    });
    fireEvent.change(amountInput, { target: { value: '1000' } });
    fireEvent.change(winInput, { target: { value: '60' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() =>
      expect(advanceStage).toHaveBeenCalledWith(
        expect.objectContaining({
          leadId: 'l1', stageId: 's-prop', amount: 1000, currency: expect.any(String), winProbability: 60,
        }),
      ),
    );
  });

  it('(b) ProposalCaptureModal não permite confirmar com Win % vazio', async () => {
    const onConfirm = vi.fn();
    render(<ProposalCaptureModal isOpen stageName="Proposta Enviada" onCancel={vi.fn()} onConfirm={onConfirm} />);
    const [amountInput] = Array.from(document.querySelectorAll('input[type="number"]')) as HTMLInputElement[];
    fireEvent.change(amountInput, { target: { value: '1000' } });

    const confirm = screen.getByRole('button', { name: 'Confirmar' });
    fireEvent.click(confirm);
    await new Promise((r) => setTimeout(r, 0));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(confirm).toBeDisabled();
  });
});
