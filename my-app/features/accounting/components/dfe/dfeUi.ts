import type { FiscalDocumentView } from '../../../../lib/services/dfe.service';

/**
 * Resultado de um comando sobre o documento (retorno, rejeição, reenvio, cancelamento). `ok: false` só quando, depois
 * do erro, a releitura do documento (item 17) mostrou que NADA mudou — aí a mensagem do BE vai íntegra para o modal.
 */
export type CommandResult = { ok: true; doc: FiscalDocumentView } | { ok: false; message: string };

// Montado dentro do SaleDetailPanel, que tem tema claro e escuro: as classes levam as duas variantes.
export const btn =
  'inline-flex items-center gap-1 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-200 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50';
export const primaryBtn =
  'inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50';
export const dangerBtn =
  'inline-flex items-center gap-1 rounded-xl bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50';
export const input =
  'w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:border-emerald-500 focus:outline-none';
export const errorBox =
  'rounded-xl border border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-700 dark:text-red-300';
export const warnBox =
  'rounded-xl border border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-sm text-amber-800 dark:text-amber-300';
