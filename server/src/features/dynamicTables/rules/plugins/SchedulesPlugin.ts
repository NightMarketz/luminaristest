/**
 * SchedulesPlugin — BE-INCR-ESCALA-BASE itens 11, 13, 14 e 15 (F-ESC-3, F-ESC-4, F-ESC-6, F-ESC-7, F-ESC-11, F-ESC-13).
 *
 * - `schedules`: contrato da linha (XOR de alvo, vigência, ciclo 1..56, âncora de calendário) e a escala do alvo sem
 *   sobreposição contra os padrões vivos dele (item 7).
 * - `scheduleShifts`: `dayOfCycle ≤ cycleLengthDays` do padrão-pai e a escala do alvo sem sobreposição (item 7).
 * - `scheduleExceptions`: contrato da linha; só o sistema grava `origin ≠ USER`; `HR` não se edita nem se apaga;
 *   `HOLIDAY_CALENDAR` se desliga (`disabled: true`, abrir no feriado), não se edita nem se apaga (F-ESC-23, emenda 4
 *   corrigida em 97540313c: a linha fica, fora do alcance da purga, e o sync não a recria).
 * - `units`: `timeZone` IANA validado por `Intl.supportedValuesOf('timeZone')`.
 *
 * Lê só DynamicTable pelo `ctx.repository` (AC-2.1-B1); a regra é a função pura de `features/scheduling/models`.
 */
import type { z } from 'zod';
import type { RulePlugin, RuleContext } from '../RuleTypes';
import { ValidationError } from '../../../../lib/errors';
import { tableMatches } from '../shared/tableFinder';
import { loadShifts, loadTargetSchedules, SCHEDULING_TABLES, unitTimeZone } from '../shared/schedulingRows';
import { scheduleExceptionSchema, scheduleSchema, scheduleShiftSchema } from '../../../scheduling/dtos/rows';
import { normalizeExceptionData, normalizeScheduleData, normalizeShiftData, toScheduleRow, type ScheduleRow, type ShiftRow } from '../../../scheduling/models/rows';
import { assertNoOverlappingShifts, type ScheduleInZone } from '../../../scheduling/models/scheduleOverlap';
import { schedulingError } from '../../../scheduling/models/errors';
import { isSupportedTimeZone } from '../../../scheduling/models/timeZone';
import type { ScheduleTarget } from '../../../scheduling/models/availability';

const NEW_ROW_ID = '(new)';

function parseOrThrow<S extends z.ZodType>(schema: S, data: Record<string, unknown>, what: string): z.infer<S> {
  const r = schema.safeParse(data);
  if (r.success) return r.data;
  if (r.error.issues.some((i) => i.message === 'SCHEDULE_TARGET_REQUIRED')) {
    throw schedulingError('SCHEDULE_TARGET_REQUIRED', 'Informe a pessoa ou o recurso da escala (um dos dois).');
  }
  const fields: Record<string, string[]> = {};
  for (const i of r.error.issues) (fields[i.path.join('.') || '_'] ??= []).push(i.message);
  throw new ValidationError(`${what} inválido(a).`, fields);
}

function targetOf(s: ScheduleRow): ScheduleTarget {
  return s.employeeId ? { employeeId: s.employeeId } : { resourceId: s.resourceId as string };
}

/** Item 7 sobre os padrões vivos do alvo, com `candidate` no lugar da versão gravada dele. */
async function assertTargetScheduleConsistent(ctx: RuleContext, candidate: ScheduleInZone): Promise<void> {
  const others = (await loadTargetSchedules(ctx, targetOf(candidate.schedule))).filter((s) => s.schedule.id !== candidate.schedule.id);
  assertNoOverlappingShifts([candidate, ...others]);
}

// ---------------------------------------------------------------------------------------------- schedules (item 13)
async function validateSchedule(ctx: RuleContext): Promise<void> {
  const after = ctx.after ?? {};
  const parsed = parseOrThrow(scheduleSchema, normalizeScheduleData(after), 'Escala');
  const id = typeof after.id === 'string' ? after.id : NEW_ROW_ID;
  const schedule: ScheduleRow = { id, ...parsed };
  const shifts = id === NEW_ROW_ID ? [] : await loadShifts(ctx, id);
  // Encurtar o ciclo não pode deixar turno com dia além dele (item 14, visto do pai).
  const beyond = shifts.find((s) => s.dayOfCycle > schedule.cycleLengthDays);
  if (beyond) {
    throw new ValidationError('O ciclo ficou menor que o dia de um turno da escala.', { cycleLengthDays: [`Turno ${beyond.id} no dia ${beyond.dayOfCycle}.`] });
  }
  await assertTargetScheduleConsistent(ctx, { schedule, shifts, timeZone: await unitTimeZone(ctx, schedule.unitId) });
}

// ----------------------------------------------------------------------------------------- scheduleShifts (item 14)
async function validateShift(ctx: RuleContext): Promise<void> {
  const after = ctx.after ?? {};
  const shift = parseOrThrow(scheduleShiftSchema, normalizeShiftData(after), 'Turno');
  const id = typeof after.id === 'string' ? after.id : NEW_ROW_ID;
  const parentRow = await ctx.repository.findDataById(shift.scheduleId);
  if (!parentRow) throw new ValidationError('Escala do turno não encontrada.', { scheduleId: ['Não encontrada.'] });
  const parent = toScheduleRow({ id: parentRow.id, data: (parentRow.data ?? {}) as Record<string, unknown> });
  if (shift.dayOfCycle > parent.cycleLengthDays) {
    throw new ValidationError(`O dia do ciclo (${shift.dayOfCycle}) passa do ciclo da escala (${parent.cycleLengthDays} dias).`, {
      dayOfCycle: [`Máximo ${parent.cycleLengthDays}.`],
    });
  }
  const siblings = (await loadShifts(ctx, parent.id)).filter((s) => s.id !== id);
  const candidate: ShiftRow = { id, ...shift };
  await assertTargetScheduleConsistent(ctx, { schedule: parent, shifts: [...siblings, candidate], timeZone: await unitTimeZone(ctx, parent.unitId) });
}

// ------------------------------------------------------------------------------------- scheduleExceptions (item 15)
/** As chaves do contrato que mudaram entre `before` e `after`, já normalizadas (`Date` × ISO não conta como mudança). */
function changedExceptionKeys(before: Record<string, unknown>, after: Record<string, unknown>): string[] {
  const b = normalizeExceptionData(before);
  const a = normalizeExceptionData(after);
  return [...new Set([...Object.keys(b), ...Object.keys(a)])].filter((k) =>
    k === 'disabled' ? (b[k] === true) !== (a[k] === true) : JSON.stringify(b[k]) !== JSON.stringify(a[k]),
  );
}

/**
 * F-ESC-23: na linha `HOLIDAY_CALENDAR` o usuário só desliga o feriado (`disabled` de não-`true` para `true`). Qualquer
 * outra mudança, e religar (pergunta de spec aberta à sessão de planejamento), é `EXCEPTION_READ_ONLY`.
 */
function assertHolidayOnlyDisabled(before: Record<string, unknown>, after: Record<string, unknown>): void {
  const changed = changedExceptionKeys(before, after);
  const turningOff = changed.length === 1 && changed[0] === 'disabled' && after.disabled === true;
  if (changed.length > 0 && !turningOff) {
    throw schedulingError('EXCEPTION_READ_ONLY', 'Feriado do calendário não se edita: só se desliga (disabled: true).', { origin: 'HOLIDAY_CALENDAR' });
  }
}

async function validateExceptionWrite(ctx: RuleContext): Promise<void> {
  const before = ctx.before ?? null;
  if (before && !ctx.isSystem) {
    const origin = String(before.origin ?? 'USER');
    if (origin === 'HR') {
      throw schedulingError('EXCEPTION_READ_ONLY', 'Exceção projetada pelo sistema não se edita.', { origin });
    }
    if (origin === 'HOLIDAY_CALENDAR') assertHolidayOnlyDisabled(before, ctx.after ?? {});
  }
  const e = parseOrThrow(scheduleExceptionSchema, normalizeExceptionData(ctx.after ?? {}), 'Exceção');
  // Desligar o feriado (acima) não troca a origem: a regra pega quem cria ou muda uma linha para `origin ≠ USER`.
  if (e.origin !== 'USER' && !ctx.isSystem && String(before?.origin ?? 'USER') !== e.origin) {
    throw schedulingError('EXCEPTION_READ_ONLY', 'Só o sistema grava exceção de feriado ou de afastamento.', { origin: e.origin });
  }
}

function assertExceptionDeletable(ctx: RuleContext): void {
  // O delete do motor não carrega `isSystem`: a projeção do DP apaga pelo repositório, fora deste gancho.
  const origin = String(ctx.before?.origin ?? 'USER');
  if (origin === 'HR') {
    throw schedulingError('EXCEPTION_READ_ONLY', 'Afastamento projetado do DP não se apaga aqui; ajuste no DP.', { origin: 'HR' });
  }
  // F-ESC-23: apagada, a linha seria purgada em 90 dias e o sync recriaria o feriado. Ela se desliga.
  if (origin === 'HOLIDAY_CALENDAR') {
    throw schedulingError('EXCEPTION_READ_ONLY', 'Feriado do calendário não se apaga: desligue-o (disabled: true).', { origin });
  }
}

// ----------------------------------------------------------------------------------------------- units (item 11)
function validateUnitTimeZone(ctx: RuleContext): void {
  const tz = ctx.after?.timeZone;
  if (tz === undefined || tz === null || tz === '') return;
  if (typeof tz !== 'string' || !isSupportedTimeZone(tz)) {
    throw new ValidationError('Fuso horário inválido: use um nome IANA (ex.: America/Sao_Paulo).', { timeZone: ['Fuso IANA desconhecido.'] });
  }
}

function is(ctx: RuleContext, internalName: string, categories: string[]): boolean {
  return tableMatches(ctx.table, { categories, internalNames: [internalName] });
}

export const SchedulesPlugin: RulePlugin = {
  name: 'SchedulesPlugin',
  supports(ctx) {
    return (
      is(ctx, SCHEDULING_TABLES.schedules, ['planning']) ||
      is(ctx, SCHEDULING_TABLES.scheduleShifts, ['planning']) ||
      is(ctx, SCHEDULING_TABLES.scheduleExceptions, ['planning']) ||
      is(ctx, SCHEDULING_TABLES.units, ['business'])
    );
  },
  async beforeCreate(ctx) {
    await dispatch(ctx);
  },
  async beforeUpdate(ctx) {
    await dispatch(ctx);
  },
  beforeDelete(ctx) {
    if (ctx.table.internalName === SCHEDULING_TABLES.scheduleExceptions) assertExceptionDeletable(ctx);
  },
};

async function dispatch(ctx: RuleContext): Promise<void> {
  switch (ctx.table.internalName) {
    case SCHEDULING_TABLES.schedules:
      return validateSchedule(ctx);
    case SCHEDULING_TABLES.scheduleShifts:
      return validateShift(ctx);
    case SCHEDULING_TABLES.scheduleExceptions:
      return validateExceptionWrite(ctx);
    case SCHEDULING_TABLES.units:
      return validateUnitTimeZone(ctx);
  }
}

