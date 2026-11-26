import type { ITableSchema } from '../../../models/DynamicTable.model';
import { city, stateUF } from '../../fields/text/TextPresets';
import { isActive } from '../../fields/boolean/BooleanPresets';

/** Opções do campo `type` — fonte única, reusada pelo DTO de criação do onboarding (BE-INCR-ONBOARDING-FIRST-UNIT, I1). */
export const UNIT_TYPE_OPTIONS = ['Own', 'Franchise', 'Department'] as const;

/**
 * @description Core module for the "units" table.
 * Represents physical or virtual business units (stores, branches, franchises).
 */
export const unitsModule = {
  name: 'Units',
  description: 'Business units — stores, branches or franchises.',
  category: 'business',
  schema: {
    defaultDisplayField: 'name',
    fields: [
      { name: 'name',    label: 'Unit Name', type: 'string',  required: true },
      { name: 'cnpj',   label: 'CNPJ',      type: 'string',  format: 'cnpj', required: false, unique: true },
      { name: 'address', label: 'Address',   type: 'string',  required: false },
      city,
      stateUF,
      {
        name: 'managerId',
        label: 'Manager',
        type: 'relation',
        required: false,
        relation: { targetTable: '@@PRESET_TABLE_KEY::employees' },
        searchable: false,
      },
      {
        name: 'type',
        label: 'Type',
        type: 'select',
        options: [...UNIT_TYPE_OPTIONS],
        required: false,
      },
      { ...isActive, label: 'Is Active' },
      {
        // BE-INCR-ESCALA-BASE item 11 (F-ESC-13): fuso IANA da unidade, onde a escala e a agenda leem a hora local.
        // Validado por `Intl.supportedValuesOf('timeZone')` no SchedulesPlugin.
        name: 'timeZone',
        label: 'Time Zone',
        type: 'string',
        required: false,
        searchable: false,
        description: 'IANA time zone, e.g. America/Sao_Paulo.',
      },
    ],
  } as ITableSchema,
};
