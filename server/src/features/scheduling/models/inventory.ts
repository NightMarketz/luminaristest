/**
 * BE-INCR-ESCALA-BASE item 21 (F-ESC-11, F-ESC-12) — inventário antes de a agenda mudar de comportamento (somente
 * leitura). Por instância, conta:
 *  (a) funcionários com `workSchedule`;
 *  (b) dias `active: false` que têm horário (a agenda de hoje os aceita como dia de trabalho);
 *  (c) funcionários com escala e sem unidade;
 *  (d) pares de agendamentos vivos `Scheduled` da mesma pessoa que se sobrepõem em unidades diferentes;
 *  (e) agendamentos vivos sem profissional.
 */
export interface InventoryRow {
  id: string;
  data: Record<string, unknown>;
}

export interface InventoryCounts {
  employeesWithWorkSchedule: number;
  inactiveDaysWithHours: number;
  employeesWithScheduleWithoutUnit: number;
  crossUnitOverlappingPairs: number;
  appointmentsWithoutProfessional: number;
}

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function hasHours(d: Record<string, unknown> | undefined): boolean {
  return !!d && String(d.start ?? '').trim() !== '' && String(d.end ?? '').trim() !== '';
}

/** O `workSchedule` tem conteúdo (pelo menos um dia com horário)? */
export function hasWorkSchedule(ws: unknown): boolean {
  if (!ws || typeof ws !== 'object') return false;
  return DAYS.some((d) => hasHours((ws as Record<string, Record<string, unknown> | undefined>)[d]));
}

export function inventoryOf(employees: InventoryRow[], appointments: InventoryRow[]): InventoryCounts {
  let employeesWithWorkSchedule = 0;
  let inactiveDaysWithHours = 0;
  let employeesWithScheduleWithoutUnit = 0;
  for (const e of employees) {
    const ws = e.data.workSchedule;
    if (!hasWorkSchedule(ws)) continue;
    employeesWithWorkSchedule++;
    for (const d of DAYS) {
      const day = (ws as Record<string, Record<string, unknown> | undefined>)[d];
      if (day && day.active === false && hasHours(day)) inactiveDaysWithHours++;
    }
    if (String(e.data.unitId ?? '').trim() === '') employeesWithScheduleWithoutUnit++;
  }

  const live = appointments.filter((a) => String(a.data.status ?? 'Scheduled') === 'Scheduled');
  const appointmentsWithoutProfessional = appointments.filter((a) => String(a.data.responsibleEmployeeId ?? '').trim() === '').length;
  let crossUnitOverlappingPairs = 0;
  const byPerson = new Map<string, Array<{ unit: string; start: number; end: number }>>();
  for (const a of live) {
    const p = String(a.data.responsibleEmployeeId ?? '').trim();
    const start = Date.parse(String(a.data.startAt ?? ''));
    const end = Date.parse(String(a.data.endAt ?? ''));
    if (!p || !Number.isFinite(start) || !Number.isFinite(end)) continue;
    const list = byPerson.get(p) ?? [];
    list.push({ unit: String(a.data.unitId ?? ''), start, end });
    byPerson.set(p, list);
  }
  for (const list of byPerson.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const x = list[i];
        const y = list[j];
        if (x.unit !== y.unit && x.start < y.end && y.start < x.end) crossUnitOverlappingPairs++;
      }
    }
  }
  return { employeesWithWorkSchedule, inactiveDaysWithHours, employeesWithScheduleWithoutUnit, crossUnitOverlappingPairs, appointmentsWithoutProfessional };
}
