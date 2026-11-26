/**
 * BE-INCR-ESCALA-BASE — leitura das linhas da escala de dentro do motor (SchedulesPlugin, AppointmentsPlugin e o
 * agendamento automático da venda). Só DynamicTable pelo `ctx.repository` (AC-2.1-B1); a lógica é a função pura de
 * `features/scheduling/models`.
 */
import type { RuleContext } from '../RuleTypes';
import type { IDynamicTable } from '../../models/DynamicTable.model';
import { resolveTable } from './tableFinder';
import {
  toExceptionRow,
  toScheduleRow,
  toShiftRow,
  type ExceptionRow,
  type RawRow,
  type ScheduleWithShifts,
} from '../../../scheduling/models/rows';
import { resolveTimeZone } from '../../../scheduling/models/timeZone';
import type { ScheduleTarget } from '../../../scheduling/models/availability';
import type { ScheduleInZone } from '../../../scheduling/models/scheduleOverlap';
import { scheduleExceptionSchema, scheduleSchema, scheduleShiftSchema } from '../../../scheduling/dtos/rows';
import { normalizeExceptionData, normalizeScheduleData, normalizeShiftData } from '../../../scheduling/models/rows';

export const SCHEDULING_TABLES = {
  schedules: 'schedules',
  scheduleShifts: 'scheduleShifts',
  scheduleExceptions: 'scheduleExceptions',
  resources: 'resources',
  units: 'units',
} as const;

export async function findSchedulingTable(ctx: RuleContext, internalName: string): Promise<IDynamicTable | null> {
  return resolveTable(ctx, { internalName });
}

const asRaw = (r: { id: string; data: unknown }): RawRow => ({ id: r.id, data: (r.data ?? {}) as Record<string, unknown> });

/** Linhas que não passam no contrato ficam de fora: o SchedulesPlugin recusa na escrita, então só sobra dado antigo. */
function parsed<T>(rows: Array<{ id: string; data: unknown }>, ok: (d: Record<string, unknown>) => boolean, map: (r: RawRow) => T): T[] {
  return rows.map(asRaw).filter((r) => ok(r.data)).map(map);
}
const okSchedule = (d: Record<string, unknown>) => scheduleSchema.safeParse(normalizeScheduleData(d)).success;
const okShift = (d: Record<string, unknown>) => scheduleShiftSchema.safeParse(normalizeShiftData(d)).success;
const okException = (d: Record<string, unknown>) => scheduleExceptionSchema.safeParse(normalizeExceptionData(d)).success;

/** Fuso da unidade (`units.timeZone`), com o fuso do processo quando ausente. */
export async function unitTimeZone(ctx: RuleContext, unitId: string | null | undefined): Promise<string> {
  if (!unitId) return resolveTimeZone(undefined);
  const unit = await ctx.repository.findDataById(unitId);
  return resolveTimeZone((unit?.data as Record<string, unknown> | undefined)?.timeZone);
}

export function targetField(target: ScheduleTarget): { field: 'employeeId' | 'resourceId'; value: string } {
  return 'employeeId' in target ? { field: 'employeeId', value: target.employeeId } : { field: 'resourceId', value: target.resourceId };
}

/** Os turnos vivos de um padrão. */
export async function loadShifts(ctx: RuleContext, scheduleId: string): Promise<ScheduleWithShifts['shifts']> {
  const t = await findSchedulingTable(ctx, SCHEDULING_TABLES.scheduleShifts);
  if (!t) return [];
  return parsed(await ctx.repository.findRowsByFieldValue(t.id, 'scheduleId', scheduleId), okShift, toShiftRow);
}

/** Os padrões vivos do alvo, com os turnos e o fuso de cada um (a unidade do padrão; sem unidade, `fallbackUnitId`). */
export async function loadTargetSchedules(ctx: RuleContext, target: ScheduleTarget, fallbackUnitId?: string | null): Promise<ScheduleInZone[]> {
  const t = await findSchedulingTable(ctx, SCHEDULING_TABLES.schedules);
  if (!t) return [];
  const { field, value } = targetField(target);
  const schedules = parsed(await ctx.repository.findRowsByFieldValue(t.id, field, value), okSchedule, toScheduleRow);
  const out: ScheduleInZone[] = [];
  for (const schedule of schedules) {
    out.push({ schedule, shifts: await loadShifts(ctx, schedule.id), timeZone: await unitTimeZone(ctx, schedule.unitId ?? fallbackUnitId) });
  }
  return out;
}

/** As exceções vivas que valem para o alvo na unidade: com o alvo (qualquer unidade) + sem alvo da unidade (item 4). */
export async function loadApplicableExceptions(ctx: RuleContext, target: ScheduleTarget, unitId: string | null): Promise<ExceptionRow[]> {
  const t = await findSchedulingTable(ctx, SCHEDULING_TABLES.scheduleExceptions);
  if (!t) return [];
  const { field, value } = targetField(target);
  const mine = parsed(await ctx.repository.findRowsByFieldValue(t.id, field, value), okException, toExceptionRow);
  const unitWide = unitId
    ? parsed(await ctx.repository.findRowsByFieldValue(t.id, 'unitId', unitId), okException, toExceptionRow).filter((e) => !e.employeeId && !e.resourceId)
    : [];
  return [...mine, ...unitWide];
}
