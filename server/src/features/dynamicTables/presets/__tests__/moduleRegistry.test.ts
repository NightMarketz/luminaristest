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
    expect(moduleKeySchema.safeParse('CRM-2').success).toBe(true);
  });

  it('moduleDefSchema recusa campo extra (strict)', () => {
    expect(moduleDefSchema.safeParse({ ...MODULE_REGISTRY['CRM-0'], extra: 1 }).success).toBe(false);
  });

  it('CRM-0 é o único fixo; CRM-1/2/3 dependem de CRM-0 (F-CRM-3/4/5 → a)', () => {
    expect(MODULE_KEYS.filter((k) => MODULE_REGISTRY[k].fixed)).toEqual(['CRM-0']);
    for (const k of ['CRM-1', 'CRM-2', 'CRM-3'] as const) {
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

  it('moduleOfTable devolve undefined para tabela de core', () => {
    expect(moduleOfTable('employees')).toBeUndefined();
    expect(moduleOfTable('leadProposals')).toBe('CRM-1');
  });
});
