/**
 * BE-INCR-ESCALA-BASE PR-1 — as tabelas da escala no Core e as regras do SchedulesPlugin, pelo caminho real do motor
 * (`DynamicTableService` + `installPresetAsSystem` com o `CoreSystemPreset`). Itens 10, 11, 12, 13, 14, 15, 16 e 19.
 *
 * Run: npx jest src/features/scheduling/__tests__/schedulingTables.integration.test.ts --selectProjects integration --runInBand
 */
import prisma from '@/lib/prisma';
import { pushTestSchema, resetDb, disconnectDb } from '@test/helpers';
import { DynamicTableRepository } from '@/features/dynamicTables/repositories/DynamicTableRepository';
import { DynamicTablePolicy } from '@/features/dynamicTables/policies/DynamicTablePolicy';
import { DynamicTableService } from '@/features/dynamicTables/services/DynamicTableService';
import { PresetSyncService } from '@/features/dynamicTables/services/PresetSyncService';
import { CoreSystemPreset } from '@/features/dynamicTables/presets';
import type { ITableSchema } from '@/features/dynamicTables/models/DynamicTable.model';
import { SchedulingRolloutService } from '@/features/scheduling/services/SchedulingRolloutService';
import { Role } from '@/features/users/models/User.model';
import type { UserContext } from '@/lib/authUtils';

const repo = new DynamicTableRepository();
const service = new DynamicTableService(repo, new DynamicTablePolicy());

function ctxOf(id: string, role: Role = Role.USER): UserContext {
  return { id, userId: id, name: id, username: id, email: `${id}@t.co`, userEmail: `${id}@t.co`, role, userRole: role, createdAt: new Date(), updatedAt: new Date() };
}
const A = 'ownerA';
const B = 'ownerB';

async function tableId(owner: string, internalName: string): Promise<string> {
  const t = await repo.findTableByInternalName(owner, internalName);
  if (!t) throw new Error(`tabela ${internalName} ausente para ${owner}`);
  return t.id;
}
const create = async (owner: string, internalName: string, data: Record<string, unknown>, isSystem = false) =>
  service.createTableData(ctxOf(owner), await tableId(owner, internalName), { data } as never, { isSystem });
const update = (owner: string, id: string, data: Record<string, unknown>, isSystem = false) =>
  service.updateTableData(ctxOf(owner), id, { data } as never, { isSystem });
const del = (owner: string, id: string) => service.deleteTableData(ctxOf(owner), id);
const codeOf = (p: Promise<unknown>) => p.then(() => 'OK', (e: { errorCode?: string }) => e.errorCode ?? 'THROWN');

async function seedOwner(owner: string) {
  await prisma.user.create({ data: { id: owner, username: owner, email: `${owner}@t.co`, password: 'x', role: Role.USER } });
  await service.installPresetAsSystem(owner, { tables: CoreSystemPreset.tables });
  const unit = await create(owner, 'units', { name: `Loja ${owner}` });
  const unit2 = await create(owner, 'units', { name: `Filial ${owner}`, timeZone: 'America/Manaus' });
  const emp = await create(owner, 'employees', { name: 'Ana', role: 'Cabeleireira', email: `ana@${owner}.co`, unitId: unit.id });
  return { unitId: unit.id, unit2Id: unit2.id, employeeId: emp.id };
}

const week = (extra: Record<string, unknown> = {}) => ({ cycleLengthDays: 7, cycleAnchorDate: '2024-01-01', validFrom: '2026-01-01', ...extra });
const shift = (scheduleId: string, dayOfCycle: number, startMinute: number, durationMinutes: number) => ({ scheduleId, dayOfCycle, startMinute, durationMinutes });

beforeAll(() => {
  pushTestSchema();
}, 120000);
afterEach(async () => {
  await resetDb();
});
afterAll(async () => {
  await disconnectDb();
});

describe('item 10 — quatro tabelas da escala no Core, visíveis', () => {
  it('instaladas com o Core, com o internalName e sem apresentação de sistema', async () => {
    await seedOwner(A);
    for (const t of ['resources', 'schedules', 'scheduleShifts', 'scheduleExceptions']) {
      const table = await repo.findTableByInternalName(A, t);
      expect(table?.category).toBe('planning');
      expect((table?.schema as unknown as ITableSchema).ui?.presentation ?? 'standalone').toBe('standalone');
    }
  });
});

describe('item 11 — units.timeZone IANA', () => {
  it('fuso IANA passa; nome desconhecido é recusado; vazio continua aceito', async () => {
    await seedOwner(A);
    await expect(create(A, 'units', { name: 'X', timeZone: 'America/Sao_Paulo' })).resolves.toBeTruthy();
    await expect(create(A, 'units', { name: 'Y', timeZone: 'Mars/Olympus' })).rejects.toThrow(/Fuso horário inválido/);
    await expect(create(A, 'units', { name: 'Z' })).resolves.toBeTruthy();
  });
});

describe('item 12 — instância de antes da escala recebe tabelas e campo pela sincronização de preset', () => {
  it('Core antigo (sem as quatro tabelas e sem timeZone) → ensureInstalled → tabelas e campo, sem perder linha', async () => {
    await prisma.user.create({ data: { id: A, username: A, email: 'a@t.co', password: 'x', role: Role.USER } });
    const { resources, schedules, scheduleShifts, scheduleExceptions, ...oldCore } = CoreSystemPreset.tables;
    void resources; void schedules; void scheduleShifts; void scheduleExceptions;
    const oldUnits = { ...oldCore.units, schema: { ...oldCore.units.schema, fields: oldCore.units.schema.fields.filter((f) => f.name !== 'timeZone') } };
    await service.installPresetAsSystem(A, { tables: { ...oldCore, units: oldUnits } });
    const unit = await create(A, 'units', { name: 'Loja' });
    await create(A, 'employees', { name: 'Ana', role: 'x', email: 'ana@a.co', unitId: unit.id });
    expect(await repo.findTableByInternalName(A, 'schedules')).toBeNull();

    const rollout = new SchedulingRolloutService(new PresetSyncService(service, repo, new DynamicTablePolicy()), repo);
    const admin = ctxOf(A, Role.ADMIN);
    const r = await rollout.ensureInstalled(admin);
    expect(r.installed).toEqual(['resources', 'schedules', 'scheduleShifts', 'scheduleExceptions']);
    expect(r.synced).toEqual([{ table: 'units', added: ['timeZone'] }]);
    expect(await prisma.dynamicTableData.count({ where: { dynamicTable: { userId: A, internalName: 'units' }, deletedAt: null } })).toBe(1);
    expect(await prisma.dynamicTableData.count({ where: { dynamicTable: { userId: A, internalName: 'employees' }, deletedAt: null } })).toBe(1);
    // A relação do padrão aponta para a tabela real do dono, e a escala já funciona.
    const emp = (await prisma.dynamicTableData.findFirst({ where: { dynamicTable: { userId: A, internalName: 'employees' } } }))!;
    await expect(create(A, 'schedules', { employeeId: emp.id, unitId: unit.id, ...week() })).resolves.toBeTruthy();
    // Idempotente.
    expect(await rollout.ensureInstalled(admin)).toEqual({ installed: [], synced: [] });
  });
});

describe('item 13 — SchedulesPlugin em schedules', () => {
  it('XOR de alvo: nenhum ou os dois → SCHEDULE_TARGET_REQUIRED', async () => {
    const s = await seedOwner(A);
    const res = await create(A, 'resources', { name: 'Sala 1', kind: 'Room', unitId: s.unitId });
    expect(await codeOf(create(A, 'schedules', { unitId: s.unitId, ...week() }))).toBe('SCHEDULE_TARGET_REQUIRED');
    expect(await codeOf(create(A, 'schedules', { employeeId: s.employeeId, resourceId: res.id, ...week() }))).toBe('SCHEDULE_TARGET_REQUIRED');
    expect(await codeOf(create(A, 'schedules', { resourceId: res.id, ...week() }))).toBe('OK');
  });

  it('vigência incoerente, ciclo fora de 1..56 e âncora fora do calendário são recusados', async () => {
    const s = await seedOwner(A);
    expect(await codeOf(create(A, 'schedules', { employeeId: s.employeeId, ...week({ validTo: '2025-12-31' }) }))).toBe('VALIDATION_ERROR');
    expect(await codeOf(create(A, 'schedules', { employeeId: s.employeeId, ...week({ cycleLengthDays: 57 }) }))).toBe('VALIDATION_ERROR');
    expect(await codeOf(create(A, 'schedules', { employeeId: s.employeeId, ...week({ cycleLengthDays: 0 }) }))).toBe('VALIDATION_ERROR');
    expect(await codeOf(create(A, 'schedules', { employeeId: s.employeeId, ...week() }))).toBe('OK');
  });

  it('item 7 contra os padrões vivos: a mesma pessoa em duas unidades no mesmo horário → SCHEDULE_OVERLAP', async () => {
    const s = await seedOwner(A);
    const a = await create(A, 'schedules', { employeeId: s.employeeId, unitId: s.unitId, ...week() });
    await create(A, 'scheduleShifts', shift(a.id, 1, 540, 480)); // segunda 09:00–17:00 em SP (fuso do processo / sem fuso)
    const b = await create(A, 'schedules', { employeeId: s.employeeId, unitId: s.unit2Id, ...week() });
    // Terça na outra unidade: passa.
    await expect(create(A, 'scheduleShifts', shift(b.id, 2, 540, 480))).resolves.toBeTruthy();
    // Segunda na outra unidade, cruzando: recusa.
    expect(await codeOf(create(A, 'scheduleShifts', shift(b.id, 1, 600, 60)))).toBe('SCHEDULE_OVERLAP');
    // Encurtar a vigência de B para antes de A não cria sobreposição; mover A para depois também não.
    await expect(update(A, b.id, { validTo: '2026-01-02' })).resolves.toBeTruthy();
  });
});

describe('item 14 — SchedulesPlugin em scheduleShifts', () => {
  it('dia do ciclo além do ciclo do pai é recusado; turnos do mesmo padrão não se sobrepõem', async () => {
    const s = await seedOwner(A);
    const p = await create(A, 'schedules', { employeeId: s.employeeId, unitId: s.unitId, ...week() });
    expect(await codeOf(create(A, 'scheduleShifts', shift(p.id, 8, 540, 60)))).toBe('VALIDATION_ERROR');
    const night = await create(A, 'scheduleShifts', shift(p.id, 1, 1320, 240)); // seg 22:00 → ter 02:00
    expect(await codeOf(create(A, 'scheduleShifts', shift(p.id, 2, 60, 60)))).toBe('SCHEDULE_OVERLAP');
    await expect(create(A, 'scheduleShifts', shift(p.id, 2, 120, 60))).resolves.toBeTruthy();
    // Editar o próprio turno não conflita consigo mesmo.
    await expect(update(A, night.id, { durationMinutes: 200 })).resolves.toBeTruthy();
    // Encurtar o ciclo abaixo do dia de um turno é recusado.
    expect(await codeOf(update(A, p.id, { cycleLengthDays: 1 }))).toBe('VALIDATION_ERROR');
  });
});

describe('item 15 — SchedulesPlugin em scheduleExceptions', () => {
  const day = { startAt: '2026-12-25T03:00:00.000Z', endAt: '2026-12-26T03:00:00.000Z' };

  it('endAt > startAt; alvo opcional; no máximo um alvo', async () => {
    const s = await seedOwner(A);
    await expect(create(A, 'scheduleExceptions', { unitId: s.unitId, kind: 'BLOCK', ...day })).resolves.toBeTruthy();
    expect(await codeOf(create(A, 'scheduleExceptions', { unitId: s.unitId, kind: 'BLOCK', startAt: day.endAt, endAt: day.startAt }))).toBe('VALIDATION_ERROR');
    const res = await create(A, 'resources', { name: 'Sala', kind: 'Room' });
    expect(await codeOf(create(A, 'scheduleExceptions', { unitId: s.unitId, employeeId: s.employeeId, resourceId: res.id, kind: 'BLOCK', ...day }))).toBe('VALIDATION_ERROR');
  });

  it('usuário não grava origin ≠ USER; o sistema grava', async () => {
    const s = await seedOwner(A);
    const hr = { unitId: s.unitId, employeeId: s.employeeId, kind: 'ABSENCE', origin: 'HR', sourceType: 'DP_ABSENCE', sourceId: 'af1', ...day };
    expect(await codeOf(create(A, 'scheduleExceptions', hr))).toBe('EXCEPTION_READ_ONLY');
    await expect(create(A, 'scheduleExceptions', hr, true)).resolves.toBeTruthy();
  });

  it('HR: usuário não edita nem apaga; HOLIDAY_CALENDAR: apaga, não edita', async () => {
    const s = await seedOwner(A);
    const hr = await create(A, 'scheduleExceptions', { unitId: s.unitId, employeeId: s.employeeId, kind: 'ABSENCE', origin: 'HR', sourceType: 'DP_ABSENCE', sourceId: 'af1', ...day }, true);
    expect(await codeOf(update(A, hr.id, { reason: 'x' }))).toBe('EXCEPTION_READ_ONLY');
    expect(await codeOf(del(A, hr.id))).toBe('EXCEPTION_READ_ONLY');
    await expect(update(A, hr.id, { reason: 'reconcile' }, true)).resolves.toBeTruthy();

    const hol = await create(A, 'scheduleExceptions', { unitId: s.unitId, kind: 'HOLIDAY', origin: 'HOLIDAY_CALENDAR', sourceType: 'HOLIDAY', sourceId: `${s.unitId}:2026-12-25`, ...day }, true);
    expect(await codeOf(update(A, hol.id, { reason: 'x' }))).toBe('EXCEPTION_READ_ONLY');
    await expect(del(A, hol.id)).resolves.toBeUndefined();
  });
});

describe('item 16 — deleteConstraints', () => {
  it('apagar o padrão apaga os turnos (cascata)', async () => {
    const s = await seedOwner(A);
    const p = await create(A, 'schedules', { employeeId: s.employeeId, unitId: s.unitId, ...week() });
    const sh = await create(A, 'scheduleShifts', shift(p.id, 1, 540, 60));
    await del(A, p.id);
    expect((await prisma.dynamicTableData.findUnique({ where: { id: sh.id } }))?.deletedAt).not.toBeNull();
  });

  it('apagar pessoa ou recurso com padrão vivo é recusado (RESTRICT); sem padrão vivo, passa', async () => {
    const s = await seedOwner(A);
    const p = await create(A, 'schedules', { employeeId: s.employeeId, unitId: s.unitId, ...week() });
    await expect(del(A, s.employeeId)).rejects.toThrow(/still have a schedule/);
    const res = await create(A, 'resources', { name: 'Sala', kind: 'Room' });
    const pr = await create(A, 'schedules', { resourceId: res.id, ...week() });
    await expect(del(A, res.id)).rejects.toThrow(/still has a schedule/);
    await del(A, pr.id);
    await expect(del(A, res.id)).resolves.toBeUndefined();
    await del(A, p.id);
    await expect(del(A, s.employeeId)).resolves.toBeUndefined();
  });
});

describe('item 19 — isolamento Tier-0', () => {
  it('o padrão de outro dono não aparece nem conflita', async () => {
    const a = await seedOwner(A);
    const b = await seedOwner(B);
    const pa = await create(A, 'schedules', { employeeId: a.employeeId, unitId: a.unitId, ...week() });
    await create(A, 'scheduleShifts', shift(pa.id, 1, 540, 480));
    const pb = await create(B, 'schedules', { employeeId: b.employeeId, unitId: b.unitId, ...week() });
    await expect(create(B, 'scheduleShifts', shift(pb.id, 1, 540, 480))).resolves.toBeTruthy();
    const listB = await service.getTableData(ctxOf(B), await tableId(B, 'schedules'));
    expect(JSON.stringify(listB)).not.toContain(pa.id);
    // B não consegue apontar para a pessoa de A.
    expect(await codeOf(create(B, 'schedules', { employeeId: a.employeeId, ...week() }))).not.toBe('OK');
  });
});
