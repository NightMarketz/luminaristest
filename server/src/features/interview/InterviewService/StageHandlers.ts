import { IMessage, InterviewStage, IInterviewTurnResult, CreationChoice, CreationChoiceReason } from '../models/InterviewTypes';
import OpenAI from 'openai';
import { logger } from '../../../lib/logger';
import { OpenAIService } from '../../../lib/openai/OpenAIService';
import { IPresetKnowledge } from '../../dynamicTables/presets/ai/PresetKnowledgeBase';
import { stageConfig } from './PromptConfig';
import { CustomizationService } from '../CustomizationService/CustomizationService';
import type { ModuleSelector } from '../../dynamicTables/presets/modules/registry';
import { DEFAULT_INTERVIEW_LOCALE, INTERVIEW_TEXT, type InterviewLocale } from '../models/interviewText';

/**
 * Classe responsável pelo processamento de estágios específicos da entrevista
 */
export class StageHandlers {
  private openaiService: OpenAIService;
  private customizationService: CustomizationService;

  constructor(openaiService: OpenAIService, customizationService: CustomizationService) {
    this.openaiService = openaiService;
    this.customizationService = customizationService;
  }

  /**
   * Obtém resposta da IA com base no prompt do sistema e mensagens da conversa
   */
  public async getAiResponseWithHistory(systemPrompt: string, messages: IMessage[]): Promise<string | null> {
    try {
      // Converte as mensagens para o formato esperado pelo OpenAI
      const formattedMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ 
          role: m.role, 
          content: m.content 
        }))
      ];

      // Solicita a resposta do OpenAI
      return await this.openaiService.getChatCompletionWithHistory(formattedMessages);
    } catch (error) {
      logger.error(`[StageHandlers] Erro ao obter resposta da IA: ${error}`);
      return null;
    }
  }



  /**
   * Processa a confirmação do tipo de criação (direta ou customizada).
   * `choice` (botão, W3 b) decide sem ler o texto; sem ele, só texto explícito decide.
   */
  public async handleCreationTypeConfirmation(
    messages: IMessage[],
    presetKey: string,
    userId: string,
    choice?: CreationChoice,
    modules?: ModuleSelector[],
    locale: InterviewLocale = DEFAULT_INTERVIEW_LOCALE
  ): Promise<IInterviewTurnResult> {
    const tx = INTERVIEW_TEXT[locale];
    const askAgain = (response: string, reason: CreationChoiceReason): IInterviewTurnResult => ({
      response,
      nextStage: 'AWAITING_CREATION_TYPE_CONFIRMATION',
      presetKey,
      choicePrompt: { kind: 'creation_type', reason },
    });

    try {
      logger.info(`[StageHandlers] Processando confirmação do tipo de criação para preset ${presetKey}`);

      let wantsToCustomize: boolean;
      let wantsToCreate: boolean;
      let negatesCustomize = false;

      if (choice) {
        wantsToCustomize = choice === 'customize';
        wantsToCreate = choice === 'create';
      } else {
        // Obtém a última mensagem do usuário
        const lastMessage = messages.filter(m => m.role === 'user').pop();
        if (!lastMessage) {
          return askAgain(tx.choiceNoMessage, 'unclear');
        }

        const userContent = lastMessage.content.toLowerCase();

        // Escolha só vale se explícita; negação de customizar não conta como customizar.
        // atalho: palavra-chave só no texto livre (fallback, F-W3-B2 a); o botão manda `choice`.
        const mentionsCustomize = /custom|personaliz|option\s*1|op[çc][ãa]o\s*1/.test(userContent);
        negatesCustomize = /\b(n[ãa]o|sem|nunca|no|not|never|without|don'?t)\b[^.,;!?]*(custom|personaliz)/.test(userContent);
        wantsToCustomize = mentionsCustomize && !negatesCustomize;
        wantsToCreate = /\b(cri[ae]r?|agora|diret[oa]|padr[ãa]o|create|now|directly|default)\b|option\s*2|op[çc][ãa]o\s*2/.test(userContent);
      }

      if (!wantsToCustomize && wantsToCreate) {
        logger.info('[StageHandlers] Usuário escolheu criar diretamente');
        return {
          response: tx.choiceCreate,
          nextStage: 'COMPLETED',
          presetKey
        };
      }

      if (!wantsToCustomize) {
        return negatesCustomize
          ? askAgain(tx.choiceDeclined, 'declined_customize')
          : askAgain(tx.choiceUnclear, 'unclear');
      }
      
      // Cria uma sessão de customização
      logger.info('[StageHandlers] Usuário escolheu customizar o sistema');
      
      // W4 item 6: a sessão pertence ao usuário; o id é o da linha persistida, nunca vem do cliente.
      const session = await this.customizationService.createCustomizationSession(presetKey, userId, modules, locale);

      if (!session) {
        logger.error(`[StageHandlers] Falha ao criar sessão de customização para preset ${presetKey}`);
        return askAgain(tx.choiceSessionError, 'error');
      }

      // Gera a apresentação das tabelas e ajusta o prompt
      const tablesPresentation = await this.customizationService.generateTablesPresentation(session.state, true, locale);

      // Avança para o estágio de customização em andamento
      return {
        response: tablesPresentation,
        nextStage: 'CUSTOMIZATION_IN_PROGRESS',
        presetKey,
        startCustomization: true,
        sessionId: session.id,
        customizationState: session.state
      };
    } catch (error) {
      logger.error(`[StageHandlers] Erro ao processar confirmação do tipo de criação: ${error}`);
      return askAgain(tx.choiceError, 'error');
    }
  }
}
