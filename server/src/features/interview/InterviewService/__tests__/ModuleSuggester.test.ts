/**
 * W5 — BE-INCR-PRESET-KB-SINGLE-SOURCE, PR-2 (c12 do I8): itens 10 (`ModuleSuggester`), 11 (sim/não latente,
 * F-W5-4) e 12 (`moduleOptions` no turno MATCHING_PRESET). A IA é stub: o que se prova é o conjunto, o fechamento
 * pelas dependências e que a sugestão nunca derruba o turno.
 */
import { ModuleSuggester } from '../ModuleSuggester';
import { InterviewService } from '../InterviewService';
import { PresetMatcher } from '../PresetMatcher';
import { StageHandlers } from '../StageHandlers';
import type { OpenAIService } from '../../../../lib/openai/OpenAIService';
import { presetService } from '../../../dynamicTables/services/PresetService';
import { tablePresetSuites, type PresetSuite } from '../../../dynamicTables/presets';
import { presetKnowledgeBase } from '../../../dynamicTables/presets/ai/PresetKnowledgeBase';
import { MODULE_REGISTRY, type ModuleDef, type ModuleKey } from '../../../dynamicTables/presets/modules/registry';
import type { IMessage, InterviewModuleOption } from '../../models/InterviewTypes';
import type { CustomizationService } from '../../CustomizationService/CustomizationService';

// Defesa: se algum caminho construir o OpenAIService real, ele exige a chave; o CI injeta esta mesma (ci.yml).
process.env.OPENAI_API_KEY ??= 'ci-dummy-openai-key';

// Contrato §5 (testes): beforeEach(() => jest.clearAllMocks()) sempre.
beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

const b2b: IMessage[] = [{ role: 'user', content: 'Tenho um salão e também vendo pacotes para empresas (B2B).' }];
const CRM_QUESTION = 'Pergunte também se o negócio quer usar um CRM';

function suggesterWith(classify: jest.Mock): ModuleSuggester {
  return new ModuleSuggester({ classifyIntoEnumSet: classify } as unknown as OpenAIService);
}

// W4: o InterviewService é construído pelo factory; aqui, direto, com a IA de sugestão como stub.
const turn = (picks: string[] | Error) => {
  const classifyIntoEnumSet = picks instanceof Error ? jest.fn().mockRejectedValue(picks) : jest.fn().mockResolvedValue(picks);
  const openai = { classifyIntoEnumSet } as unknown as OpenAIService;
  return new InterviewService({} as CustomizationService, openai).processTurn('MATCHING_PRESET', b2b, 'u1');
};

const byKey = (options: InterviewModuleOption[]) =>
  Object.fromEntries(options.map((o) => [o.key, { locked: o.locked, suggested: o.suggested }]));

describe('W5 item 10 — ModuleSuggester.suggest', () => {
  it('salão + conversa B2B: pick CRM-2A vira suggested; CRM-0/CRM-1 vêm locked', async () => {
    const classify = jest.fn().mockResolvedValue(['CRM-2A']);
    const options = await suggesterWith(classify).suggest(b2b, tablePresetSuites.services.beautySalon);

    expect(options.map((o) => o.key)).toEqual(['CRM-0', 'CRM-1', 'CRM-2A', 'CRM-2B', 'CRM-3']);
    expect(byKey(options)).toEqual({
      'CRM-0': { locked: true, suggested: true },
      'CRM-1': { locked: true, suggested: true },
      'CRM-2A': { locked: false, suggested: true },
      'CRM-2B': { locked: false, suggested: false },
      'CRM-3': { locked: false, suggested: false },
    });
    // A IA escolhe só entre os não-travados.
    expect(classify).toHaveBeenCalledWith(expect.any(String), expect.any(String), ['CRM-2A', 'CRM-2B', 'CRM-3']);
    expect(options[2]).toEqual({
      key: 'CRM-2A', name: { pt: 'Contas', en: 'Accounts' }, dependsOn: ['CRM-0'], locked: false, suggested: true,
    });
  });

  it('crmModule (os 5 travados) → zero chamada à IA, todos locked + suggested', async () => {
    const classify = jest.fn();
    const options = await suggesterWith(classify).suggest(b2b, tablePresetSuites.sales.crmModule);

    expect(classify).not.toHaveBeenCalled();
    expect(options.every((o) => o.locked && o.suggested)).toBe(true);
  });

  it.each([
    ['erro da API', () => jest.fn().mockRejectedValue(new Error('429'))],
    ['resposta vazia', () => jest.fn().mockResolvedValue([])],
  ])('%s → só os travados sugeridos', async (_caso, makeClassify) => {
    const options = await suggesterWith(makeClassify()).suggest(b2b, tablePresetSuites.services.beautySalon);

    expect(options.filter((o) => o.suggested).map((o) => o.key)).toEqual(['CRM-0', 'CRM-1']);
  });

  it('pick cuja dependência não-fixa falta é descartado (sem 400); os outros picks seguem', async () => {
    // Fixture: CRM-3 passa a depender de CRM-2A (não-fixo, fora da suíte).
    const registry: Record<ModuleKey, ModuleDef> = {
      ...MODULE_REGISTRY,
      'CRM-3': { ...MODULE_REGISTRY['CRM-3'], dependsOn: ['CRM-0', 'CRM-2A'] },
    };
    const classify = jest.fn().mockResolvedValue(['CRM-3', 'CRM-2B']);
    const options = await suggesterWith(classify).suggest(b2b, tablePresetSuites.services.beautySalon, registry);

    expect(options.filter((o) => o.suggested).map((o) => o.key)).toEqual(['CRM-0', 'CRM-1', 'CRM-2B']);
  });
});

describe('W5 item 11 — sim/não latente (F-W5-4)', () => {
  const semModulos: PresetSuite = { key: 'fixtureSemModulos', tables: {} };

  it('suíte sem modules: CRM-0 entra nas opções como locked: false; pick CRM-1 traz CRM-0 junto', async () => {
    const classify = jest.fn().mockResolvedValue(['CRM-1']);
    const options = await suggesterWith(classify).suggest(b2b, semModulos);

    expect(options.find((o) => o.key === 'CRM-0')).toMatchObject({ locked: false, suggested: true });
    expect(options.every((o) => !o.locked)).toBe(true);
    expect(classify.mock.calls[0][2]).toContain('CRM-0');
  });

  it('nenhuma suíte real cai no latente hoje: as 3 suítes têm CRM-0 travado', async () => {
    const suites = Object.values(tablePresetSuites).flatMap((c) => Object.values(c));
    expect(suites).toHaveLength(3);
    for (const suite of suites) {
      const options = await suggesterWith(jest.fn().mockResolvedValue([])).suggest([], suite);
      expect(options.find((o) => o.key === 'CRM-0')?.locked).toBe(true);
    }
  });

  it('turno com suíte sem CRM-0: o prompt da mensagem pergunta se o negócio quer CRM', async () => {
    jest.spyOn(PresetMatcher.prototype, 'findMatchingPreset').mockResolvedValue(presetKnowledgeBase[0]);
    jest.spyOn(presetService, 'getPresetByKey').mockReturnValue(semModulos as never);
    const ai = jest.spyOn(StageHandlers.prototype, 'getAiResponseWithHistory').mockResolvedValue('Encontrei.');

    const result = await turn([]);

    expect(result.moduleOptions?.find((o) => o.key === 'CRM-0')).toMatchObject({ locked: false });
    expect(ai.mock.calls[0][0]).toContain(CRM_QUESTION);
  });
});

describe('W5 item 12 — turno MATCHING_PRESET devolve moduleOptions', () => {
  it('com match: presetKey + choicePrompt + moduleOptions; a mensagem cita os sugeridos não-travados', async () => {
    jest.spyOn(PresetMatcher.prototype, 'findMatchingPreset').mockResolvedValue(presetKnowledgeBase[0]);
    const ai = jest.spyOn(StageHandlers.prototype, 'getAiResponseWithHistory').mockResolvedValue(null);

    const result = await turn(['CRM-3']);

    expect(result.presetKey).toBe('beautySalon');
    expect(result.choicePrompt).toEqual({ kind: 'creation_type', reason: 'initial' });
    expect(result.moduleOptions?.filter((o) => o.suggested).map((o) => o.key)).toEqual(['CRM-0', 'CRM-1', 'CRM-3']);
    expect(ai.mock.calls[0][0]).toContain('Oportunidades');
    expect(ai.mock.calls[0][0]).not.toContain(CRM_QUESTION);
    // Fallback (a IA da mensagem não respondeu) também cita o módulo sugerido.
    expect(result.response).toContain('Oportunidades');
  });

  it('sem match: nada muda, sem moduleOptions e sem chamar a sugestão', async () => {
    jest.spyOn(PresetMatcher.prototype, 'findMatchingPreset').mockResolvedValue(null);
    const suggest = jest.spyOn(ModuleSuggester.prototype, 'suggest');

    const result = await turn([]);

    expect(result.nextStage).toBe('IDENTIFYING_ENTITIES');
    expect(result).not.toHaveProperty('moduleOptions');
    expect(suggest).not.toHaveBeenCalled();
  });
});
