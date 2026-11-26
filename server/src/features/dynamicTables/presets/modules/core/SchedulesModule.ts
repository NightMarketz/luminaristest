import type { ITableSchema } from '../../../models/DynamicTable.model';
import { notes } from '../../fields';
import { responsibleEmployeeId, resourceId, unitId } from '../../fields/relation/RelationPresets';

/**
 * @description Core module for the "schedules" table (BE-INCR-ESCALA-BASE §3.3, F-ESC-1..4, F-ESC-10).
 * Availability pattern of ONE target (person XOR resource) in one unit (or any unit when empty), with validity and an
 * N-day cycle anchored on a date. Rules in `SchedulesPlugin` (items 7, 13). Deleting a schedule deletes its shifts.
 */
export const schedulesModule = {
  name: 'Schedules',
  description: 'Availability patterns (N-day cycle) of a person or a resource.',
  category: 'planning',
  schema: {
    defaultDisplayField: 'validFrom',
    fields: [
      { ...responsibleEmployeeId, name: 'employeeId', label: 'Employee', description: 'Person this schedule belongs to (or set a resource).' },
      { ...resourceId, label: 'Resource' },
      { ...unitId, required: false, label: 'Unit', description: 'Empty = valid in any unit.' },
      {
        name: 'cycleLengthDays', label: 'Cycle Length (days)', type: 'number', numberFormat: 'integer', required: true,
        defaultValue: 7, validation: { minValue: 1, maxValue: 56 }, searchable: false,
      },
      { name: 'cycleAnchorDate', label: 'Cycle Anchor Date', type: 'date', required: true, searchable: false, description: 'Day 1 of the cycle.' },
      { name: 'validFrom', label: 'Valid From', type: 'date', required: true, searchable: false },
      { name: 'validTo', label: 'Valid To', type: 'date', required: false, searchable: false, description: 'Inclusive; empty = no end.' },
      { name: 'origin', label: 'Origin', type: 'select', options: ['DECLARED', 'ASSIGNED'], defaultValue: 'DECLARED', required: false },
      { name: 'migratedFrom', label: 'Migrated From', type: 'string', required: false, searchable: false },
      { ...notes, validation: { maxLength: 500 } },
    ],
    deleteConstraints: [
      { type: 'CASCADE', targetTable: '@@PRESET_TABLE_KEY::scheduleShifts', cascadeCondition: 'ALWAYS' },
    ],
  } as ITableSchema,
};
