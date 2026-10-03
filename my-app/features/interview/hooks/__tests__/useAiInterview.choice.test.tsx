import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// W3 FE-INCR-W3-CHOICE itens 7, 8, 9, 12 no hook (BRIEF WIZARD-W3-ESCOLHA-CRIACAO).
vi.mock('next/router', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('cookies-next', () => ({ getCookie: () => 'tok' }));

import { useAiInterview } from '../useAiInterview';

const jsonResponse = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as unknown as Response;
const bodyOf = (fetchMock: ReturnType<typeof vi.fn>, i: number) => JSON.parse((fetchMock.mock.calls[i][1] as RequestInit).body as string);

describe('useAiInterview — escolha criar × customizar (W3 FE)', () => {
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

  async function emEstagioDeEscolha() {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ response: 'Olá', nextStage: 'DISCOVERING_BUSINESS' }))
      .mockResolvedValueOnce(
        jsonResponse({ response: 'Achei o salão', nextStage: 'AWAITING_CREATION_TYPE_CONFIRMATION', presetKey: 'salon', choicePrompt: { kind: 'creation_type', reason: 'initial' } }),
      );
    const hook = renderHook(() => useAiInterview());
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
    act(() => hook.result.current.setUserInput('salão'));
    await act(async () => { await hook.result.current.handleSendMessage(); });
    return hook;
  }

  it('item 7: choicePrompt do servidor aparece no hook; turno sem ele zera', async () => {
    const { result } = await emEstagioDeEscolha();
    expect(result.current.choicePrompt).toEqual({ kind: 'creation_type', reason: 'initial' });

    fetchMock.mockResolvedValueOnce(jsonResponse({ response: 'ok', nextStage: 'DISCOVERING_BUSINESS' }));
    act(() => result.current.setUserInput('mais uma'));
    await act(async () => { await result.current.handleSendMessage(); });
    expect(result.current.choicePrompt).toBeNull();
  });

  it('itens 8/9: sendCreationChoice posta choice no corpo com stage, presetKey e mensagens', async () => {
    const { result } = await emEstagioDeEscolha();
    fetchMock.mockResolvedValueOnce(jsonResponse({ response: 'Customizando', nextStage: 'CUSTOMIZING', presetKey: 'salon' }));
    await act(async () => { await result.current.sendCreationChoice('customize'); });

    const body = bodyOf(fetchMock, 2);
    expect(body).toMatchObject({ choice: 'customize', stage: 'AWAITING_CREATION_TYPE_CONFIRMATION', presetKey: 'salon' });
    expect(body.messages).toHaveLength(3);
    expect(result.current.choicePrompt).toBeNull();
  });

  it('item 12: dois cliques no mesmo tick → 1 fetch', async () => {
    const { result } = await emEstagioDeEscolha();
    let resolve!: (r: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise<Response>((r) => { resolve = r; }));
    await act(async () => {
      const a = result.current.sendCreationChoice('create');
      const b = result.current.sendCreationChoice('create');
      resolve(jsonResponse({ response: 'Pronto', nextStage: 'COMPLETED', presetKey: 'salon' }));
      await Promise.all([a, b]);
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
