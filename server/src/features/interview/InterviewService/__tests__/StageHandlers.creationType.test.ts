/**
 * Teste-guarda (sessao-instrumentacao) — GAP-MAP "Wizard — escolha 'criar agora × customizar' por
 * palavra-chave". `handleCreationTypeConfirmation` decide por `includes('custom'|'personaliz')` e
 * trata todo o resto como "criar direto" (`COMPLETED`, sem volta).
 *
 * Comportamento esperado (decisão do dono 2026-09-30, AskUserQuestion):
 * - resposta ambígua → pergunta de novo (fica em AWAITING_CREATION_TYPE_CONFIRMATION);
 * - negação de customizar → "modal de confirmação": não abre a customização NEM cria direto
 *   sem confirmar. O teste afirma só essa metade — o formato do modal é da correção.
 *
 * A IA não participa desta etapa; `CustomizationService` é stub (só seria usado no ramo customizar).
 */
import { StageHandlers } from '../StageHandlers';
import type { OpenAIService } from '../../../../lib/openai/OpenAIService';
import type { CustomizationService } from '../../CustomizationService/CustomizationService';
import type { IMessage } from '../../models/InterviewTypes';

// Contrato §5 (testes): beforeEach(() => jest.clearAllMocks()) sempre.
beforeEach(() => jest.clearAllMocks());

const customizationStub = {
  generateSessionId: jest.fn().mockReturnValue('sess-1'),
  createCustomizationSession: jest.fn().mockReturnValue({ tables: [] }),
  generateTablesPresentation: jest.fn().mockResolvedValue('tabelas'),
} as unknown as CustomizationService;

const handlers = new StageHandlers({} as OpenAIService, customizationStub);

const turn = (content: string): IMessage[] => [
  { role: 'assistant', content: 'Gostaria de **criar o sistema agora** ou prefere **customizar** primeiro?' },
  { role: 'user', content },
];

describe('StageHandlers.handleCreationTypeConfirmation — escolha só vale se for explícita', () => {
  it.each([
    ['hmm, não sei', 'ambígua'],
    ['depende, o que muda?', 'ambígua'],
    ['não quero customizar', 'negação'],
    ['sem personalizar, por favor', 'negação'],
  ])('"%s" (%s) não abre a customização nem cria o sistema sem confirmar', async (content) => {
    const result = await handlers.handleCreationTypeConfirmation(turn(content), 'beautySalon');

    expect(result.nextStage).not.toBe('CUSTOMIZATION_IN_PROGRESS');
    expect(result.nextStage).not.toBe('COMPLETED');
  });

  // Controle: a escolha explícita continua valendo — sem isto, "perguntar sempre" passaria no guarda.
  it.each([
    ['quero customizar', 'CUSTOMIZATION_IN_PROGRESS'],
    ['criar o sistema agora', 'COMPLETED'],
  ])('"%s" (explícita) → %s', async (content, expected) => {
    const result = await handlers.handleCreationTypeConfirmation(turn(content), 'beautySalon');

    expect(result.nextStage).toBe(expected);
  });
});

// Teste-guarda do achado irmão (GAP-MAP "Wizard — erro ao customizar cria o sistema direto"): quem
// escolheu customizar e esbarrou em falha não pode sair com o sistema criado sem ter pedido.
describe('StageHandlers.handleCreationTypeConfirmation — falha ao customizar não cria o sistema', () => {
  const withCustomization = (overrides: Partial<Record<keyof CustomizationService, jest.Mock>>) =>
    new StageHandlers({} as OpenAIService, {
      generateSessionId: jest.fn().mockReturnValue('sess-1'),
      createCustomizationSession: jest.fn().mockReturnValue({ tables: [] }),
      generateTablesPresentation: jest.fn().mockResolvedValue('tabelas'),
      ...overrides,
    } as unknown as CustomizationService);

  it.each([
    ['sessão de customização não criada', { createCustomizationSession: jest.fn().mockReturnValue(null) }],
    ['exceção ao apresentar as tabelas', { generateTablesPresentation: jest.fn().mockRejectedValue(new Error('boom')) }],
  ])('%s → não sai COMPLETED', async (_caso, overrides) => {
    const result = await withCustomization(overrides).handleCreationTypeConfirmation(
      turn('quero customizar'),
      'beautySalon',
    );

    expect(result.nextStage).not.toBe('COMPLETED');
  });
});
