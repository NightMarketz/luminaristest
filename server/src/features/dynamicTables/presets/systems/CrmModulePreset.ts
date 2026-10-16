import type { SelectablePresetSuite } from '..';
import { composeModuleTables, MODULE_KEYS } from '../modules/registry';

/**
 * @description
 * CRM Module — a **selectable** preset suite (NOT auto-installed in CoreSystemPreset).
 *
 * BE-INCR-CRM-MODULE-COMPOSITION (I8) — comportamento 4: a suíte é a COMPOSIÇÃO
 * CRM-0 (Funil) + CRM-1 (Propostas) + CRM-2A (Contas) + CRM-2B (Contatos) + CRM-3 (Oportunidades)
 * do registro de módulos (`../modules/registry.ts`) — as mesmas 8 tabelas, com os mesmos
 * schemas, que ela já instalava (prova em `__tests__/CrmModulePreset.test.ts`).
 *
 * Depends on Core infrastructure tables (`units`, `employees`) for its relations.
 */
export const CrmModulePreset: SelectablePresetSuite = {
  key: 'crmModule',
  name: 'Módulo CRM',
  description: 'CRM completo: funil de leads, propostas, atividades, contas e contatos.',
  modules: [...MODULE_KEYS],
  // W5 item 3 (F-W5-1 → b): a IA da entrevista passa a conhecer a suíte CRM (rascunho do BRIEF §3.3). A frase
  // "Inclui tabelas para: …" é lida pelo `PresetMatcher.extractTablesInfo` — manter a forma.
  aiProfile: {
    name: 'CRM (funil de vendas)',
    description:
      'Um sistema de CRM para negócios que vendem por funil — empresas de serviços B2B, consultorias, agências ou ' +
      'representantes comerciais — sem agenda de atendimentos nem catálogo de serviços. Otimizado para acompanhar o lead ' +
      'do primeiro contato até o fechamento. Inclui tabelas para: Funis de venda, Etapas do funil, Leads (com histórico ' +
      'de atividades), Propostas, Contas (empresas), Contatos e Oportunidades.',
  },
  tables: composeModuleTables(MODULE_KEYS),
};

export default CrmModulePreset;
