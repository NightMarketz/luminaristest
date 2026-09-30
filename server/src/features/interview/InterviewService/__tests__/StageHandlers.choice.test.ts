/**
 * BE-INCR-W3-CHOICE — itens 1–3 de `docs/accounting/WIZARD-W3-ESCOLHA-CRIACAO-brief.md`.
 * `choice` (botão) decide sem ler o texto; todo turno que volta a AWAITING_CREATION_TYPE_CONFIRMATION
 * traz `choicePrompt.reason` para o front escolher botões/modal.
 */
import type { Request, Response } from 'express';
import { StageHandlers } from '../StageHandlers';
import { InterviewService } from '../InterviewService';
import { PresetMatcher } from '../PresetMatcher';
import { presetKnowledgeBase } from '../../../dynamicTables/presets/ai/PresetKnowledgeBase';
import { postChatInterview } from '../../../../controllers/interviewController';
import type { OpenAIService } from '../../../../lib/openai/OpenAIService';
import type { CustomizationService } from '../../CustomizationService/CustomizationService';
import type { IMessage } from '../../models/InterviewTypes';

// O singleton constrói OpenAIService, que exige a chave; o CI injeta esta mesma (ci.yml), o shell local não.
process.env.OPENAI_API_KEY ??= 'ci-dummy-openai-key';

// Contrato §5 (testes): beforeEach(() => jest.clearAllMocks()) sempre.
beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

const handlersWith = (overrides: Partial<Record<keyof CustomizationService, jest.Mock>> = {}) =>
  new StageHandlers({} as OpenAIService, {
    generateSessionId: jest.fn().mockReturnValue('sess-1'),
    createCustomizationSession: jest.fn().mockReturnValue({ tables: [] }),
    generateTablesPresentation: jest.fn().mockResolvedValue('tabelas'),
    ...overrides,
  } as unknown as CustomizationService);

const said = (content: string): IMessage[] => [{ role: 'user', content }];

describe('item 2 — choice decide sem ler o texto', () => {
  it("choice 'create' vence um texto que pede customizar", async () => {
    const result = await handlersWith().handleCreationTypeConfirmation(said('quero customizar'), 'beautySalon', 'create');

    expect(result.nextStage).toBe('COMPLETED');
    expect(result.choicePrompt).toBeUndefined();
  });

  it("choice 'customize' abre a customização mesmo sem mensagem do usuário", async () => {
    const result = await handlersWith().handleCreationTypeConfirmation([], 'beautySalon', 'customize');

    expect(result.nextStage).toBe('CUSTOMIZATION_IN_PROGRESS');
    expect(result.sessionId).toBe('sess-1');
  });
});

describe('item 3 — choicePrompt.reason em todo turno que pede a escolha de novo', () => {
  it.each([
    ['hmm, não sei', 'unclear'],
    ['não quero customizar', 'declined_customize'],
  ])('texto "%s" → reason %s', async (content, reason) => {
    const result = await handlersWith().handleCreationTypeConfirmation(said(content), 'beautySalon');

    expect(result.nextStage).toBe('AWAITING_CREATION_TYPE_CONFIRMATION');
    expect(result.choicePrompt).toEqual({ kind: 'creation_type', reason });
  });

  it('sem mensagem do usuário e sem choice → reason unclear', async () => {
    const result = await handlersWith().handleCreationTypeConfirmation([], 'beautySalon');

    expect(result.choicePrompt).toEqual({ kind: 'creation_type', reason: 'unclear' });
  });

  it.each([
    ['sessão nula', { createCustomizationSession: jest.fn().mockReturnValue(null) }],
    ['exceção', { generateTablesPresentation: jest.fn().mockRejectedValue(new Error('boom')) }],
  ])('erro ao customizar (%s) → reason error', async (_caso, overrides) => {
    const result = await handlersWith(overrides).handleCreationTypeConfirmation([], 'beautySalon', 'customize');

    expect(result.nextStage).toBe('AWAITING_CREATION_TYPE_CONFIRMATION');
    expect(result.choicePrompt).toEqual({ kind: 'creation_type', reason: 'error' });
  });

  it('MATCHING_PRESET com preset encontrado → reason initial', async () => {
    jest.spyOn(PresetMatcher.prototype, 'findMatchingPreset').mockResolvedValue(presetKnowledgeBase[0]);
    jest.spyOn(StageHandlers.prototype, 'getAiResponseWithHistory').mockResolvedValue('Encontrei um sistema.');

    const result = await InterviewService.getInstance().processTurn('MATCHING_PRESET', said('tenho um salão'));

    expect(result.nextStage).toBe('AWAITING_CREATION_TYPE_CONFIRMATION');
    expect(result.choicePrompt).toEqual({ kind: 'creation_type', reason: 'initial' });
  });
});

describe('item 1 — contrato do corpo em POST /api/dashboard/ai/ChatInterview', () => {
  const call = async (body: Record<string, unknown>) => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as unknown as Response;
    const req = { headers: { 'x-user-id': 'u1', 'x-user-username': 'u1', 'x-user-role': 'USER' }, body } as unknown as Request;
    await postChatInterview(req, res);
    return res;
  };

  it("choice fora do enum → 400, sem processar o turno", async () => {
    const processTurn = jest.spyOn(InterviewService.prototype, 'processTurn');

    const res = await call({ stage: 'AWAITING_CREATION_TYPE_CONFIRMATION', presetKey: 'beautySalon', choice: 'delete' });

    expect(res.status).toHaveBeenCalledWith(400);
    expect(processTurn).not.toHaveBeenCalled();
  });

  it("choice válido chega ao processTurn", async () => {
    const processTurn = jest
      .spyOn(InterviewService.prototype, 'processTurn')
      .mockResolvedValue({ response: 'ok', nextStage: 'COMPLETED' });

    const res = await call({ stage: 'AWAITING_CREATION_TYPE_CONFIRMATION', presetKey: 'beautySalon', choice: 'create' });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(processTurn).toHaveBeenCalledWith('AWAITING_CREATION_TYPE_CONFIRMATION', [], 'beautySalon', undefined, 'create');
  });
});
