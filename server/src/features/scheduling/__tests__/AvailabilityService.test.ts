/**
 * BE-INCR-ESCALA-BASE itens 31, 32 e 34 — AvailabilityService com repositório falso (a leitura real das linhas é provada
 * no teste de integração das rotas).
 */
import { AvailabilityService } from '../services/AvailabilityService';
import { SchedulingPolicy } from '../policies/SchedulingPolicy';
import type { ISchedulingRowRepository } from '../repositories/ISchedulingRowRepository';
import type { ScheduleInZone } from '../models/scheduleOverlap';
import type { UserContext } from '../../../lib/authUtils';
import { NotFoundError, ValidationError } from '../../../lib/errors';
import { AvailabilityQuerySchema, FreeSlotsQuerySchema } from '../dtos/availability';

const user = { userId: 'owner' } as UserContext;
const SP = 'America/Sao_Paulo';
// 2027-01-04 é segunda. Padrão semanal: segunda 09:00–12:00 locais (UTC−3).
const weekly = (id: string, target: Record<string, string>, unitId: string | null = 'u1'): ScheduleInZone => ({
  schedule: { id, ...target, unitId, cycleLengthDays: 7, cycleAnchorDate: '2024-01-01', validFrom: '2026-01-01' } as ScheduleInZone['schedule'],
  shifts: [{ id: `${id}-s`, scheduleId: id, dayOfCycle: 1, startMinute: 540, durationMinutes: 180 }],
  timeZone: SP,
});
const MON = (hhmm: string) => `2027-01-04T${hhmm}:00-03:00`;
const ms = (s: string) => Date.parse(s);

function fakeRepo(over: Partial<ISchedulingRowRepository> = {}): ISchedulingRowRepository {
  return {
    unitState: async () => 'live',
    isOwnRow: async () => true,
    unitTimeZone: async () => SP,
    targetSchedules: async () => [],
    applicableExceptions: async () => [],
    busy: async () => [],
    employeesOfUnit: async () => [],
    serviceDurationMinutes: async () => 60,
    tableId: async () => null,
    liveUnitIds: async () => [],
    unitTimeZoneSetting: async () => null,
    projectionRows: async () => [],
    ownersWithTable: async () => [],
    ...over,
  };
}
const svc = (over: Partial<ISchedulingRowRepository> = {}) => new AvailabilityService(fakeRepo(over), new SchedulingPolicy());
const day = { unitId: 'u1', from: MON('00:00'), to: MON('23:59') };

describe('item 31 — availability', () => {
  it('alvo sem padrão vivo: a janela inteira, unrestricted (F-ESC-15 a)', async () => {
    const r = await svc().availability(user, { ...day, employeeId: 'e1' });
    expect(r).toEqual({ unrestricted: true, intervals: [{ startAt: new Date(ms(day.from)).toISOString(), endAt: new Date(ms(day.to)).toISOString() }] });
  });

  it('com padrão: os turnos no fuso da unidade, menos a folga', async () => {
    const r = await svc({
      targetSchedules: async () => [weekly('s1', { employeeId: 'e1' })],
      applicableExceptions: async () => [
        { id: 'x', employeeId: 'e1', unitId: 'u1', kind: 'DAY_OFF', origin: 'USER', startAt: MON('10:00'), endAt: MON('11:00') } as never,
      ],
    }).availability(user, { ...day, employeeId: 'e1' });
    expect(r.unrestricted).toBe(false);
    expect(r.intervals).toEqual([
      { startAt: '2027-01-04T12:00:00.000Z', endAt: '2027-01-04T13:00:00.000Z' },
      { startAt: '2027-01-04T14:00:00.000Z', endAt: '2027-01-04T15:00:00.000Z' },
    ]);
  });

  it('F-ESC-19: padrão só em outra unidade não vale aqui (a lista fica vazia, não unrestricted)', async () => {
    const r = await svc({ targetSchedules: async () => [weekly('s1', { employeeId: 'e1' }, 'u2')] }).availability(user, { ...day, employeeId: 'e1' });
    expect(r).toEqual({ unrestricted: false, intervals: [] });
  });

  it('janela acima de 31 dias → RANGE_TOO_LARGE', async () => {
    const e = await svc().availability(user, { unitId: 'u1', employeeId: 'e1', from: '2027-01-01T00:00:00Z', to: '2027-02-01T00:00:01Z' }).catch((x) => x);
    expect(e).toBeInstanceOf(ValidationError);
    expect(e.errorCode).toBe('RANGE_TOO_LARGE');
  });
});

describe('item 34 — leitura só do dono', () => {
  it('unidade de outro dono ou apagada → 404', async () => {
    await expect(svc({ unitState: async () => null }).availability(user, { ...day, employeeId: 'e1' })).rejects.toBeInstanceOf(NotFoundError);
    await expect(svc({ unitState: async () => 'deleted' }).availability(user, { ...day, employeeId: 'e1' })).rejects.toBeInstanceOf(NotFoundError);
  });
  it('profissional, recurso ou serviço que não é linha do dono → 404', async () => {
    for (const table of ['employees', 'resources', 'services']) {
      const s = svc({ isOwnRow: async (_o, t) => t !== table });
      await expect(s.freeSlots(user, { ...day, employeeId: 'e1', resourceId: 'r1', serviceId: 'sv', stepMinutes: 15 })).rejects.toBeInstanceOf(NotFoundError);
    }
  });
});

describe('item 32 — freeSlots', () => {
  it('duração do serviço; tira o ocupado; passo 60', async () => {
    const r = await svc({
      targetSchedules: async () => [weekly('s1', { employeeId: 'e1' })],
      busy: async () => [{ start: ms(MON('10:00')), end: ms(MON('11:00')) }],
    }).freeSlots(user, { ...day, employeeId: 'e1', serviceId: 'sv', stepMinutes: 60 });
    expect(r.slots.map((s) => s.startAt)).toEqual(['2027-01-04T12:00:00.000Z', '2027-01-04T14:00:00.000Z']);
    expect(r.slots[0]).toMatchObject({ employeeId: 'e1', resourceId: null, endAt: '2027-01-04T13:00:00.000Z' });
  });

  it('durationMinutes informado vence o do serviço; sem nenhum → 400', async () => {
    const s = svc({ targetSchedules: async () => [weekly('s1', { employeeId: 'e1' })], serviceDurationMinutes: async () => null });
    expect((await s.freeSlots(user, { ...day, employeeId: 'e1', durationMinutes: 180, stepMinutes: 60 })).slots).toHaveLength(1);
    await expect(s.freeSlots(user, { ...day, employeeId: 'e1', serviceId: 'sv', stepMinutes: 60 })).rejects.toBeInstanceOf(ValidationError);
  });

  it('sem profissional: um conjunto por profissional da unidade', async () => {
    const r = await svc({
      employeesOfUnit: async () => ['e1', 'e2'],
      targetSchedules: async (_o, t) => ('employeeId' in t && t.employeeId === 'e1' ? [weekly('s1', { employeeId: 'e1' })] : []),
    }).freeSlots(user, { unitId: 'u1', from: MON('09:00'), to: MON('10:00'), durationMinutes: 60, stepMinutes: 60 });
    expect(r.slots).toEqual([
      { employeeId: 'e1', resourceId: null, startAt: '2027-01-04T12:00:00.000Z', endAt: '2027-01-04T13:00:00.000Z' },
      // e2 sem padrão: sem restrição na janela pedida.
      { employeeId: 'e2', resourceId: null, startAt: '2027-01-04T12:00:00.000Z', endAt: '2027-01-04T13:00:00.000Z' },
    ]);
  });

  it('profissional e recurso: só onde os dois estão disponíveis e livres', async () => {
    const r = await svc({
      targetSchedules: async (_o, t) => ('employeeId' in t ? [weekly('s1', { employeeId: 'e1' })] : []),
      busy: async (_o, t) => ('resourceId' in t ? [{ start: ms(MON('09:00')), end: ms(MON('10:00')) }] : []),
    }).freeSlots(user, { ...day, employeeId: 'e1', resourceId: 'r1', durationMinutes: 60, stepMinutes: 60 });
    expect(r.slots.map((s) => [s.startAt, s.employeeId, s.resourceId])).toEqual([
      ['2027-01-04T13:00:00.000Z', 'e1', 'r1'],
      ['2027-01-04T14:00:00.000Z', 'e1', 'r1'],
    ]);
  });

  it('só recurso: os horários do recurso', async () => {
    const r = await svc({ targetSchedules: async () => [weekly('s1', { resourceId: 'r1' })] }).freeSlots(user, {
      ...day,
      resourceId: 'r1',
      durationMinutes: 180,
      stepMinutes: 60,
    });
    expect(r.slots).toEqual([{ employeeId: null, resourceId: 'r1', startAt: '2027-01-04T12:00:00.000Z', endAt: '2027-01-04T15:00:00.000Z' }]);
  });
});

describe('item 33 — contrato das queries', () => {
  const base = { unitId: 'u1', from: MON('09:00'), to: MON('10:00') };
  it('availability: exatamente um alvo, to depois de from, sem campo extra', () => {
    expect(AvailabilityQuerySchema.safeParse({ ...base, employeeId: 'e1' }).success).toBe(true);
    expect(AvailabilityQuerySchema.safeParse(base).success).toBe(false);
    expect(AvailabilityQuerySchema.safeParse({ ...base, employeeId: 'e1', resourceId: 'r1' }).success).toBe(false);
    expect(AvailabilityQuerySchema.safeParse({ ...base, employeeId: 'e1', to: base.from }).success).toBe(false);
    expect(AvailabilityQuerySchema.safeParse({ ...base, employeeId: 'e1', extra: 'x' }).success).toBe(false);
  });
  it('free-slots: duração obrigatória sem serviceId; números da query string; passo padrão 15', () => {
    expect(FreeSlotsQuerySchema.safeParse(base).success).toBe(false);
    const p = FreeSlotsQuerySchema.parse({ ...base, durationMinutes: '45' });
    expect(p).toMatchObject({ durationMinutes: 45, stepMinutes: 15 });
    expect(FreeSlotsQuerySchema.safeParse({ ...base, serviceId: 's', stepMinutes: '3' }).success).toBe(false);
  });
});
