'use client';

import React, { useState } from 'react';
import { HiPlus, HiX } from 'react-icons/hi';
import { DashboardLayout } from './types/dashboard-grid.types';
import { useConfirmModal } from '../../ui/feedback/useConfirmModal';

interface DashboardTabsBarProps {
  layouts: DashboardLayout[];
  activeLayoutId: string | null;
  onSwitch: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

/**
 * Tab bar for the dashboard layouts. Each tab is a layout; the user can switch,
 * create, rename (double-click) and delete tabs. Presentational only — all
 * persistence happens in the parent via the provided callbacks.
 */
export default function DashboardTabsBar({
  layouts,
  activeLayoutId,
  onSwitch,
  onCreate,
  onRename,
  onDelete,
}: DashboardTabsBarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const { confirm, confirmNode } = useConfirmModal();

  const askDelete = (layout: DashboardLayout) => {
    void confirm({
      title: 'Excluir aba',
      message: `Excluir a aba "${layout.name}" e os widgets dela? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      variant: 'danger',
      onConfirm: async () => {
        onDelete(layout.id);
      },
    });
  };

  const startEditing = (layout: DashboardLayout) => {
    setEditingId(layout.id);
    setDraftName(layout.name);
  };

  const commitRename = (id: string) => {
    const trimmed = draftName.trim();
    if (trimmed && trimmed.length >= 3) {
      onRename(id, trimmed);
    }
    setEditingId(null);
  };

  return (
    <>
    <div
      role="tablist"
      aria-label="Abas do dashboard"
      className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-neutral-900/40 overflow-x-auto custom-scrollbar"
    >
      {layouts.map((layout) => {
        const isActive = layout.id === activeLayoutId;
        const isEditing = layout.id === editingId;
        return (
          <div
            key={layout.id}
            className={`group flex items-center gap-1 px-3 py-1 rounded-md text-xs whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-white dark:bg-neutral-800 text-gray-900 dark:text-white ring-1 ring-gray-200 dark:ring-gray-700 font-semibold'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800/60'
            }`}
          >
            {isEditing ? (
              <input
                autoFocus
                aria-label="Nome da aba"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={() => commitRename(layout.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename(layout.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                className="w-24 bg-transparent outline-none border-b border-gray-400"
                maxLength={50}
              />
            ) : (
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onSwitch(layout.id)}
                onDoubleClick={() => startEditing(layout)}
                onKeyDown={(e) => {
                  if (e.key === 'F2') {
                    e.preventDefault();
                    startEditing(layout);
                  }
                }}
                title="Clique para abrir, duplo-clique ou F2 para renomear"
                className="cursor-pointer"
              >
                {layout.name}
              </button>
            )}

            {layouts.length > 1 && !isEditing && (
              <button
                type="button"
                onClick={() => askDelete(layout)}
                aria-label={`Excluir aba ${layout.name}`}
                className="inline-flex items-center justify-center w-6 h-6 rounded hover:text-red-500 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity"
                title={`Excluir aba ${layout.name}`}
              >
                <HiX className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={onCreate}
        aria-label="Nova aba"
        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800/60 transition-colors"
        title="Nova aba"
      >
        <HiPlus className="w-3.5 h-3.5" />
      </button>
    </div>
    {confirmNode}
    </>
  );
}
