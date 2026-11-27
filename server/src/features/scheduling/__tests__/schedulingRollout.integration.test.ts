/**
 * BE-INCR-ESCALA-BASE PR-2 — o rollout numa instância de antes da escala: itens 22 (migração), 23 (readOnly), 27
 * (noOverlap novo) e F-ESC-18 (fuso padrão da borda), pelo script `scheduling-rollout.ts`. Idempotente.
 *
 * Run: npx jest src/features/scheduling/__tests__/schedulingRollout.integration.test.ts --selectProjects integration --runInBand
 */
import prisma from '@/lib/prisma';
import { pushTestSchema, resetDb, disconnectDb } from '@test/helpers';
import { DynamicTableRepository } from '@/features/dynamicTables/repositories/DynamicTableRepository';
import { DynamicTablePolicy } from '@/features/dynamicTables/policies/DynamicTablePolicy';
import { DynamicTableService } from '@/features/dynamicTables/services/DynamicTableService';
import { CoreSystemPreset } from '@/features/dynamicTables/presets';
import { composeModuleTables } from '@/features/dynamicTables/presets/modules/registry';
import { resolveModuleSelection } from '@/features/dynamicTables/presets/modules/moduleSelection';
import type { ITableSchema } from '@/features/dynamicTables/models/DynamicTable.model';
import { runSchedulingRollout } from '@/scripts/scheduling-rollout';
import { Role } from '@/features/users/models/User.model';
import type { UserContext } from '@/lib/authUtils';

const repo = new DynamicTableRepository();
const service = new DynamicTableService(repo, new DynamicTablePolicy());
const A = 'ownerA';
const ctx: UserContext = { id: A, userId: A, name: A, username: A, email: 'a@t.co', userEmail: 'a@t.co', role: Role.USER, userRole: Role.USER, createdAt: new Date(), updatedAt: new Date() };

async function tableOf(internalName: string) {
  const t = await repo.findTableByInternalName(A, internalName);
  if (!t) throw new Error(`tabela ${internalName} ausente`);
  return t;
}
const rows = async (internalName: string) => (await repo.findAllDataByTableId((await tableOf(internalName)).id)).map((r) => ({ id: r.id, ...(r.data as Record<string, unknown>) }));

/** Instância de antes da escala: Core e agenda no formato antigo (sem as 4 tabelas, sem os campos novos, noOverlap antigo). */
async function seedLegacyInstance() {
  await prisma.user.create({ data: { id: A, username: A, email: 'a@t.co', password: 'x', role: Role.USER } });
  const { resources, schedules, scheduleShifts, scheduleExceptions, ...core } = CoreSystemPreset.tables;
  void resources; void schedules; void scheduleShifts; void scheduleExceptions;
  const strip = (t: { schema: ITableSchema }, drop: string[], extra: Partial<ITableSchema> = {}) => ({
    ...t,
    schema: { ...t.schema, fields: t.schema.fields.filter((f) => !drop.includes(f.name)).map((f) => (f.name === 'workSchedule' ? { ...f, readOnly: undefined } : f)), ...extra },
  });
  const agenda = composeModuleTables(resolveModuleSelection(['AGE-0']));
  const legacy = {
    ...core,
    ...agenda,
    units: strip(core.units, ['timeZone']),
    employees: strip(core.employees, [], { deleteConstraints: [] }),
    appointments: strip(agenda.appointments, ['resourceId', 'availabilityOverride', 'availabilityOverrideReason'], {
      noOverlap: [{ startField: 'startAt', endField: 'endAt', scopeFields: ['unitId', 'responsibleEmployeeId'] }],
    }),
  };
  await service.installPresetAsSystem(A, { tables: legacy as never });
  const mk = async (t: string, data: Record<string, unknown>) => service.createTableData(ctx, (await tableOf(t)).id, { data } as never);
  const unit = await mk('units', { name: 'Loja' });
  // Formatos reais do FE: `active` ausente, `active: false` com horário, `start` vazio.
  const ana = await mk('employees', {
    name: 'Ana', role: 'x', email: 'ana@a.co', unitId: unit.id,
    workSchedule: { monday: { start: '09:00', end: '18:00' }, tuesday: { start: '09:00', end: '18:00', active: false }, wednesday: { start: '', end: '' } },
  });
  const bia = await mk('employees', { name: 'Bia', role: 'x', email: 'bia@a.co', workSchedule: { friday: { start: '10:00', end: '14:00', active: true } } });
  const caio = await mk('employees', { name: 'Caio', role: 'x', email: 'caio@a.co', unitId: unit.id });
  return { unitId: unit.id, ana: ana.id, bia: bia.id, caio: caio.id };
}

beforeAll(() => {
  pushTestSchema();
}, 120000);
afterEach(async () => {
  await resetDb();
});
afterAll(async () => {
  await disconnectDb();
});

describe('rollout da escala numa instância de antes dela', () => {
  it('instala, aplica o esquema, grava o fuso padrão e migra o workSchedule; a 2ª rodada não muda nada', async () => {
    const s = await seedLegacyInstance();
    const now = new Date('2026-11-27T12:00:00Z');
    const [first] = await runSchedulingRollout(now);
    expect(first.installed).toEqual(['resources', 'schedules', 'scheduleShifts', 'scheduleExceptions']);
    expect(first.patched).toEqual(['employees', 'appointments']);
    expect(first.unitsWithDefaultTimeZone).toBe(1);
    expect(first.migration).toEqual({ migrated: 2, alreadyMigrated: 0, withoutWorkDays: 1, shifts: 2 });

    // F-ESC-18: a unidade sem fuso recebeu o da borda BR.
    expect((await rows('units'))[0].timeZone).toBe('America/Sao_Paulo');
    // Item 23: workSchedule readOnly; item 27: noOverlap por pessoa e por recurso, com a flag.
    const emp = (await tableOf('employees')).schema as unknown as ITableSchema;
    expect(emp.fields.find((f) => f.name === 'workSchedule')?.readOnly).toBe(true);
    const appt = (await tableOf('appointments')).schema as unknown as ITableSchema;
    expect(appt.noOverlap).toEqual([
      expect.objectContaining({ scopeFields: ['responsibleEmployeeId'], skipWhenScopeEmpty: true }),
      expect.objectContaining({ scopeFields: ['resourceId'], skipWhenScopeEmpty: true }),
    ]);
    // Item 22: um padrão semanal por funcionário com dia de trabalho; `active: false` e `start` vazio não viram turno.
    const sch = await rows('schedules');
    expect(sch).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ employeeId: s.ana, unitId: s.unitId, cycleLengthDays: 7, origin: 'DECLARED', migratedFrom: 'workSchedule' }),
        expect.objectContaining({ employeeId: s.bia, cycleLengthDays: 7, migratedFrom: 'workSchedule' }),
      ]),
    );
    expect(sch.find((x) => x.employeeId === s.bia)?.unitId ?? null).toBeNull();
    const shifts = await rows('scheduleShifts');
    const anaSchedule = sch.find((x) => x.employeeId === s.ana)!;
    expect(shifts.filter((x) => x.scheduleId === anaSchedule.id).map((x) => [x.dayOfCycle, x.startMinute, x.durationMinutes])).toEqual([[1, 540, 540]]);
    expect(shifts.filter((x) => x.scheduleId !== anaSchedule.id).map((x) => [x.dayOfCycle, x.startMinute, x.durationMinutes])).toEqual([[5, 600, 240]]);

    const [second] = await runSchedulingRollout(now);
    expect(second).toMatchObject({ installed: [], patched: [], unitsWithDefaultTimeZone: 0, migration: { migrated: 0, alreadyMigrated: 2 } });
    expect(await rows('schedules')).toHaveLength(2);
  });
});
