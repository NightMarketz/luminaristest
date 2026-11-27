import type { RuleContext } from '../../RuleTypes';
import { ValidationError } from '../../../../../lib/errors';
import { resolveTable } from '../../shared/tableFinder';
import { targetAvailability, unitTimeZone } from '../../shared/schedulingRows';
import { freeSlots, isCovered, localDay, localMinuteToInstant, type Interval } from '../../../../scheduling/models/availability';
import { addDays } from '../../../../scheduling/models/cycle';

/** BE-INCR-ESCALA-BASE item 28 (F-ESC-16): motivo gravado no encaixe automático da venda. */
export const AUTO_FROM_SALE = 'AUTO_FROM_SALE';
const AUTO_SLOT_STEP_MINUTES = 15;

const overlaps = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end;

/**
 * Item 28 (F-ESC-16) — onde gravar o agendamento automático. O horário proposto vale se cabe na escala do profissional
 * (a mesma função pura do gate, item 24) e não colide com outro agendamento `Scheduled` dele. Senão, o primeiro horário
 * livre do mesmo dia local da unidade, a partir do proposto. Sem nenhum, grava o proposto como encaixe `AUTO_FROM_SALE`:
 * a venda não falha por causa da escala.
 */
export async function placeAutoAppointment(
  ctx: RuleContext,
  apptTableId: string,
  i: { unitId: string; employeeId?: string; proposed: Interval },
): Promise<{ slot: Interval; override: boolean }> {
  if (!i.employeeId) return { slot: i.proposed, override: false };
  const tz = await unitTimeZone(ctx, i.unitId);
  const dayEnd = localMinuteToInstant(addDays(localDay(i.proposed.start, tz), 1), 0, tz);
  const searchRange = { start: i.proposed.start, end: Math.max(dayEnd, i.proposed.end) };
  const available = (await targetAvailability(ctx, { employeeId: i.employeeId }, i.unitId, searchRange)) ?? [searchRange];
  const busy = (await ctx.repository.findRowsByFieldValue(apptTableId, 'responsibleEmployeeId', i.employeeId))
    .map((r) => (r.data ?? {}) as Record<string, unknown>)
    .filter((d) => String(d.status ?? '') === 'Scheduled')
    .map((d) => ({ start: new Date(d.startAt as string).getTime(), end: new Date(d.endAt as string).getTime() }))
    .filter((b) => isFinite(b.start) && isFinite(b.end));
  if (isCovered(available, i.proposed) && !busy.some((b) => overlaps(b, i.proposed))) return { slot: i.proposed, override: false };
  const durationMinutes = Math.round((i.proposed.end - i.proposed.start) / 60000);
  const first = freeSlots(available, busy, durationMinutes, AUTO_SLOT_STEP_MINUTES)[0];
  return first ? { slot: first, override: false } : { slot: i.proposed, override: true };
}

/** Resolve Appointments table id if present (indexed-first). */
async function findAppointmentsTable(ctx: RuleContext): Promise<string | null> {
  const t = await resolveTable(ctx, {
    internalName: 'appointments',
    category: 'planning',
    names: ['Appointments', 'Agendamentos'],
  });
  return t?.id || null;
}

/**
 * For service items, require that linked appointments are Completed or No-Show when finalizing a sale.
 */
export async function assertServiceAppointmentsReady(ctx: RuleContext, items: Array<{ id: string; data: Record<string, unknown> }>) {
  const apptTable = await findAppointmentsTable(ctx);
  if (!apptTable) return; // no scheduling in system
  for (const it of items) {
    const isService = (it.data?.type ? String(it.data.type) === 'Service' : !!it.data?.serviceId);
    if (!isService) continue;
    const apptId = String(it.data?.appointmentId || '');
    const requires = Boolean(it.data?.requiresAppointment);
    if (!apptId) {
      if (requires) {
        throw new ValidationError('Serviço com agendamento obrigatório deve conter appointmentId.');
      }
      continue; // Optional appointment: if absent and not required, skip validation
    }
    const appt = await ctx.repository.findDataById(apptId);
    const status = String((appt?.data as Record<string, unknown>)?.status || '');
    if (!(status === 'Completed' || status === 'No-Show')) {
      throw new ValidationError('Agendamento do serviço deve estar "Completed" ou "No-Show" para finalizar a venda.');
    }
  }
}

/** Ensure the linked appointment matches service/employee/unit when required by item. */
export async function validateServiceAppointmentCoherence(ctx: RuleContext, itemData: Record<string, unknown>, saleUnitId: string) {
  const apptTableId = await findAppointmentsTable(ctx);
  if (!apptTableId) return;
  const apptId = String(itemData?.appointmentId || '');
  if (!apptId) throw new ValidationError('Serviço requer um agendamento válido (appointmentId).');
  const appt = await ctx.repository.findDataById(apptId);
  if (!appt) throw new ValidationError('Agendamento não encontrado para o appointmentId informado.');
  const a = (appt.data || {}) as Record<string, unknown>;
  const svcOk = !itemData?.serviceId || String(a.serviceId || '') === String(itemData.serviceId || '');
  const empOk = !itemData?.responsibleEmployeeId || String(a.responsibleEmployeeId || '') === String(itemData.responsibleEmployeeId || '');
  const unitOk = !saleUnitId || String(a.unitId || '') === String(saleUnitId || '');
  if (!svcOk) throw new ValidationError('Agendamento não corresponde ao serviço informado.');
  if (!empOk) throw new ValidationError('Agendamento não corresponde ao responsável informado.');
  if (!unitOk) throw new ValidationError('Agendamento pertence a outra unidade da venda.');
}

export async function cancelLinkedAppointmentsIfScheduled(ctx: RuleContext, items: Array<{ id: string; data: Record<string, unknown> }>) {
  const apptTableId = await findAppointmentsTable(ctx);
  if (!apptTableId) return;
  for (const it of items) {
    const isService = (it.data?.type ? String(it.data.type) === 'Service' : !!it.data?.serviceId);
    if (!isService) continue;
    const apptId = String(it.data?.appointmentId || '');
    if (!apptId) continue;
    const appt = await ctx.repository.findDataById(apptId);
    if (!appt) continue;
    const status = String((appt?.data as Record<string, unknown>)?.status || '');
    if (status === 'Scheduled') {
      const currentData = (appt?.data as Record<string, unknown>) || {};
      await ctx.repository.updateData(apptId, Object.assign({}, currentData, { status: 'Cancelled' }));
    }
  }
}

/**
 * Cria automaticamente um agendamento para um item de serviço que exige agendamento.
 * - Usa unidade e cliente da venda
 * - Agenda em futuro próximo (para respeitar AppointmentsPlugin: sem passado, máx. 5 anos)
 * - Mantém status 'Scheduled' para que o fluxo real possa concluir depois
 */
export async function autoCreateAppointmentForServiceItem(
  ctx: RuleContext,
  itemData: Record<string, unknown>,
  saleUnitId: string,
  sale: { id: string; data: Record<string, unknown> } | null
): Promise<string> {
  const apptTableId = await findAppointmentsTable(ctx);
  if (!apptTableId) {
    throw new ValidationError('Tabela de agendamentos (Appointments) não encontrada para criação automática.');
  }

  const saleData = (sale?.data as Record<string, unknown>) ?? {};
  const unitId = saleUnitId || String(saleData.unitId || '');
  if (!unitId) {
    throw new ValidationError('Não foi possível determinar a unidade da venda para criar o agendamento.');
  }

  // Cliente: aproveita o cliente simples da venda, se existir; caso contrário, cria um nome genérico
  const hasCustomerRelation = typeof saleData.customerId === 'string' && String(saleData.customerId).trim().length > 0;
  const customerId = hasCustomerRelation ? String(saleData.customerId).trim() : undefined;
  const simpleCustomer = hasCustomerRelation ? false : true;
  const simpleCustomerName = String(
    saleData.simpleCustomerName ||
    (simpleCustomer ? `Cliente Venda ${String(sale?.id || '')}` : '')
  ).trim();

  const serviceId = String(itemData?.serviceId || '');
  if (!serviceId) {
    throw new ValidationError('Item de serviço requer um serviceId para criação automática de agendamento.');
  }

  const responsibleEmployeeId = itemData?.responsibleEmployeeId
    ? String(itemData.responsibleEmployeeId)
    : undefined;

  // Agenda 1 hora à frente com duração padrão de 60 minutos
  const now = new Date();
  const start = new Date(now.getTime() + 60 * 60 * 1000);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const placed = await placeAutoAppointment(ctx, apptTableId, {
    unitId,
    employeeId: responsibleEmployeeId,
    proposed: { start: start.getTime(), end: end.getTime() },
  });

  const payload: Record<string, unknown> = {
    unitId,
    serviceId,
    responsibleEmployeeId,
    customerId,
    simpleCustomer,
    simpleCustomerName,
    startAt: new Date(placed.slot.start).toISOString(),
    endAt: new Date(placed.slot.end).toISOString(),
    status: 'Scheduled',
    ...(placed.override ? { availabilityOverride: true, availabilityOverrideReason: AUTO_FROM_SALE } : {}),
  };

  const created = await ctx.repository.createData(apptTableId, payload);
  const id = (created as Record<string, unknown>)?.id || created;
  if (!id) {
    throw new ValidationError('Falha ao criar agendamento automático para o serviço.');
  }
  return String(id);
}
