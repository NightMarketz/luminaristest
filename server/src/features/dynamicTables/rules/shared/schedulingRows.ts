/**
 * BE-INCR-ESCALA-BASE — leitura das linhas da escala de dentro do motor (SchedulesPlugin, AppointmentsPlugin e o
 * agendamento automático da venda). Só DynamicTable pelo `ctx.repository` (AC-2.1-B1); a lógica é a função pura de
 * `features/scheduling/models`.
 */
import type { RuleContext } from '../RuleTypes';
import type { IDynamicTable } from '../../models/DynamicTable.model';
import { resolveTable } from './tableFinder';
import {
  validExceptionRows,
  validScheduleRows,
  validShiftRows,
  type ExceptionRow,
  type ScheduleWithShifts,
} from '../../../scheduling/models/rows';
import { resolveTimeZone } from '../../../scheduling/models/timeZone';
import { targetAvailabilityOf, type Interval, type ScheduleTarget } from '../../../scheduling/models/availability';
import type { ScheduleInZone } from '../../../scheduling/models/scheduleOverlap';

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
  return validShiftRows(await ctx.repository.findRowsByFieldValue(t.id, 'scheduleId', scheduleId));
}

/** Os padrões vivos do alvo, com os turnos e o fuso de cada um (a unidade do padrão; sem unidade, `fallbackUnitId`). */
export async function loadTargetSchedules(ctx: RuleContext, target: ScheduleTarget, fallbackUnitId?: string | null): Promise<ScheduleInZone[]> {
  const t = await findSchedulingTable(ctx, SCHEDULING_TABLES.schedules);
  if (!t) return [];
  const { field, value } = targetField(target);
  const schedules = validScheduleRows(await ctx.repository.findRowsByFieldValue(t.id, field, value));
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
  const mine = validExceptionRows(await ctx.repository.findRowsByFieldValue(t.id, field, value));
  const unitWide = unitId
    ? validExceptionRows(await ctx.repository.findRowsByFieldValue(t.id, 'unitId', unitId)).filter((e) => !e.employeeId && !e.resourceId)
    : [];
  return [...mine, ...unitWide];
}

/**
 * Itens 24 e 28 — a disponibilidade do alvo na unidade, dentro de `range` (a composição pura é `targetAvailabilityOf`,
 * a mesma da leitura do item 31). `null` = o alvo não tem padrão vivo (F-ESC-15 a: sem restrição).
 */
export async function targetAvailability(ctx: RuleContext, target: ScheduleTarget, unitId: string | null, range: Interval): Promise<Interval[] | null> {
  const schedules = await loadTargetSchedules(ctx, target, unitId);
  if (schedules.length === 0) return null;
  const exceptions = await loadApplicableExceptions(ctx, target, unitId);
  return targetAvailabilityOf({ schedules, exceptions, unitId, timeZone: await unitTimeZone(ctx, unitId), range });
}
