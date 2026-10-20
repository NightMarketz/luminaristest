import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';

// I4 PR-4 (item 21, F-I4-5 b): a Entrevista lê `data.accounting` do 201 do create — `Draft` gera o aviso que não
// bloqueia (com o próximo passo quando falta o perfil fiscal da unidade); `Active` não gera nada.
(globalThis as unknown as { React: typeof React }).React = React;

vi.mock('next/router', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('cookies-next', () => ({ getCookie: () => 'tok' }));
vi.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

import { ToastProvider } from '../../../../lib/context/ToastContext';
import { useAiInterview } from '../useAiInterview';

const jsonResponse = (body: unknown) => ({ ok: true, status: 201, json: async () => body, text: async () => JSON.stringify(body) }) as unknown as Response;

let hook: ReturnType<typeof useAiInterview>;
function Probe() {
  hook = useAiInterview();
  return <span data-testid="creating">{String(hook.isCreating)}</span>;
}

async function criarComResposta(createBody: unknown) {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(jsonResponse({ response: 'Olá!', nextStage: 'DISCOVERING_BUSINESS' }))
    .mockResolvedValueOnce(jsonResponse({ response: 'SUMMARY: Salão Centro', nextStage: 'COMPLETED', presetKey: 'beautySalon' }))
    .mockResolvedValueOnce(jsonResponse(createBody));
  vi.stubGlobal('fetch', fetchMock);
  render(<ToastProvider><Probe /></ToastProvider>);
  await waitFor(() => expect(hook.isLoading).toBe(false));
  act(() => hook.setUserInput('Tenho um salão'));
  await act(async () => {
    await hook.handleSendMessage();
  });
  await waitFor(() => expect(hook.fiscalPendente).toBe(true));
  act(() => hook.confirmarFiscal({ regime: 'PRESUMIDO', grandePorte: false, icmsContribuinte: null }));
  return fetchMock;
}

describe('useAiInterview — aviso de contabilidade Draft depois do create (I4 PR-4)', () => {
  beforeEach(() => vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://api.test/api'));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('Draft KIT_FISCAL_PROFILE_REQUIRED ⇒ aviso nomeia o perfil fiscal; o payload leva icmsContribuinte', async () => {
    const fetchMock = await criarComResposta({
      success: true,
      data: { unitId: 'u-1', accounting: { status: 'Draft', blocking: [{ code: 'KIT_FISCAL_PROFILE_REQUIRED', message: 'm' }] } },
    });
    expect(await screen.findByText('onboardingAccountingDraftFiscalProfile')).toBeInTheDocument();
    const [, init] = fetchMock.mock.calls[2] as [string, RequestInit];
    expect(JSON.parse(String(init.body)).fiscal).toEqual({ regime: 'PRESUMIDO', grandePorte: false, icmsContribuinte: null });
  });

  it('Active ⇒ nenhum aviso', async () => {
    const fetchMock = await criarComResposta({ success: true, data: { unitId: 'u-1', accounting: { status: 'Active', bindingVersion: 1 } } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    // deixa o create terminar (o hook segue "criando" até navegar, num setTimeout de 2 s): nenhum toast foi montado
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(screen.getByTestId('creating')).toHaveTextContent('true');
    expect(screen.queryByText('onboardingAccountingDraftTitle')).not.toBeInTheDocument();
  });
});
