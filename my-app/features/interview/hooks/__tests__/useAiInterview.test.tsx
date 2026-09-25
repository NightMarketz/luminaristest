import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// Teste-guarda (sessão de instrumentação 2026-09-07, autorização do dono: "Corrige o 401 mandando o
// Bearer no hook"). Lacuna: o hook chama POST /dashboard/ai/ChatInterview sem `Authorization`, e a
// rota vive sob o prefixo protegido `/api/dashboard` (deny-by-default) → 401 em toda chamada, chat
// mudo. Comportamento esperado: toda chamada do hook à entrevista carrega `Bearer <auth_token>`,
// como o `apiClient` faz.

vi.mock('next/router', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('cookies-next', () => ({
  getCookie: (name: string) => (name === 'auth_token' ? 'tok-teste-guarda' : undefined),
}));

import { useAiInterview, nomeDaUnidadeDaEntrevista } from '../useAiInterview';

type FetchMock = ReturnType<typeof vi.fn>;

const jsonResponse = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body }) as unknown as Response;

const authHeaderOf = (call: unknown[]): string | undefined => {
  const init = call[1] as RequestInit | undefined;
  const headers = (init?.headers ?? {}) as Record<string, string>;
  return headers.Authorization ?? headers.authorization;
};

describe('useAiInterview — Bearer na rota protegida /dashboard/ai/ChatInterview', () => {
  let fetchMock: FetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://api.test/api');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('manda Authorization: Bearer <auth_token> na saudação e no envio de mensagem', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ response: 'Olá!', nextStage: 'DISCOVERING_BUSINESS' }))
      .mockResolvedValueOnce(jsonResponse({ response: 'Qual o porte?', nextStage: 'DISCOVERING_BUSINESS' }));

    const { result } = renderHook(() => useAiInterview());

    // 1) saudação (GREETING) disparada no mount
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [greetingUrl] = fetchMock.mock.calls[0] as [string];
    expect(greetingUrl).toBe('http://api.test/api/dashboard/ai/ChatInterview');
    expect(authHeaderOf(fetchMock.mock.calls[0])).toBe('Bearer tok-teste-guarda');

    // 2) envio de mensagem do usuário
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.setUserInput('Tenho um salão de beleza'));
    await act(async () => {
      await result.current.handleSendMessage();
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(authHeaderOf(fetchMock.mock.calls[1])).toBe('Bearer tok-teste-guarda');
  });
});

// BE-INCR-ONBOARDING-FIRST-UNIT (I1, BRIEF item 5; F-I1-2 b): a Entrevista monta `unit` no create — o servidor
// responde 400 sem ele. Nome = texto do `SUMMARY:` da IA (até 120), fallback = chave do preset.
describe('useAiInterview — create da Entrevista manda a primeira unidade (I1)', () => {
  let fetchMock: FetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://api.test/api');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('ao chegar em COMPLETED, POST /dashboard/create leva { suiteKey, unit: { name: <SUMMARY> } }', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ response: 'Olá!', nextStage: 'DISCOVERING_BUSINESS' }))
      .mockResolvedValueOnce(
        jsonResponse({ response: 'SUMMARY: Salão Bela Vista, atende mulheres', nextStage: 'COMPLETED', presetKey: 'beautySalon' }),
      )
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { unitId: 'u-1' } }));

    const { result } = renderHook(() => useAiInterview());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.setUserInput('Tenho um salão'));
    await act(async () => {
      await result.current.handleSendMessage();
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    const [url, init] = fetchMock.mock.calls[2] as [string, RequestInit];
    expect(url).toBe('http://api.test/api/dashboard/create');
    expect(JSON.parse(String(init.body))).toEqual({ suiteKey: 'beautySalon', unit: { name: 'Salão Bela Vista, atende mulheres' } });
  });

  it('nomeDaUnidadeDaEntrevista: sem SUMMARY usa a chave do preset; corta em 120; ignora mensagem do usuário', () => {
    expect(nomeDaUnidadeDaEntrevista([{ sender: 'ai', text: 'Olá' }], 'beautySalon')).toBe('beautySalon');
    expect(nomeDaUnidadeDaEntrevista([{ sender: 'user', text: 'SUMMARY: eu' }], 'k')).toBe('k');
    expect(nomeDaUnidadeDaEntrevista([{ sender: 'ai', text: `SUMMARY: ${'x'.repeat(200)}` }], 'k')).toHaveLength(120);
  });
});
