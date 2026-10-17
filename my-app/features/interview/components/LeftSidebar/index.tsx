import React from 'react';
import { useTranslation } from 'next-i18next';
import { ITable, ITableField } from '../../types/InterviewTypes';

interface ICustomizationState {
  presetKey: string;
  presetName: string;
  tables: ITable[];
}

interface LeftSidebarProps {
  customizationState: ICustomizationState | null;
  isVisible: boolean;
  onSelectTable?: (table: ITable) => void;
  selectedTableName?: string;
}

function LeftSidebar({ customizationState, isVisible, onSelectTable, selectedTableName }: LeftSidebarProps) {
  const { t } = useTranslation('common');
  if (!customizationState) return null;

  // Componente para renderizar uma tabela no painel de customização
  function TableItem({ table }: { table: ITable }) {
    const isSelected = table.name === selectedTableName;

    return (
      <div
        className={`mb-3 p-3 ${isSelected ? 'bg-blue-50 dark:bg-blue-900' : 'bg-neutral-100 dark:bg-neutral-700'} rounded-lg cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors duration-200`}
        onClick={() => onSelectTable && onSelectTable(table)}
      >
        <div className="flex justify-between items-start mb-1">
          <h3 className={`font-semibold ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-900 dark:text-white'}`}>
            {table.name}
          </h3>
          {table.isCore && (
            <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full">
              {t('onboardingFeaturesPanelCore')}
            </span>
          )}
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-2">{table.description}</p>
        {table.fields && table.fields.length > 0 && (
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            <span className="font-medium">{t('onboardingFeaturesPanelFields')}</span>
            {table.fields
              .filter(f => !f.hidden)
              .slice(0, 3)
              .map(f => f.label)
              .join(', ')}
            {table.fields.length > 3 && t('onboardingFeaturesPanelMore', { count: table.fields.length - 3 })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`fixed left-0 top-0 h-full z-50 transition-transform duration-300 ease-in-out ${isVisible ? 'translate-x-0' : '-translate-x-full'}`}
      style={{ width: '400px' }}
    >
      <div className="bg-white dark:bg-neutral-800 h-full shadow-2xl flex flex-col border-r border-neutral-200 dark:border-neutral-700">
        {/* Cabeçalho Fixo */}
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
              {t('onboardingFeaturesPanelTitle')}
            </h3>
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {t('onboardingFeaturesPanelSystem')} <span className="font-semibold">{customizationState.presetName}</span>
          </p>
        </div>

        {/* Container com Scroll */}
        <div className="flex-grow overflow-y-auto p-6">
          <div className="space-y-4">
            {customizationState.tables.map((table, index) => (
              <TableItem key={index} table={table} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LeftSidebar;
