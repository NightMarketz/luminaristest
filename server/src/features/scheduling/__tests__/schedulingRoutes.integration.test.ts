/**
 * BE-INCR-ESCALA-BASE PR-3 — as rotas de leitura da escala pelo app Express real (auth → DTO → controller → serviço →
 * repositório → SQLite). Itens 31–34, e a paridade com o gate da agenda: todo horário que o free-slots devolve, o create de
 * `appointments` aceita; um horário fora da escala, ele recusa (inclusive F-ESC-19).
 *
 * Run: npx jest src/features/scheduling/__tests__/schedulingRoutes.integration.test.ts --selectProjects integration --runInBand
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
const MON = (hhmm: string) => `2027-01-04T${hhmm}:00-03:00`; // segunda; America/Sao_Paulo = UTC−3

async function owner(id: string) {
  await prisma.user.create({ data: { id, username: id, email: `${id}@t.co`, password: 'x', role: Role.USER } });
  await service.installPresetAsSystem(id, { tables: { ...CoreSystemPreset.tables, ...composeModuleTables(resolveModuleSelection(['VEN-SERV', 'AGE-0'])) } });
  const tid = async (t: string) => (await repo.findTableByInternalName(id, t))!.id;
  const mk = async (t: string, data: Record<string, unknown>) => service.createTableData(ctxOf(id), await tid(t), { data } as never);
  const unit = await mk('units', { name: 'Loja', timeZone: 'America/Sao_Paulo' });
  const unit2 = await mk('units', { name: 'Filial', timeZone: 'America/Sao_Paulo' });
  const emp = await mk('employees', { name: 'Ana', role: 'x', email: `ana-${id}@a.co`, unitId: unit.id });
  const svc = await mk('services', { name: 'Corte', category: 'Hair', price: 50, duration: 60 });
  const schedule = async (unitId: string) => {
    const s = await mk('schedules', { employeeId: emp.id, unitId, cycleLengthDays: 7, cycleAnchorDate: '2024-01-01', validFrom: '2026-01-01' });
    await mk('scheduleShifts', { scheduleId: s.id, dayOfCycle: 1, startMinute: 540, durationMinutes: 180 }); // 09:00–12:00
  };
  const book = (startAt: string, endAt: string, unitId = unit.id) =>
    mk('appointments', { unitId, serviceId: svc.id, responsibleEmployeeId: emp.id, simpleCustomer: true, simpleCustomerName: 'C', startAt, endAt });
  return { id, unitId: unit.id, unit2Id: unit2.id, employeeId: emp.id, serviceId: svc.id, schedule, book, actor: { id, username: id } };
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

const day = { from: MON('00:00'), to: MON('23:00') };

describe('GET /api/scheduling — leitura da escala', () => {
  it('sem Bearer → 401', async () => {
    expect((await request(app).get('/api/scheduling/availability').query({ unitId: 'x', employeeId: 'y', ...day })).status).toBe(401);
    expect((await request(app).get('/api/scheduling/free-slots').query({ unitId: 'x', durationMinutes: 60, ...day })).status).toBe(401);
  });

  it('item 34 (Tier-0): a unidade e o profissional de outro dono → 404', async () => {
    const a = await owner('ownerA');
    const b = await owner('ownerB');
    const r1 = await request(app).get('/api/scheduling/availability').set(authHeader(b.actor)).query({ unitId: a.unitId, employeeId: b.employeeId, ...day });
    expect(r1.status).toBe(404);
    const r2 = await request(app).get('/api/scheduling/free-slots').set(authHeader(b.actor)).query({ unitId: b.unitId, employeeId: a.employeeId, durationMinutes: 60, ...day });
    expect(r2.status).toBe(404);
    // Controle positivo: os próprios ids respondem 200.
    const ok = await request(app).get('/api/scheduling/availability').set(authHeader(b.actor)).query({ unitId: b.unitId, employeeId: b.employeeId, ...day });
    expect(ok.status).toBe(200);
  });

  it('item 33: query inválida → 400; janela acima de 31 dias → 400 RANGE_TOO_LARGE', async () => {
    const a = await owner('ownerA');
    const h = authHeader(a.actor);
    expect((await request(app).get('/api/scheduling/availability').set(h).query({ unitId: a.unitId, ...day })).status).toBe(400);
    const r = await request(app).get('/api/scheduling/availability').set(h).query({ unitId: a.unitId, employeeId: a.employeeId, from: '2027-01-01T00:00:00Z', to: '2027-02-15T00:00:00Z' });
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.body)).toContain('RANGE_TOO_LARGE');
  });

  it('item 31: as faixas da escala no fuso da unidade; sem escala, unrestricted', async () => {
    const a = await owner('ownerA');
    const h = authHeader(a.actor);
    const before = await request(app).get('/api/scheduling/availability').set(h).query({ unitId: a.unitId, employeeId: a.employeeId, ...day });
    expect(before.body.data.unrestricted).toBe(true);
    await a.schedule(a.unitId);
    const r = await request(app).get('/api/scheduling/availability').set(h).query({ unitId: a.unitId, employeeId: a.employeeId, ...day });
    expect(r.status).toBe(200);
    expect(r.body.data).toEqual({ unrestricted: false, intervals: [{ startAt: '2027-01-04T12:00:00.000Z', endAt: '2027-01-04T15:00:00.000Z' }] });
  });

  it('itens 32 e 24 (paridade): todo slot devolvido é aceito pelo create; o ocupado e o fora da escala não', async () => {
    const a = await owner('ownerA');
    await a.schedule(a.unitId);
    expect(await codeOf(a.book(MON('10:00'), MON('11:00')))).toBe('OK');
    const r = await request(app).get('/api/scheduling/free-slots').set(authHeader(a.actor)).query({ unitId: a.unitId, employeeId: a.employeeId, serviceId: a.serviceId, stepMinutes: 60, ...day });
    expect(r.status).toBe(200);
    const slots: Array<{ startAt: string; endAt: string; employeeId: string }> = r.body.data.slots;
    expect(slots.map((s) => s.startAt)).toEqual(['2027-01-04T12:00:00.000Z', '2027-01-04T14:00:00.000Z']);
    for (const s of slots) {
      const row = await a.book(s.startAt, s.endAt);
      await service.deleteTableData(ctxOf(a.id), row.id);
    }
    expect(await codeOf(a.book(MON('12:00'), MON('13:00')))).toBe('OUTSIDE_AVAILABILITY');
  });

  it('F-ESC-19 (paridade): padrão só na outra unidade → nenhum slot nesta, e o create nesta é recusado', async () => {
    const a = await owner('ownerA');
    await a.schedule(a.unit2Id);
    const r = await request(app).get('/api/scheduling/free-slots').set(authHeader(a.actor)).query({ unitId: a.unitId, employeeId: a.employeeId, durationMinutes: 60, stepMinutes: 60, ...day });
    expect(r.body.data.slots).toEqual([]);
    expect(await codeOf(a.book(MON('09:00'), MON('10:00')))).toBe('OUTSIDE_AVAILABILITY');
  });

  it('item 32 sem profissional: entra quem é da unidade ou tem escala nela; quem não tem nenhum dos dois fica de fora', async () => {
    const a = await owner('ownerA');
    await a.schedule(a.unitId);
    const tid = (await repo.findTableByInternalName(a.id, 'employees'))!.id;
    await service.createTableData(ctxOf(a.id), tid, { data: { name: 'Bia', role: 'x', email: 'bia@a.co' } } as never); // sem unidade, sem escala
    const r = await request(app).get('/api/scheduling/free-slots').set(authHeader(a.actor)).query({ unitId: a.unitId, durationMinutes: 180, stepMinutes: 60, ...day });
    expect(r.body.data.slots).toEqual([{ employeeId: a.employeeId, resourceId: null, startAt: '2027-01-04T12:00:00.000Z', endAt: '2027-01-04T15:00:00.000Z' }]);
  });
});
