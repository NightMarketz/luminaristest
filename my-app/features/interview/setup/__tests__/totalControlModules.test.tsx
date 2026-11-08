import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

// BE-INCR-MODULOS-BASE-SUBMODULOS PR-2 (dono, chat, 31/10/2026: "Tela lê moduleViews"): as tabelas de módulo
// (CRM, PESSOAS, VENDAS…) saíram de `tables` do GET /dashboard/presets/:key. O Controle Total lista os módulos de
// `moduleViews`: base fixa travada, submódulo removível — e o removido sai em `removedTables`.
(globalThis as unknown as { React: typeof React }).React = React;

const push = vi.fn();
const router = { push, replace: vi.fn() };
const auth = { user: { id: 'u-1' }, isLoading: false };
vi.mock('next/router', () => ({ useRouter: () => router }));
vi.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'pt' } }) }));
vi.mock('cookies-next', () => ({ getCookie: () => 'tok' }));
vi.mock('../../../../lib/context/AuthContext', () => ({ useAuth: () => auth }));

const getPresets = vi.fn();
const getPresetDetails = vi.fn();
const createDashboard = vi.fn();
vi.mock('../../../../lib/services/setup.service', () => ({
  SetupService: {
    getPresets: (...a: unknown[]) => getPresets(...a),
    getPresetDetails: (...a: unknown[]) => getPresetDetails(...a),
    createDashboard: (...a: unknown[]) => createDashboard(...a),
  },
}));

import { ToastProvider } from '../../../../lib/context/ToastContext';
import TotalControlSetup from '../TotalControlSetup';

const DETALHE = {
  tables: { goals: { name: 'Goals', schema: { fields: [] } } },
  moduleViews: [
    { key: 'VEN-0', category: 'vendas', name: { pt: 'Vendas', en: 'Sales' }, fixed: true, tables: ['sales', 'saleItems'], dependsOn: ['PES-0'] },
    { key: 'VEN-COM', category: 'vendas', name: { pt: 'Comissões', en: 'Commissions' }, fixed: false, tables: ['commissions'], dependsOn: ['VEN-0'] },
  ],
};

async function abrirCustomizacao() {
  render(<ToastProvider><TotalControlSetup /></ToastProvider>);
  fireEvent.click(await screen.findByText('Salão'));
  fireEvent.click(screen.getByRole('button', { name: 'onboardingTotalControlNext' }));
  await screen.findByText('onboardingTotalControlModules');
}

describe('Controle Total — módulos de moduleViews (BE-INCR-MODULOS-BASE-SUBMODULOS PR-2)', () => {
  beforeEach(() => {
    push.mockReset();
    createDashboard.mockReset();
    getPresets.mockResolvedValue([{ category: 'Beleza', key: 'beautySalon', name: 'Salão', description: 'salão de beleza' }]);
    getPresetDetails.mockResolvedValue(DETALHE);
  });

  it('base fixa aparece marcada e travada; submódulo aparece marcado e removível', async () => {
    await abrirCustomizacao();
    const base = within(screen.getByTestId('module-VEN-0')).getByRole('checkbox');
    const sub = within(screen.getByTestId('module-VEN-COM')).getByRole('checkbox');
    expect(base).toBeChecked();
    expect(base).toBeDisabled();
    expect(sub).toBeChecked();
    expect(sub).not.toBeDisabled();
    expect(screen.getByTestId('module-VEN-0')).toHaveTextContent('onboardingTotalControlModuleBase');
  });

  it('desmarcar o submódulo manda a tabela dele em removedTables; a base nunca sai', async () => {
    createDashboard.mockResolvedValue({ accounting: { status: 'Active' } });
    await abrirCustomizacao();
    fireEvent.click(within(screen.getByTestId('module-VEN-COM')).getByRole('checkbox'));
    fireEvent.change(screen.getByLabelText('unitNameLabel'), { target: { value: 'Matriz' } });
    fireEvent.click(screen.getByRole('button', { name: 'onboardingTotalControlFinish' }));
    fireEvent.click(await screen.findByLabelText('fiscalRegime_MEI'));
    fireEvent.click(screen.getByRole('button', { name: 'fiscalCreateButton' }));

    await waitFor(() => expect(createDashboard).toHaveBeenCalledTimes(1));
    expect(createDashboard.mock.calls[0][0]).toMatchObject({ mode: 'custom', presetKey: 'beautySalon', removedTables: ['commissions'] });
  });
});
