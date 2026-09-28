/**
 * BE-INCR-CRM-MODULE-COMPOSITION (I8), comportamento 9 — a navegação do CRM decide por MÓDULO instalado.
 *
 * Espelho das tabelas por módulo do registro do servidor
 * (`server/src/features/dynamicTables/presets/modules/registry.ts`). O front não importa código do servidor;
 * se o registro mudar, este mapa muda no mesmo PR.
 */
export type CrmModuleKey = 'CRM-0' | 'CRM-1' | 'CRM-2' | 'CRM-3';

export const CRM_MODULE_TABLES: Readonly<Record<CrmModuleKey, readonly string[]>> = {
  'CRM-0': ['leadPipelines', 'leadStages', 'leads', 'leadActivities'],
  'CRM-1': ['leadProposals'],
  'CRM-2': ['crmAccounts', 'crmContacts'],
  'CRM-3': ['crmOpportunities'],
};

/** Um módulo está instalado quando TODAS as suas tabelas existem para o tenant. */
export function installedCrmModules(internalNames: readonly (string | null | undefined)[]): Set<CrmModuleKey> {
  const present = new Set(internalNames.filter((n): n is string => Boolean(n)));
  const out = new Set<CrmModuleKey>();
  for (const [key, tables] of Object.entries(CRM_MODULE_TABLES) as [CrmModuleKey, readonly string[]][]) {
    if (tables.every((t) => present.has(t))) out.add(key);
  }
  return out;
}
