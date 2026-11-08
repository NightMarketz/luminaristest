import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// Idioma da UI (dono, chat, 2026-11-06: "Seguir o idioma da UI"): todo POST da entrevista leva o `locale` da UI.
const lang = vi.hoisted(() => ({ value: 'en-US' }));
vi.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: lang.value } }),
}));
vi.mock('next/router', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('cookies-next', () => ({ getCookie: () => 'tok' }));

import { useAiInterview } from '../useAiInterview';

const jsonResponse = (body: unknown) => ({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) }) as unknown as Response;
const bodyOf = (fetchMock: ReturnType<typeof vi.fn>, i: number) => JSON.parse((fetchMock.mock.calls[i][1] as RequestInit).body as string);

describe('useAiInterview — locale da UI no corpo', () => {
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

  it.each([
    ['en-US', 'en'],
    ['pt', 'pt'],
  ])('UI em %s → saudação e turno com locale %s', async (ui, expected) => {
    lang.value = ui;
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ response: 'Hi', nextStage: 'DISCOVERING_BUSINESS' }))
      .mockResolvedValueOnce(jsonResponse({ response: 'Tell me more', nextStage: 'DISCOVERING_BUSINESS' }));
    const { result } = renderHook(() => useAiInterview());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.setUserInput('salon'));
    await act(async () => { await result.current.handleSendMessage(); });

    expect(bodyOf(fetchMock, 0)).toMatchObject({ stage: 'GREETING', locale: expected });
    expect(bodyOf(fetchMock, 1)).toMatchObject({ stage: 'DISCOVERING_BUSINESS', locale: expected });
  });
});
