import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// W4 FE-INCR-INTERVIEW-SESSION-LOST — itens 13 e 14 do BRIEF `docs/accounting/BE-INCR-INTERVIEW-SESSION-brief.md`:
// 404 INTERVIEW_SESSION_NOT_FOUND volta à escolha criar × customizar; 409 INTERVIEW_SESSION_CONFLICT avisa sem perder nada.
vi.mock('next/router', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('cookies-next', () => ({ getCookie: () => 'tok' }));
vi.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

import { useAiInterview } from '../useAiInterview';

const resp = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response;
const SESSION = '3f1c2a8e-5b7d-4c1e-9a2f-0e6d8b4c7a91';

describe('useAiInterview — sessão de customização perdida ou concorrente (W4 PR-2)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://api.test/api');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  /** Saudação → escolha → customizar: o hook fica em CUSTOMIZATION_IN_PROGRESS com sessão e painel abertos. */
  async function customizando() {
    fetchMock
      .mockResolvedValueOnce(resp(200, { response: 'Olá', nextStage: 'DISCOVERING_BUSINESS' }))
      .mockResolvedValueOnce(
        resp(200, { response: 'Achei o salão', nextStage: 'AWAITING_CREATION_TYPE_CONFIRMATION', presetKey: 'beautySalon', choicePrompt: { kind: 'creation_type', reason: 'initial' } }),
      )
      .mockResolvedValueOnce(
        resp(200, { response: 'Tabelas', nextStage: 'CUSTOMIZATION_IN_PROGRESS', presetKey: 'beautySalon', sessionId: SESSION, startCustomization: true, customizationState: { presetKey: 'beautySalon', presetName: 'Salão', tables: [], customMessages: [], isCompleted: false } }),
      );
    const hook = renderHook(() => useAiInterview());
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
    act(() => hook.result.current.setUserInput('salão'));
    await act(async () => { await hook.result.current.handleSendMessage(); });
    await act(async () => { await hook.result.current.sendCreationChoice('customize'); });
    expect(hook.result.current.sessionId).toBe(SESSION);
    expect(hook.result.current.showCustomizationPanel).toBe(true);
    return hook;
  }

  async function enviar(hook: Awaited<ReturnType<typeof customizando>>, texto: string) {
    act(() => hook.result.current.setUserInput(texto));
    await act(async () => { await hook.result.current.handleSendMessage(); });
  }

  it('item 13: 404 com o code → sessão e painel descartados, volta aos botões criar × customizar do mesmo preset', async () => {
    const hook = await customizando();
    fetchMock.mockResolvedValueOnce(resp(404, { code: 'INTERVIEW_SESSION_NOT_FOUND', message: 'x' }));

    await enviar(hook, 'quero adicionar estoque');

    const r = hook.result.current;
    expect(r.sessionId).toBeNull();
    expect(r.customizationState).toBeNull();
    expect(r.showCustomizationPanel).toBe(false);
    expect(r.presetKey).toBe('beautySalon');
    expect(r.choicePrompt).toEqual({ kind: 'creation_type', reason: 'error' });
    expect(r.messages.at(-1)).toEqual({ sender: 'ai', text: 'onboardingSessionExpired' });

    // O próximo turno sai do estágio da escolha, sem sessionId.
    fetchMock.mockResolvedValueOnce(resp(200, { response: 'ok', nextStage: 'AWAITING_CREATION_TYPE_CONFIRMATION', presetKey: 'beautySalon' }));
    await act(async () => { await hook.result.current.sendCreationChoice('customize'); });
    const body = JSON.parse((fetchMock.mock.calls.at(-1)![1] as RequestInit).body as string);
    expect(body).toMatchObject({ stage: 'AWAITING_CREATION_TYPE_CONFIRMATION', presetKey: 'beautySalon', choice: 'customize' });
    expect(body).not.toHaveProperty('sessionId');
  });

  it('item 14: 409 com o code → mensagem própria; conversa, estágio, sessionId e painel ficam como estavam', async () => {
    const hook = await customizando();
    const antes = hook.result.current.messages.length;
    fetchMock.mockResolvedValueOnce(resp(409, { code: 'INTERVIEW_SESSION_CONFLICT', message: 'x' }));

    await enviar(hook, 'remover metas');

    const r = hook.result.current;
    expect(r.sessionId).toBe(SESSION);
    expect(r.showCustomizationPanel).toBe(true);
    expect(r.customizationState).not.toBeNull();
    expect(r.messages).toHaveLength(antes + 2); // a mensagem do usuário + o aviso
    expect(r.messages.at(-2)).toEqual({ sender: 'user', text: 'remover metas' });
    expect(r.messages.at(-1)).toEqual({ sender: 'ai', text: 'onboardingSessionConflict' });

    fetchMock.mockResolvedValueOnce(resp(200, { response: 'ok', nextStage: 'CUSTOMIZATION_IN_PROGRESS', sessionId: SESSION }));
    await enviar(hook, 'remover metas');
    const body = JSON.parse((fetchMock.mock.calls.at(-1)![1] as RequestInit).body as string);
    expect(body).toMatchObject({ stage: 'CUSTOMIZATION_IN_PROGRESS', sessionId: SESSION });
  });

  it.each([
    [500, { code: 'INTERNAL_SERVER_ERROR' }],
    [404, { code: 'NOT_FOUND' }],
  ])('%i sem o code da sessão → mensagem genérica, sessão e estágio mantidos', async (status, body) => {
    const hook = await customizando();
    fetchMock.mockResolvedValueOnce(resp(status, body));

    await enviar(hook, 'oi');

    const r = hook.result.current;
    expect(r.sessionId).toBe(SESSION);
    expect(r.choicePrompt).toBeNull();
    expect(r.messages.at(-1)).toEqual({ sender: 'ai', text: 'onboardingTurnFailed' });
  });
});
