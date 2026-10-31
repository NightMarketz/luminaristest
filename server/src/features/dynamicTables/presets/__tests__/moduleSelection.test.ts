/**
 * BE-INCR-CRM-MODULE-COMPOSITION (I8) — comportamentos 2 (seleção) e 10 (addedFields por módulo).
 * BE-INCR-CRM-SUBMODULES — itens 3 (grupo 'CRM-2' como atalho), 5 (MODULE_PARTIAL) e 6 (DEPENDENT_MODULE_KEPT).
 */
import { ValidationError } from '../../../../lib/errors';
import {
  MODULE_REGISTRY,
  composeModuleTables,
  expandModuleSelectors,
  type ModuleCategory,
  type ModuleDef,
  type ModuleKey,
  type ModuleRegistry,
} from '../modules/registry';
import {
  applyModuleRemovals,
  applySelectOverrides,
  assertAddedFieldsRespectModules,
  resolveModuleSelection,
} from '../modules/moduleSelection';

beforeEach(() => jest.clearAllMocks());

describe('resolveModuleSelection (comportamento 2)', () => {
  it("['CRM-1'] instala CRM-0 + CRM-1 (CRM-0 implícito)", () => {
    expect(resolveModuleSelection(['CRM-1'])).toEqual(['CRM-0', 'CRM-1']);
  });

  it("['CRM-3'] sem CRM-2A/2B instala CRM-0 + CRM-3 (F-CRM-5 → a: Contas/Contatos só enriquecem)", () => {
    expect(resolveModuleSelection(['CRM-3'])).toEqual(['CRM-0', 'CRM-3']);
  });

  it('soma o default da suíte e devolve na ordem do registro, sem duplicar', () => {
    expect(resolveModuleSelection(['CRM-3', 'CRM-1'], ['CRM-0', 'CRM-1'])).toEqual(['CRM-0', 'CRM-1', 'CRM-3']);
  });

  it('nada pedido e suíte sem módulos → nenhum módulo (tenant sem CRM)', () => {
    expect(resolveModuleSelection([], [])).toEqual([]);
  });

  it('dependência NÃO-fixa ausente → 400 com o módulo faltante nomeado', () => {
    // Registro de teste: CRM-3 passa a exigir CRM-2A (não-fixo) — o ramo que o registro real não exercita hoje.
    const fake: Record<ModuleKey, ModuleDef> = {
      ...MODULE_REGISTRY,
      'CRM-3': { ...MODULE_REGISTRY['CRM-3'], dependsOn: ['CRM-0', 'CRM-2A'] },
    };
    let err: unknown;
    try {
      resolveModuleSelection(['CRM-3'], [], fake);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(ValidationError);
    expect((err as ValidationError).details).toEqual({ module: 'CRM-3', missingModule: 'CRM-2A' });
  });
});

describe('expandModuleSelectors (BE-INCR-CRM-SUBMODULES item 3, F-SUB-2 → a)', () => {
  it("'CRM-2' expande para CRM-2A+CRM-2B", () => {
    expect(expandModuleSelectors(['CRM-2'])).toEqual(['CRM-2A', 'CRM-2B']);
  });

  it('mistura grupo e chaves atômicas: deduplica e devolve na ordem do registro', () => {
    expect(expandModuleSelectors(['CRM-3', 'CRM-2B', 'CRM-2', 'CRM-1'])).toEqual(['CRM-1', 'CRM-2A', 'CRM-2B', 'CRM-3']);
  });

  it('a seleção resolvida só tem chaves atômicas', () => {
    expect(resolveModuleSelection(expandModuleSelectors(['CRM-2']), ['CRM-0', 'CRM-1'])).toEqual([
      'CRM-0',
      'CRM-1',
      'CRM-2A',
      'CRM-2B',
    ]);
  });
});

describe('applyModuleRemovals (#411 + BE-INCR-CRM-SUBMODULES itens 4–6)', () => {
  const ALL: ModuleKey[] = ['CRM-0', 'CRM-1', 'CRM-2A', 'CRM-2B', 'CRM-3'];
  const details = (fn: () => unknown) => {
    try { fn(); } catch (e) { expect(e).toBeInstanceOf(ValidationError); return (e as ValidationError).details; }
    return null;
  };

  it('item 4: remover a tabela de um submódulo remove o submódulo inteiro, sem erro', () => {
    expect(applyModuleRemovals(ALL, ['crmContacts'])).toEqual(['CRM-0', 'CRM-1', 'CRM-2A', 'CRM-3']);
    expect(applyModuleRemovals(ALL, ['crmAccounts'])).toEqual(['CRM-0', 'CRM-1', 'CRM-2B', 'CRM-3']);
  });

  it('módulo fixo parcial segue FIXED_MODULE_PARTIAL (#411)', () => {
    expect(details(() => applyModuleRemovals(ALL, ['leadActivities']))).toEqual({
      moduleKey: 'CRM-0', removedTables: ['leadActivities'], reason: 'FIXED_MODULE_PARTIAL',
    });
  });

  it('item 5 (F-SUB-4 → a): módulo NÃO-fixo de 2 tabelas com remoção parcial → 400 MODULE_PARTIAL', () => {
    // Registro de teste: um CRM-2A hipotético com 2 tabelas (o reagrupamento que o teste 1d impede no registro real).
    const fake: Record<ModuleKey, ModuleDef> = {
      ...MODULE_REGISTRY,
      'CRM-2A': { ...MODULE_REGISTRY['CRM-2A'], tables: ['crmAccounts', 'crmAccountNotes'] },
    };
    expect(details(() => applyModuleRemovals(['CRM-0', 'CRM-2A'], ['crmAccountNotes'], fake))).toEqual({
      moduleKey: 'CRM-2A', removedTables: ['crmAccountNotes'], reason: 'MODULE_PARTIAL',
    });
    expect(applyModuleRemovals(['CRM-0', 'CRM-2A'], ['crmAccounts', 'crmAccountNotes'], fake)).toEqual(['CRM-0']);
  });

  it('item 6 (F-SUB-6 → a): remover módulo com dependente mantido → 400 DEPENDENT_MODULE_KEPT nomeando todos', () => {
    const CRM0 = ['leadPipelines', 'leadStages', 'leads', 'leadActivities'];
    expect(details(() => applyModuleRemovals(ALL, CRM0))).toEqual({
      reason: 'DEPENDENT_MODULE_KEPT', moduleKey: 'CRM-0', dependents: ['CRM-1', 'CRM-2A', 'CRM-2B', 'CRM-3'],
    });
  });

  it('item 6: remover o módulo junto com todos os dependentes é permitido (caso c3 do salão)', () => {
    expect(applyModuleRemovals(['CRM-0', 'CRM-1'], ['leadPipelines', 'leadStages', 'leads', 'leadActivities', 'leadProposals'])).toEqual([]);
  });
});

describe('assertAddedFieldsRespectModules (comportamento 10, F-CRM-7 → a)', () => {
  const tables = composeModuleTables(['CRM-0']);

  it("addedFields.leads: [{ name: 'status' }] → 400 (select lido por serviço)", () => {
    expect(() => assertAddedFieldsRespectModules({ leads: [{ name: 'status', type: 'string' }] }, tables)).toThrow(
      ValidationError,
    );
  });

  it('sombrear qualquer campo declarado pelo módulo → 400', () => {
    expect(() => assertAddedFieldsRespectModules({ leadStages: [{ name: 'type' }] }, tables)).toThrow(ValidationError);
  });

  it('campo novo em tabela de módulo é aceito; tabela fora de módulo não é checada aqui', () => {
    expect(() =>
      assertAddedFieldsRespectModules(
        { leads: [{ name: 'instagram', type: 'string' }], customers: [{ name: 'name' }] },
        { ...tables, customers: { name: 'C', category: 'business', schema: { fields: [{ name: 'name', label: 'N', type: 'string' }] } } } as never,
      ),
    ).not.toThrow();
  });
});

describe('applySelectOverrides (comportamento 11, F-I8-C11)', () => {
  const tables = composeModuleTables(['CRM-0', 'CRM-2A', 'CRM-2B']);
  const reason = (fn: () => unknown) => {
    try { fn(); } catch (e) { return (e as ValidationError).details; }
    return null;
  };

  it('select da allowlist (crmAccounts.size) troca as opções sem mutar a definição de origem', () => {
    const before = JSON.stringify(tables);
    const out = applySelectOverrides({ crmAccounts: { size: ['P', 'G'] } }, tables);
    expect(out.crmAccounts.schema.fields.find((f) => f.name === 'size')?.options).toEqual(['P', 'G']);
    expect(out.crmAccounts.schema.fields.find((f) => f.name === 'size')?.type).toBe('select');
    expect(JSON.stringify(tables)).toBe(before);
  });

  it('campo texto (leads.source, crmAccounts.segment) → 400 NOT_A_SELECT nomeado', () => {
    expect(reason(() => applySelectOverrides({ leads: { source: ['Instagram'] } }, tables))).toEqual({ table: 'leads', field: 'source', reason: 'NOT_A_SELECT' });
    expect(reason(() => applySelectOverrides({ crmAccounts: { segment: ['Varejo'] } }, tables))).toEqual({ table: 'crmAccounts', field: 'segment', reason: 'NOT_A_SELECT' });
  });

  it('select lido por serviço (leads.status) → 400 NOT_ALLOWLISTED; tabela não instalada → 400', () => {
    expect(reason(() => applySelectOverrides({ leads: { status: ['X'] } }, tables))).toMatchObject({ reason: 'NOT_ALLOWLISTED' });
    expect(reason(() => applySelectOverrides({ crmOpportunities: { status: ['X'] } }, tables))).toEqual({ table: 'crmOpportunities' });
  });

  it('allowlist do registro só contém campos que já são select', () => {
    const all = composeModuleTables(['CRM-0', 'CRM-1', 'CRM-2A', 'CRM-2B', 'CRM-3']);
    for (const def of Object.values(MODULE_REGISTRY)) {
      for (const [t, fields] of Object.entries(def.freeSelects)) {
        for (const f of fields) expect({ t, f, type: all[t].schema.fields.find((x) => x.name === f)?.type }).toEqual({ t, f, type: 'select' });
      }
    }
  });
});

describe('registro com várias categorias (BE-INCR-MODULOS-BASE-SUBMODULOS PR-1, registro sintético)', () => {
  const k = (s: string) => s as ModuleKey;
  const def = (key: string, category: ModuleCategory, over: Partial<ModuleDef> = {}): ModuleDef => ({
    key: k(key),
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
  // PESSOAS (base PES-0), VENDAS (base VEN-0 + 3 catálogos), AGENDA (base AGE-0 → PES-0 + VEN-SERV).
  const reg: ModuleRegistry = {
    'PES-0': def('PES-0', 'pessoas', { fixed: true, tables: ['customers'] }),
    'VEN-0': def('VEN-0', 'vendas', {
      fixed: true,
      tables: ['sales', 'saleItems'],
      dependsOn: [k('PES-0')],
      requiresOneOf: [[k('VEN-SERV'), k('VEN-PROD'), k('VEN-PAC')]],
    }),
    'VEN-SERV': def('VEN-SERV', 'vendas', { dependsOn: [k('VEN-0')] }),
    'VEN-PROD': def('VEN-PROD', 'vendas', { dependsOn: [k('VEN-0')] }),
    'VEN-PAC': def('VEN-PAC', 'vendas', { dependsOn: [k('VEN-0')] }),
    'AGE-0': def('AGE-0', 'agenda', { fixed: true, dependsOn: [k('PES-0'), k('VEN-SERV')] }),
  };
  const erro = (fn: () => unknown): ValidationError => {
    try {
      fn();
    } catch (e) {
      return e as ValidationError;
    }
    throw new Error('esperava ValidationError');
  };

  it('item 3: dependência para base fixa de outra categoria entra implícita (VEN-SERV puxa VEN-0 e PES-0)', () => {
    expect(resolveModuleSelection([k('VEN-SERV')], [], reg)).toEqual(['PES-0', 'VEN-0', 'VEN-SERV']);
  });

  it('item 3: AGE-0 puxa PES-0 implícito; sem VEN-SERV → 400 missingModule VEN-SERV', () => {
    const err = erro(() => resolveModuleSelection([k('AGE-0')], [], reg));
    expect(err.details).toEqual({ module: 'AGE-0', missingModule: 'VEN-SERV' });
    expect(resolveModuleSelection([k('AGE-0'), k('VEN-SERV')], [], reg)).toEqual(['PES-0', 'VEN-0', 'VEN-SERV', 'AGE-0']);
  });

  it('item 4: VEN-0 sem nenhum catálogo → 400 REQUIRES_ONE_OF com mensagem e detalhes', () => {
    const err = erro(() => resolveModuleSelection([k('VEN-0')], [], reg));
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.message).toBe("O módulo 'VEN-0' exige pelo menos um destes: VEN-SERV, VEN-PROD, VEN-PAC.");
    expect(err.details).toEqual({ reason: 'REQUIRES_ONE_OF', module: 'VEN-0', oneOf: ['VEN-SERV', 'VEN-PROD', 'VEN-PAC'] });
    expect(resolveModuleSelection([k('VEN-PAC')], [], reg)).toContain('VEN-PAC');
  });

  it('item 4: remover os três catálogos → 400; remover dois de três → ok', () => {
    const selected = [k('PES-0'), k('VEN-0'), k('VEN-SERV'), k('VEN-PROD'), k('VEN-PAC')];
    const err = erro(() => applyModuleRemovals(selected, ['VEN-SERV-t', 'VEN-PROD-t', 'VEN-PAC-t'], reg));
    expect(err.details).toMatchObject({ reason: 'REQUIRES_ONE_OF', module: 'VEN-0' });
    expect(applyModuleRemovals(selected, ['VEN-SERV-t', 'VEN-PROD-t'], reg)).toEqual(['PES-0', 'VEN-0', 'VEN-PAC']);
  });

  it('item 5: remover sales+saleItems com VEN-SERV mantido → 400 DEPENDENT_MODULE_KEPT [VEN-SERV]', () => {
    const err = erro(() => applyModuleRemovals([k('PES-0'), k('VEN-0'), k('VEN-SERV')], ['sales', 'saleItems'], reg));
    expect(err.details).toEqual({ reason: 'DEPENDENT_MODULE_KEPT', moduleKey: 'VEN-0', dependents: ['VEN-SERV'] });
  });

  it('item 5: sair a base barra submódulo mantido da categoria mesmo sem dependsOn declarado', () => {
    const solto: ModuleRegistry = { ...reg, 'VEN-PAC': def('VEN-PAC', 'vendas') };
    const err = erro(() => applyModuleRemovals([k('PES-0'), k('VEN-0'), k('VEN-PAC')], ['sales', 'saleItems'], solto));
    expect(err.details).toMatchObject({ reason: 'DEPENDENT_MODULE_KEPT', moduleKey: 'VEN-0', dependents: ['VEN-PAC'] });
  });

  it('item 5: remover a categoria VENDAS inteira com AGE-0 mantido → 400 (AGE-0 depende de VEN-SERV)', () => {
    const selected = [k('PES-0'), k('VEN-0'), k('VEN-SERV'), k('AGE-0')];
    const err = erro(() => applyModuleRemovals(selected, ['sales', 'saleItems', 'VEN-SERV-t'], reg));
    expect(err.details).toMatchObject({ reason: 'DEPENDENT_MODULE_KEPT', dependents: ['AGE-0'] });
  });

  it('item 5: remover a categoria inteira (base + submódulos) sem dependente mantido → ok, só PESSOAS fica', () => {
    const selected = [k('PES-0'), k('VEN-0'), k('VEN-SERV'), k('VEN-PROD')];
    expect(applyModuleRemovals(selected, ['sales', 'saleItems', 'VEN-SERV-t', 'VEN-PROD-t'], reg)).toEqual(['PES-0']);
  });

  it('item 5: remover só parte da base (sales sem saleItems) segue FIXED_MODULE_PARTIAL', () => {
    const err = erro(() => applyModuleRemovals([k('PES-0'), k('VEN-0'), k('VEN-SERV')], ['sales'], reg));
    expect(err.details).toMatchObject({ reason: 'FIXED_MODULE_PARTIAL', moduleKey: 'VEN-0' });
  });

  it('registro real (só CRM): comportamento inalterado — requiresOneOf vazio nunca dispara', () => {
    expect(resolveModuleSelection(['CRM-1'])).toEqual(['CRM-0', 'CRM-1']);
    expect(applyModuleRemovals(['CRM-0', 'CRM-1'], ['leadProposals'])).toEqual(['CRM-0']);
  });
});
