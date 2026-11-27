/**
 * BE-INCR-ESCALA-BASE PR-4 — `POST /api/scheduling/holidays/sync` pelo app Express real (auth → DTO → controller →
 * HolidayExceptionService → porta BR → motor → SQLite), com os parâmetros legais do seed (`FERIADO_NACIONAL`).
 * Itens 39 e 40, e a costura com o gate da agenda: agendar no feriado projetado → 400 OUTSIDE_AVAILABILITY.
 *
 * Run: npx jest src/features/scheduling/__tests__/holidaySync.integration.test.ts --selectProjects integration --runInBand
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, resetDb, disconnectDb, authHeader } from '@test/helpers';
import { DynamicTableRepository } from '@/features/dynamicTables/repositories/DynamicTableRepository';
import { DynamicTablePolicy } from '@/features/dynamicTables/policies/DynamicTablePolicy';
import { DynamicTableService } from '@/features/dynamicTables/services/DynamicTableService';
import { CoreSystemPreset } from '@/features/dynamicTables/presets';
import { composeModuleTables } from '@/features/dynamicTables/presets/modules/registry';
import { resolveModuleSelection } from '@/features/dynamicTables/presets/modules/moduleSelection';
import { Role } from '@/features/users/models/User.model';
import type { UserContext } from '@/lib/authUtils';

const app = makeApp();
const repo = new DynamicTableRepository();
const service = new DynamicTableService(repo, new DynamicTablePolicy());

const ctxOf = (id: string): UserContext => ({ id, userId: id, name: id, username: id, email: `${id}@t.co`, userEmail: `${id}@t.co`, role: Role.USER, userRole: Role.USER, createdAt: new Date(), updatedAt: new Date() });

async function owner(id: string, unitTimeZone: string | null = 'America/Sao_Paulo') {
  await prisma.user.create({ data: { id, username: id, email: `${id}@t.co`, password: 'x', role: Role.USER } });
  await service.installPresetAsSystem(id, { tables: { ...CoreSystemPreset.tables, ...composeModuleTables(resolveModuleSelection(['VEN-SERV', 'AGE-0'])) } });
  const tid = async (t: string) => (await repo.findTableByInternalName(id, t))!.id;
  const mk = async (t: string, data: Record<string, unknown>) => service.createTableData(ctxOf(id), await tid(t), { data } as never);
  const unit = await mk('units', { name: 'Loja', ...(unitTimeZone ? { timeZone: unitTimeZone } : {}) });
  const emp = await mk('employees', { name: 'Ana', role: 'x', email: `ana-${id}@a.co`, unitId: unit.id });
  const svc = await mk('services', { name: 'Corte', category: 'Hair', price: 50, duration: 60 });
  const holidays = async () =>
    (await repo.findRowsByFieldValueIncludingDeleted(await tid('scheduleExceptions'), 'sourceType', 'HOLIDAY')).map((r) => ({
      id: r.id,
      deleted: r.deletedAt != null,
      data: r.data as Record<string, unknown>,
    }));
  const book = (startAt: string, endAt: string) =>
    mk('appointments', { unitId: unit.id, serviceId: svc.id, responsibleEmployeeId: emp.id, simpleCustomer: true, simpleCustomerName: 'C', startAt, endAt });
  const schedule = async () => {
    // Todo dia 08:00–18:00 (ciclo de 1 dia): só o feriado tira a disponibilidade.
    const s = await mk('schedules', { employeeId: emp.id, unitId: unit.id, cycleLengthDays: 1, cycleAnchorDate: '2024-01-01', validFrom: '2026-01-01' });
    await mk('scheduleShifts', { scheduleId: s.id, dayOfCycle: 1, startMinute: 480, durationMinutes: 600 });
  };
  return { id, unitId: unit.id, actor: { id, username: id }, holidays, book, schedule };
}
const codeOf = (p: Promise<unknown>) => p.then(() => 'OK', (e: { errorCode?: string; message?: string }) => e.errorCode ?? `THROWN: ${e.message}`);

beforeAll(() => {
  pushTestSchema();
}, 120000);
afterEach(async () => {
  await resetDb();
});
afterAll(async () => {
  await disconnectDb();
});

const sync = (actor: { id: string; username: string }, body: unknown) =>
  request(app).post('/api/scheduling/holidays/sync').set(authHeader(actor)).send(body as object);

describe('POST /api/scheduling/holidays/sync (itens 39 e 40)', () => {
  it('sem Bearer → 401', async () => {
    expect((await request(app).post('/api/scheduling/holidays/sync').send({ year: 2027 })).status).toBe(401);
  });

  it('corpo inválido → 400 (year fora da faixa, campo extra)', async () => {
    const a = await owner('ownerA');
    expect((await sync(a.actor, { year: 2023 })).status).toBe(400);
    expect((await sync(a.actor, { year: 2027, extra: 1 })).status).toBe(400);
  });

  it('item 40 (Tier-0): unidade de outro dono → 404, e nada gravado na dele', async () => {
    const a = await owner('ownerA');
    const b = await owner('ownerB');
    expect((await sync(b.actor, { unitId: a.unitId, year: 2027 })).status).toBe(404);
    expect(await a.holidays()).toEqual([]);
  });

  it('cria os feriados do ano no fuso da unidade; a 2ª rodada pula; o apagado pelo usuário não volta', async () => {
    const a = await owner('ownerA');
    const r1 = await sync(a.actor, { unitId: a.unitId, year: 2027 });
    expect(r1.status).toBe(200);
    expect(r1.body.data.created).toBeGreaterThan(0);
    expect(r1.body.data).toMatchObject({ skipped: 0, deletedByUser: 0 });
    const rows = await a.holidays();
    const newYear = rows.find((r) => r.data.sourceId === `${a.unitId}:2027-01-01`);
    expect(newYear?.data).toMatchObject({ unitId: a.unitId, kind: 'HOLIDAY', origin: 'HOLIDAY_CALENDAR', sourceType: 'HOLIDAY' });
    expect(new Date(String(newYear?.data.startAt)).toISOString()).toBe('2027-01-01T03:00:00.000Z');
    expect(new Date(String(newYear?.data.endAt)).toISOString()).toBe('2027-01-02T03:00:00.000Z');

    const r2 = await sync(a.actor, { unitId: a.unitId, year: 2027 });
    expect(r2.body.data).toEqual({ created: 0, skipped: r1.body.data.created, deletedByUser: 0 });

    // Item 15: o usuário apaga o feriado (abre a unidade). O sync seguinte não o recria.
    await service.deleteTableData(ctxOf(a.id), newYear!.id);
    const r3 = await sync(a.actor, { year: 2027 }); // sem unitId: todas as unidades vivas
    expect(r3.body.data).toEqual({ created: 0, skipped: r1.body.data.created - 1, deletedByUser: 1 });
    expect((await a.holidays()).filter((r) => r.data.sourceId === `${a.unitId}:2027-01-01`)).toEqual([expect.objectContaining({ deleted: true })]);
  });

  it('F-ESC-18: unidade sem fuso recebe o padrão da borda antes do feriado', async () => {
    const a = await owner('ownerA', null);
    expect((await sync(a.actor, { unitId: a.unitId, year: 2027 })).status).toBe(200);
    const unit = await repo.findDataById(a.unitId);
    expect((unit?.data as Record<string, unknown>).timeZone).toBe('America/Sao_Paulo');
  });

  it('o gate da agenda recusa o feriado projetado e aceita o dia útil seguinte', async () => {
    const a = await owner('ownerA');
    await a.schedule();
    await sync(a.actor, { unitId: a.unitId, year: 2027 });
    expect(await codeOf(a.book('2027-01-01T10:00:00-03:00', '2027-01-01T11:00:00-03:00'))).toBe('OUTSIDE_AVAILABILITY');
    expect(await codeOf(a.book('2027-01-04T10:00:00-03:00', '2027-01-04T11:00:00-03:00'))).toBe('OK');
  });
});
