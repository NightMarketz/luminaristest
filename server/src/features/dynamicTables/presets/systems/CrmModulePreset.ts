import type { PresetSuite } from '..';
import { composeModuleTables, MODULE_KEYS } from '../modules/registry';

/**
 * @description
 * CRM Module — a **selectable** preset suite (NOT auto-installed in CoreSystemPreset).
 *
 * BE-INCR-CRM-MODULE-COMPOSITION (I8) — comportamento 4: a suíte é a COMPOSIÇÃO
 * CRM-0 (Funil) + CRM-1 (Propostas) + CRM-2 (Contas e contatos) + CRM-3 (Oportunidades)
 * do registro de módulos (`../modules/registry.ts`) — as mesmas 8 tabelas, com os mesmos
 * schemas, que ela já instalava (prova em `__tests__/CrmModulePreset.test.ts`).
 *
 * Depends on Core infrastructure tables (`units`, `employees`) for its relations.
 */
export const CrmModulePreset: PresetSuite = {
  key: 'crmModule',
  name: 'Módulo CRM',
  description: 'CRM completo: funil de leads, propostas, atividades, contas e contatos.',
  tables: composeModuleTables(MODULE_KEYS),
};

export default CrmModulePreset;
