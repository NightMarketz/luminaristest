import React, { useId } from 'react';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

/** Caixa de seleção canônica de `components/ui`, com rótulo clicável (dono, 20/10/2026, W6 item 18). */
export function Checkbox({ checked, onChange, label, disabled, className = '' }: CheckboxProps) {
  const id = useId();
  return (
    <div className={`flex items-start gap-2 ${className}`.trim()}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-neutral-300 dark:border-neutral-600 text-blue-600 focus:ring-blue-500"
      />
      <label htmlFor={id} className="text-sm text-neutral-700 dark:text-neutral-200">
        {label}
      </label>
    </div>
  );
}
