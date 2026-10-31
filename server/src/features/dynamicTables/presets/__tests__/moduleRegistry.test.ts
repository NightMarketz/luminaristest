/**
 * BE-INCR-CRM-MODULE-COMPOSITION (I8) — comportamento 1: registro de módulos.
 * Testável (BRIEF §2.1): registro é acíclico; toda tabela de `CrmModulePreset` pertence a exatamente
 * um módulo; nenhum `required` cruza módulo sem `dependsOn`. + contrato §3 materializado em Zod.
 */
import {
  MODULE_KEYS,
  MODULE_REGISTRY,
  moduleDefSchema,
  moduleKeySchema,
  moduleOfTable,
  composeModuleTables,
  moduleSelectorSchema,
  MODULE_GROUPS,
  MODULE_GROUP_KEYS,
  MODULE_CATEGORIES,
  MODULE_TABLE_SOURCES,
  assertRegistryInvariants,
  expandModuleSelectors,
  type ModuleCategory,
  type ModuleDef,
  type ModuleKey,
} from '../modules/registry';
import { CrmModulePreset } from '../systems/CrmModulePreset';

beforeEach(() => jest.clearAllMocks());

const MARKER = '@@PRESET_TABLE_KEY::';

describe('registro de módulos — contrato Zod (BRIEF §3)', () => {
  it.each(MODULE_KEYS)('%s satisfaz moduleDefSchema (.strict) e key casa com a chave do registro', (k) => {
    const def = moduleDefSchema.parse(MODULE_REGISTRY[k]);
    expect(def.key).toBe(k);
  });

  it('moduleKeySchema recusa chave fora do registro', () => {
    expect(moduleKeySchema.safeParse('CRM-9').success).toBe(false);
    expect(moduleKeySchema.safeParse('CRM-2A').success).toBe(true);
    // BE-INCR-CRM-SUBMODULES (F-SUB-2 → a): 'CRM-2' deixou de ser módulo; é grupo, aceito só como seletor de entrada.
    expect(moduleKeySchema.safeParse('CRM-2').success).toBe(false);
    expect(moduleSelectorSchema.safeParse('CRM-2').success).toBe(true);
    expect(moduleSelectorSchema.safeParse('CRM-9').success).toBe(false);
  });

  it('moduleDefSchema recusa campo extra (strict)', () => {
    expect(moduleDefSchema.safeParse({ ...MODULE_REGISTRY['CRM-0'], extra: 1 }).success).toBe(false);
  });

  it('CRM-0 é o único fixo do CRM; CRM-1/2A/2B/3 dependem só de CRM-0 (F-CRM-3/5 → a; F-SUB-3 → a)', () => {
    expect(MODULE_KEYS.filter((k) => MODULE_REGISTRY[k].fixed && MODULE_REGISTRY[k].category === 'crm')).toEqual(['CRM-0']);
    for (const k of ['CRM-1', 'CRM-2A', 'CRM-2B', 'CRM-3'] as const) {
      expect(MODULE_REGISTRY[k].dependsOn).toEqual(['CRM-0']);
    }
  });
});

describe('registro de módulos — invariantes (BRIEF §2.1)', () => {
  it('é acíclico', () => {
    const visit = (k: ModuleKey, path: ModuleKey[]): void => {
      expect(path).not.toContain(k);
      for (const d of MODULE_REGISTRY[k].dependsOn) visit(d, [...path, k]);
    };
    for (const k of MODULE_KEYS) visit(k, []);
  });

  it('toda tabela de CrmModulePreset pertence a exatamente um módulo', () => {
    for (const t of Object.keys(CrmModulePreset.tables)) {
      const owners = MODULE_KEYS.filter((k) => MODULE_REGISTRY[k].tables.includes(t));
      expect({ t, owners }).toEqual({ t, owners: [moduleOfTable(t)] });
      expect(owners).toHaveLength(1);
    }
    const all = MODULE_KEYS.flatMap((k) => MODULE_REGISTRY[k].tables);
    expect(new Set(all).size).toBe(all.length);
  });

  it('nenhuma relação required cruza módulo sem dependsOn (tabela fora de módulo = core)', () => {
    const closure = (k: ModuleKey): Set<ModuleKey> => {
      const s = new Set<ModuleKey>([k]);
      for (const d of MODULE_REGISTRY[k].dependsOn) closure(d).forEach((x) => s.add(x));
      return s;
    };
    const tables = composeModuleTables(MODULE_KEYS);
    let checked = 0;
    for (const [internalName, def] of Object.entries(tables)) {
      const owner = moduleOfTable(internalName)!;
      for (const f of def.schema.fields) {
        const target = f.relation?.targetTable;
        if (f.type !== 'relation' || !f.required || !target?.startsWith(MARKER)) continue;
        const targetModule = moduleOfTable(target.slice(MARKER.length));
        if (!targetModule) continue; // core (units/employees/...)
        checked++;
        expect({ from: `${internalName}.${f.name}`, ok: closure(owner).has(targetModule) }).toEqual({
          from: `${internalName}.${f.name}`,
          ok: true,
        });
      }
    }
    // falsificador: se o scan não achasse nenhuma relação required intra-CRM, o teste seria vazio.
    expect(checked).toBeGreaterThanOrEqual(4);
  });

  it('(d) BE-INCR-CRM-SUBMODULES §2: todo módulo não-fixo tem exatamente uma tabela', () => {
    const naoFixos = MODULE_KEYS.filter((k) => !MODULE_REGISTRY[k].fixed);
    expect(naoFixos.length).toBeGreaterThanOrEqual(4);
    for (const k of naoFixos) {
      expect({ k, tables: MODULE_REGISTRY[k].tables.length }).toEqual({ k, tables: 1 });
    }
  });

  it('(e) todo membro de grupo existe, pertence a um único grupo e declara esse grupo', () => {
    const vistos = new Map<ModuleKey, string>();
    for (const g of MODULE_GROUP_KEYS) {
      expect(MODULE_GROUPS[g].members.length).toBeGreaterThanOrEqual(2);
      for (const m of MODULE_GROUPS[g].members) {
        expect(MODULE_KEYS).toContain(m);
        expect(vistos.has(m)).toBe(false);
        vistos.set(m, g);
        expect(MODULE_REGISTRY[m].group).toBe(g);
      }
    }
    for (const k of MODULE_KEYS) {
      if (MODULE_REGISTRY[k].group) expect(vistos.get(k)).toBe(MODULE_REGISTRY[k].group);
    }
    // o corte ratificado: CRM-2 = Contas + Contatos
    expect(MODULE_GROUPS['CRM-2'].members).toEqual(['CRM-2A', 'CRM-2B']);
    expect(MODULE_REGISTRY['CRM-2A'].tables).toEqual(['crmAccounts']);
    expect(MODULE_REGISTRY['CRM-2B'].tables).toEqual(['crmContacts']);
  });

  it('moduleOfTable devolve undefined para tabela de core', () => {
    expect(moduleOfTable('employees')).toBeUndefined();
    expect(moduleOfTable('leadProposals')).toBe('CRM-1');
  });
});

describe('registro genérico por categoria (BE-INCR-MODULOS-BASE-SUBMODULOS PR-1)', () => {
  const def = (key: string, category: ModuleCategory, over: Partial<ModuleDef> = {}): ModuleDef => ({
    key: key as ModuleKey,
    category,
    name: { pt: key, en: key },
    aiDescription: key,
    fixed: false,
    tables: [`${key}-t`],
    dependsOn: [],
    requiresOneOf: [],
    freeSelects: {},
    ...over,
  });

  it('item 1: category é enum fechado de 7 categorias; toda entrada real passa no schema', () => {
    expect(MODULE_CATEGORIES).toEqual(['crm', 'pessoas', 'vendas', 'estoque', 'agenda', 'financeiro', 'gestao']);
    for (const k of MODULE_KEYS) expect(moduleDefSchema.safeParse(MODULE_REGISTRY[k]).success).toBe(true);
    expect(moduleDefSchema.safeParse({ ...MODULE_REGISTRY['CRM-0'], category: 'vendas' }).success).toBe(true);
    expect(moduleDefSchema.safeParse({ ...MODULE_REGISTRY['CRM-0'], category: 'outra' }).success).toBe(false);
  });

  it('item 2: cada categoria presente tem uma base; não-fixo tem uma tabela', () => {
    expect(() => assertRegistryInvariants()).not.toThrow();
    const cats = new Set(MODULE_KEYS.map((k) => MODULE_REGISTRY[k].category));
    for (const c of cats) {
      expect(MODULE_KEYS.filter((k) => MODULE_REGISTRY[k].category === c && MODULE_REGISTRY[k].fixed)).toHaveLength(1);
    }
  });

  it('item 2 (negativo): duas bases na mesma categoria → falha nomeando a categoria', () => {
    const reg = { 'VEN-0': def('VEN-0', 'vendas', { fixed: true }), 'VEN-X': def('VEN-X', 'vendas', { fixed: true }) };
    expect(() => assertRegistryInvariants(reg)).toThrow(/categoria 'vendas'.*exatamente uma base fixa.*VEN-0, VEN-X/);
  });

  it('item 2 (negativo): categoria sem base e não-fixo com 2 tabelas → falham', () => {
    expect(() => assertRegistryInvariants({ 'VEN-S': def('VEN-S', 'vendas') })).toThrow(/categoria 'vendas'/);
    const reg = { 'VEN-0': def('VEN-0', 'vendas', { fixed: true }), 'VEN-S': def('VEN-S', 'vendas', { tables: ['a', 'b'] }) };
    expect(() => assertRegistryInvariants(reg)).toThrow(/'VEN-S'.*exatamente uma tabela/);
  });

  it('item 4: requiresOneOf default [] e cada grupo exige ≥2 chaves', () => {
    const { requiresOneOf: _drop, ...semCampo } = MODULE_REGISTRY['CRM-0'];
    expect(_drop).toEqual([]);
    expect(moduleDefSchema.parse(semCampo).requiresOneOf).toEqual([]);
    expect(moduleDefSchema.safeParse({ ...MODULE_REGISTRY['CRM-0'], requiresOneOf: [['CRM-1']] }).success).toBe(false);
    expect(moduleDefSchema.safeParse({ ...MODULE_REGISTRY['CRM-0'], requiresOneOf: [['CRM-1', 'CRM-3']] }).success).toBe(true);
  });

  it('item 6: toda tabela de todo módulo tem fonte, e a fonte não traz tabela de outro módulo', () => {
    for (const k of MODULE_KEYS) {
      expect(Object.keys(MODULE_TABLE_SOURCES[k]).sort()).toEqual([...MODULE_REGISTRY[k].tables].sort());
      for (const t of MODULE_REGISTRY[k].tables) expect(MODULE_TABLE_SOURCES[k][t]).toBeDefined();
    }
    expect(Object.keys(composeModuleTables(MODULE_KEYS))).toEqual(MODULE_KEYS.flatMap((k) => MODULE_REGISTRY[k].tables));
  });

  it('a ordem de chaves do registro é a de MODULE_KEYS (as regras puras devolvem na ordem do registro)', () => {
    expect(Object.keys(MODULE_REGISTRY)).toEqual([...MODULE_KEYS]);
  });
});

describe('PR-2 — PESSOAS e VENDAS no registro (itens 7, 9, 10, 11a/11b)', () => {
  it('itens 9–10: o mapa-alvo §1 — base, tabelas, dependências e requiresOneOf', () => {
    const view = (k: ModuleKey) => {
      const { category, fixed, tables, dependsOn, requiresOneOf } = MODULE_REGISTRY[k];
      return { category, fixed, tables, dependsOn, requiresOneOf };
    };
    expect(view('PES-0')).toEqual({ category: 'pessoas', fixed: true, tables: ['customers'], dependsOn: [], requiresOneOf: [] });
    expect(view('PES-FORN')).toEqual({ category: 'pessoas', fixed: false, tables: ['suppliers'], dependsOn: [], requiresOneOf: [] });
    expect(view('VEN-0')).toEqual({
      category: 'vendas', fixed: true, tables: ['sales', 'saleItems'], dependsOn: ['PES-0'],
      requiresOneOf: [['VEN-SERV', 'VEN-PROD', 'VEN-PAC']],
    });
    for (const [k, t] of [['VEN-SERV', 'services'], ['VEN-PROD', 'products'], ['VEN-PAC', 'packages'], ['VEN-COM', 'commissions']] as const) {
      expect(view(k)).toEqual({ category: 'vendas', fixed: false, tables: [t], dependsOn: ['VEN-0'], requiresOneOf: [] });
    }
  });

  it('item 9 (F-MS-6 a): os módulos novos nascem com freeSelects vazio e aiDescription em pt', () => {
    for (const k of ['PES-0', 'PES-FORN', 'VEN-0', 'VEN-SERV', 'VEN-PROD', 'VEN-PAC', 'VEN-COM'] as const) {
      expect(MODULE_REGISTRY[k].freeSelects).toEqual({});
      expect(MODULE_REGISTRY[k].aiDescription.length).toBeGreaterThan(20);
    }
  });

  it('item 10: VEN-0 não declara trava (lockedBy é do PR-5)', () => {
    expect(Object.keys(MODULE_REGISTRY['VEN-0'])).not.toContain('lockedBy');
  });

  it('item 7: VENDAS expande para VEN-0, VEN-SERV, VEN-PROD, VEN-PAC, VEN-COM; PESSOAS para PES-0, PES-FORN', () => {
    expect(expandModuleSelectors(['VENDAS'])).toEqual(['VEN-0', 'VEN-SERV', 'VEN-PROD', 'VEN-PAC', 'VEN-COM']);
    expect(expandModuleSelectors(['PESSOAS'])).toEqual(['PES-0', 'PES-FORN']);
    expect(moduleSelectorSchema.safeParse('VENDAS').success).toBe(true);
    expect(moduleKeySchema.safeParse('VENDAS').success).toBe(false);
    // categorias ainda sem módulos não têm grupo (PR-3/PR-4)
    for (const g of ['ESTOQUE', 'AGENDA', 'FINANCEIRO', 'GESTAO']) expect(moduleSelectorSchema.safeParse(g).success).toBe(false);
  });

  it('item 11a: override troca a fonte de uma tabela de módulo; override de tabela fora de módulo → erro', () => {
    const override = { name: 'Fichas', category: 'business', schema: { fields: [{ name: 'x', label: 'x', type: 'string' }] } };
    expect(composeModuleTables(['PES-0'], { overrides: { customers: override } }).customers.name).toBe('Fichas');
    expect(composeModuleTables(['PES-0']).customers.name).toBe('Customers');
    expect(() => composeModuleTables(['PES-0'], { overrides: { productUnits: override } })).toThrow(/'productUnits' não é tabela de módulo/);
  });

  it('item 11b: locked marca lockedBy accounting só nas tabelas pedidas, preservando a meta do módulo', () => {
    const t = composeModuleTables(['PES-0', 'VEN-0', 'VEN-SERV'], { locked: ['sales'] });
    expect(t.sales.meta).toEqual({ requiresTables: ['saleItems'], lockedBy: 'accounting' });
    expect(t.saleItems.meta?.lockedBy).toBeUndefined();
    expect(() => composeModuleTables(['PES-0'], { locked: ['units'] })).toThrow(/'units' não é tabela de módulo/);
  });
});
