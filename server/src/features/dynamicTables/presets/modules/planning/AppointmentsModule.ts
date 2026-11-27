import type { ITableSchema } from '../../../models/DynamicTable.model';
import { endAtDateTime, notes, simpleCustomerFlag, startAtDateTime } from '../../fields';
import { customerId, resourceId, responsibleEmployeeId, serviceId, unitId } from '../../fields/relation/RelationPresets';
import { appointmentStatus } from '../../fields/select/SelectPresets';

export const appointmentsModule = {
  name: 'Appointments',
  description: 'Schedules for services, linking customer, service, professional and unit.',
  category: 'planning',
  meta: {
    requiresTables: ['services', 'customers'],
  },
  schema: {
    defaultDisplayField: 'startAt',
    fields: [
      { ...unitId, label: 'Unit' },
      { ...customerId, required: false },
      { ...simpleCustomerFlag, label: 'Simple Customer' },
      { name: 'simpleCustomerName', label: 'Customer Name', type: 'string', required: false },
      serviceId,
      { ...responsibleEmployeeId, required: false, label: 'Professional' },
      // BE-INCR-ESCALA-BASE item 26 (F-ESC-3): sala, posto ou equipamento reservado pelo agendamento.
      { ...resourceId, label: 'Resource' },
      { ...startAtDateTime, label: 'Start Date/Time' },
      { ...endAtDateTime, label: 'End Date/Time' },
      { ...appointmentStatus, label: 'Appointment Status', defaultValue: 'Scheduled' },
      notes,
      // BE-INCR-ESCALA-BASE item 25 (F-ESC-5): encaixe fora da disponibilidade, com motivo obrigatório (AppointmentsPlugin).
      { name: 'availabilityOverride', label: 'Override availability', type: 'boolean', required: false, defaultValue: false, searchable: false },
      { name: 'availabilityOverrideReason', label: 'Override reason', type: 'string', required: false, searchable: false },
    ],
    immutableAfter: [
      {
        condition: { field: 'status', op: 'in', value: ['Completed', 'No-Show', 'Cancelled'] },
        scope: ['startAt', 'endAt', 'serviceId', 'customerId', 'responsibleEmployeeId', 'unitId'],
        errorMessage: 'This appointment cannot be rescheduled or reassigned in its current status.',
      },
    ],
    lifecycle: [
      {
        field: 'status',
        transitions: {
          Scheduled: ['Completed', 'No-Show', 'Cancelled'],
          // Completed / No-Show / Cancelled are absent ⇒ terminal states.
        },
        errorMessage: 'Invalid appointment status transition.',
      },
    ],
    compare: [
      {
        left: 'endAt',
        op: 'gt',
        right: 'startAt',
        errorMessage: 'Agendamento inválido: fim deve ser após o início.',
      },
    ],
    // BE-INCR-ESCALA-BASE item 27 (F-ESC-11, F-ESC-17): conflito por pessoa (sem a unidade no escopo, a mesma pessoa
    // não fica em duas unidades ao mesmo tempo) e por recurso; o agendamento sem profissional ou sem recurso não entra
    // na regra respectiva.
    noOverlap: [
      {
        startField: 'startAt',
        endField: 'endAt',
        scopeFields: ['responsibleEmployeeId'],
        skipWhenScopeEmpty: true,
        errorMessage: 'Conflito de agenda: já existe outro compromisso nesse período.',
      },
      {
        startField: 'startAt',
        endField: 'endAt',
        scopeFields: ['resourceId'],
        skipWhenScopeEmpty: true,
        errorMessage: 'Conflito de agenda: o recurso já está reservado nesse período.',
      },
    ],
  } as ITableSchema,
};
