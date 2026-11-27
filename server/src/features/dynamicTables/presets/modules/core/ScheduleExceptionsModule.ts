import type { ITableSchema } from '../../../models/DynamicTable.model';
import { endAtDateTime, startAtDateTime } from '../../fields';
import { responsibleEmployeeId, resourceId, unitId } from '../../fields/relation/RelationPresets';

/**
 * @description Core module for the "scheduleExceptions" table (BE-INCR-ESCALA-BASE §3.3, F-ESC-6, F-ESC-7).
 * Day off, block, absence, holiday or extra time in an interval — of a person, a resource or the whole unit (no target).
 * `origin` USER is typed by the user; HOLIDAY_CALENDAR and HR are projections written by the system, keyed by
 * (`sourceType`, `sourceId`). A HOLIDAY_CALENDAR row is turned off (`disabled`), never deleted (F-ESC-23). Rules in
 * `SchedulesPlugin` (item 15).
 */
export const scheduleExceptionsModule = {
  name: 'Schedule Exceptions',
  description: 'Days off, blocks, absences, holidays and extra time on top of the schedules.',
  category: 'planning',
  schema: {
    defaultDisplayField: 'startAt',
    fields: [
      { ...responsibleEmployeeId, name: 'employeeId', label: 'Employee', description: 'Empty (and no resource) = the whole unit.' },
      { ...resourceId, label: 'Resource' },
      { ...unitId, label: 'Unit' },
      { name: 'kind', label: 'Kind', type: 'select', options: ['DAY_OFF', 'BLOCK', 'ABSENCE', 'HOLIDAY', 'EXTRA'], required: true },
      { name: 'origin', label: 'Origin', type: 'select', options: ['USER', 'HOLIDAY_CALENDAR', 'HR'], defaultValue: 'USER', required: false },
      { ...startAtDateTime, label: 'Start' },
      { ...endAtDateTime, label: 'End' },
      { name: 'reason', label: 'Reason', type: 'string', required: false, validation: { maxLength: 300 } },
      { name: 'sourceType', label: 'Source Type', type: 'select', options: ['HOLIDAY', 'DP_ABSENCE'], required: false, searchable: false },
      { name: 'sourceId', label: 'Source Id', type: 'string', required: false, searchable: false },
      {
        name: 'disabled',
        label: 'Disabled',
        type: 'boolean',
        required: false,
        defaultValue: false,
        searchable: false,
        description: 'A calendar holiday the user opened: it stays (the sync does not recreate it) and blocks nothing.',
      },
    ],
  } as ITableSchema,
};
