import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// L-20261113-152222-3a43: o erro do wizard de setup trocava o formulário por uma caixa sem botão e perdia o preset e a
// customização. Guarda: falha ao carregar os modelos tem "tentar de novo"; falha ao criar mantém a escolha e o nome.
(globalThis as unknown as { React: typeof React }).React = React;

// referências estáveis: os wizards têm `user`/`router` no dep array do effect que carrega os presets
const push = vi.fn();
const router = { push, replace: vi.fn() };
const auth = { user: { id: 'u-1' }, isLoading: false };
vi.mock('next/router', () => ({ useRouter: () => router }));
vi.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
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
import QuickSetup from '../QuickSetup';
import TotalControlSetup from '../TotalControlSetup';



const reject = (m: string) => Object.assign(new Error(m), {});

async function ate_a_pergunta_fiscal_quick() {
  render(<ToastProvider><QuickSetup /></ToastProvider>);
  fireEvent.click(await screen.findByText('Salão'));
  fireEvent.change(screen.getByLabelText('unitNameLabel'), { target: { value: 'Unidade Centro' } });
  fireEvent.click(screen.getByRole('button', { name: 'createDashboard' }));
  fireEvent.click(await screen.findByLabelText('fiscalRegime_MEI'));
  fireEvent.click(screen.getByRole('button', { name: 'fiscalCreateButton' }));
}

describe('wizard de setup — saída do erro', () => {
  beforeEach(() => {
    push.mockReset();
    createDashboard.mockReset();
    getPresets.mockReset();
    getPresetDetails.mockReset();
    getPresets.mockResolvedValue([{ category: 'Beleza', key: 'beautySalon', name: 'Salão', description: 'salão de beleza' }]);
    getPresetDetails.mockResolvedValue({ tables: { clients: { name: 'Clientes', schema: { fields: [] } } } });
  });

  it('Rápido: falha ao carregar os modelos → alerta + "tentar de novo" que recarrega', async () => {
    getPresets.mockRejectedValueOnce(reject('sem rede'));
    render(<ToastProvider><QuickSetup /></ToastProvider>);
    expect(await screen.findByRole('alert')).toHaveTextContent('sem rede');
    fireEvent.click(screen.getByRole('button', { name: 'onboardingRetry' }));
    expect(await screen.findByText('Salão')).toBeInTheDocument();
    expect(getPresets).toHaveBeenCalledTimes(2);
  });

  it('Rápido: falha ao criar → alerta, e o preset escolhido e o nome da unidade continuam na tela', async () => {
    createDashboard.mockRejectedValue(reject('falhou ao criar'));
    await ate_a_pergunta_fiscal_quick();
    expect(await screen.findByRole('alert')).toHaveTextContent('falhou ao criar');
    expect(screen.getByText('Salão')).toBeInTheDocument();
    expect(screen.getByLabelText('unitNameLabel')).toHaveValue('Unidade Centro');
  });

  it('Controle Total: falha ao criar → alerta sobre o passo de customização, sem voltar ao início', async () => {
    createDashboard.mockRejectedValue(reject('falhou ao criar'));
    render(<ToastProvider><TotalControlSetup /></ToastProvider>);
    fireEvent.click(await screen.findByText('Salão'));
    fireEvent.click(screen.getByRole('button', { name: 'onboardingTotalControlNext' }));
    fireEvent.change(await screen.findByLabelText('unitNameLabel'), { target: { value: 'Unidade Centro' } });
    fireEvent.click(screen.getByRole('button', { name: 'onboardingTotalControlFinish' }));
    fireEvent.click(await screen.findByLabelText('fiscalRegime_MEI'));
    fireEvent.click(screen.getByRole('button', { name: 'fiscalCreateButton' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('falhou ao criar');
    expect(screen.getByLabelText('unitNameLabel')).toHaveValue('Unidade Centro');
  });
});
