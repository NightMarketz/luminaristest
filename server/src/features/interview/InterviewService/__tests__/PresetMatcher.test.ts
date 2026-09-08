/**
 * BE-INCR-P2-VERTICAL-CLINICA — Bloco I, comportamento 3: "o matcher resolve uma descrição de
 * clínica estética para `aestheticClinic`, não para `beautySalon`". A IA (`OpenAIService`) é
 * mockada — o que este teste prova é a metade determinística do contrato: dado o `key` que a IA
 * devolveria, `PresetMatcher` resolve para a entrada CERTA de `presetKnowledgeBase`, e as duas
 * entradas (`beautySalon`/`aestheticClinic`) não competem mais pela mesma descrição — a emenda ao
 * `aiDescription` do salão (que reivindicava "clínicas de estética" antes deste incremento) é
 * verificada diretamente aqui, não só inferida.
 */
import { PresetMatcher } from '../PresetMatcher';
import { presetKnowledgeBase } from '../../../dynamicTables/presets/ai/PresetKnowledgeBase';
import type { OpenAIService } from '../../../../lib/openai/OpenAIService';
import type { IMessage } from '../../models/InterviewTypes';

// Contrato §5 (testes): beforeEach(() => jest.clearAllMocks()) sempre.
beforeEach(() => jest.clearAllMocks());

const userSays = (content: string): IMessage[] => [{ role: 'user', content }];

function buildMatcher(aiResponse: string | null): PresetMatcher {
  const openaiStub = {
    getChatCompletionWithHistory: jest.fn().mockResolvedValue(aiResponse),
  } as unknown as OpenAIService;
  return new PresetMatcher(openaiStub);
}

describe('PresetKnowledgeBase — não-competição entre beautySalon e aestheticClinic (comportamento 3)', () => {
  it('aestheticClinic existe e reivindica "clínica" na própria aiDescription', () => {
    const clinic = presetKnowledgeBase.find((p) => p.key === 'aestheticClinic');
    expect(clinic).toBeDefined();
    expect(clinic!.aiDescription.toLowerCase()).toContain('clínica');
  });

  it('beautySalon NÃO reivindica mais "clínica de estética" — emenda obrigatória (BRIEF §3, comportamento 3)', () => {
    const salon = presetKnowledgeBase.find((p) => p.key === 'beautySalon');
    expect(salon).toBeDefined();
    expect(salon!.aiDescription.toLowerCase()).not.toContain('clínica de estética');
    expect(salon!.aiDescription.toLowerCase()).not.toContain('clínicas de estética');
  });
});

describe('PresetMatcher.findMatchingPreset — resolve aestheticClinic vs beautySalon (comportamento 3)', () => {
  it('resposta da IA "aestheticClinic" (descrição de clínica) resolve para o preset da clínica', async () => {
    const matcher = buildMatcher('aestheticClinic');
    const result = await matcher.findMatchingPreset(
      userSays('Quero um sistema para minha clínica de estética, com pacotes de sessões.'),
    );
    expect(result?.key).toBe('aestheticClinic');
  });

  it('resposta da IA "beautySalon" (descrição de salão) resolve para o preset do salão', async () => {
    const matcher = buildMatcher('beautySalon');
    const result = await matcher.findMatchingPreset(userSays('Tenho um salão de beleza e barbearia.'));
    expect(result?.key).toBe('beautySalon');
  });

  it('resposta "none" não resolve preset nenhum', async () => {
    const matcher = buildMatcher('none');
    const result = await matcher.findMatchingPreset(userSays('Vendo carros usados.'));
    expect(result).toBeNull();
  });
});
