/**
 * W5 item 8 (c12 do I8): o conhecimento de módulos é derivado de `MODULE_REGISTRY`, sem lista à mão.
 */
import { moduleKnowledge } from '../ModuleKnowledgeBase';
import { MODULE_KEYS, MODULE_REGISTRY } from '../../modules/registry';

beforeEach(() => jest.clearAllMocks());

describe('W5 item 8 — moduleKnowledge()', () => {
  it('uma entrada por MODULE_KEYS, na ordem do registro', () => {
    expect(moduleKnowledge().map((m) => m.key)).toEqual([...MODULE_KEYS]);
  });

  it('textos e metadados iguais aos do registro', () => {
    for (const m of moduleKnowledge()) {
      const def = MODULE_REGISTRY[m.key];
      expect(m).toEqual({
        key: def.key,
        category: def.category,
        name: def.name,
        aiDescription: def.aiDescription,
        fixed: def.fixed,
        dependsOn: def.dependsOn,
        ...(def.group ? { group: def.group } : {}),
      });
    }
  });
});

describe('BE-INCR-MODULOS-BASE-SUBMODULOS PR-6 item 30 — aiDescription dos módulos', () => {
  it('todo módulo aparece no conhecimento da IA, com categoria e descrição em pt', () => {
    const byKey = new Map(moduleKnowledge().map((m) => [m.key, m]));
    expect(byKey.size).toBe(MODULE_KEYS.length);
    for (const key of MODULE_KEYS) {
      const m = byKey.get(key);
      expect(m?.category).toBe(MODULE_REGISTRY[key].category);
      expect(m?.aiDescription.trim().length).toBeGreaterThan(20);
      // pt: sem cair no nome em inglês como descrição
      expect(m?.aiDescription).not.toBe(MODULE_REGISTRY[key].name.en);
    }
    expect(byKey.get('VEN-PAC')?.aiDescription).toBe(
      'Pacotes de sessões pré-pagas com validade; a venda de pacote gera passivo até o consumo.',
    );
  });
});
