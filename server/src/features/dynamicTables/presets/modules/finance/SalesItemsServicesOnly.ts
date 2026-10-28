import type { ITableSchema } from '../../../models/DynamicTable.model';
import { appointmentId, responsibleEmployeeId, saleId, serviceId } from '../../fields/relation/RelationPresets';
import { description } from '../../fields/text/TextPresets';
import { unitPrice, commission, catalogUnitPrice, discountCents, custoSnapshotCents } from '../../fields/number/NumberPresets';
import { kitRef } from '../../fields/text/TextPresets';
import { principalItem } from '../../fields/boolean/BooleanPresets';

export const saleItemsServicesOnlyModule = {
  name: 'Sale Items',
  description: 'Details each service item of a sale.',
  category: 'finance',
  meta: {
    requiresTables: ['services'],
  },
  schema: {
    defaultDisplayField: 'description',
    ui: { presentation: 'embedded' },
    fields: [
      saleId,
      serviceId,
      { ...description, label: 'Description' },
      unitPrice,
      // EFICIENCIA-FISCAL PR-1 item 1 (combo itemizado, desconto por item, piso de custo, kit).
      catalogUnitPrice,
      discountCents,
      custoSnapshotCents,
      kitRef,
      principalItem,
      { name: 'requiresAppointment', label: 'Schedule now', type: 'boolean', required: false, defaultValue: false, searchable: false },
      { ...appointmentId, required: false },
      responsibleEmployeeId,
      commission,
    ],
  } as ITableSchema,
};
