import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

// Rótulo canônico de opção: t('database:options.<valor>', valor) — só 'Small' tem tradução neste mock.
const LABELS: Record<string, string> = { 'database:options.Small': 'Pequena' };
vi.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (k: string, d?: string) => LABELS[k] ?? d ?? k }),
}));
vi.mock('../../../../lib/services/dynamic-table.service', () => ({
  DynamicTableService: {
    getTables: vi.fn(async (): Promise<unknown> => ({
      success: true,
      data: [
        { id: 't-acc', internalName: 'crmAccounts', schema: { fields: [{ name: 'size', type: 'select', options: ['P', 'G'] }] } },
        { id: 't-con', internalName: 'crmContacts', schema: { fields: [{ name: 'role', type: 'select', options: ['Decisor', 'Usuário'] }] } },
      ],
    })),
  },
}));
vi.mock('../../../../lib/services/crm.service', () => ({
  CrmService: { convertLead: vi.fn(async () => ({ success: true })) },
}));

import { CrmService } from '../../../../lib/services/crm.service';
import { DynamicTableService } from '../../../../lib/services/dynamic-table.service';
import { LeadConvertModal } from '../LeadConvertModal';

const convertLead = CrmService.convertLead as unknown as ReturnType<typeof vi.fn>;
const getTables = DynamicTableService.getTables as unknown as ReturnType<typeof vi.fn>;

// GAP-MAP Nível 3 "CRM — convertLead fixa enum inglês em campo freeSelects" (FIX-CRM-CONVERT-LEAD-SELECTS).
// Forks do dono 2026-09-28 F-B3-3 (a): Porte/Papel são <select> alimentados pelas opções do schema INSTALADO.
describe('LeadConvertModal — Porte/Papel vêm das opções instaladas do tenant', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const selectDe = (label: string) =>
    waitFor(() => {
      const el = screen.getByText(label).parentElement!.querySelector('select');
      expect(el, `controle "${label}" deveria ser <select>`).not.toBeNull();
      return el as HTMLSelectElement;
    });

  it('T-3: Porte e Papel são <select> com opção vazia + opções do schema; o escolhido vai no payload', async () => {
    render(<LeadConvertModal isOpen onClose={() => {}} leadId="l1" leadName="ACME" onConverted={() => {}} />);

    const porte = await selectDe('Porte');
    expect(Array.from(porte.options).map((o) => o.value)).toEqual(['', 'P', 'G']);
    const papel = await selectDe('Papel');
    expect(Array.from(papel.options).map((o) => o.value)).toEqual(['', 'Decisor', 'Usuário']);

    fireEvent.change(porte, { target: { value: 'G' } });
    fireEvent.change(papel, { target: { value: 'Usuário' } });
    fireEvent.click(screen.getByRole('button', { name: 'Converter' }));

    await waitFor(() => expect(convertLead).toHaveBeenCalledTimes(1));
    const payload = convertLead.mock.calls[0][0];
    expect(payload.account.size).toBe('G');
    expect(payload.contact.role).toBe('Usuário');
  });

  it('F-1: valor padrão do preset mostra o rótulo traduzido (database:options) e envia o valor cru', async () => {
    getTables.mockResolvedValueOnce({
      success: true,
      data: [{ id: 't-acc', internalName: 'crmAccounts', schema: { fields: [{ name: 'size', type: 'select', options: ['Small', 'P'] }] } }],
    });
    render(<LeadConvertModal isOpen onClose={() => {}} leadId="l1" leadName="ACME" onConverted={() => {}} />);

    const porte = await selectDe('Porte');
    // 'P' é opção do tenant sem chave de tradução → rótulo = o próprio valor.
    expect(Array.from(porte.options).map((o) => [o.value, o.text])).toEqual([['', '—'], ['Small', 'Pequena'], ['P', 'P']]);
    expect(screen.queryByText('Papel')).toBeNull(); // crmContacts ausente → controle não aparece

    fireEvent.change(porte, { target: { value: 'Small' } });
    fireEvent.click(screen.getByRole('button', { name: 'Converter' }));
    await waitFor(() => expect(convertLead).toHaveBeenCalledTimes(1));
    expect(convertLead.mock.calls[0][0].account.size).toBe('Small');
  });

  it('F-2 (b): falha ao carregar as opções → erro no banner do modal; conversão segue possível sem Porte/Papel', async () => {
    getTables.mockRejectedValueOnce({ error: 'Network request failed' });
    render(<LeadConvertModal isOpen onClose={() => {}} leadId="l1" leadName="ACME" onConverted={() => {}} />);

    await screen.findByText('Network request failed');
    expect(screen.queryByText('Porte')).toBeNull();
    expect(screen.queryByText('Papel')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Converter' }));
    await waitFor(() => expect(convertLead).toHaveBeenCalledTimes(1));
    const payload = convertLead.mock.calls[0][0];
    expect(payload.account.size).toBeUndefined();
    expect(payload.contact.role).toBeUndefined();
  });
});
