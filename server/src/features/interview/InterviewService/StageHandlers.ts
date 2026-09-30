import { IMessage, InterviewStage, IInterviewTurnResult, CreationChoice, CreationChoiceReason } from '../models/InterviewTypes';
import OpenAI from 'openai';
import { logger } from '../../../lib/logger';
import { OpenAIService } from '../../../lib/openai/OpenAIService';
import { IPresetKnowledge } from '../../dynamicTables/presets/ai/PresetKnowledgeBase';
import { stageConfig } from './PromptConfig';
import { CustomizationService } from '../CustomizationService/CustomizationService';

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
    choice?: CreationChoice
  ): Promise<IInterviewTurnResult> {
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
          return askAgain("Não entendi sua escolha. Por favor, indique se deseja customizar o sistema ou criar diretamente.", 'unclear');
        }

        const userContent = lastMessage.content.toLowerCase();

        // Escolha só vale se explícita; negação de customizar não conta como customizar.
        // ponytail: palavra-chave só no texto livre (fallback, F-W3-B2 a); o botão manda `choice`.
        const mentionsCustomize = /custom|personaliz|option\s*1|op[çc][ãa]o\s*1/.test(userContent);
        negatesCustomize = /\b(n[ãa]o|sem|nunca)\b[^.,;!?]*(custom|personaliz)/.test(userContent);
        wantsToCustomize = mentionsCustomize && !negatesCustomize;
        wantsToCreate = /\b(cri[ae]r?|agora|diret[oa]|padr[ãa]o)\b|option\s*2|op[çc][ãa]o\s*2/.test(userContent);
      }

      if (!wantsToCustomize && wantsToCreate) {
        logger.info('[StageHandlers] Usuário escolheu criar diretamente');
        return {
          response: "Ótimo! Seu sistema será criado diretamente com as configurações padrão.",
          nextStage: 'COMPLETED',
          presetKey
        };
      }

      if (!wantsToCustomize) {
        return negatesCustomize
          ? askAgain("Entendi que você prefere não customizar. Quer **criar o sistema agora** com as configurações padrão?", 'declined_customize')
          : askAgain("Não entendi sua escolha. Você prefere **criar o sistema agora** ou **customizar** primeiro?", 'unclear');
      }
      
      // Cria uma sessão de customização
      logger.info('[StageHandlers] Usuário escolheu customizar o sistema');
      
      // Gera um sessionId para a customização
      const sessionId = this.customizationService.generateSessionId();
      
      // Cria a sessão de customização
      const customizationState = this.customizationService.createCustomizationSession(presetKey, sessionId);
      
      if (!customizationState) {
        logger.error(`[StageHandlers] Falha ao criar sessão de customização para preset ${presetKey}`);
        return askAgain("Desculpe, houve um erro ao preparar a customização. Quer tentar **customizar** de novo ou **criar o sistema agora**?", 'error');
      }
      
      // Gera a apresentação das tabelas e ajusta o prompt
      const tablesPresentation = await this.customizationService.generateTablesPresentation(sessionId, true);
      
      // Avança para o estágio de customização em andamento
      return {
        response: tablesPresentation,
        nextStage: 'CUSTOMIZATION_IN_PROGRESS',
        presetKey,
        startCustomization: true,
        sessionId,
        customizationState
      };
    } catch (error) {
      logger.error(`[StageHandlers] Erro ao processar confirmação do tipo de criação: ${error}`);
      return askAgain("Desculpe, houve um erro ao processar sua escolha. Quer tentar **customizar** de novo ou **criar o sistema agora**?", 'error');
    }
  }
}
