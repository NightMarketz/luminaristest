import { IChatService } from './IChatService';
import { ChatRequestDto as ChatRequest, ChatResponseDto as ChatResponse } from '../dtos/ChatDto';
import type { DocumentSearchService } from '@/features/documents/services/DocumentSearchService';
import { OpenAIService } from '@/lib/openai/OpenAIService';
import { LlmUsage, toTurnUsage } from '@/lib/openai/llmUsage';
import { LuminarisAgentService } from './LuminarisAgentService';
import { KnowledgeGraphService } from './KnowledgeGraphService';
import { ChatMessageService } from '@/features/chatMessages/services/ChatMessageService';
import { ChatMessageRole } from '@/features/chatMessages/models/ChatMessage.model';
import logger from '@/lib/logger';
import { UserContext } from '@/lib/authUtils';
import OpenAI from 'openai';
import { formatInTimeZone } from 'date-fns-tz';
import { sanitizeUserInput, wrapSystemPrompt } from '@/lib/PromptSanitizer';
import { wrapUntrustedData } from '@/lib/untrustedData';
import { RagTurn } from './ragTurn';
import { agentToolError } from '../models/AgentTool.model';

// System prompts are intentionally written in Portuguese: the assistant's persona is
// a Portuguese-speaking ERP/CRM agent. Technical values (IDs, enums) stay language-neutral.
const RAG_SYSTEM_PROMPT = `
Você é um assistente de IA especializado em analisar documentos e responder perguntas com base estritamente no conteúdo fornecido.
Seu objetivo é fornecer respostas precisas e concisas, citando o texto exato dos documentos que suportam sua resposta.

Instruções:
1. Analise a pergunta do usuário e o contexto dos documentos fornecidos.
2. Se o contexto não contiver informações para responder à pergunta, afirme claramente que a resposta não foi encontrada nos documentos.
3. Baseie sua resposta SOMENTE nas informações extraídas do contexto. Não utilize conhecimento prévio ou informações externas.
4. Responda de forma direta e clara.
`;

/** Emenda 07/11, item 15b: no DESCRITIVO, cada afirmação cita o número do trecho que a sustenta. */
const RAG_CITE_RULE =
  '5. Os trechos do contexto vêm numerados como [1], [2]… Em cada afirmação, cite entre colchetes o número do trecho que a sustenta (ex.: "a multa é de 10% [2]"). Não cite número que não esteja no contexto.';

/** Item 15f (F-RAG-M6 = b): no agente, a mesma regra para os trechos devolvidos por search_documents. */
const AGENT_CITE_RULE =
  'Os trechos devolvidos pela ferramenta search_documents vêm com um número ("marker"). Ao usar um trecho na resposta, cite o número dele entre colchetes (ex.: [3]). Não cite número que a ferramenta não devolveu.';

/** Trechos pedidos ao índice no modo RAG (o mesmo valor de antes do RAG-PR-B). */
const RAG_SEARCH_LIMIT = 10;

const AGENT_SYSTEM_PROMPT = `
Você é o Luminaris AI Agent, um assistente inteligente integrado ao ERP/CRM do usuário.
Você tem acesso total ao MAPA DE CONHECIMENTO do sistema (tabelas e relações) que será fornecido abaixo.

Sua missão:
1. Analise o MAPA DE CONHECIMENTO para entender quais tabelas existem e como se relacionam.
2. Quando o usuário quiser criar algo, você DEVE chamar a ferramenta "request_record_creation" enviando TODO o objeto "data".
3. Quando quiser editar algo, use "request_record_update" com os campos alterados no objeto "data".
4. IMPORTANTE: Chamar a ferramenta É O PEDIDO DE CONFIRMAÇÃO. O sistema abrirá um modal automaticamente para o usuário. 
5. NÃO peça confirmação via texto antes de chamar a ferramenta. Se você tiver os dados, chame a ferramenta imediatamente.
6. REGRAS DE DADOS:
   - Se um campo tiver "Opções permitidas", você DEVE usar EXATAMENTE um dos valores da lista. NÃO traduza nem mude o valor (ex: se a opção for "Sale", use "Sale", não use "Venda").
   - Se o campo for uma RELATION, você deve fornecer o ID do registro relacionado.
   - Se faltarem dados obrigatórios, peça ao usuário ANTES de chamar a ferramenta.
7. Use a linguagem do usuário (Português) para conversar, mas mantenha os valores técnicos (IDs e Enums) idênticos ao Graph.
`;

/**
 * Fuso do usuário (`x-user-timezone` → `user.timeZone`) e a hora atual nele, para o agente converter "amanhã às 14h"
 * no instante certo — o motor rejeita `datetime` sem fuso. Fuso ausente ou desconhecido → UTC.
 */
function userClockPrompt(timeZone: string | undefined): string {
  let zone = 'UTC';
  try {
    if (timeZone) {
      Intl.DateTimeFormat(undefined, { timeZone });
      zone = timeZone;
    }
  } catch {
    // RangeError: fuso desconhecido — fica UTC
  }
  const now = formatInTimeZone(new Date(), zone, "yyyy-MM-dd'T'HH:mmxxx");
  return `Fuso horário do usuário: ${zone}. Agora no fuso do usuário: ${now}. Datas/horas que o usuário disser são nesse fuso: envie campos datetime em ISO 8601 com esse offset.`;
}

/** Same ceiling as the client `history` (ChatDto `.max(50)`). */
const MAX_PERSISTED_HISTORY = 50;

export class ChatService implements IChatService {
  constructor(
    // RAG-PR-B item 15: o modo RAG busca pelo mesmo serviço da rota e da ferramenta (posse + embedding + vec0).
    private readonly documentSearch: DocumentSearchService,
    private readonly openaiService: OpenAIService,
    private readonly agentService: LuminarisAgentService,
    private readonly knowledgeGraphService: KnowledgeGraphService,
    private readonly chatMessageService: ChatMessageService
  ) {}

  /**
   * Public entry point: persists the user message, generates the reply, and persists the
   * assistant reply. Persistence is server-owned so message roles can't be spoofed by the client.
   */
  async generateResponse(request: ChatRequest & { user: UserContext }): Promise<ChatResponse> {
    const { query = '', chatInstanceId, user } = request;

    // No client history → the turn remembers what this instance already persisted (read before the
    // new message is stored, so the current query isn't duplicated). Ownership is checked by the read.
    if (chatInstanceId && !request.history?.length) {
      const { messages } = await this.chatMessageService.getMessagesByInstance(chatInstanceId, user);
      request = {
        ...request,
        history: messages.slice(-MAX_PERSISTED_HISTORY).map(m => ({
          role: m.role === ChatMessageRole.ASSISTANT ? 'assistant' : 'user',
          content: m.content,
        })),
      };
    }

    // Persist the user's message first (ownership is validated here → 403/404 if the instance isn't theirs).
    // The DTO has no `role` field — the service always stores client-created messages as USER.
    if (chatInstanceId && query.trim()) {
      await this.chatMessageService.createMessage({ content: query, chatInstanceId }, user);
    }

    // I11: every LLM call of the turn reports its usage here (embedding excluded — F-I11-5 → a).
    const calls: LlmUsage[] = [];
    // Item 15a (F-RAG-M2): sem `ragMode`, RÁPIDO — o comportamento de antes da emenda.
    const turn = new RagTurn(request.ragMode ?? 'RAPIDO');
    const response = await this.buildResponse(request, turn, (usage) => calls.push(usage));

    // Persist the assistant reply. Best-effort: a write hiccup must not discard a generated answer.
    // A turn that throws before this point is not persisted, so its usage is lost (accepted limit, BRIEF item 15).
    if (chatInstanceId && response.answer) {
      try {
        // Item 15e (F-RAG-M7): citações e dados técnicos ficam com a mensagem, para o chat reaberto mostrar o mesmo.
        const ragDetail = response.sourceDocuments?.length ? turn.detail(response) : null;
        await this.chatMessageService.appendAssistantMessage(chatInstanceId, response.answer, user, toTurnUsage(calls), ragDetail);
      } catch (error) {
        logger.warn('Failed to persist assistant message', { error, chatInstanceId });
      }
    }

    return response;
  }

  private async rewriteQueryWithHistory(query: string, history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>, onUsage: (usage: LlmUsage) => void): Promise<string> {
    const historyText = history
      .filter(h => h.role !== 'system') // Skip system instructions for query rewriting
      .map(h => `${h.role === 'user' ? 'Usuário' : 'Assistente'}: ${h.content}`)
      .join('\n');

    const rewritePrompt = `
Com base no histórico da conversa abaixo e na pergunta seguinte, reformule a pergunta para que ela seja autônoma e possa ser compreendida sem o histórico.
Responda APENAS com a pergunta reformulada.

Histórico da Conversa:
---
${historyText}
---

Pergunta a ser reformulada: "${query}"

Pergunta Reformulada:
`;

    const rewrittenQuery = await this.openaiService.getChatCompletion(rewritePrompt, undefined, onUsage);
    // Fall back to the original query if the rewrite fails.
    return rewrittenQuery ? rewrittenQuery.trim() : query;
  }

  private async buildResponse(request: ChatRequest & { user: UserContext }, turn: RagTurn, onUsage: (usage: LlmUsage) => void): Promise<ChatResponse> {
    const { documentIds, history, confirmedProposalId, user } = request;
    const query = sanitizeUserInput(request.query ?? '');
    logger.info('Iniciando geração de resposta de chat', { queryLength: query.length, documentCount: documentIds?.length, historyLength: history?.length });

    // Confirmation of a previously proposed action.
    if (confirmedProposalId) {
      logger.info('Executing confirmed proposal', { confirmedProposalId });
      try {
        const result = await this.agentService.executeProposal(user, confirmedProposalId);
        return {
          answer: `Pronto! A operação foi realizada com sucesso. ID do registro: ${result.result?.id || 'N/A'}`,
          type: 'TEXT',
          sourceDocuments: []
        };
      } catch (error: unknown) {
        logger.error('Failed to execute confirmed proposal', { error, confirmedProposalId });
        return {
          answer: `Houve um erro ao executar a operação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
          type: 'TEXT',
          sourceDocuments: []
        };
      }
    }

    const hasSelectedDocuments = Array.isArray(documentIds) && documentIds.length > 0;

    // No documents selected → drive the ERP agent flow directly.
    if (!hasSelectedDocuments) {
      logger.info('No documents selected; using ERP agent mode.');

      const tools = await this.agentService.getTools();
      const knowledgeGraphPrompt = await this.knowledgeGraphService.getGraphPrompt(user.userId);

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: wrapSystemPrompt(AGENT_SYSTEM_PROMPT, user.id) },
        { role: 'system', content: userClockPrompt(user.timeZone) },
        { role: 'system', content: knowledgeGraphPrompt },
        ...(turn.descriptive ? [{ role: 'system' as const, content: AGENT_CITE_RULE }] : []),
        ...(history || []).map(h => ({ role: h.role, content: h.content } as OpenAI.Chat.Completions.ChatCompletionMessageParam)),
        { role: 'user', content: query }
      ];

      // Tool-call loop.
      let iterations = 0;
      let answerModel: string | undefined;
      while (iterations < 5) {
        iterations++;
        const response = await this.openaiService.getChatCompletionWithToolsAndHistory(
          messages,
          tools,
          undefined,
          (usage) => { answerModel = usage.model; onUsage(usage); }
        );

        if (!response) break;

        if (response.tool_calls && response.tool_calls.length > 0) {
          messages.push(response as OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam);

          for (const toolCall of response.tool_calls) {
            // openai 7: tool_calls é união function | custom; só registramos tools do tipo function.
            if (toolCall.type !== 'function') {
              logger.warn('Ignoring non-function tool call', { toolCallType: toolCall.type });
              continue;
            }
            let toolArgs: Record<string, unknown>;
            try {
              toolArgs = JSON.parse(toolCall.function.arguments);
            } catch (parseError) {
              logger.warn('Failed to parse tool args, skipping', { toolName: toolCall.function.name });
              // BRD F-57.1: every tool_call needs its tool message, or the next round sends an unanswered call.
              messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify(agentToolError('ARGUMENTOS_INVALIDOS', 'Os argumentos da ferramenta não são um JSON válido.')),
              });
              continue;
            }
            const result = await this.agentService.handleToolCall(
              user,
              toolCall.function.name,
              toolArgs,
              turn
            ) as { status?: string; proposalId?: string } | unknown;

            // Se for uma proposta, interrompemos e retornamos para o frontend
            const toolResult = result as { status?: string; proposalId?: string };
            if (toolResult.status === 'PROPOSED') {
              const proposal = await this.agentService.getProposal(toolResult.proposalId!);
              if (!proposal) throw new Error('Proposal not found');
              return {
                answer: `Entendido! Estou propondo a seguinte ação na tabela **${proposal.tableName}**. Por favor, confirme os detalhes no modal abaixo para prosseguir.`,
                type: 'ACTION_PROPOSAL',
                proposal: {
                  id: proposal.id,
                  action: proposal.action as 'CREATE' | 'UPDATE' | 'DELETE',
                  tableName: proposal.tableName,
                  tableLabel: proposal.tableLabel,
                  data: proposal.data
                },
                sourceDocuments: []
              };
            }

            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(result)
            } as { role: 'tool'; tool_call_id: string; content: string });
          }
          // Tool results appended: the next iteration lets the model call another tool or answer.
        } else {
          const answer = response.content || 'Não foi possível gerar uma resposta.';
          // Item 15f: no DESCRITIVO, a resposta final liga os [n] aos trechos devolvidos no turno inteiro.
          if (turn.descriptive && turn.size > 0) {
            return {
              answer,
              type: 'TEXT',
              sourceDocuments: turn.sourceDocuments(),
              citations: turn.citations(answer),
              ...(answerModel ? { answerModel } : {}),
            };
          }
          return { answer, type: 'TEXT', sourceDocuments: [] };
        }
      }

      return { answer: 'O limite de processamento do agente foi atingido.', type: 'TEXT', sourceDocuments: [] };
    }

    // Modo RAG (documentos selecionados). RAG-PR-B item 15: posse, embedding e busca pelo DocumentSearchService —
    // documento que não é do usuário → NotFoundError antes do embedding (padrão cross-tenant do item 13).
    let contextualQuery = query;
    if (history && history.length > 1) {
      contextualQuery = await this.rewriteQueryWithHistory(query, history, onUsage);
    }
    const { hits, stamp } = await this.documentSearch.search(user, contextualQuery, { documentIds, limit: RAG_SEARCH_LIMIT });

    if (hits.length === 0) {
      return {
        answer: 'Desculpe, não encontrei informações relevantes nos documentos selecionados.',
        type: 'TEXT',
        sourceDocuments: [],
      };
    }

    const numbered = turn.add(hits, stamp);
    let answerModel: string | undefined;
    const trackModel = (usage: LlmUsage) => { answerModel = usage.model; onUsage(usage); };

    let answer: string | null;
    if (turn.descriptive) {
      // Item 15b: trechos numerados, ainda como dado não confiável (item 17); o prompt manda citar o número.
      const context = wrapUntrustedData(
        'documentos selecionados',
        numbered.map((h) => `[${h.marker}] (${h.fileName}, trecho ${h.chunkIndex})\n${h.text}`).join('\n\n---\n\n'),
      );
      const finalPrompt = `Contexto:\n---\n${context}\n---\nPergunta: "${contextualQuery}"`;
      answer = await this.openaiService.getChatCompletion(finalPrompt, wrapSystemPrompt(`${RAG_SYSTEM_PROMPT}${RAG_CITE_RULE}\n`, user.id), trackModel);
    } else {
      // Item 15c: o prompt de antes da emenda — sem numeração e sem citations.
      const context = hits.map((h) => h.text).join('\n\n---\n\n');
      const finalPrompt = `Contexto:\n---\n${context}\n---\nPergunta: "${contextualQuery}"`;
      answer = await this.openaiService.getChatCompletion(finalPrompt, wrapSystemPrompt(RAG_SYSTEM_PROMPT, user.id), trackModel);
    }

    const text = answer || 'Não foi possível gerar uma resposta.';
    return {
      answer: text,
      type: 'TEXT',
      // F-RAG-M3: o RÁPIDO também devolve as fontes (a tela esconde).
      sourceDocuments: turn.sourceDocuments(),
      ...(turn.descriptive ? { citations: turn.citations(text) } : {}),
      ...(answerModel ? { answerModel } : {}),
    };
  }
}
