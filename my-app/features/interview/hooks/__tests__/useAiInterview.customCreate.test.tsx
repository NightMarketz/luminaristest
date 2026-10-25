import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// W1 — BRIEF docs/accounting/W1-WIZARD-CUSTOM-CREATE-brief.md, itens 6–8 e 10 (FE) + F-W1-6 (a) com sincronização
// (dono, questionário 2026-10-24).
vi.mock('next/router', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('cookies-next', () => ({ getCookie: () => 'tok' }));
vi.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (k: string, p?: Record<string, string>) => (p ? `${k}:${JSON.stringify(p)}` : k) }),
}));

import { useAiInterview } from '../useAiInterview';
import type { InterviewModuleOption } from '../../types/InterviewTypes';

const reply = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) }) as unknown as Response;
const bodyOf = (fetchMock: ReturnType<typeof vi.fn>, i: number) => JSON.parse((fetchMock.mock.calls[i][1] as RequestInit).body as string);
const urlOf = (fetchMock: ReturnType<typeof vi.fn>, i: number) => fetchMock.mock.calls[i][0] as string;

const opt = (key: InterviewModuleOption['key'], locked: boolean, suggested: boolean): InterviewModuleOption => ({
  key,
  name: { pt: key, en: key },
  dependsOn: key === 'CRM-0' ? [] : ['CRM-0'],
  locked,
  suggested,
});
const OPTIONS = [opt('CRM-0', true, true), opt('CRM-1', true, true), opt('CRM-3', false, false)];
const SESSION = '3f1c2a8e-5b7d-4c1e-9a2f-0e6d8b4c7a91';
const estado = (modules: string[]) => ({ presetKey: 'beautySalon', presetName: 'Salão', tables: [], modules });
const CREATION = {
  mode: 'custom',
  presetKey: 'beautySalon',
  removedTables: ['goals'],
  addedFields: { expenses: [{ name: 'nota', label: 'Nota', type: 'string', required: false }] },
  addedTables: [{ key: 'fidelidade', name: 'Fidelidade', fields: [{ name: 'name', label: 'Nome', type: 'string', required: true }] }],
};

describe('useAiInterview — customização chega ao create (W1 FE)', () => {
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

  /** Saudação → match com módulos → botão customizar (abre a sessão). */
  async function emCustomizacao() {
    fetchMock
      .mockResolvedValueOnce(reply({ response: 'Olá', nextStage: 'DISCOVERING_BUSINESS' }))
      .mockResolvedValueOnce(reply({
        response: 'Achei', nextStage: 'AWAITING_CREATION_TYPE_CONFIRMATION', presetKey: 'beautySalon',
        choicePrompt: { kind: 'creation_type', reason: 'initial' }, moduleOptions: OPTIONS,
      }));
    const hook = renderHook(() => useAiInterview());
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
    act(() => hook.result.current.setUserInput('tenho um salão'));
    await act(async () => { await hook.result.current.handleSendMessage(); });
    act(() => hook.result.current.toggleModule('CRM-3'));
    fetchMock.mockResolvedValueOnce(reply({
      response: 'Painel', nextStage: 'CUSTOMIZATION_IN_PROGRESS', presetKey: 'beautySalon', startCustomization: true,
      sessionId: SESSION, customizationState: estado(['CRM-0', 'CRM-1', 'CRM-3']),
    }));
    await act(async () => { await hook.result.current.sendCreationChoice('customize'); });
    return hook;
  }

  async function finalizar(result: Awaited<ReturnType<typeof emCustomizacao>>['result'], creation: unknown = CREATION) {
    fetchMock.mockResolvedValueOnce(reply({
      response: 'Customização Concluída', nextStage: 'COMPLETED', presetKey: 'beautySalon', sessionId: SESSION,
      ...(creation ? { creation } : {}),
    }));
    act(() => result.current.setUserInput('pode finalizar'));
    await act(async () => { await result.current.handleSendMessage(); });
    await waitFor(() => expect(result.current.fiscalPendente).toBe(true));
  }

  it('F-W1-6 (a): o turno customizar leva os módulos marcados', async () => {
    await emCustomizacao();
    expect(bodyOf(fetchMock, 2)).toMatchObject({ choice: 'customize', modules: ['CRM-0', 'CRM-1', 'CRM-3'] });
  });

  it('itens 6–7: COMPLETED com creation → pergunta fiscal → create custom com unit, fiscal e os módulos do hook', async () => {
    const { result } = await emCustomizacao();
    await finalizar(result);
    fetchMock.mockResolvedValueOnce(reply({ success: true, data: { unitId: 'u-1' } }, 201));
    act(() => result.current.confirmarFiscal({ regime: 'SIMPLES' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
    expect(urlOf(fetchMock, 4)).toBe('http://api.test/api/dashboard/create');
    expect(bodyOf(fetchMock, 4)).toEqual({
      ...CREATION,
      unit: { name: 'beautySalon' },
      fiscal: { regime: 'SIMPLES' },
      modules: ['CRM-0', 'CRM-1', 'CRM-3'],
    });
  });

  it('item 6: COMPLETED sem creation → caminho quick de antes, intacto', async () => {
    const { result } = await emCustomizacao();
    await finalizar(result, null);
    fetchMock.mockResolvedValueOnce(reply({ success: true, data: {} }, 201));
    act(() => result.current.confirmarFiscal({ regime: 'MEI' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
    expect(bodyOf(fetchMock, 4)).toEqual({ suiteKey: 'beautySalon', unit: { name: 'beautySalon' }, fiscal: { regime: 'MEI' }, modules: ['CRM-0', 'CRM-1', 'CRM-3'] });
  });

  it('item 8: o retry reenvia o payload custom inteiro', async () => {
    const { result } = await emCustomizacao();
    await finalizar(result);
    fetchMock.mockResolvedValueOnce(reply({ success: false, errorCode: 'ONBOARDING_ROLLED_BACK', error: 'falhou' }, 500));
    act(() => result.current.confirmarFiscal({ regime: 'SIMPLES' }));
    await waitFor(() => expect(result.current.creationError?.kind).toBe('retryable'));

    fetchMock.mockResolvedValueOnce(reply({ success: true, data: {} }, 201));
    act(() => result.current.handleRetry());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(6));
    expect(bodyOf(fetchMock, 5)).toEqual(bodyOf(fetchMock, 4));
    expect(bodyOf(fetchMock, 5)).toMatchObject({ mode: 'custom', addedTables: CREATION.addedTables });
  });

  it('item 10: 400 com motivo conhecido → kind invalid e mensagem traduzida com os nomes', async () => {
    const { result } = await emCustomizacao();
    await finalizar(result);
    fetchMock.mockResolvedValueOnce(reply({
      code: 'VALIDATION_ERROR', message: 'texto do servidor',
      details: { reason: 'MODULE_PARTIAL', moduleKey: 'CRM-9', removedTables: ['a'] },
    }, 400));
    act(() => result.current.confirmarFiscal({ regime: 'SIMPLES' }));
    await waitFor(() => expect(result.current.creationError).not.toBeNull());
    expect(result.current.creationError?.kind).toBe('invalid');
    expect(result.current.creationError?.message).toContain('onboardingCreateErrorModulePartial');
    expect(result.current.creationError?.message).toContain('CRM-9');
  });

  it('sincronização: marcar módulo durante a customização regrava a sessão e a seleção vem do servidor', async () => {
    const { result } = await emCustomizacao();
    fetchMock.mockResolvedValueOnce(reply({ sessionId: SESSION, customizationState: estado(['CRM-0', 'CRM-1']) }));
    await act(async () => { result.current.toggleModule('CRM-3'); });
    await waitFor(() => expect(result.current.isSyncingModules).toBe(false));

    expect(urlOf(fetchMock, 3)).toBe('http://api.test/api/dashboard/ai/InterviewModules');
    expect(bodyOf(fetchMock, 3)).toEqual({ sessionId: SESSION, modules: ['CRM-0', 'CRM-1'] });
    expect(result.current.selectedModules).toEqual(['CRM-0', 'CRM-1']);
    expect(result.current.customizationState?.modules).toEqual(['CRM-0', 'CRM-1']);
  });

  it('sincronização: o turno que tira um módulo pela conversa atualiza a seleção', async () => {
    const { result } = await emCustomizacao();
    fetchMock.mockResolvedValueOnce(reply({
      response: 'Removida', nextStage: 'CUSTOMIZATION_IN_PROGRESS', sessionId: SESSION, customizationState: estado(['CRM-0', 'CRM-3']),
    }));
    act(() => result.current.setUserInput('tira as propostas'));
    await act(async () => { await result.current.handleSendMessage(); });
    expect(result.current.selectedModules).toEqual(['CRM-0', 'CRM-3']);
  });

  it('sincronização: sessão perdida (404) volta à escolha criar × customizar', async () => {
    const { result } = await emCustomizacao();
    fetchMock.mockResolvedValueOnce(reply({ code: 'INTERVIEW_SESSION_NOT_FOUND', message: 'x' }, 404));
    await act(async () => { result.current.toggleModule('CRM-3'); });
    await waitFor(() => expect(result.current.sessionId).toBeNull());
    expect(result.current.choicePrompt).toEqual({ kind: 'creation_type', reason: 'error' });
  });
});
