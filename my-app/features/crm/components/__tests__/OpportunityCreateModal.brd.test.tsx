import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

(globalThis as { React?: typeof React }).React = React;

vi.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (_k: string, d?: string) => d ?? _k }),
}));
vi.mock('../../../../lib/services/dynamic-table.service', () => ({
  DynamicTableService: {
    getTables: vi.fn(async () => ({ success: true, data: [{ id: 't-pipes', internalName: 'leadPipelines' }] })),
  },
}));
vi.mock('../../lib/crmFetch', () => ({
  fetchAllRows: vi.fn(async () => [{ id: 'p1', data: { name: 'Pipeline Padrão' } }]),
}));
vi.mock('../../../../lib/services/crm.service', () => ({
  CrmService: { convertLeadToOpportunity: vi.fn(async () => ({ success: true, data: {} })) },
}));

import { CrmService } from '../../../../lib/services/crm.service';
import { OpportunityCreateModal } from '../OpportunityCreateModal';

const convert = CrmService.convertLeadToOpportunity as unknown as ReturnType<typeof vi.fn>;

// BRD F-74.1 (GAP-MAP, faixa 1 de 2026-11-10; ficha BRD-74): na conversão de lead, o valor digitado no
// formato brasileiro ("1.234,56") virava `NaN` (ou vazio, no `type="number"`) e a oportunidade era
// criada sem valor, sem aviso. O valor deve chegar ao servidor como 1234.56 (reais; o DTO é `number`).
describe('BRD F-74.1 — valor com vírgula na conversão de lead', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('BRD F-74.1: "1.234,56" chega ao servidor como 1234.56, não some', async () => {
    const onCreated = vi.fn();
    render(
      <OpportunityCreateModal isOpen onClose={() => {}} leadId="l1" leadName="Acme" onCreated={onCreated} />,
    );

    const pipelineSelect = await waitFor(() => {
      const el = screen.getAllByRole('combobox')[0] as HTMLSelectElement;
      expect(el.querySelector('option[value="p1"]')).not.toBeNull();
      return el;
    });
    fireEvent.change(pipelineSelect, { target: { value: 'p1' } });
    fireEvent.change(screen.getByPlaceholderText('0,00'), { target: { value: '1.234,56' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(convert).toHaveBeenCalledTimes(1);
    expect(convert.mock.calls[0][0]).toMatchObject({ amount: 1234.56, currency: 'BRL' });
  });
});
