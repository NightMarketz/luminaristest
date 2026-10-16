import { logger } from '../../../lib/logger';
import { OpenAIService } from '../../../lib/openai/OpenAIService';
import { IMessage, InterviewStage, IInterviewTurnResult, ProcessableStage, CreationChoice, InterviewModuleOption } from '../models/InterviewTypes';
import { PresetMatcher } from './PresetMatcher';
import { ModuleSuggester } from './ModuleSuggester';
import { StageHandlers } from './StageHandlers';
import { stageConfig } from './PromptConfig';
import { CustomizationService } from '../CustomizationService/CustomizationService';
import { presetService } from '../../dynamicTables/services/PresetService';
import { MODULE_REGISTRY } from '../../dynamicTables/presets/modules/registry';
import { isInterviewSessionError } from '../models/InterviewSession.model';

/**
 * Serviço responsável por orquestrar todo o processo de entrevista com IA.
 * W4: construído pelo factory (`getInterviewService`) com o `CustomizationService` sobre a sessão persistida.
 */
export class InterviewService {
  private openaiService: OpenAIService;
  private presetMatcher: PresetMatcher;
  private moduleSuggester: ModuleSuggester;
  private stageHandlers: StageHandlers;
  private customizationService: CustomizationService;

  constructor(customizationService: CustomizationService, openaiService: OpenAIService = OpenAIService.getInstance()) {
    this.openaiService = openaiService;
    this.customizationService = customizationService;
    this.presetMatcher = new PresetMatcher(this.openaiService);
    this.moduleSuggester = new ModuleSuggester(this.openaiService);
    this.stageHandlers = new StageHandlers(this.openaiService, this.customizationService);
    logger.info('[InterviewService] Initialized');
  }

  /**
   * W5 item 12: `moduleOptions` do turno MATCHING_PRESET. Suíte fora do registro ou erro inesperado ⇒ sem o campo
   * (o turno segue como antes).
   */
  private async suggestModules(messages: IMessage[], presetKey: string): Promise<InterviewModuleOption[] | undefined> {
    const suite = presetService.getPresetByKey(presetKey);
    if (!suite) return undefined;
    try {
      return await this.moduleSuggester.suggest(messages, suite);
    } catch (error) {
      logger.error(`[InterviewService] Sugestão de módulos falhou para '${presetKey}': ${error}`);
      return undefined;
    }
  }

  /**
   * Verifica se um estágio é processável com lógica específica
   */
  private isProcessableStage(stage: InterviewStage): stage is ProcessableStage {
    return Object.keys(stageConfig).includes(stage);
  }

  /**
   * Processa um turno da entrevista, avançando o estágio se necessário
   */
  public async processTurn(
    stage: InterviewStage,
    messages: IMessage[],
    userId: string,
    presetKey?: string,
    sessionId?: string,
    choice?: CreationChoice
  ): Promise<IInterviewTurnResult> {
    try {
      logger.info(`[InterviewService] Processando turno no estágio: ${stage}`);
      
      // Estágios especiais que não seguem o fluxo padrão
      if (stage === 'GREETING') {
        return {
          response: "Olá! Para começarmos, por favor me conte sobre o seu negócio ou projeto para que eu possa entender como melhor ajudá-lo com a configuração do sistema.",
          nextStage: 'DISCOVERING_BUSINESS'
        };
      } 
      
      else if (stage === 'MATCHING_PRESET') {
        const matchedPreset = await this.presetMatcher.findMatchingPreset(messages);
        
        if (!matchedPreset) {
          return {
            response: "Não encontrei um preset que se encaixe perfeitamente no seu negócio. Mas não se preocupe, podemos criar um sistema totalmente personalizado. Vamos começar definindo as principais funcionalidades que você precisa.",
            nextStage: 'IDENTIFYING_ENTITIES'
          };
        }
        
        const tablesInfo = this.presetMatcher.extractTablesInfo(matchedPreset.aiDescription);
        const tablesFormatted = tablesInfo.length > 0 ? 
          `Ele inclui as seguintes tabelas principais: ${tablesInfo.join(', ')}.` : '';

        // W5 itens 10–12 (c12 do I8): módulos sugeridos para a suíte casada. A sugestão nunca derruba o turno.
        const moduleOptions = await this.suggestModules(messages, matchedPreset.key);
        const suggestedNames = (moduleOptions ?? []).filter((m) => m.suggested && !m.locked).map((m) => m.name.pt);
        // F-W5-4 (sim/não latente): a suíte não traz a base fixa da categoria (ex.: CRM-0) → perguntar se quer CRM.
        const asksForCrm = (moduleOptions ?? []).some((m) => !m.locked && MODULE_REGISTRY[m.key].fixed);
        const modulesPrompt = [
          suggestedNames.length > 0
            ? `\n\nPela conversa, você também sugere ativar estes módulos: ${suggestedNames.join(', ')}. Cite-os pelo nome e diga que ele pode desmarcá-los antes de criar.`
            : '',
          asksForCrm
            ? '\n\nPergunte também se o negócio quer usar um CRM (funil de vendas para acompanhar clientes em potencial).'
            : '',
        ].join('');
        
        // Criar um prompt para a IA gerar uma mensagem amigável
        const systemPrompt = `Você é um assistente especializado em sistemas de gestão para pequenos negócios.

Um cliente acabou de descrever seu negócio, e você identificou o sistema "${matchedPreset.name}" como ideal para ele.

Este sistema inclui as seguintes funcionalidades: ${tablesInfo.join(', ')}.

Crie uma mensagem acolhedora e entusiasmada (em primeira pessoa) explicando ao cliente que você encontrou este sistema, destacando o que ele poderá fazer com ele em termos práticos para o negócio dele (sem mencionar "tabelas", apenas funcionalidades).

Ao final, pergunte se ele gostaria de criar o sistema diretamente ou customizá-lo primeiro.

Sua mensagem deve ter tom conversacional, ser breve (máximo 5 linhas) e incluir as opções em negrito: **criar o sistema agora** ou **customizar**.${modulesPrompt}`;
        
        // Obter resposta da IA
        const aiResponse = await this.stageHandlers.getAiResponseWithHistory(systemPrompt, []);
        
        // Fallback se a IA não responder corretamente
        const response = aiResponse || `Ótimo! Encontrei um sistema de **${matchedPreset.name}** que combina com o que você precisa.

Com ele você poderá gerenciar ${tablesInfo.slice(0, 3).join(', ')} e muito mais.${suggestedNames.length > 0 ? `\n\nPelo que você contou, também sugiro os módulos: ${suggestedNames.join(', ')}.` : ''}

Gostaria de **criar o sistema agora** ou prefere **customizar** primeiro?`;
        
        return { 
          response, 
          nextStage: 'AWAITING_CREATION_TYPE_CONFIRMATION', 
          presetKey: matchedPreset.key,
          choicePrompt: { kind: 'creation_type', reason: 'initial' },
          ...(moduleOptions ? { moduleOptions } : {}),
        };
      } 
      
      else if (stage === 'AWAITING_CREATION_TYPE_CONFIRMATION' && presetKey) {
        return await this.stageHandlers.handleCreationTypeConfirmation(messages, presetKey, userId, choice);
      }

      else if (stage === 'CUSTOMIZATION_IN_PROGRESS' && sessionId) {
        return await this.customizationService.processCustomizationStep(sessionId, userId, messages);
      }
      
      else if (stage === 'CUSTOMIZATION_COMPLETED') {
        return {
          response: "Sua customização foi concluída com sucesso! O sistema será criado com todas as modificações que você solicitou.",
          nextStage: 'CUSTOMIZATION_COMPLETED' // Mantém o estágio para evitar ciclos indesejados
        };
      }
      

      else if (this.isProcessableStage(stage)) {
        const config = stageConfig[stage];
        let aiResponse = await this.stageHandlers.getAiResponseWithHistory(config.systemPrompt, messages);

        if (!aiResponse) {
          return {
            response: "Desculpe, estou com problemas para processar sua solicitação no momento. Vamos tentar novamente.",
            nextStage: stage
          };
        }

        let isCompleted = false;
        if (stage === 'DISCOVERING_BUSINESS') {
          // Verifica se a resposta contém o marcador SUMMARY:, indicando que a IA coletou informações suficientes
          isCompleted = aiResponse.includes('SUMMARY:');
        } else if (config.completionCheckPrompt) {
          // Para outros estágios, usa a verificação por IA se um prompt de verificação estiver configurado
          const checkResult = await this.stageHandlers.getAiResponseWithHistory(
            config.completionCheckPrompt,
            [...messages, { role: 'assistant', content: aiResponse }]
          );
          isCompleted = checkResult?.toLowerCase() === 'true';
        }

        if (isCompleted) {
          if (stage === 'DISCOVERING_BUSINESS') {
            // Extrai o resumo do negócio e cria uma pergunta de confirmação
            const summaryIndex = aiResponse.indexOf('SUMMARY:');
            const summaryText = aiResponse.substring(summaryIndex + 'SUMMARY:'.length).trim();
            const confirmationQuestion = `Entendi. Então, em resumo, seu negócio é: ${summaryText}. Isso está correto?`;
            return { response: confirmationQuestion, nextStage: 'CONFIRMING_BUSINESS' };
          }
          
          // Para outros estágios completos, avança para o próximo estágio configurado
          // Processa imediatamente o próximo estágio (importante para CONFIRMING_BUSINESS -> MATCHING_PRESET)
          return this.processTurn(config.nextStage, messages, userId);
        }

        return { response: aiResponse, nextStage: stage };
      }

      // Estágio não processável (segue padrão de chat normal)
      else {
        const standardPrompt = `Você é um assistente especializado em configuração de sistemas. 
        Ajude o usuário a entender e configurar seu sistema da melhor maneira possível.`;
        
        const aiResponse = await this.stageHandlers.getAiResponseWithHistory(standardPrompt, messages);
        
        return {
          response: aiResponse || "Desculpe, não consegui processar sua solicitação.",
          nextStage: stage
        };
      }
    } catch (error) {
      // W4 item 5/12: 404/409 da sessão saem com o code próprio — não viram 200 CANNOT_PROCEED.
      if (isInterviewSessionError(error)) throw error;
      logger.error(`[InterviewService] Erro ao processar turno: ${error}`);
      return {
        response: "Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.",
        nextStage: 'CANNOT_PROCEED'
      };
    }
  }
}
