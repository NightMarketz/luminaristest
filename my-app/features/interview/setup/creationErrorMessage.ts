/**
 * W1 item 10 — mensagem traduzida do 400 do create custom (`POST /dashboard/create`), lida de `details` do corpo
 * (`handleApiError` do servidor). `null` = sem motivo conhecido: o chamador cai no texto do servidor ou no fallback.
 * Motivos: `MODULE_PARTIAL`/`FIXED_MODULE_PARTIAL`/`DEPENDENT_MODULE_KEPT` (`applyModuleRemovals`), `TABLE_LOCKED`
 * (`assertRemovalsAllowed`), colisão de campo com módulo (`assertAddedFieldsRespectModules`, sem `reason`: só
 * `{ table, field, moduleKey }`) e `ADDED_TABLE_EXISTS`/`ADDED_TABLE_INVALID` (tabela nova da conversa).
 */
export interface CreationErrorMessage {
  key: string;
  params: Record<string, string>;
}

const REASON_KEY: Record<string, string> = {
  MODULE_PARTIAL: 'onboardingCreateErrorModulePartial',
  FIXED_MODULE_PARTIAL: 'onboardingCreateErrorFixedModulePartial',
  DEPENDENT_MODULE_KEPT: 'onboardingCreateErrorDependentModuleKept',
  TABLE_LOCKED: 'onboardingCreateErrorTableLocked',
  ADDED_TABLE_EXISTS: 'onboardingCreateErrorAddedTableExists',
  ADDED_TABLE_INVALID: 'onboardingCreateErrorAddedTableInvalid',
};

const str = (v: unknown): string => (typeof v === 'string' ? v : Array.isArray(v) ? v.filter((x) => typeof x === 'string').join(', ') : '');

export function creationErrorMessage(body: Record<string, unknown> | null): CreationErrorMessage | null {
  const details = body?.details;
  if (!details || typeof details !== 'object' || Array.isArray(details)) return null;
  const d = details as Record<string, unknown>;
  const params = {
    table: str(d.table),
    field: str(d.field),
    moduleKey: str(d.moduleKey),
    dependents: str(d.dependents),
    tables: str(d.removedTables),
  };
  const reasonKey = typeof d.reason === 'string' ? REASON_KEY[d.reason] : undefined;
  if (reasonKey) return { key: reasonKey, params };
  if (params.table && params.field && params.moduleKey) return { key: 'onboardingCreateErrorFieldDeclaredByModule', params };
  return null;
}
