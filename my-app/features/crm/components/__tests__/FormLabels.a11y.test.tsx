import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

(globalThis as unknown as { React: typeof React }).React = React;

const i18nStable = { t: (_k: string, d?: string) => d ?? _k };
vi.mock('next-i18next', () => ({ useTranslation: () => i18nStable }));
vi.mock('../../../../lib/services/dynamic-table.service', () => ({
  DynamicTableService: { getTables: vi.fn(async () => ({ success: true, data: [] })) },
}));
vi.mock('../../../../lib/services/crm.service', () => ({ CrmService: { convertLead: vi.fn() } }));

import { MeetingCaptureModal } from '../MeetingCaptureModal';
import { ProposalCaptureModal } from '../ProposalCaptureModal';
import { NoShowCaptureModal } from '../NoShowCaptureModal';
import { LeadConvertModal } from '../LeadConvertModal';

function semNome() {
  const dlg = screen.getByRole('dialog');
  return Array.from(dlg.querySelectorAll<HTMLElement>('input, select, textarea')).filter((el) => {
    const labelled = (el as HTMLInputElement).labels?.length || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
    return !labelled;
  });
}

// L-20261113-152230-a736: labels soltos (sem htmlFor) nos modais do CRM — o campo ficava sem nome acessível.
describe('Modais do CRM — todo campo tem nome acessível', () => {
  it('MeetingCaptureModal', () => {
    render(<MeetingCaptureModal isOpen stageName="X" onCancel={() => {}} onConfirm={() => {}} />);
    expect(semNome()).toHaveLength(0);
  });
  it('ProposalCaptureModal', () => {
    render(<ProposalCaptureModal isOpen stageName="X" onCancel={() => {}} onConfirm={() => {}} />);
    expect(semNome()).toHaveLength(0);
  });
  it('NoShowCaptureModal', () => {
    render(<NoShowCaptureModal isOpen canRevert onCancel={() => {}} onConfirm={() => {}} />);
    expect(semNome()).toHaveLength(0);
  });
  it('LeadConvertModal', async () => {
    render(<LeadConvertModal isOpen onClose={() => {}} leadId="l1" leadName="ACME" onConverted={() => {}} />);
    await waitFor(() => screen.getByRole('dialog'));
    expect(semNome()).toHaveLength(0);
  });
  it('OpportunityCreateModal e LeadNotesPanel: fonte liga label→controle', () => {
    const dir = join(__dirname, '..');
    const opp = readFileSync(join(dir, 'OpportunityCreateModal.tsx'), 'utf8');
    expect((opp.match(/htmlFor=/g) ?? []).length).toBeGreaterThanOrEqual(5);
    expect(readFileSync(join(dir, 'LeadNotesPanel.tsx'), 'utf8')).toMatch(/<textarea[\s\S]*?aria-label=/);
  });
});
