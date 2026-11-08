// React default import: tsconfig uses jsx:"preserve", so vitest/esbuild transforms JSX with the classic runtime.
import React from 'react';

/**
 * Peças de formulário das telas do SPED (ECD, ECF Presumido, ECF Real e o editor do Y600) — um estilo só. Saíram do
 * `SpedGenerationPanel.tsx` para o `EcfY600Editor` usá-las sem importar o painel que o monta (U7-no-circular); o painel
 * as reexporta para os importadores de antes.
 */
export const inputClass =
  'rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none disabled:opacity-50';

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-neutral-400">
      {label}
      {children}
    </label>
  );
}
