import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, renderHook, waitFor, act } from '@testing-library/react';

// W7 — FE-INCR-WIZARD-HYGIENE PR-1 (BRIEF `docs/accounting/FE-INCR-WIZARD-HYGIENE-brief.md` itens 1–5; F-W7-2 a).
(globalThis as unknown as { React: typeof React }).React = React;

vi.mock('next/router', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('cookies-next', () => ({ getCookie: () => 'tok' }));
vi.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

import { ToastProvider } from '../../../../lib/context/ToastContext';
import { useAiInterview } from '../useAiInterview';

const resp = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body) }) as unknown as Response;

const isGreeting = (call: unknown[]) => {
  const init = call[1] as RequestInit | undefined;
  return typeof init?.body === 'string' && JSON.parse(init.body).stage === 'GREETING';
};

describe('W7 item 1 — saudação uma vez só, inclusive em StrictMode', () => {
  beforeEach(() => vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://api.test/api'));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('StrictMode: só 1 GREETING segue vivo (o da 1ª montagem é abortado) e há 1 mensagem', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => resp(200, { response: 'Olá!', nextStage: 'DISCOVERING_BUSINESS' }));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useAiInterview(), { wrapper: React.StrictMode });
    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    const vivos = fetchMock.mock.calls.filter(isGreeting).filter((c) => !(c[1] as RequestInit).signal?.aborted);
    expect(vivos).toHaveLength(1);
  });
});

let hook: ReturnType<typeof useAiInterview>;
function Probe() {
  hook = useAiInterview();
  return null;
}

/** Entrevista até a pergunta fiscal e confirma; o 3º fetch é o 1º `POST /dashboard/create`. */
async function criarCom(primeiroCreate: Response | Error, ...demais: Response[]) {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(resp(200, { response: 'Olá!', nextStage: 'DISCOVERING_BUSINESS' }))
    .mockResolvedValueOnce(resp(200, { response: 'SUMMARY: Salão Centro', nextStage: 'COMPLETED', presetKey: 'beautySalon' }));
  if (primeiroCreate instanceof Error) fetchMock.mockRejectedValueOnce(primeiroCreate);
  else fetchMock.mockResolvedValueOnce(primeiroCreate);
  for (const r of demais) fetchMock.mockResolvedValueOnce(r);
  vi.stubGlobal('fetch', fetchMock);
  render(<ToastProvider><Probe /></ToastProvider>);
  await waitFor(() => expect(hook.isLoading).toBe(false));
  act(() => hook.setUserInput('Tenho um salão'));
  await act(async () => {
    await hook.handleSendMessage();
  });
  await waitFor(() => expect(hook.fiscalPendente).toBe(true));
  act(() => hook.confirmarFiscal({ regime: 'PRESUMIDO', grandePorte: false, icmsContribuinte: null }));
  await waitFor(() => expect(hook.creationError).not.toBeNull());
  return fetchMock;
}

describe('W7 itens 2–5 — Debug fora, retry sem reload, erro classificado', () => {
  let reload: ReturnType<typeof vi.fn>;
  const locationOriginal = window.location;
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://api.test/api');
    reload = vi.fn();
    Object.defineProperty(window, 'location', { configurable: true, value: { ...locationOriginal, reload } });
  });
  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: locationOriginal });
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('item 2: o hook não expõe mais logState', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resp(200, { response: 'Olá!', nextStage: 'DISCOVERING_BUSINESS' })));
    const { result } = renderHook(() => useAiInterview());
    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    expect('logState' in result.current).toBe(false);
  });

  it('item 3: ONBOARDING_ROLLED_BACK ⇒ retry reenvia o MESMO corpo, sem reload, conversa preservada', async () => {
    const fetchMock = await criarCom(
      resp(500, { success: false, errorCode: 'ONBOARDING_ROLLED_BACK', error: 'desfeito' }),
      resp(500, { success: false, errorCode: 'ONBOARDING_ROLLED_BACK', error: 'desfeito' }),
    );
    expect(hook.creationError?.kind).toBe('retryable');
    const mensagens = hook.messages;
    act(() => hook.handleRetry());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    const corpo = (i: number) => JSON.parse(String((fetchMock.mock.calls[i][1] as RequestInit).body));
    expect(fetchMock.mock.calls[3][0]).toBe('http://api.test/api/dashboard/create');
    expect(corpo(3)).toEqual(corpo(2));
    expect(reload).not.toHaveBeenCalled();
    expect(hook.messages).toEqual(mensagens);
  });

  it.each([
    ['falha de rede', new TypeError('Failed to fetch'), 'retryable'],
    ['500 sem errorCode', resp(500, { success: false, error: 'boom' }), 'retryable'],
    ['ONBOARDING_ROLLBACK_FAILED', resp(500, { success: false, errorCode: 'ONBOARDING_ROLLBACK_FAILED', error: 'parcial' }), 'partial'],
    ['403 one-shot', resp(403, { success: false, error: 'Forbidden', message: 'Setup já foi concluído.' }), 'already-provisioned'],
    ['400 payload', resp(400, { success: false, error: 'Payload inválido' }), 'invalid'],
  ] as const)('item 4: %s ⇒ kind %s', async (_nome, primeiro, kind) => {
    await criarCom(primeiro);
    expect(hook.creationError?.kind).toBe(kind);
  });

  it('item 5: 400 ⇒ "Voltar à conversa" limpa o erro, devolve a pergunta fiscal e mantém as mensagens', async () => {
    await criarCom(resp(400, { success: false, error: 'Payload inválido' }));
    const mensagens = hook.messages;
    act(() => hook.backToConversation());
    expect(hook.creationError).toBeNull();
    expect(hook.isCreating).toBe(false);
    expect(hook.fiscalPendente).toBe(true);
    expect(hook.messages).toEqual(mensagens);
  });
});
