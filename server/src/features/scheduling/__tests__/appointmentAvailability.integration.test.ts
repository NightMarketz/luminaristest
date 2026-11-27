/**
 * BE-INCR-ESCALA-BASE PR-2 — o gate da agenda pela escala, pelo caminho real do motor (`DynamicTableService` + plugins).
 * Itens 24, 25, 26, 27, 28 (caminhos de escrita) e 29.
 *
 * Run: npx jest src/features/scheduling/__tests__/appointmentAvailability.integration.test.ts --selectProjects integration --runInBand
 */
import prisma from '@/lib/prisma';
import { pushTestSchema, resetDb, disconnectDb } from '@test/helpers';
import { DynamicTableRepository } from '@/features/dynamicTables/repositories/DynamicTableRepository';
import { DynamicTablePolicy } from '@/features/dynamicTables/policies/DynamicTablePolicy';
import { DynamicTableService } from '@/features/dynamicTables/services/DynamicTableService';
import { DynamicTableVersionService } from '@/features/dynamicTables/services/DynamicTableVersionService';
import { DynamicTableVersionRepository } from '@/features/dynamicTables/repositories/DynamicTableVersionRepository';
import { CoreSystemPreset } from '@/features/dynamicTables/presets';
import { composeModuleTables } from '@/features/dynamicTables/presets/modules/registry';
import { resolveModuleSelection } from '@/features/dynamicTables/presets/modules/moduleSelection';
import { LuminarisAgentService } from '@/features/chat/services/LuminarisAgentService';
import { AUTO_FROM_SALE, autoCreateAppointmentForServiceItem, placeAutoAppointment } from '@/features/dynamicTables/rules/plugins/sales/appointmentSync';
import type { RuleContext } from '@/features/dynamicTables/rules/RuleTypes';
import { Role } from '@/features/users/models/User.model';
import type { UserContext } from '@/lib/authUtils';

const repo = new DynamicTableRepository();
const policy = new DynamicTablePolicy();
const service = new DynamicTableService(repo, policy);

function ctxOf(id: string, role: Role = Role.USER): UserContext {
  return { id, userId: id, name: id, username: id, email: `${id}@t.co`, userEmail: `${id}@t.co`, role, userRole: role, createdAt: new Date(), updatedAt: new Date() };
}
const A = 'ownerA';

async function tableId(owner: string, internalName: string): Promise<string> {
  const t = await repo.findTableByInternalName(owner, internalName);
  if (!t) throw new Error(`tabela ${internalName} ausente para ${owner}`);
  return t.id;
}
const create = async (internalName: string, data: Record<string, unknown>, isSystem = false) =>
  service.createTableData(ctxOf(A), await tableId(A, internalName), { data } as never, { isSystem });
const update = (id: string, data: Record<string, unknown>, isSystem = false) => service.updateTableData(ctxOf(A), id, { data } as never, { isSystem });
const codeOf = (p: Promise<unknown>) => p.then(() => 'OK', (e: { errorCode?: string; message?: string }) => e.errorCode ?? `THROWN: ${e.message}`);

// 2027-01-04 é uma segunda-feira. America/Sao_Paulo = UTC−3 (sem horário de verão); America/Manaus = UTC−4.
const MON = '2027-01-04';
const TUE = '2027-01-05';
const at = (day: string, hhmm: string, offset = '-03:00') => `${day}T${hhmm}:00${offset}`;

async function seed() {
  await prisma.user.create({ data: { id: A, username: A, email: `${A}@t.co`, password: 'x', role: Role.USER } });
  await service.installPresetAsSystem(A, { tables: { ...CoreSystemPreset.tables, ...composeModuleTables(resolveModuleSelection(['VEN-SERV', 'AGE-0'])) } });
  const unit = await create('units', { name: 'Loja', timeZone: 'America/Sao_Paulo' });
  const unit2 = await create('units', { name: 'Filial', timeZone: 'America/Sao_Paulo' });
  const manaus = await create('units', { name: 'Manaus', timeZone: 'America/Manaus' });
  const emp = await create('employees', { name: 'Ana', role: 'Cabeleireira', email: 'ana@a.co', unitId: unit.id });
  const emp2 = await create('employees', { name: 'Bia', role: 'Manicure', email: 'bia@a.co', unitId: unit.id });
  const svc = await create('services', { name: 'Corte', category: 'Hair', price: 50, duration: 60 });
  return { unitId: unit.id, unit2Id: unit2.id, manausId: manaus.id, employeeId: emp.id, employee2Id: emp2.id, serviceId: svc.id };
}
type Seed = Awaited<ReturnType<typeof seed>>;

/** Padrão semanal: segunda 09:00–18:00 na unidade (ou sem unidade). */
async function mondaySchedule(target: Record<string, string>, unitId?: string, extra: Record<string, unknown> = {}) {
  const s = await create('schedules', { ...target, ...(unitId ? { unitId } : {}), cycleLengthDays: 7, cycleAnchorDate: '2024-01-01', validFrom: '2026-01-01', ...extra });
  await create('scheduleShifts', { scheduleId: s.id, dayOfCycle: 1, startMinute: 540, durationMinutes: 540 });
  return s;
}
const appt = (s: Seed, startAt: string, endAt: string, extra: Record<string, unknown> = {}) => ({
  unitId: s.unitId,
  serviceId: s.serviceId,
  responsibleEmployeeId: s.employeeId,
  simpleCustomer: true,
  simpleCustomerName: 'Cliente',
  startAt,
  endAt,
  ...extra,
});

beforeAll(() => {
  pushTestSchema();
}, 120000);
afterEach(async () => {
  await resetDb();
});
afterAll(async () => {
  await disconnectDb();
});

describe('item 24 — assertWithinAvailability', () => {
  it('profissional sem padrão vivo não é restringido (F-ESC-15 a)', async () => {
    const s = await seed();
    expect(await codeOf(create('appointments', appt(s, at(TUE, '22:00'), at(TUE, '23:00'))))).toBe('OK');
  });

  it('dentro do turno passa; fora do horário e em dia sem turno → OUTSIDE_AVAILABILITY com alvo e intervalo', async () => {
    const s = await seed();
    await mondaySchedule({ employeeId: s.employeeId }, s.unitId);
    expect(await codeOf(create('appointments', appt(s, at(MON, '09:00'), at(MON, '10:00'))))).toBe('OK');
    expect(await codeOf(create('appointments', appt(s, at(MON, '17:00'), at(MON, '18:00'))))).toBe('OK');
    expect(await codeOf(create('appointments', appt(s, at(MON, '18:00'), at(MON, '19:00'))))).toBe('OUTSIDE_AVAILABILITY');
    const err = await create('appointments', appt(s, at(TUE, '10:00'), at(TUE, '11:00'))).catch((e) => e);
    expect(err.errorCode).toBe('OUTSIDE_AVAILABILITY');
    expect(err.details).toMatchObject({ reason: 'OUTSIDE_AVAILABILITY', target: 'responsibleEmployeeId', targetId: s.employeeId, startAt: '2027-01-05T13:00:00.000Z' });
  });

  it('folga da pessoa (qualquer unidade) e bloqueio da unidade recusam; EXTRA abre o dia sem turno', async () => {
    const s = await seed();
    await mondaySchedule({ employeeId: s.employeeId }, s.unitId);
    await create('scheduleExceptions', { employeeId: s.employeeId, unitId: s.unit2Id, kind: 'DAY_OFF', startAt: at(MON, '12:00'), endAt: at(MON, '13:00') });
    await create('scheduleExceptions', { unitId: s.unitId, kind: 'BLOCK', startAt: at(MON, '15:00'), endAt: at(MON, '16:00') });
    await create('scheduleExceptions', { employeeId: s.employeeId, unitId: s.unitId, kind: 'EXTRA', startAt: at(TUE, '10:00'), endAt: at(TUE, '12:00') });
    expect(await codeOf(create('appointments', appt(s, at(MON, '12:30'), at(MON, '13:30'))))).toBe('OUTSIDE_AVAILABILITY');
    expect(await codeOf(create('appointments', appt(s, at(MON, '15:00'), at(MON, '15:30'))))).toBe('OUTSIDE_AVAILABILITY');
    expect(await codeOf(create('appointments', appt(s, at(TUE, '10:00'), at(TUE, '11:00'))))).toBe('OK');
  });

  it('o horário é o da unidade (item 11): 09:00 em Manaus é 13:00Z', async () => {
    const s = await seed();
    await mondaySchedule({ employeeId: s.employeeId }, s.manausId);
    const inManaus = (startAt: string, endAt: string) => appt(s, startAt, endAt, { unitId: s.manausId });
    expect(await codeOf(create('appointments', inManaus(at(MON, '09:00', '-04:00'), at(MON, '10:00', '-04:00'))))).toBe('OK');
    expect(await codeOf(create('appointments', inManaus(at(MON, '08:00', '-04:00'), at(MON, '09:00', '-04:00'))))).toBe('OUTSIDE_AVAILABILITY');
  });

  it('padrão vivo fora da vigência na data recusa; padrão sem unidade vale em qualquer unidade', async () => {
    const s = await seed();
    await mondaySchedule({ employeeId: s.employeeId }, s.unitId, { validTo: '2026-12-31' });
    expect(await codeOf(create('appointments', appt(s, at(MON, '10:00'), at(MON, '11:00'))))).toBe('OUTSIDE_AVAILABILITY');
    await mondaySchedule({ employeeId: s.employee2Id });
    expect(await codeOf(create('appointments', appt(s, at(MON, '10:00'), at(MON, '11:00'), { responsibleEmployeeId: s.employee2Id, unitId: s.unit2Id })))).toBe('OK');
  });

  it('padrão só em outra unidade: o agendamento nesta unidade é recusado', async () => {
    const s = await seed();
    await mondaySchedule({ employeeId: s.employeeId }, s.unitId);
    expect(await codeOf(create('appointments', appt(s, at(MON, '10:00'), at(MON, '11:00'), { unitId: s.unit2Id })))).toBe('OUTSIDE_AVAILABILITY');
  });
});

describe('item 25 — encaixe', () => {
  it('override sem motivo → OVERRIDE_REASON_REQUIRED; com motivo passa fora da escala, e a versão guarda quem gravou', async () => {
    const s = await seed();
    await mondaySchedule({ employeeId: s.employeeId }, s.unitId);
    expect(await codeOf(create('appointments', appt(s, at(TUE, '10:00'), at(TUE, '11:00'), { availabilityOverride: true })))).toBe('OVERRIDE_REASON_REQUIRED');
    const row = await create('appointments', appt(s, at(TUE, '10:00'), at(TUE, '11:00'), { availabilityOverride: true, availabilityOverrideReason: 'Cliente VIP' }));
    const v = await prisma.dynamicTableRowVersion.findFirst({ where: { dataId: row.id }, orderBy: { version: 'desc' } });
    expect(v?.actorUserId).toBe(A);
  });
});

describe('item 26 — recurso', () => {
  it('a escala do recurso também é conferida, e o recurso não fica em dois agendamentos ao mesmo tempo', async () => {
    const s = await seed();
    const room = await create('resources', { name: 'Sala 1', kind: 'Room', unitId: s.unitId });
    await mondaySchedule({ resourceId: room.id }, s.unitId);
    expect(await codeOf(create('appointments', appt(s, at(TUE, '10:00'), at(TUE, '11:00'), { resourceId: room.id })))).toBe('OUTSIDE_AVAILABILITY');
    expect(await codeOf(create('appointments', appt(s, at(MON, '10:00'), at(MON, '11:00'), { resourceId: room.id })))).toBe('OK');
    expect(
      await codeOf(create('appointments', appt(s, at(MON, '10:30'), at(MON, '11:30'), { resourceId: room.id, responsibleEmployeeId: s.employee2Id }))),
    ).toBe('VALIDATION_ERROR');
  });
});

describe('item 27 — noOverlap por pessoa e por recurso', () => {
  it('agendamentos sem profissional e sem recurso não conflitam entre si', async () => {
    const s = await seed();
    const noPro = appt(s, at(MON, '10:00'), at(MON, '11:00'), { responsibleEmployeeId: undefined });
    expect(await codeOf(create('appointments', noPro))).toBe('OK');
    expect(await codeOf(create('appointments', noPro))).toBe('OK');
  });

  it('a mesma pessoa em duas unidades no mesmo horário conflita (F-ESC-11)', async () => {
    const s = await seed();
    expect(await codeOf(create('appointments', appt(s, at(MON, '10:00'), at(MON, '11:00'))))).toBe('OK');
    expect(await codeOf(create('appointments', appt(s, at(MON, '10:30'), at(MON, '11:30'), { unitId: s.unit2Id })))).toBe('VALIDATION_ERROR');
  });
});

describe('item 28 — os caminhos de escrita passam pelo gate', () => {
  it('rota genérica: update que remarca para fora → OUTSIDE_AVAILABILITY', async () => {
    const s = await seed();
    await mondaySchedule({ employeeId: s.employeeId }, s.unitId);
    const row = await create('appointments', appt(s, at(MON, '10:00'), at(MON, '11:00')));
    expect(await codeOf(update(row.id, { startAt: at(TUE, '10:00'), endAt: at(TUE, '11:00') }))).toBe('OUTSIDE_AVAILABILITY');
  });

  it('agente do chat: a proposta confirmada passa pelo mesmo serviço', async () => {
    const s = await seed();
    await mondaySchedule({ employeeId: s.employeeId }, s.unitId);
    const proposals = { findById: async () => ({ id: 'p1', userId: A, action: 'CREATE', tableId: await tableId(A, 'appointments'), data: appt(s, at(TUE, '10:00'), at(TUE, '11:00')) }), delete: async () => undefined, deleteOldProposals: async () => undefined };
    const agent = new LuminarisAgentService(service, proposals as never, policy, { afterDataWrite: () => undefined } as never, {} as never);
    expect(await codeOf(agent.executeProposal(ctxOf(A), 'p1'))).toBe('OUTSIDE_AVAILABILITY');
  });

  it('restauração de versão: voltar a um horário que a escala fechou depois → OUTSIDE_AVAILABILITY', async () => {
    const s = await seed();
    await mondaySchedule({ employeeId: s.employeeId }, s.unitId);
    const row = await create('appointments', appt(s, at(MON, '10:00'), at(MON, '11:00')));
    await update(row.id, { startAt: at(MON, '14:00'), endAt: at(MON, '15:00') });
    await create('scheduleExceptions', { employeeId: s.employeeId, unitId: s.unitId, kind: 'BLOCK', startAt: at(MON, '10:00'), endAt: at(MON, '11:00') });
    const versions = new DynamicTableVersionService(new DynamicTableVersionRepository(), repo, policy, service);
    expect(await codeOf(versions.restoreRowVersion(ctxOf(A), await tableId(A, 'appointments'), row.id, 1))).toBe('OUTSIDE_AVAILABILITY');
  });

  it('escrita de sistema continua fora do gate de horário', async () => {
    const s = await seed();
    await mondaySchedule({ employeeId: s.employeeId }, s.unitId);
    expect(await codeOf(create('appointments', appt(s, at(TUE, '10:00'), at(TUE, '11:00')), true))).toBe('OK');
  });
});

describe('item 29 — remarcar passa pelo gate; mudar só o status não', () => {
  it('cancelar um agendamento que a escala fechou depois passa; remarcar dentro do fechado é recusado', async () => {
    const s = await seed();
    await mondaySchedule({ employeeId: s.employeeId }, s.unitId);
    const row = await create('appointments', appt(s, at(MON, '10:00'), at(MON, '11:00')));
    await create('scheduleExceptions', { employeeId: s.employeeId, unitId: s.unitId, kind: 'DAY_OFF', startAt: at(MON, '00:00'), endAt: at(TUE, '00:00') });
    expect(await codeOf(update(row.id, { startAt: at(MON, '10:30'), endAt: at(MON, '11:30') }))).toBe('OUTSIDE_AVAILABILITY');
    expect(await codeOf(update(row.id, { status: 'Cancelled' }))).toBe('OK');
  });
});

describe('item 28 — agendamento automático da venda (F-ESC-16)', () => {
  const ruleCtx = async (): Promise<RuleContext> => {
    const table = (await repo.findTableByInternalName(A, 'saleItems')) ?? (await repo.findTableByInternalName(A, 'appointments'))!;
    return { userId: A, table, schema: table.schema as never, operation: 'create' as never, repository: repo };
  };
  const ms = (iso: string) => Date.parse(iso);
  const iv = (a: string, b: string) => ({ start: ms(a), end: ms(b) });

  it('proposto dentro da escala e livre fica; antes do turno vai ao início; em conflito vai ao próximo livre', async () => {
    const s = await seed();
    await mondaySchedule({ employeeId: s.employeeId }, s.unitId);
    const ctx = await ruleCtx();
    const apptT = await tableId(A, 'appointments');
    const place = (a: string, b: string) => placeAutoAppointment(ctx, apptT, { unitId: s.unitId, employeeId: s.employeeId, proposed: iv(a, b) });
    expect(await place(at(MON, '10:00'), at(MON, '11:00'))).toEqual({ slot: iv(at(MON, '10:00'), at(MON, '11:00')), override: false });
    expect(await place(at(MON, '07:10'), at(MON, '08:10'))).toEqual({ slot: iv(at(MON, '09:00'), at(MON, '10:00')), override: false });
    await create('appointments', appt(s, at(MON, '10:00'), at(MON, '11:00')));
    expect(await place(at(MON, '10:00'), at(MON, '11:00'))).toEqual({ slot: iv(at(MON, '11:00'), at(MON, '12:00')), override: false });
  });

  it('sem horário livre no dia → o proposto como encaixe; sem profissional → o proposto, sem gate', async () => {
    const s = await seed();
    await mondaySchedule({ employeeId: s.employeeId }, s.unitId);
    const ctx = await ruleCtx();
    const apptT = await tableId(A, 'appointments');
    expect(await placeAutoAppointment(ctx, apptT, { unitId: s.unitId, employeeId: s.employeeId, proposed: iv(at(MON, '17:30'), at(MON, '18:30')) })).toEqual({
      slot: iv(at(MON, '17:30'), at(MON, '18:30')),
      override: true,
    });
    expect(await placeAutoAppointment(ctx, apptT, { unitId: s.unitId, proposed: iv(at(TUE, '22:00'), at(TUE, '23:00')) })).toEqual({
      slot: iv(at(TUE, '22:00'), at(TUE, '23:00')),
      override: false,
    });
  });

  it('a venda não falha: o agendamento sai gravado com availabilityOverride e AUTO_FROM_SALE', async () => {
    const s = await seed();
    await mondaySchedule({ employeeId: s.employeeId }, s.unitId, { validTo: '2026-01-31' }); // padrão vivo, já fora da vigência
    const id = await autoCreateAppointmentForServiceItem(await ruleCtx(), { serviceId: s.serviceId, responsibleEmployeeId: s.employeeId }, s.unitId, { id: 'sale1', data: { unitId: s.unitId } });
    const row = await repo.findDataById(id);
    expect(row?.data).toMatchObject({ availabilityOverride: true, availabilityOverrideReason: AUTO_FROM_SALE, status: 'Scheduled' });
  });
});
