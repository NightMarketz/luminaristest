import React from 'react';

export type ButtonVariant = 'primary' | 'secondary';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 disabled:bg-blue-400',
  secondary:
    'bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 focus:ring-neutral-400 disabled:opacity-60',
};

/**
 * Botão canônico de `components/ui` (dono, 20/10/2026, W6 item 18). `type="button"` por padrão — dentro de um
 * `<form>` ele não submete sem pedir.
 */
export function Button({ variant = 'primary', type = 'button', className = '', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`.trim()}
      {...props}
    />
  );
}
