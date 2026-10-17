import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// I4 PR-4 (item 21, EMENDA 14/10 E14.4; F-I4-5 b + F-I4-7 a + F-I4-9 a): Rápido e Controle Total perguntam regime
// (+ ICMS em Presumido/Real) antes de criar, mandam `fiscal.icmsContribuinte` e, quando o create devolve
// `accounting.status === 'Draft'`, mostram um aviso que não bloqueia antes de navegar.
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

const DRAFT_FISCAL = {
  accounting: {
    status: 'Draft',
    sectorKey: 'beautySalon',
    blocking: [{ code: 'KIT_FISCAL_PROFILE_REQUIRED', message: 'unidade sem perfil fiscal' }],
  },
};
const DRAFT_OUTRO = { accounting: { status: 'Draft', blocking: [{ code: 'EVENT_COVERAGE_MISSING', message: 'x' }] } };
const ACTIVE = { accounting: { status: 'Active', sectorKey: 'beautySalon', bindingVersion: 1 } };

/** Leva o wizard até a pergunta fiscal (preset escolhido + nome da unidade + clique em criar). */
async function abrirPerguntaFiscal(wizard: 'quick' | 'total') {
  if (wizard === 'quick') {
    render(<ToastProvider><QuickSetup /></ToastProvider>);
    fireEvent.click(await screen.findByText('Salão'));
    fireEvent.change(screen.getByLabelText('unitNameLabel'), { target: { value: 'Unidade Centro' } });
    fireEvent.click(screen.getByRole('button', { name: 'createDashboard' }));
  } else {
    render(<ToastProvider><TotalControlSetup /></ToastProvider>);
    fireEvent.click(await screen.findByText('Salão'));
    fireEvent.click(screen.getByRole('button', { name: 'onboardingTotalControlNext' }));
    fireEvent.change(await screen.findByLabelText('unitNameLabel'), { target: { value: 'Unidade Centro' } });
    fireEvent.click(screen.getByRole('button', { name: 'onboardingTotalControlFinish' }));
  }
  await screen.findByLabelText('fiscalRegime_PRESUMIDO');
}

describe.each(['quick', 'total'] as const)('wizard %s — pergunta fiscal + aviso de contabilidade Draft (I4 PR-4)', (wizard) => {
  beforeEach(() => {
    push.mockReset();
    createDashboard.mockReset();
    getPresets.mockResolvedValue([{ category: 'Beleza', key: 'beautySalon', name: 'Salão', description: 'salão de beleza' }]);
    getPresetDetails.mockResolvedValue({ tables: { clients: { name: 'Clientes', schema: { fields: [] } } } });
  });

  it('F-I4-9 a: exibe o FiscalQuestion antes de criar; payload leva fiscal.icmsContribuinte; Draft KIT_FISCAL_PROFILE_REQUIRED ⇒ aviso com o próximo passo', async () => {
    createDashboard.mockResolvedValue(DRAFT_FISCAL);
    await abrirPerguntaFiscal(wizard);
    expect(createDashboard).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('fiscalRegime_PRESUMIDO'));
    fireEvent.click(screen.getByLabelText('fiscalIcms_nao'));
    fireEvent.click(screen.getByRole('button', { name: 'fiscalCreateButton' }));

    expect(await screen.findByText('onboardingAccountingDraftFiscalProfile')).toBeInTheDocument();
    expect(screen.getByText('onboardingAccountingDraftTitle')).toBeInTheDocument();
    expect(createDashboard.mock.calls[0][0]).toMatchObject({
      unit: { name: 'Unidade Centro' },
      fiscal: { regime: 'PRESUMIDO', grandePorte: null, icmsContribuinte: false },
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'));
  });

  it('Draft com outro bloqueante ⇒ aviso genérico (sem o texto do perfil fiscal)', async () => {
    createDashboard.mockResolvedValue(DRAFT_OUTRO);
    await abrirPerguntaFiscal(wizard);
    fireEvent.click(screen.getByLabelText('fiscalRegime_MEI'));
    fireEvent.click(screen.getByRole('button', { name: 'fiscalCreateButton' }));

    expect(await screen.findByText('onboardingAccountingDraft')).toBeInTheDocument();
    expect(screen.queryByText('onboardingAccountingDraftFiscalProfile')).not.toBeInTheDocument();
  });

  it('Active ⇒ navega sem aviso nenhum', async () => {
    createDashboard.mockResolvedValue(ACTIVE);
    await abrirPerguntaFiscal(wizard);
    fireEvent.click(screen.getByLabelText('fiscalRegime_REAL'));
    fireEvent.click(screen.getByLabelText('fiscalIcms_sim'));
    fireEvent.click(screen.getByRole('button', { name: 'fiscalCreateButton' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'));
    expect(createDashboard.mock.calls[0][0]).toMatchObject({ fiscal: { regime: 'REAL', icmsContribuinte: true } });
    expect(screen.queryByText('onboardingAccountingDraftTitle')).not.toBeInTheDocument();
  });
});
