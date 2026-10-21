import React from 'react';
import { useTranslation } from 'next-i18next';
import { ITableField } from '../../types/RightSidebarTypes';

interface FieldItemProps {
  field: ITableField;
  index: number;
  onToggleVisibility: (index: number) => void;
}

/**
 * Componente responsável por renderizar um campo da tabela no painel lateral
 */
function FieldItem({ field, index, onToggleVisibility }: FieldItemProps) {
  const { t } = useTranslation('common');
  return (
    <div className="p-3 bg-neutral-100 dark:bg-neutral-700 rounded-2xl">
      <div className="flex justify-between items-center mb-2">
        <h5 className="font-medium text-neutral-900 dark:text-white">{field.label}</h5>
        <div className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 py-0.5 px-2 rounded">
          {field.format ?? field.type}
        </div>
      </div>
      
      <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">
        {field.name}
        {field.required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </div>
      
      <div className="flex items-center">
        <input
          id={`visible-field-${index}`}
          type="checkbox"
          checked={!field.hidden}
          // Revisão do #786 (dono, 21/10): campo obrigatório não se esconde (o servidor recusa com required_hidden).
          disabled={Boolean(field.required) && !field.hidden}
          onChange={() => onToggleVisibility(index)}
          className="w-4 h-4 text-blue-600 bg-neutral-100 border-neutral-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-neutral-800 dark:focus:ring-offset-neutral-800 focus:ring-2 dark:bg-neutral-700 dark:border-neutral-600"
        />
        <label 
          htmlFor={`visible-field-${index}`}
          className="ml-2 text-sm font-medium text-neutral-900 dark:text-neutral-300 cursor-pointer"
        >
          {t('onboardingFieldsVisible')}
        </label>
      </div>
    </div>
  );
}

export default FieldItem;
