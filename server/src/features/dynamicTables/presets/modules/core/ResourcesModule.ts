import type { ITableSchema } from '../../../models/DynamicTable.model';
import { isActive } from '../../fields/boolean/BooleanPresets';
import { unitId } from '../../fields/relation/RelationPresets';

/** Tipos iniciais de recurso; o usuário acrescenta os dele na tabela (opções livres). */
export const RESOURCE_KIND_OPTIONS = ['Room', 'Station', 'Equipment', 'Other'] as const;

/**
 * @description Core module for the "resources" table (BE-INCR-ESCALA-BASE §3.3, F-ESC-3).
 * Schedulable thing that is not a person: room, chair, box, equipment. Target of a schedule and, optionally, of an
 * appointment. Deleting a resource that still has a schedule is refused (RESTRICT).
 */
export const resourcesModule = {
  name: 'Resources',
  description: 'Schedulable resources that are not people — rooms, stations, equipment.',
  category: 'planning',
  schema: {
    defaultDisplayField: 'name',
    fields: [
      { name: 'name', label: 'Name', type: 'string', required: true, validation: { maxLength: 120 } },
      { name: 'kind', label: 'Kind', type: 'select', options: [...RESOURCE_KIND_OPTIONS], required: true },
      { ...unitId, required: false, label: 'Unit' },
      { ...isActive, label: 'Active' },
    ],
    deleteConstraints: [
      {
        type: 'RESTRICT',
        targetTable: '@@PRESET_TABLE_KEY::schedules',
        errorMessage: 'Cannot delete this resource: it still has a schedule. Delete the schedule first.',
      },
    ],
  } as ITableSchema,
};
