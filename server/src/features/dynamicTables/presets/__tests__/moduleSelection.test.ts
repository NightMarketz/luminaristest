/**
 * BE-INCR-CRM-MODULE-COMPOSITION (I8) — comportamentos 2 (seleção) e 10 (addedFields por módulo).
 * BE-INCR-CRM-SUBMODULES — itens 3 (grupo 'CRM-2' como atalho), 5 (MODULE_PARTIAL) e 6 (DEPENDENT_MODULE_KEPT).
 */
import { ValidationError } from '../../../../lib/errors';
import { MODULE_REGISTRY, composeModuleTables, expandModuleSelectors, type ModuleDef, type ModuleKey } from '../modules/registry';
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
