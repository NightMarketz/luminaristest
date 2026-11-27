/**
 * BE-INCR-ESCALA-BASE item 22 (F-ESC-12) — conversão pura do `employees.workSchedule` legado num padrão semanal.
 *
 * Formato real do FE (`DynamicForm`/`PeopleWizardModal`): `{ monday: { start: 'HH:MM', end: 'HH:MM', active?: boolean } }`.
 * - `active` ausente = dia de trabalho (o FE antigo não gravava a chave); `active: false` não vira turno, mesmo com horário;
 * - `start` ou `end` vazio, ou `end <= start`, pula o dia;
 * - ciclo de 7 dias com âncora `2024-01-01` (uma segunda-feira): segunda = `dayOfCycle` 1 … domingo = 7.
 */
export const WEEKLY_ANCHOR = '2024-01-01';
export const WEEKLY_CYCLE_DAYS = 7;
export const MIGRATED_FROM_WORK_SCHEDULE = 'workSchedule' as const;

const WEEKDAYS_FROM_MONDAY = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export interface MigratedShift {
  dayOfCycle: number;
  startMinute: number;
  durationMinutes: number;
}

/** "HH:MM" → minutos desde 00:00; `null` quando vazio ou fora de 00:00–24:00. */
export function minuteOfDay(v: unknown): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(v ?? '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59 || (h === 24 && min > 0)) return null;
  return h * 60 + min;
}

/** Os turnos semanais do `workSchedule`; lista vazia = nada a migrar. */
export function shiftsFromWorkSchedule(ws: unknown): MigratedShift[] {
  if (!ws || typeof ws !== 'object' || Array.isArray(ws)) return [];
  const out: MigratedShift[] = [];
  WEEKDAYS_FROM_MONDAY.forEach((day, i) => {
    const entry = (ws as Record<string, unknown>)[day];
    if (!entry || typeof entry !== 'object') return;
    const e = entry as Record<string, unknown>;
    if (e.active === false) return;
    const start = minuteOfDay(e.start);
    const end = minuteOfDay(e.end);
    if (start === null || end === null || end <= start || start > 1439) return;
    out.push({ dayOfCycle: i + 1, startMinute: start, durationMinutes: end - start });
  });
  return out;
}
