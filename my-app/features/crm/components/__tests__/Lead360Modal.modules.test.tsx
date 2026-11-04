import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

/**
 * H2 C7 achado 21-3 (03/11, PR #982): o Lead 360 oferecia "Converter Lead" e "Criar Oportunidade" sem os módulos que
 * o servidor exige — a conversão pede CRM-2A + CRM-2B e a oportunidade pede CRM-3 (`CrmPipelineService`), senão 409
 * CRM_MODULE_NOT_INSTALLED. Guarda: os botões seguem o módulo instalado, como o `CrmNav`.
 */
vi.mock('next-i18next', () => ({ useTranslation: () => ({ t: (_k: string, d?: string) => d ?? _k }) }));
const { getTables } = vi.hoisted(() => ({ getTables: vi.fn() }));
vi.mock('../../../../lib/services/dynamic-table.service', () => ({ DynamicTableService: { getTables } }));
vi.mock('../../../../lib/services/crm.service', () => ({ CrmService: {} }));
// Painéis e modais filhos buscam dados próprios — fora do que o guarda afirma.
const { Nada } = vi.hoisted(() => ({ Nada: () => null }));
vi.mock('../LeadTasksPanel', () => ({ LeadTasksPanel: Nada }));
vi.mock('../LeadNotesPanel', () => ({ LeadNotesPanel: Nada }));
vi.mock('../LeadTimelinePanel', () => ({ LeadTimelinePanel: Nada }));
vi.mock('../LeadAttachmentsPanel', () => ({ LeadAttachmentsPanel: Nada }));
vi.mock('../LeadConvertModal', () => ({ LeadConvertModal: Nada }));
vi.mock('../OpportunityCreateModal', () => ({ OpportunityCreateModal: Nada }));
vi.mock('../ProposalCaptureModal', () => ({ ProposalCaptureModal: Nada }));
vi.mock('../NoShowCaptureModal', () => ({ NoShowCaptureModal: Nada }));
vi.mock('../MeetingCaptureModal', () => ({ MeetingCaptureModal: Nada }));
vi.mock('../../context/Lead360Context', () => ({ Lead360Provider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

import { Lead360Modal } from '../Lead360Modal';

const tabelas = (...names: string[]) => ({ success: true, data: names.map((internalName, i) => ({ id: `t${i}`, internalName })) });
const CRM0 = ['leadPipelines', 'leadStages', 'leads', 'leadActivities'];
const lead = { id: 'lead-1', data: { leadName: 'Maria', status: 'Open', pipelineId: 'p1', stageId: 's1' } };

function renderModal() {
  render(<Lead360Modal isOpen onClose={vi.fn()} lead={lead as never} stages={[]} onChanged={vi.fn()} />);
}

describe('Lead360Modal — ações por módulo instalado (H2 21-3)', () => {
  beforeEach(() => getTables.mockReset());
  afterEach(() => cleanup());

  it('só CRM-0 (+ CRM-1, o salão): sem "Converter Lead" e sem "Criar Oportunidade"', async () => {
    getTables.mockResolvedValue(tabelas(...CRM0, 'leadProposals'));
    renderModal();
    await screen.findByText('Não compareceu');
    await act(async () => {}); // a lista de tabelas resolve
    expect(screen.queryByRole('button', { name: 'Converter Lead' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Criar Oportunidade' })).toBeNull();
  });

  it('CRM-2A sem CRM-2B: a conversão (que exige os dois) continua escondida', async () => {
    getTables.mockResolvedValue(tabelas(...CRM0, 'crmAccounts'));
    renderModal();
    await screen.findByText('Não compareceu');
    await act(async () => {}); // a lista de tabelas resolve
    expect(screen.queryByRole('button', { name: 'Converter Lead' })).toBeNull();
  });

  it('CRM completo: os dois botões aparecem', async () => {
    getTables.mockResolvedValue(tabelas(...CRM0, 'leadProposals', 'crmAccounts', 'crmContacts', 'crmOpportunities'));
    renderModal();
    expect(await screen.findByRole('button', { name: 'Converter Lead' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar Oportunidade' })).toBeInTheDocument();
  });
});
