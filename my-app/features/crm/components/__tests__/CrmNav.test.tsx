import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';

// I8 (BE-INCR-CRM-MODULE-COMPOSITION) comportamento 9 — o CrmNav decide por módulo instalado.
vi.mock('next-i18next', () => ({ useTranslation: () => ({ t: (_k: string, d?: string) => d ?? _k }) }));
vi.mock('next/router', () => ({ useRouter: () => ({ pathname: '/crm' }) }));
const { getTables } = vi.hoisted(() => ({ getTables: vi.fn() }));
vi.mock('../../../../lib/services/dynamic-table.service', () => ({ DynamicTableService: { getTables } }));

import { CrmNav } from '../CrmNav';

const tabelas = (...names: string[]) => ({ success: true, data: names.map((internalName, i) => ({ id: `t${i}`, internalName })) });
const CRM0 = ['leadPipelines', 'leadStages', 'leads', 'leadActivities'];

describe('CrmNav — áreas por módulo (I8 c9)', () => {
  beforeEach(() => getTables.mockReset());
  afterEach(() => cleanup());

  it('só CRM-0: sem Propostas, Contas, Contatos, Oportunidades', async () => {
    getTables.mockResolvedValue(tabelas('units', ...CRM0));
    render(<CrmNav />);
    await waitFor(() => expect(getTables).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('Pipeline')).toBeInTheDocument());
    for (const x of ['Visão Geral', 'Atividades', 'Reuniões', 'Analytics']) expect(screen.getByText(x)).toBeInTheDocument();
    for (const x of ['Propostas', 'Contas', 'Contatos', 'Oportunidades']) expect(screen.queryByText(x)).toBeNull();
  });

  it('salão (CRM-0 + CRM-1): Propostas aparece; Oportunidades não', async () => {
    getTables.mockResolvedValue(tabelas(...CRM0, 'leadProposals'));
    render(<CrmNav />);
    await waitFor(() => expect(screen.getByText('Propostas')).toBeInTheDocument());
    expect(screen.queryByText('Oportunidades')).toBeNull();
  });

  it('CRM completo: todas as áreas', async () => {
    getTables.mockResolvedValue(tabelas(...CRM0, 'leadProposals', 'crmAccounts', 'crmContacts', 'crmOpportunities'));
    render(<CrmNav />);
    await waitFor(() => expect(screen.getByText('Oportunidades')).toBeInTheDocument());
    for (const x of ['Propostas', 'Contas', 'Contatos']) expect(screen.getByText(x)).toBeInTheDocument();
  });
});
