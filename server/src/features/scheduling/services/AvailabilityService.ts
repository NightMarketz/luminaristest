/**
 * BE-INCR-ESCALA-BASE itens 31 e 32 — disponibilidade e horário livre (leitura, fora do motor).
 *
 * A composição é a do gate da agenda (`targetAvailabilityOf`, itens 24/28): um horário que esta leitura devolve, o
 * create de `appointments` aceita. Alvo sem padrão vivo = sem restrição (F-ESC-15 a): a janela inteira volta disponível,
 * com `unrestricted: true`. A janela máxima é de 31 dias (`RANGE_TOO_LARGE`, §3.4). Toda leitura é do dono das tabelas, e
 * id que não é dele dá 404 (item 34).
 */
import type { UserContext } from '../../../lib/authUtils';
import { NotFoundError, ValidationError } from '../../../lib/errors';
import { freeSlots, subtractIntervals, targetAvailabilityOf, type Interval, type ScheduleTarget } from '../models/availability';
import { schedulingError } from '../models/errors';
import { MAX_RANGE_DAYS, type AvailabilityQuery, type AvailabilityResponse, type FreeSlotsQuery, type FreeSlotsResponse } from '../dtos/availability';
import type { ISchedulingRowRepository } from '../repositories/ISchedulingRowRepository';
import type { ISchedulingPolicy } from '../policies/ISchedulingPolicy';

const DAY_MS = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();
const intersect = (a: Interval[], b: Interval[]) => subtractIntervals(a, subtractIntervals(a, b));

interface TargetAvailability {
  unrestricted: boolean;
  intervals: Interval[];
}

export class AvailabilityService {
  constructor(
    private readonly rows: ISchedulingRowRepository,
    private readonly policy: ISchedulingPolicy,
  ) {}

  /** Item 34 — a unidade é viva e do usuário; profissional, recurso e serviço pedidos são linhas dele. Senão 404. */
  private async assertReadable(user: UserContext, q: { unitId: string; employeeId?: string; resourceId?: string; serviceId?: string }) {
    if (!this.policy.canRead(user, await this.rows.unitState(user.userId, q.unitId))) throw new NotFoundError('Unit not found');
    const refs: Array<['employees' | 'resources' | 'services', string | undefined]> = [
      ['employees', q.employeeId],
      ['resources', q.resourceId],
      ['services', q.serviceId],
    ];
    for (const [table, id] of refs) {
      if (id && !(await this.rows.isOwnRow(user.userId, table, id))) throw new NotFoundError(`${table} row not found`);
    }
  }

  private range(q: { from: string; to: string }): Interval {
    const range = { start: Date.parse(q.from), end: Date.parse(q.to) };
    if (range.end - range.start > MAX_RANGE_DAYS * DAY_MS) {
      throw schedulingError('RANGE_TOO_LARGE', `The window is limited to ${MAX_RANGE_DAYS} days.`, { maxDays: MAX_RANGE_DAYS });
    }
    return range;
  }

  private async targetAvailability(ownerUserId: string, target: ScheduleTarget, unitId: string, range: Interval): Promise<TargetAvailability> {
    const schedules = await this.rows.targetSchedules(ownerUserId, target, unitId);
    const exceptions = schedules.length ? await this.rows.applicableExceptions(ownerUserId, target, unitId) : [];
    const timeZone = await this.rows.unitTimeZone(ownerUserId, unitId);
    const intervals = targetAvailabilityOf({ schedules, exceptions, unitId, timeZone, range });
    return intervals === null ? { unrestricted: true, intervals: [range] } : { unrestricted: false, intervals };
  }

  /** Item 31 — as faixas disponíveis de um alvo na unidade. */
  async availability(user: UserContext, q: AvailabilityQuery): Promise<AvailabilityResponse> {
    await this.assertReadable(user, q);
    const range = this.range(q);
    const target: ScheduleTarget = q.employeeId ? { employeeId: q.employeeId } : { resourceId: q.resourceId as string };
    const a = await this.targetAvailability(user.userId, target, q.unitId, range);
    return { unrestricted: a.unrestricted, intervals: a.intervals.map((i) => ({ startAt: iso(i.start), endAt: iso(i.end) })) };
  }

  /**
   * Item 32 — inícios livres. A duração vem do `durationMinutes` ou, sem ele, do `services.duration`. Com profissional e
   * recurso, o horário em que os dois estão disponíveis e livres. Sem profissional, um conjunto por profissional da
   * unidade (`employeesOfUnit`); só com recurso, os horários do recurso.
   */
  async freeSlots(user: UserContext, q: FreeSlotsQuery): Promise<FreeSlotsResponse> {
    await this.assertReadable(user, q);
    const range = this.range(q);
    const duration = q.durationMinutes ?? (q.serviceId ? await this.rows.serviceDurationMinutes(user.userId, q.serviceId) : null);
    if (!duration) throw new ValidationError('The service has no duration; send durationMinutes.', { durationMinutes: ['required'] });

    let resource: { available: Interval[]; busy: Interval[] } | null = null;
    if (q.resourceId) {
      const t = { resourceId: q.resourceId };
      resource = {
        available: (await this.targetAvailability(user.userId, t, q.unitId, range)).intervals,
        busy: await this.rows.busy(user.userId, t, range),
      };
    }
    const employees = q.employeeId ? [q.employeeId] : q.resourceId ? [] : await this.rows.employeesOfUnit(user.userId, q.unitId);

    const slots: FreeSlotsResponse['slots'] = [];
    const push = (xs: Interval[], employeeId: string | null) =>
      xs.forEach((s) => slots.push({ employeeId, resourceId: q.resourceId ?? null, startAt: iso(s.start), endAt: iso(s.end) }));

    if (employees.length === 0 && resource) {
      push(freeSlots(resource.available, resource.busy, duration, q.stepMinutes), null);
      return { slots };
    }
    for (const employeeId of employees) {
      const t = { employeeId };
      let available = (await this.targetAvailability(user.userId, t, q.unitId, range)).intervals;
      let busy = await this.rows.busy(user.userId, t, range);
      if (resource) {
        available = intersect(available, resource.available);
        busy = [...busy, ...resource.busy];
      }
      push(freeSlots(available, busy, duration, q.stepMinutes), employeeId);
    }
    return { slots };
  }
}
