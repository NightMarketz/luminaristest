/**
 * BE-INCR-ESCALA-BASE §3.1 (item 1) — contrato Zod das linhas da escala (DynamicTable no Core).
 *
 * São as linhas como o centro as lê, depois da normalização de `models/rows.ts`: o motor guarda `date` como ISO à
 * meia-noite UTC e `datetime` como ISO com `Z`, e o plugin recebe `Date`. O normalizador devolve date-only (`YYYY-MM-DD`)
 * e instante ISO, e só então estes schemas validam. Campos extras que o usuário acrescentar à tabela não entram aqui.
 *
 * Forks: F-ESC-3 (alvo pessoa XOR recurso), F-ESC-4 (ciclo de N dias), F-ESC-6/7 (origem das exceções), F-ESC-10 (origem
 * do padrão). Nomes em inglês (ADR-PAIS-NA-BORDA R1).
 */
import { z } from 'zod';
import { DATE_ONLY_RE, isValidDateOnly } from '../../accounting/models/dates';

/** Date-only com calendário real: `2027-02-30` é recusada pelo round-trip, não só pela regex. */
export const dateOnly = z.string().regex(DATE_ONLY_RE).refine(isValidDateOnly, 'date outside the calendar');
/** Instante ISO 8601 com `Z` ou offset. */
export const instant = z.string().datetime({ offset: true });
const id = z.string().min(1);

export const SCHEDULE_ORIGINS = ['DECLARED', 'ASSIGNED'] as const; // F-ESC-10
export const EXCEPTION_KINDS = ['DAY_OFF', 'BLOCK', 'ABSENCE', 'HOLIDAY', 'EXTRA'] as const;
/** Exceções que tiram disponibilidade; `EXTRA` acrescenta (item 4). */
export const UNAVAILABLE_EXCEPTION_KINDS = ['DAY_OFF', 'BLOCK', 'ABSENCE', 'HOLIDAY'] as const;
export const EXCEPTION_ORIGINS = ['USER', 'HOLIDAY_CALENDAR', 'HR'] as const; // F-ESC-6/7
export const EXCEPTION_SOURCE_TYPES = ['HOLIDAY', 'DP_ABSENCE'] as const;
export const MAX_CYCLE_DAYS = 56; // F-ESC-4
export const MINUTES_PER_DAY = 1440;

export type ScheduleOrigin = (typeof SCHEDULE_ORIGINS)[number];
export type ExceptionKind = (typeof EXCEPTION_KINDS)[number];
export type ExceptionOrigin = (typeof EXCEPTION_ORIGINS)[number];
export type ExceptionSourceType = (typeof EXCEPTION_SOURCE_TYPES)[number];

export const resourceSchema = z
  .object({
    name: z.string().min(1).max(120),
    kind: z.string().min(1).max(40), // select com opções do usuário (sala, equipamento, box, caixa…)
    unitId: id.optional(),
    isActive: z.boolean().default(true),
  })
  .strict();

export const scheduleSchema = z
  .object({
    employeeId: id.optional(),
    resourceId: id.optional(),
    unitId: id.optional(), // ausente = vale em qualquer unidade (migração de funcionário sem unidade)
    cycleLengthDays: z.number().int().min(1).max(MAX_CYCLE_DAYS),
    cycleAnchorDate: dateOnly,
    validFrom: dateOnly,
    validTo: dateOnly.nullable().optional(), // inclusive; null = sem fim
    origin: z.enum(SCHEDULE_ORIGINS).default('DECLARED'),
    migratedFrom: z.literal('workSchedule').optional(),
    notes: z.string().max(500).optional(),
  })
  .strict()
  .superRefine((s, ctx) => {
    if (!!s.employeeId === !!s.resourceId) ctx.addIssue({ code: 'custom', message: 'SCHEDULE_TARGET_REQUIRED' });
    // date-only compara como texto (mesmo formato fixo).
    if (s.validTo && s.validTo < s.validFrom) ctx.addIssue({ code: 'custom', path: ['validTo'], message: 'validTo < validFrom' });
  });

export const scheduleShiftSchema = z
  .object({
    scheduleId: id,
    dayOfCycle: z.number().int().min(1).max(MAX_CYCLE_DAYS), // ≤ cycleLengthDays do pai (plugin, item 14)
    startMinute: z.number().int().min(0).max(MINUTES_PER_DAY - 1), // hora local da unidade
    durationMinutes: z.number().int().min(1).max(MINUTES_PER_DAY), // passa da meia-noite sem ambiguidade
  })
  .strict();

export const scheduleExceptionSchema = z
  .object({
    employeeId: id.optional(),
    resourceId: id.optional(), // os dois ausentes = a unidade inteira
    unitId: id,
    kind: z.enum(EXCEPTION_KINDS),
    origin: z.enum(EXCEPTION_ORIGINS).default('USER'),
    startAt: instant,
    endAt: instant,
    reason: z.string().max(300).optional(),
    sourceType: z.enum(EXCEPTION_SOURCE_TYPES).optional(), // chave idempotente das projeções
    sourceId: z.string().min(1).optional(),
    // F-ESC-23 (C, emenda 4 corrigida em 97540313c): o feriado do calendário se desliga, não se apaga. A linha fica
    // (fora do alcance da purga), o gate e a leitura a ignoram, e o sync não a recria. Só em `HOLIDAY_CALENDAR`.
    disabled: z.boolean().optional(),
  })
  .strict()
  .superRefine((e, ctx) => {
    if (e.disabled === true && e.origin !== 'HOLIDAY_CALENDAR') ctx.addIssue({ code: 'custom', path: ['disabled'], message: 'only HOLIDAY_CALENDAR is disabled' });
    if (e.employeeId && e.resourceId) ctx.addIssue({ code: 'custom', message: 'one target at most' });
    // Instantes comparam como instante, não como texto: offsets diferentes ordenam errado em string.
    if (Date.parse(e.endAt) <= Date.parse(e.startAt)) ctx.addIssue({ code: 'custom', path: ['endAt'], message: 'endAt <= startAt' });
    if ((e.origin === 'USER') !== (e.sourceType === undefined)) ctx.addIssue({ code: 'custom', message: 'projection key mismatch' });
  });

export type ResourceInput = z.infer<typeof resourceSchema>;
export type ScheduleInput = z.infer<typeof scheduleSchema>;
export type ScheduleShiftInput = z.infer<typeof scheduleShiftSchema>;
export type ScheduleExceptionInput = z.infer<typeof scheduleExceptionSchema>;
