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
        name: def.name,
        aiDescription: def.aiDescription,
        fixed: def.fixed,
        dependsOn: def.dependsOn,
        ...(def.group ? { group: def.group } : {}),
      });
    }
  });
});
