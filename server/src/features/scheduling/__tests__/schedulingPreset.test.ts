import fs from 'fs';
import path from 'path';
import { CoreSystemPreset } from '../../dynamicTables/presets';
import { MODULE_KEYS, MODULE_REGISTRY, moduleOfTable } from '../../dynamicTables/presets/modules/registry';
import { assertRemovalsAllowed } from '../../dynamicTables/presets/removability';
import { SchedulesPlugin } from '../../dynamicTables/rules/plugins/SchedulesPlugin';
import { globalRuleRegistry } from '../../dynamicTables/rules/RuleRegistry';
import { resourceSchema, scheduleExceptionSchema, scheduleSchema, scheduleShiftSchema } from '../dtos/rows';

/** BE-INCR-ESCALA-BASE PR-1 — itens 10, 17, 18 e 20 sobre os presets reais. */
const NEW = ['resources', 'schedules', 'scheduleShifts', 'scheduleExceptions'] as const;

describe('item 10 — tabelas no CoreSystemPreset, com os campos do contrato', () => {
  it('as quatro estão no Core, na categoria planning, visíveis', () => {
    for (const t of NEW) {
      expect(CoreSystemPreset.tables[t]).toBeDefined();
      expect(CoreSystemPreset.tables[t].category).toBe('planning');
      expect(CoreSystemPreset.tables[t].schema.ui?.presentation ?? 'standalone').toBe('standalone');
    }
  });

  it('cada campo do contrato Zod (§3.1) existe na tabela de mesmo nome', () => {
    const pairs = [
      ['resources', resourceSchema],
      ['schedules', scheduleSchema],
      ['scheduleShifts', scheduleShiftSchema],
      ['scheduleExceptions', scheduleExceptionSchema],
    ] as const;
    for (const [t, schema] of pairs) {
      const fields = CoreSystemPreset.tables[t].schema.fields.map((f) => f.name);
      expect(fields.sort()).toEqual(Object.keys(schema.shape).sort());
    }
  });

  it('relações apontam para as tabelas do Core; units tem timeZone (item 11)', () => {
    const rel = (t: string, f: string) => CoreSystemPreset.tables[t].schema.fields.find((x) => x.name === f)?.relation?.targetTable;
    expect(rel('schedules', 'employeeId')).toBe('@@PRESET_TABLE_KEY::employees');
    expect(rel('schedules', 'resourceId')).toBe('@@PRESET_TABLE_KEY::resources');
    expect(rel('scheduleShifts', 'scheduleId')).toBe('@@PRESET_TABLE_KEY::schedules');
    expect(rel('scheduleExceptions', 'unitId')).toBe('@@PRESET_TABLE_KEY::units');
    expect(CoreSystemPreset.tables.units.schema.fields.find((f) => f.name === 'timeZone')).toMatchObject({ type: 'string', required: false });
  });

  it('o SchedulesPlugin está registrado e cobre as três tabelas e units', () => {
    const ctx = (internalName: string, category: string) => ({ table: { internalName, category, name: internalName } }) as never;
    for (const t of ['schedules', 'scheduleShifts', 'scheduleExceptions']) expect(SchedulesPlugin.supports(ctx(t, 'planning'))).toBe(true);
    expect(SchedulesPlugin.supports(ctx('units', 'business'))).toBe(true);
    expect(SchedulesPlugin.supports(ctx('appointments', 'planning'))).toBe(false);
    expect(globalRuleRegistry.getApplicable(ctx('schedules', 'planning')).map((p) => p.name)).toContain('SchedulesPlugin');
  });
});

describe('item 17 — as quatro tabelas são do Core e não saem pela tela de módulos', () => {
  it('não pertencem a módulo nenhum e a remoção de módulo/tabela as ignora', () => {
    for (const t of NEW) expect(moduleOfTable(t)).toBeUndefined();
    // O create da suíte ignora chave do Core (removability item 8): pedir a remoção não remove nem trava.
    expect(() => assertRemovalsAllowed({}, [...NEW], [])).not.toThrow();
  });
});

describe('item 20 — o MODULE_REGISTRY não muda', () => {
  it('MODULE_KEYS continua igual e nenhum módulo lista tabela da escala', () => {
    expect(MODULE_KEYS).toEqual([
      'CRM-0', 'CRM-1', 'CRM-2A', 'CRM-2B', 'CRM-3', 'CRM-CAMP',
      'PES-0', 'PES-FORN',
      'VEN-0', 'VEN-SERV', 'VEN-PROD', 'VEN-PAC', 'VEN-COM',
      'EST-0', 'AGE-0',
      'FIN-0', 'FIN-REC', 'FIN-BASE',
      'GES-0', 'GES-META',
    ]);
    for (const k of MODULE_KEYS) for (const t of NEW) expect(MODULE_REGISTRY[k].tables).not.toContain(t);
  });
});

describe('item 18 — rótulos pt/en das tabelas, campos e opções', () => {
  const load = (lang: string) =>
    JSON.parse(fs.readFileSync(path.resolve(__dirname, `../../../../../my-app/public/locales/${lang}/database.json`), 'utf8'));
  it.each(['pt', 'en'])('%s tem rótulo para cada tabela, campo e opção nova', (lang) => {
    const d = load(lang);
    for (const t of NEW) expect(d.tables[t]).toBeTruthy();
    for (const t of NEW) {
      for (const f of CoreSystemPreset.tables[t].schema.fields) {
        expect([t, f.name, d.fields[f.name]]).toEqual([t, f.name, expect.any(String)]);
        for (const o of f.options ?? []) expect([f.name, o, d.options[o]]).toEqual([f.name, o, expect.any(String)]);
      }
    }
    expect(d.fields.timeZone).toEqual(expect.any(String)); // o campo novo de units (os antigos ficam como estão)
  });
});
