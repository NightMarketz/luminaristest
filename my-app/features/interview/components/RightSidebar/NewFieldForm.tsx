import React from 'react';
import { useTranslation } from 'next-i18next';
import { ITableField } from '../../types/RightSidebarTypes';

interface NewFieldFormProps {
  newField: ITableField;
  setNewField: React.Dispatch<React.SetStateAction<ITableField>>;
  onAddField: () => void;
  onCancel: () => void;
}

/**
 * Componente de formulário para adição de novo campo
 */
function NewFieldForm({ newField, setNewField, onAddField, onCancel }: NewFieldFormProps) {
  const { t } = useTranslation('common');
  return (
    <div className="bg-white dark:bg-neutral-700 p-4 rounded-2xl shadow mb-4">
      <h4 className="text-lg font-medium text-neutral-900 dark:text-white mb-3">
        {t('onboardingFieldsAddNewField')}
      </h4>
      
      <div className="space-y-3">
        <div>
          <label 
            htmlFor="field-name" 
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >
            {t('onboardingFieldsTechName')}
          </label>
          <input
            id="field-name"
            type="text"
            value={newField.name}
            onChange={(e) => setNewField({ ...newField, name: e.target.value })}
            placeholder={t('onboardingFieldsTechNamePlaceholder')}
            className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:border-neutral-600 dark:text-white"
          />
        </div>
        
        <div>
          <label 
            htmlFor="field-label" 
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >
            {t('onboardingFieldsLabel')}
          </label>
          <input
            id="field-label"
            type="text"
            value={newField.label}
            onChange={(e) => setNewField({ ...newField, label: e.target.value })}
            placeholder={t('onboardingFieldsLabelPlaceholder')}
            className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:border-neutral-600 dark:text-white"
          />
        </div>
        
        <div>
          <label 
            htmlFor="field-type" 
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >
            {t('onboardingFieldsType')}
          </label>
          <select
            id="field-type"
            value={newField.type}
            onChange={(e) => setNewField({ ...newField, type: e.target.value })}
            className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:border-neutral-600 dark:text-white"
          >
            <option value="string">{t('onboardingFieldsType_string')}</option>
            <option value="number">{t('onboardingFieldsType_number')}</option>
            <option value="boolean">{t('onboardingFieldsType_boolean')}</option>
            <option value="date">{t('onboardingFieldsType_date')}</option>
            <option value="datetime">{t('onboardingFieldsType_datetime')}</option>
            <option value="email">{t('onboardingFieldsType_email')}</option>
            <option value="phone">{t('onboardingFieldsType_phone')}</option>
          </select>
        </div>
        
        <div className="flex items-center">
          <input
            id="field-required"
            type="checkbox"
            checked={newField.required}
            onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
            className="w-4 h-4 text-blue-600 bg-neutral-100 border-neutral-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-neutral-800 dark:focus:ring-offset-neutral-800 focus:ring-2 dark:bg-neutral-700 dark:border-neutral-600"
          />
          <label 
            htmlFor="field-required"
            className="ml-2 text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            {t('onboardingFieldsRequired')}
          </label>
        </div>
        
        <div className="flex justify-end space-x-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-200 rounded-md hover:bg-neutral-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-500 dark:bg-neutral-600 dark:text-white dark:hover:bg-neutral-500"
          >
            {t('onboardingFieldsCancel')}
          </button>
          <button
            type="button"
            onClick={onAddField}
            disabled={!newField.name || !newField.label}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {t('onboardingFieldsAdd')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default NewFieldForm;
