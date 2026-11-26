import type { ITableSchema } from '../../../models/DynamicTable.model';
import { scheduleId } from '../../fields/relation/RelationPresets';

/**
 * @description Core module for the "scheduleShifts" table (BE-INCR-ESCALA-BASE §3.3, F-ESC-4).
 * One shift of a schedule: day of the cycle, start in local minutes of the unit, duration (may cross midnight).
 * Rules in `SchedulesPlugin` (item 14).
 */
export const scheduleShiftsModule = {
  name: 'Schedule Shifts',
  description: 'Shifts of an availability pattern: day of cycle, local start minute and duration.',
  category: 'planning',
  schema: {
    defaultDisplayField: 'dayOfCycle',
    fields: [
      scheduleId,
      { name: 'dayOfCycle', label: 'Day of Cycle', type: 'number', numberFormat: 'integer', required: true, validation: { minValue: 1, maxValue: 56 }, searchable: false },
      {
        name: 'startMinute', label: 'Start (minutes after midnight)', type: 'number', numberFormat: 'integer', required: true,
        validation: { minValue: 0, maxValue: 1439 }, searchable: false, description: 'Local time of the unit, e.g. 540 = 09:00.',
      },
      { name: 'durationMinutes', label: 'Duration (minutes)', type: 'number', numberFormat: 'integer', required: true, validation: { minValue: 1, maxValue: 1440 }, searchable: false },
    ],
  } as ITableSchema,
};
