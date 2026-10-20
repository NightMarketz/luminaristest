import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// W5 FE-INCR-W5-MODULES itens 14 e 16 (BRIEF BE-INCR-PRESET-KB-SINGLE-SOURCE §2).
vi.mock('next/router', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('cookies-next', () => ({ getCookie: () => 'tok' }));
vi.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

import { useAiInterview } from '../useAiInterview';
import type { InterviewModuleOption } from '../../types/InterviewTypes';

const jsonResponse = (body: unknown) => ({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) }) as unknown as Response;
const bodyOf = (fetchMock: ReturnType<typeof vi.fn>, i: number) => JSON.parse((fetchMock.mock.calls[i][1] as RequestInit).body as string);

const opt = (key: InterviewModuleOption['key'], locked: boolean, suggested: boolean): InterviewModuleOption => ({
  key,
  name: { pt: key, en: key },
  dependsOn: key === 'CRM-0' ? [] : ['CRM-0'],
  locked,
  suggested,
});
const SALON_OPTIONS: InterviewModuleOption[] = [
  opt('CRM-0', true, true),
  opt('CRM-1', true, true),
  opt('CRM-2A', false, true),
  opt('CRM-2B', false, false),
  opt('CRM-3', false, false),
];
const matchTurn = (presetKey: string, moduleOptions?: InterviewModuleOption[]) =>
  jsonResponse({
    response: 'Achei',
    nextStage: 'AWAITING_CREATION_TYPE_CONFIRMATION',
    presetKey,
    choicePrompt: { kind: 'creation_type', reason: 'initial' },
    ...(moduleOptions ? { moduleOptions } : {}),
  });

describe('useAiInterview — módulos sugeridos (W5 FE)', () => {
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

  async function comMatch() {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ response: 'Olá', nextStage: 'DISCOVERING_BUSINESS' }))
      .mockResolvedValueOnce(matchTurn('beautySalon', SALON_OPTIONS));
    const hook = renderHook(() => useAiInterview());
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
    act(() => hook.result.current.setUserInput('salão que vende para empresas'));
    await act(async () => { await hook.result.current.handleSendMessage(); });
    return hook;
  }

  async function turno(result: Awaited<ReturnType<typeof comMatch>>['result'], resposta: Response) {
    fetchMock.mockResolvedValueOnce(resposta);
    act(() => result.current.setUserInput('mais'));
    await act(async () => { await result.current.handleSendMessage(); });
  }

  it('item 14: turno com moduleOptions popula as opções e a seleção começa pelos suggested', async () => {
    const { result } = await comMatch();
    expect(result.current.moduleOptions).toEqual(SALON_OPTIONS);
    expect(result.current.selectedModules).toEqual(['CRM-0', 'CRM-1', 'CRM-2A']);
  });

  it('item 14: turno seguinte com o MESMO presetKey e sem moduleOptions não perde a seleção', async () => {
    const { result } = await comMatch();
    act(() => result.current.toggleModule('CRM-3'));
    await turno(result, jsonResponse({ response: 'Não entendi', nextStage: 'AWAITING_CREATION_TYPE_CONFIRMATION', presetKey: 'beautySalon' }));
    expect(result.current.selectedModules).toEqual(['CRM-0', 'CRM-1', 'CRM-2A', 'CRM-3']);
  });

  it('item 14: novo match (outro presetKey) zera opções e seleção', async () => {
    const { result } = await comMatch();
    await turno(result, matchTurn('crmModule'));
    expect(result.current.moduleOptions).toEqual([]);
    expect(result.current.selectedModules).toEqual([]);
  });

  it('item 16: o POST /dashboard/create leva modules com a seleção', async () => {
    const { result } = await comMatch();
    act(() => result.current.toggleModule('CRM-2A'));
    act(() => result.current.toggleModule('CRM-3'));
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ response: 'Pronto', nextStage: 'COMPLETED', presetKey: 'beautySalon' }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { unitId: 'u-1' } }));
    await act(async () => { await result.current.sendCreationChoice('create'); });
    await waitFor(() => expect(result.current.fiscalPendente).toBe(true));
    act(() => result.current.confirmarFiscal({ regime: 'PRESUMIDO', grandePorte: false }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    expect(fetchMock.mock.calls[3][0]).toBe('http://api.test/api/dashboard/create');
    expect(bodyOf(fetchMock, 3)).toMatchObject({ suiteKey: 'beautySalon', modules: ['CRM-0', 'CRM-1', 'CRM-3'] });
  });
});
