import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// W7 — runbook de 12/11 (3ª execução), passo 5: em Controle Total, ao escolher o modelo, o cartão mostrava o selo
// "Selecionado" (literal em português) com a UI em inglês. O selo tem de sair do `t()`: aqui o `t` devolve a chave,
// então um literal solto aparece como "Selecionado" e a chave como "onboardingTotalControlSelected".
(globalThis as unknown as { React: typeof React }).React = React;

vi.mock('next/router', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }) }));
vi.mock('cookies-next', () => ({ getCookie: () => 'tok' }));
vi.mock('../../../../lib/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u-1' }, isLoading: false }) }));

const getPresets = vi.fn();
vi.mock('../../../../lib/services/setup.service', () => ({
  SetupService: {
    getPresets: (...a: unknown[]) => getPresets(...a),
    getPresetDetails: vi.fn(),
    createDashboard: vi.fn(),
  },
}));

import { ToastProvider } from '../../../../lib/context/ToastContext';
import TotalControlSetup from '../TotalControlSetup';

describe('Controle Total — selo do modelo escolhido (W7 passo 5)', () => {
  beforeEach(() => {
    getPresets.mockResolvedValue([{ category: 'Beleza', key: 'beautySalon', name: 'Salão', description: 'salão de beleza' }]);
  });

  it('o selo vem de t(), não de literal em português', async () => {
    render(<ToastProvider><TotalControlSetup /></ToastProvider>);
    fireEvent.click(await screen.findByText('Salão'));
    expect(await screen.findByText('onboardingTotalControlSelected')).toBeInTheDocument();
    expect(screen.queryByText('Selecionado')).not.toBeInTheDocument();
  });
});
