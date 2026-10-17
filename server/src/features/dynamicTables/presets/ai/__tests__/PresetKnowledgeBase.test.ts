/**
 * W5 — BE-INCR-PRESET-KB-SINGLE-SOURCE, PR-1: itens 2 (textos movidos sem mudança), 3 (perfil do `crmModule`),
 * 4 (KB derivado do registro) e 5 (chave do mapa = `suite.key`).
 */
import { deriveKnowledgeBase, presetKnowledgeBase } from '../PresetKnowledgeBase';
import { tablePresetSuites, type SelectablePresetSuite } from '../..';
import { PresetMatcher } from '../../../../interview/InterviewService/PresetMatcher';
import type { OpenAIService } from '../../../../../lib/openai/OpenAIService';

beforeEach(() => jest.clearAllMocks());

// Literais de `presetKnowledgeBase` em `8ba1ed8f` (antes do W5), copiadas do `git show` — a fonte única não pode
// reescrever o texto que o P2 comportamento 3 fixou.
const SALON_8BA1ED8F =
  'Um sistema completo de gestão para negócios na área da beleza, como salões, barbearias ou spas. Otimizado para gerenciar o relacionamento com clientes e a agenda. Inclui tabelas para: Clientes (com histórico de visitas), Serviços (catálogo de serviços oferecidos com preço e duração), Agendamentos (para marcar horários, vinculando cliente, serviço e funcionário), Produtos (para venda ou uso interno), Vendas (registrando serviços e produtos), e Funcionários (para comissões e agenda).';
const CLINIC_8BA1ED8F =
  'Um sistema completo de gestão para clínicas de estética — procedimentos estéticos, protocolos de tratamento e pacotes de sessões pré-pagas. Otimizado para o relacionamento com o paciente/cliente e a agenda de atendimentos. Inclui tabelas para: Clientes (ficha com registro administrativo próprio da clínica), Serviços (catálogo de procedimentos com preço e duração), Agendamentos (marcação de atendimentos vinculando cliente, procedimento e profissional), Produtos (cosméticos/insumos para revenda ou uso interno, com controle de estoque), Pacotes (sessões pré-pagas), Vendas (registrando procedimentos e produtos), e Comissões (por profissional).';

const suite = (key: string): SelectablePresetSuite => ({
  key,
  tables: {},
  aiProfile: { name: `Nome ${key}`, description: `Descrição ${key}. Inclui tabelas para: A, B e C.` },
});

describe('W5 item 2 — textos do salão e da clínica movidos byte a byte', () => {
  it('beautySalon e aestheticClinic têm nome e descrição iguais às literais de 8ba1ed8f', () => {
    const byKey = Object.fromEntries(presetKnowledgeBase.map((p) => [p.key, p]));
    expect(byKey.beautySalon).toEqual({ key: 'beautySalon', name: 'Salão de Beleza', aiDescription: SALON_8BA1ED8F });
    expect(byKey.aestheticClinic).toEqual({
      key: 'aestheticClinic',
      name: 'Clínica de Estética',
      aiDescription: CLINIC_8BA1ED8F,
    });
  });
});

describe('W5 item 3 — crmModule ganha perfil de IA', () => {
  const crm = presetKnowledgeBase.find((p) => p.key === 'crmModule');

  it("extractTablesInfo lê ≥ 3 tabelas da frase 'Inclui tabelas para: …'", () => {
    expect(crm).toBeDefined();
    const matcher = new PresetMatcher({} as OpenAIService);
    expect(matcher.extractTablesInfo(crm!.aiDescription).length).toBeGreaterThanOrEqual(3);
  });

  it("CRM não reivindica salão nem clínica; salão e clínica não reivindicam 'funil'", () => {
    const lower = crm!.aiDescription.toLowerCase();
    expect(lower).not.toContain('salão');
    expect(lower).not.toContain('clínica');
    for (const key of ['beautySalon', 'aestheticClinic']) {
      expect(presetKnowledgeBase.find((p) => p.key === key)!.aiDescription.toLowerCase()).not.toContain('funil');
    }
  });
});

describe('W5 item 4 — KB derivado de tablePresetSuites', () => {
  it('chaves do KB == chaves de todas as suítes do registro, na ordem do registro (hoje 3)', () => {
    const registryKeys = Object.values(tablePresetSuites).flatMap((category) => Object.keys(category));
    expect(presetKnowledgeBase.map((p) => p.key)).toEqual(registryKeys);
    expect(registryKeys).toEqual(['beautySalon', 'aestheticClinic', 'crmModule']);
  });

  it('uma suíte de fixture acrescentada ao registro aparece no KB sem tocar PresetKnowledgeBase.ts', () => {
    const kb = deriveKnowledgeBase({ ...tablePresetSuites, extra: { fixtureSuite: suite('fixtureSuite') } });
    expect(kb.map((p) => p.key)).toEqual(['beautySalon', 'aestheticClinic', 'crmModule', 'fixtureSuite']);
    expect(kb[3]).toEqual({
      key: 'fixtureSuite',
      name: 'Nome fixtureSuite',
      aiDescription: 'Descrição fixtureSuite. Inclui tabelas para: A, B e C.',
    });
  });
});

describe('W5 item 5 — chave do mapa tem de ser igual a suite.key', () => {
  it('registro com chave divergente lança erro nomeando a suíte', () => {
    expect(() => deriveKnowledgeBase({ services: { outraChave: suite('minhaSuite') } })).toThrow(/minhaSuite/);
  });
});
