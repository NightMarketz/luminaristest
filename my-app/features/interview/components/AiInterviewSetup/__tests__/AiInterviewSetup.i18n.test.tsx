import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, renderHook, waitFor, act } from '@testing-library/react';

// W7 PR-2 itens 6–7 (BRIEF `FE-INCR-WIZARD-HYGIENE`): todo texto visível do wizard passa por t() — com o `t`
// devolvendo a chave, nenhum texto em português fixo pode sobrar na tela.
(globalThis as unknown as { React: typeof React }).React = React;
vi.mock('next/router', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('cookies-next', () => ({ getCookie: () => 'tok' }));
vi.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

import LeftSidebar from '../../LeftSidebar';
import InputArea from '../InputArea';
import CreatingAnimation from '../../../setup/CreatingAnimation';
import { useAiInterview } from '../../../hooks/useAiInterview';

const PT_FIXO = [
  'Entrevista com IA', 'Digite sua resposta', 'painel de funcionalidades', 'painel de customização', 'Um momento',
  'Estou configurando', 'Funcionalidades do Sistema', 'Sistema:', 'Essencial', 'Campos:', 'e mais',
];
const semPortuguesFixo = (container: HTMLElement) => {
  const texto = `${container.textContent ?? ''} ${Array.from(container.querySelectorAll('[aria-label],[placeholder]'))
    .map((el) => `${el.getAttribute('aria-label') ?? ''} ${el.getAttribute('placeholder') ?? ''}`).join(' ')}`;
  for (const pt of PT_FIXO) expect(texto).not.toContain(pt);
};

describe('wizard sem texto PT fixo (W7 item 6)', () => {
  it('LeftSidebar, InputArea e CreatingAnimation', () => {
    const { container } = render(
      <div>
        <LeftSidebar
          isVisible
          customizationState={{
            presetKey: 'beautySalon',
            presetName: 'Salão',
            tables: [{ key: 't', name: 'Clientes', description: 'd', isCore: true, fields: ['a', 'b', 'c', 'd', 'e'].map((n) => ({ name: n, label: n, type: 'text' })) }],
          }}
        />
        <InputArea userInput="" setUserInput={vi.fn()} handleSendMessage={vi.fn()} isLoading={false} isCreating={false} inputRef={{ current: null }} />
        <CreatingAnimation />
      </div>,
    );
    semPortuguesFixo(container);
    expect(container.textContent).toContain('onboardingFeaturesPanelCore');
    expect(container.textContent).toContain('onboardingFeaturesPanelMore');
  });
});

describe('fallback de erro do create traduzido (W7 item 7)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('500 sem corpo ⇒ a chave onboardingErrorCreateFailed; corpo com `error` ⇒ o texto do servidor como veio', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://api.test/api');
    const resp = (status: number, body: unknown) =>
      ({ ok: status < 300, status, json: async () => (body === undefined ? Promise.reject(new Error('sem corpo')) : body) }) as unknown as Response;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(resp(200, { response: 'Olá!', nextStage: 'DISCOVERING_BUSINESS' }))
      .mockResolvedValueOnce(resp(200, { response: 'SUMMARY: X', nextStage: 'COMPLETED', presetKey: 'beautySalon' }))
      .mockResolvedValueOnce(resp(500, undefined))
      .mockResolvedValueOnce(resp(500, { success: false, error: 'falha do servidor' }));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useAiInterview());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.setUserInput('oi'));
    await act(async () => {
      await result.current.handleSendMessage();
    });
    await waitFor(() => expect(result.current.fiscalPendente).toBe(true));
    act(() => result.current.confirmarFiscal({ regime: 'MEI', grandePorte: null, icmsContribuinte: null }));
    await waitFor(() => expect(result.current.creationError?.message).toBe('onboardingErrorCreateFailed'));
    act(() => result.current.handleRetry());
    await waitFor(() => expect(result.current.creationError?.message).toBe('falha do servidor'));
  });
});
