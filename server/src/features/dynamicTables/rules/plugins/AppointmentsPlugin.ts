/**
 * AppointmentsPlugin
 *
 * Enforces scheduling rules for appointments that cannot be expressed declaratively:
 * - Blocks past or overly distant bookings (compared against `now`)
 * - Ensures basic customer data (relational or simple) is present
 * - Optionally validates service duration tolerance when available
 * - Verifies appointments fit within the availability of the professional and the resource (BE-INCR-ESCALA-BASE item 24),
 *   unless the booking is an explicit override with a reason (item 25)
 * - Enforces the real-time completion rule (cannot complete before end time)
 *
 * Note: status transitions (lifecycle), end-after-start (compare) and scheduling
 * conflicts (noOverlap) are enforced declaratively by AppointmentsModule.schema, not here.
 */
import type { RulePlugin, RuleContext } from '../RuleTypes';
import { ValidationError } from '../../../../lib/errors';
import { resolveTable, tableMatches } from '../shared/tableFinder';
import { targetAvailability } from '../shared/schedulingRows';
import { isCovered, type ScheduleTarget } from '../../../scheduling/models/availability';
import { schedulingError } from '../../../scheduling/models/errors';

export const AppointmentsPlugin: RulePlugin = {
  name: 'AppointmentsPlugin',
  supports(ctx) {
    return tableMatches(ctx.table, { categories: ['planning'], internalNames: ['appointments'], names: ['Appointments'] });
  },
  async beforeCreate(ctx) { await validateAppointment(ctx, ctx.after ?? {}); },
  async beforeUpdate(ctx) {
    await validateAppointment(ctx, ctx.after ?? {}, ctx.before ?? {});
    await validateCompletionTiming(ctx, ctx.after ?? {}, ctx.before ?? {});
  },
};

/**
 * Validate appointment core fields, temporal consistency and basic coherence with optional service and employee rules.
 */
async function validateAppointment(ctx: RuleContext, after: Record<string, unknown>, before?: Record<string, unknown>) {
  const startAt = new Date((after?.startAt ?? '') as string | number | Date);
  const endAt = new Date((after?.endAt ?? '') as string | number | Date);
  if (!(isFinite(startAt.getTime()) && isFinite(endAt.getTime()))) {
    throw new ValidationError('Agendamento inválido: datas/hora são obrigatórias.');
  }
  // Note: endAt > startAt is enforced declaratively via schema.compare.
  // Restrição de datas: não permitir passado e nem mais de 5 anos no futuro (exceto se for processo de sistema)
  const now = new Date();
  const fiveYearsAhead = new Date(now.getFullYear() + 5, now.getMonth(), now.getDate());
  if (startAt < now && !ctx.isSystem) {
    throw new ValidationError('Agendamento inválido: não é permitido agendar no passado.');
  }
  if (startAt > fiveYearsAhead) {
    throw new ValidationError('Agendamento inválido: data muito distante no futuro (máx. 5 anos).');
  }

  // Optional: enforce unit/service linkage consistency
  const serviceId = String(after?.serviceId || '');
  const simpleCustomer = Boolean(after?.simpleCustomer);
  const simpleCustomerName = String(after?.simpleCustomerName || '').trim();
  const hasCustomerRelation = typeof after?.customerId === 'string' && String(after.customerId).trim().length > 0;

  // Allow either relational customerId or simple customer name
  if (!hasCustomerRelation) {
    if (!simpleCustomer || !simpleCustomerName) {
      throw new ValidationError('Agendamento inválido: informe um cliente relacional ou habilite cliente simples com nome.');
    }
  }

  // Check optional service duration if present on service table
  if (serviceId) {
    const durationOk = await validateServiceDuration(ctx, serviceId, startAt, endAt);
    if (!durationOk) {
      // Not hard error; services may not have duration defined
    }
  }

  // Note: scheduling overlap is enforced declaratively via schema.noOverlap.

  await assertOverrideReason(after);
  // Item 29: remarcar (início, fim, profissional ou recurso) passa pelo gate; mudar só o status não passa.
  if (!before || bookingChanged(after, before)) {
    await assertWithinAvailability(ctx, after, startAt, endAt);
  }
}

const BOOKING_FIELDS = ['startAt', 'endAt', 'responsibleEmployeeId', 'resourceId'] as const;

/** Valor comparável: instante vira ISO (o motor guarda Date ou string ISO), o resto vira texto. */
function comparable(v: unknown): string {
  if (v instanceof Date) return isFinite(v.getTime()) ? v.toISOString() : '';
  const text = String(v ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
    const t = Date.parse(text);
    if (isFinite(t)) return new Date(t).toISOString();
  }
  return text;
}

function bookingChanged(after: Record<string, unknown>, before: Record<string, unknown>): boolean {
  return BOOKING_FIELDS.some((f) => comparable(after[f]) !== comparable(before[f]));
}

/** Item 25 (F-ESC-5): o encaixe exige motivo. */
async function assertOverrideReason(after: Record<string, unknown>) {
  if (after.availabilityOverride !== true) return;
  if (String(after.availabilityOverrideReason ?? '').trim() === '') {
    throw schedulingError('OVERRIDE_REASON_REQUIRED', 'Encaixe fora da disponibilidade exige o motivo.', { field: 'availabilityOverrideReason' });
  }
}

/**
 * Item 24 (F-ESC-5, F-ESC-13, F-ESC-15) — o agendamento cabe na disponibilidade do profissional e do recurso na unidade,
 * no fuso da unidade. Alvo sem padrão vivo não restringe. Escrita de sistema e encaixe (item 25) ficam fora do gate.
 */
async function assertWithinAvailability(ctx: RuleContext, after: Record<string, unknown>, startAt: Date, endAt: Date) {
  if (ctx.isSystem || after.availabilityOverride === true) return;
  const unitId = String(after.unitId ?? '').trim() || null;
  const interval = { start: startAt.getTime(), end: endAt.getTime() };
  const targets: Array<{ target: ScheduleTarget; field: string; id: string }> = [];
  const employeeId = String(after.responsibleEmployeeId ?? '').trim();
  const resourceId = String(after.resourceId ?? '').trim();
  if (employeeId) targets.push({ target: { employeeId }, field: 'responsibleEmployeeId', id: employeeId });
  if (resourceId) targets.push({ target: { resourceId }, field: 'resourceId', id: resourceId });
  for (const t of targets) {
    const available = await targetAvailability(ctx, t.target, unitId, interval);
    if (available !== null && !isCovered(available, interval)) {
      throw schedulingError('OUTSIDE_AVAILABILITY', 'Fora da disponibilidade do profissional ou do recurso.', {
        target: t.field,
        targetId: t.id,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      });
    }
  }
}

/**
 * When services define a duration, check if the appointment duration is within a small tolerance (±5 min).
 */
async function validateServiceDuration(ctx: RuleContext, serviceId: string, startAt: Date, endAt: Date): Promise<boolean> {
  const serviceTable = await findTableByName(ctx, 'services', 'services', 'services', 'Services');
  if (!serviceTable) return true;
  const srv = await ctx.repository.findDataById(String(serviceId));
  const durationMin = Number((srv?.data as Record<string, unknown>)?.duration || 0);
  if (!durationMin) return true;
  const diffMin = Math.round((endAt.getTime() - startAt.getTime()) / 60000);
  return Math.abs(diffMin - durationMin) <= 5; // allow 5 min tolerance
}

/**
 * Real-time check that cannot be expressed declaratively: an appointment may only be marked
 * `Completed` once its end time has passed.
 *
 * Allowed status transitions themselves (Scheduled -> Completed | No-Show | Cancelled; terminal
 * states) and the validity of status values are now enforced declaratively by
 * AppointmentsModule.schema.lifecycle and the field's `options`.
 */
async function validateCompletionTiming(ctx: RuleContext, after: Record<string, unknown>, before?: Record<string, unknown>) {
  const prev = String(before?.status || 'Scheduled');
  const next = String(after?.status || prev);
  if (prev === next) return;
  if (next === 'Completed' && !ctx.isSystem) {
    // Completion must be in the past or present.
    const endAt = new Date(((after?.endAt ?? before?.endAt) ?? '') as string | number | Date);
    if (!isFinite(endAt.getTime()) || endAt > new Date()) {
      throw new ValidationError('Não é possível concluir um agendamento que ainda não terminou.');
    }
  }
}

/** Locate a table by category and stable internalName (with name-based fallbacks). */
async function findTableByName(ctx: RuleContext, category: string, internalName: string, nameA: string, nameB?: string): Promise<{ id: string } | null> {
  const t = await resolveTable(ctx, {
    internalName,
    category,
    names: nameB ? [nameA, nameB] : [nameA],
  });
  return t ? { id: t.id } : null;
}


