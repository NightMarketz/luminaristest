/**
 * BE-INCR-ESCALA-BASE (§1 "Centro puro", `models/rows.ts`) — as linhas da escala como o centro as lê.
 *
 * O motor DynamicTable entrega `date` como `Date` (no plugin, depois do `z.coerce.date()`) ou como ISO à meia-noite UTC
 * (na leitura pelo repositório), e `datetime` como `Date` ou ISO com `Z`. Aqui isso vira date-only (`YYYY-MM-DD`, o dia
 * COMO ESCRITO — memória motor-grava-date-como-iso-utc-scopeday-recua-um-dia) e instante ISO, e passa pelos schemas de
 * `dtos/rows.ts`. Campo que o usuário acrescentou à tabela fica de fora (o schema é `.strict()`).
 */
import type { z } from 'zod';
import {
  resourceSchema,
  scheduleExceptionSchema,
  scheduleSchema,
  scheduleShiftSchema,
  type ResourceInput,
  type ScheduleExceptionInput,
  type ScheduleInput,
  type ScheduleShiftInput,
} from '../dtos/rows';

export type ScheduleRow = ScheduleInput & { id: string };
export type ShiftRow = ScheduleShiftInput & { id: string };
export type ExceptionRow = ScheduleExceptionInput & { id: string };
export type ResourceRow = ResourceInput & { id: string };
export interface ScheduleWithShifts {
  schedule: ScheduleRow;
  shifts: ShiftRow[];
}

/** Linha crua do motor (`IDynamicTableData` ou o `ctx.after` do plugin). */
export interface RawRow {
  id: string;
  data: Record<string, unknown>;
}

const DATE_KEYS = ['cycleAnchorDate', 'validFrom', 'validTo'];
const INSTANT_KEYS = ['startAt', 'endAt'];

/** Dia como escrito: `YYYY-MM-DD`, ISO à meia-noite UTC ou `Date` à meia-noite UTC. Outro formato passa adiante e o schema recusa. */
export function dayAsWritten(v: unknown): unknown {
  if (v instanceof Date) return Number.isFinite(v.getTime()) ? v.toISOString().slice(0, 10) : v;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}(T00:00:00(\.000)?Z)?$/.test(v)) return v.slice(0, 10);
  return v;
}

/** Instante ISO: `Date`, epoch ou string com fuso. */
export function instantAsIso(v: unknown): unknown {
  if (v instanceof Date) return Number.isFinite(v.getTime()) ? v.toISOString() : v;
  if (typeof v === 'number' && Number.isFinite(v)) return new Date(v).toISOString();
  return v;
}

function pick(data: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    let v = data[k];
    if (v === null && k !== 'validTo') continue; // vazio na tabela genérica = ausente
    if (v === undefined || v === '') continue;
    if (DATE_KEYS.includes(k)) v = dayAsWritten(v);
    if (INSTANT_KEYS.includes(k)) v = instantAsIso(v);
    out[k] = v;
  }
  return out;
}

function keysOf(schema: z.ZodType): string[] {
  // Os schemas de linha são ZodObject (com ou sem superRefine).
  const shape = (schema as unknown as { shape?: Record<string, unknown> }).shape;
  return shape ? Object.keys(shape) : [];
}

const SCHEDULE_KEYS = keysOf(scheduleSchema);
const SHIFT_KEYS = keysOf(scheduleShiftSchema);
const EXCEPTION_KEYS = keysOf(scheduleExceptionSchema);
const RESOURCE_KEYS = keysOf(resourceSchema);

export function toScheduleRow(r: RawRow): ScheduleRow {
  return { id: r.id, ...scheduleSchema.parse(pick(r.data, SCHEDULE_KEYS)) };
}
export function toShiftRow(r: RawRow): ShiftRow {
  return { id: r.id, ...scheduleShiftSchema.parse(pick(r.data, SHIFT_KEYS)) };
}
export function toExceptionRow(r: RawRow): ExceptionRow {
  return { id: r.id, ...scheduleExceptionSchema.parse(pick(r.data, EXCEPTION_KEYS)) };
}
export function toResourceRow(r: RawRow): ResourceRow {
  return { id: r.id, ...resourceSchema.parse(pick(r.data, RESOURCE_KEYS)) };
}

/** Só os campos do contrato, normalizados — para validar o `ctx.after` do plugin sem as chaves extras do usuário. */
export const normalizeScheduleData = (d: Record<string, unknown>) => pick(d, SCHEDULE_KEYS);
export const normalizeShiftData = (d: Record<string, unknown>) => pick(d, SHIFT_KEYS);
export const normalizeExceptionData = (d: Record<string, unknown>) => pick(d, EXCEPTION_KEYS);
