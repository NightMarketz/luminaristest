import { logger } from '../../../lib/logger';
import { OpenAIService } from '../../../lib/openai/OpenAIService';
import type { PresetSuite } from '../../dynamicTables/presets';
import { moduleKnowledge } from '../../dynamicTables/presets/ai/ModuleKnowledgeBase';
import { MODULE_REGISTRY, type ModuleDef, type ModuleKey } from '../../dynamicTables/presets/modules/registry';
import { resolveModuleSelection } from '../../dynamicTables/presets/modules/moduleSelection';
import type { IMessage, InterviewModuleOption } from '../models/InterviewTypes';

/**
 * W5 item 10 (c12 do I8, F-W5-3/F-W5-4): sugere, no turno MATCHING_PRESET, os módulos do registro além dos que a suíte
 * casada já instala. A IA escolhe só dentro do conjunto (`classifyIntoEnumSet`); a sugestão nunca derruba o turno.
 */
export class ModuleSuggester {
  constructor(private readonly openaiService: OpenAIService) {}

  public async suggest(
    messages: IMessage[],
    suite: Pick<PresetSuite, 'modules'>,
    registry: Readonly<Record<ModuleKey, ModuleDef>> = MODULE_REGISTRY,
  ): Promise<InterviewModuleOption[]> {
    // O que a suíte já instala: padrão da suíte fechado pelas dependências.
    const locked = resolveModuleSelection([], suite.modules ?? [], registry);
    const lockedSet = new Set<ModuleKey>(locked);
    const knowledge = moduleKnowledge(registry);
    const options = knowledge.filter((m) => !lockedSet.has(m.key));

    const suggested = new Set<ModuleKey>(locked);
    if (options.length > 0) {
      for (const pick of await this.pickWithAi(messages, knowledge, options.map((m) => m.key))) {
        try {
          for (const key of resolveModuleSelection([pick], locked, registry)) suggested.add(key);
        } catch (error) {
          // Sugestão, não pedido: dependência não-fixa ausente descarta o pick (sem 400).
          logger.warn(`[ModuleSuggester] Sugestão '${pick}' descartada: ${(error as Error).message}`);
        }
      }
    }

    return knowledge.map((m) => ({
      key: m.key,
      name: { ...m.name },
      dependsOn: [...m.dependsOn],
      locked: lockedSet.has(m.key),
      suggested: suggested.has(m.key),
    }));
  }

  /** Erro da API ou resposta vazia ⇒ nenhum pick. */
  private async pickWithAi(
    messages: IMessage[],
    knowledge: ReturnType<typeof moduleKnowledge>,
    options: ModuleKey[],
  ): Promise<ModuleKey[]> {
    const optionSet = new Set<string>(options);
    const systemPrompt = `Você ajuda a configurar um sistema de gestão para um pequeno negócio. Com base na conversa, escolha quais destes módulos OPCIONAIS o negócio deve ter. Escolha só o que a conversa justificar; se nenhum se justificar, devolva a lista vazia.

Módulos opcionais (escolha só entre estas chaves):
${JSON.stringify(knowledge.filter((m) => optionSet.has(m.key)), null, 2)}

Módulos que o sistema já inclui (não escolha):
${JSON.stringify(knowledge.filter((m) => !optionSet.has(m.key)).map((m) => m.key))}`;
    try {
      const conversation = messages.map((m) => `${m.role}: ${m.content}`).join('\n');
      const picks = await this.openaiService.classifyIntoEnumSet(conversation, systemPrompt, options);
      return picks.filter((p): p is ModuleKey => optionSet.has(p));
    } catch (error) {
      logger.error(`[ModuleSuggester] Falha ao sugerir módulos; seguem só os da suíte: ${error}`);
      return [];
    }
  }
}
