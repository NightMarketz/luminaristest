/**
 * BE-INCR-ESCALA-BASE item 31 — leitura das linhas da escala fora do motor, sobre o repositório do DynamicTable (só
 * leitura, nada de escrita: quem escreve a escala é o motor, pelo SchedulesPlugin). A validação das linhas é a mesma do
 * gate da agenda (`validScheduleRows` & cia., `models/rows.ts`).
 */
import type { IDynamicTableRepository } from '../../dynamicTables/repositories/IDynamicTableRepository';
import { validExceptionRows, validScheduleRows, validShiftRows, type ExceptionRow } from '../models/rows';
import type { Interval, ScheduleTarget } from '../models/availability';
import type { ScheduleInZone } from '../models/scheduleOverlap';
import { resolveTimeZone } from '../models/timeZone';
import type { ISchedulingRowRepository, SchedulingTableName } from './ISchedulingRowRepository';

type Reader = Pick<
  IDynamicTableRepository,
  'findTableByInternalName' | 'findRowsByFieldValue' | 'findDataById' | 'existsByIdInTable' | 'findUnitRowState'
>;

const targetField = (t: ScheduleTarget) =>
  'employeeId' in t ? { field: 'employeeId', value: t.employeeId } : { field: 'resourceId', value: t.resourceId };

export class SchedulingRowRepository implements ISchedulingRowRepository {
  constructor(private readonly dt: Reader) {}

  private async rowsBy(ownerUserId: string, table: SchedulingTableName, field: string, value: string) {
    const t = await this.dt.findTableByInternalName(ownerUserId, table);
    return t ? this.dt.findRowsByFieldValue(t.id, field, value) : [];
  }

  unitState(ownerUserId: string, unitId: string) {
    return this.dt.findUnitRowState(ownerUserId, unitId);
  }

  async isOwnRow(ownerUserId: string, table: SchedulingTableName, id: string): Promise<boolean> {
    const t = await this.dt.findTableByInternalName(ownerUserId, table);
    return t ? this.dt.existsByIdInTable(id, t.id) : false;
  }

  async unitTimeZone(ownerUserId: string, unitId: string | null): Promise<string> {
    if (!unitId || (await this.unitState(ownerUserId, unitId)) !== 'live') return resolveTimeZone(undefined);
    const unit = await this.dt.findDataById(unitId);
    return resolveTimeZone((unit?.data as Record<string, unknown> | undefined)?.timeZone);
  }

  async targetSchedules(ownerUserId: string, target: ScheduleTarget, fallbackUnitId: string | null): Promise<ScheduleInZone[]> {
    const { field, value } = targetField(target);
    const out: ScheduleInZone[] = [];
    for (const schedule of validScheduleRows(await this.rowsBy(ownerUserId, 'schedules', field, value))) {
      out.push({
        schedule,
        shifts: validShiftRows(await this.rowsBy(ownerUserId, 'scheduleShifts', 'scheduleId', schedule.id)),
        timeZone: await this.unitTimeZone(ownerUserId, schedule.unitId ?? fallbackUnitId),
      });
    }
    return out;
  }

  async applicableExceptions(ownerUserId: string, target: ScheduleTarget, unitId: string | null): Promise<ExceptionRow[]> {
    const { field, value } = targetField(target);
    const mine = validExceptionRows(await this.rowsBy(ownerUserId, 'scheduleExceptions', field, value));
    const unitWide = unitId
      ? validExceptionRows(await this.rowsBy(ownerUserId, 'scheduleExceptions', 'unitId', unitId)).filter((e) => !e.employeeId && !e.resourceId)
      : [];
    return [...mine, ...unitWide];
  }

  async busy(ownerUserId: string, target: ScheduleTarget, range: Interval): Promise<Interval[]> {
    const field = 'employeeId' in target ? 'responsibleEmployeeId' : 'resourceId';
    const value = 'employeeId' in target ? target.employeeId : target.resourceId;
    return (await this.rowsBy(ownerUserId, 'appointments', field, value))
      .map((r) => (r.data ?? {}) as Record<string, unknown>)
      .filter((d) => String(d.status ?? '') === 'Scheduled')
      .map((d) => ({ start: new Date(d.startAt as string).getTime(), end: new Date(d.endAt as string).getTime() }))
      .filter((b) => isFinite(b.start) && isFinite(b.end) && b.start < range.end && range.start < b.end);
  }

  async employeesOfUnit(ownerUserId: string, unitId: string): Promise<string[]> {
    const registered = (await this.rowsBy(ownerUserId, 'employees', 'unitId', unitId)).map((r) => r.id);
    const scheduledHere = validScheduleRows(await this.rowsBy(ownerUserId, 'schedules', 'unitId', unitId))
      .map((s) => s.employeeId)
      .filter((e): e is string => !!e);
    return [...new Set([...registered, ...scheduledHere])];
  }

  async serviceDurationMinutes(ownerUserId: string, serviceId: string): Promise<number | null> {
    if (!(await this.isOwnRow(ownerUserId, 'services', serviceId))) return null;
    const row = await this.dt.findDataById(serviceId);
    const d = Number((row?.data as Record<string, unknown> | undefined)?.duration);
    return Number.isInteger(d) && d > 0 ? d : null;
  }
}
