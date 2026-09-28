import { z } from 'zod';
import type { PresetTableDefinition } from '..';
import { createTableFromModule } from '../../utils/TableFactory';
import { leadPipelinesModule } from './core/LeadPipelinesModule';
import { leadStagesModule } from './core/LeadStagesModule';
import { leadsModule } from './core/LeadsModule';
import { leadProposalsModule } from './core/LeadProposalsModule';
import { leadActivitiesModule } from './core/LeadActivitiesModule';
import { crmAccountsModule } from './crm/CrmAccountsModule';
import { crmContactsModule } from './crm/CrmContactsModule';
import { opportunitiesModule } from './crm/OpportunitiesModule';

/**
 * BE-INCR-CRM-MODULE-COMPOSITION (nó I8) — comportamento 1: registro de módulos.
 *
 * Um "módulo" é um conjunto de tabelas de preset com contrato próprio, ligável dentro de uma
 * categoria (BRIEF §1.1–1.2). CRM = CRM-0 (Funil, FIXO) + CRM-1 (Propostas) + CRM-2 (Contas e
 * contatos) + CRM-3 (Oportunidades). Forks ratificados 2026-09-07: F-CRM-3 (a) Propostas é módulo
 * próprio; F-CRM-4 (a) Contas+Contatos num módulo; F-CRM-5 (a) Oportunidades depende só de CRM-0.
 *
 * O registro é metadado de preset: não instala nada nem conhece serviço Prisma (Contrato §2.1).
 *
 * BE-INCR-CRM-SUBMODULES (docs/crm/BE-INCR-CRM-SUBMODULES-brief.md, forks ratificados 2026-09-28): CRM-2 se
 * divide em CRM-2A (Contas) + CRM-2B (Contatos) — F-CRM-4 REVERTIDO. F-SUB-5 (a): lista PLANA de módulos
 * atômicos; `group` é só UI/alias e nunca entra em dependência. F-SUB-2 (a): a chave do grupo ('CRM-2') segue
 * aceita na ENTRADA e expande para os membros; a saída só tem chaves atômicas. Regra do corte (BRIEF §2):
 * módulo não-fixo tem exatamente uma tabela (guarda em `moduleRegistry.test.ts`).
 */

export const MODULE_KEYS = ['CRM-0', 'CRM-1', 'CRM-2A', 'CRM-2B', 'CRM-3'] as const;
export const moduleKeySchema = z.enum(MODULE_KEYS);
export type ModuleKey = z.infer<typeof moduleKeySchema>;

export const MODULE_GROUP_KEYS = ['CRM-2'] as const;
export const moduleGroupKeySchema = z.enum(MODULE_GROUP_KEYS);
export type ModuleGroupKey = z.infer<typeof moduleGroupKeySchema>;

/** Entrada de seleção (`modules` do create, `moduleKey` do install): chave atômica OU chave de grupo. */
export const moduleSelectorSchema = z.union([moduleKeySchema, moduleGroupKeySchema]);
export type ModuleSelector = z.infer<typeof moduleSelectorSchema>;

/** Contrato §3 do BRIEF, materializado. */
export const moduleDefSchema = z
  .object({
    key: moduleKeySchema,
    category: z.literal('crm'),
    group: moduleGroupKeySchema.optional(),
    name: z.object({ pt: z.string().min(1), en: z.string().min(1) }).strict(),
    aiDescription: z.string().min(1),
    fixed: z.boolean(),
    tables: z.array(z.string().min(1)).min(1),
    dependsOn: z.array(moduleKeySchema),
    freeSelects: z.record(z.string(), z.array(z.string().min(1))),
  })
  .strict();
export type ModuleDef = z.infer<typeof moduleDefSchema>;

export const MODULE_REGISTRY: Readonly<Record<ModuleKey, ModuleDef>> = {
  'CRM-0': {
    key: 'CRM-0',
    category: 'crm',
    name: { pt: 'Funil', en: 'Funnel' },
    aiDescription:
      'Base do CRM: pipelines, etapas, leads e histórico de atividades (notas, reuniões, no-show). Existe CRM se e somente se existe este módulo.',
    fixed: true,
    tables: ['leadPipelines', 'leadStages', 'leads', 'leadActivities'],
    dependsOn: [],
    freeSelects: {},
  },
  'CRM-1': {
    key: 'CRM-1',
    category: 'crm',
    name: { pt: 'Propostas', en: 'Proposals' },
    aiDescription:
      'Propostas comerciais com valor e probabilidade de ganho, ligadas ao lead; habilita a etapa do tipo proposta no funil.',
    fixed: false,
    tables: ['leadProposals'],
    dependsOn: ['CRM-0'],
    freeSelects: {},
  },
  'CRM-2A': {
    key: 'CRM-2A',
    category: 'crm',
    group: 'CRM-2',
    name: { pt: 'Contas', en: 'Accounts' },
    aiDescription:
      'Empresas (contas) para vendas B2B; junto com Contatos, habilita converter lead em conta + contato.',
    fixed: false,
    tables: ['crmAccounts'],
    dependsOn: ['CRM-0'],
    // F-I8-C11 (2026-09-26): só campos JÁ `select`; `segment` (texto) ficou fora.
    freeSelects: { crmAccounts: ['size'] },
  },
  'CRM-2B': {
    key: 'CRM-2B',
    category: 'crm',
    group: 'CRM-2',
    name: { pt: 'Contatos', en: 'Contacts' },
    aiDescription:
      'Pessoas (contatos), com ou sem empresa; junto com Contas, habilita converter lead em conta + contato.',
    fixed: false,
    tables: ['crmContacts'],
    // F-SUB-3 (a): Contatos NÃO depende de Contas — `crmContacts.accountId` é opcional (descartado sem Contas,
    // restaurado por sync quando Contas chega).
    dependsOn: ['CRM-0'],
    freeSelects: { crmContacts: ['role'] },
  },
  'CRM-3': {
    key: 'CRM-3',
    category: 'crm',
    name: { pt: 'Oportunidades', en: 'Opportunities' },
    aiDescription:
      'Oportunidades de venda num segundo funil; oportunidade ganha gera conta a receber.',
    fixed: false,
    tables: ['crmOpportunities'],
    dependsOn: ['CRM-0'],
    freeSelects: {},
  },
};

/** Grupos de módulos (F-SUB-5 a): só nome de UI + membros atômicos; o alias de entrada vem daqui (F-SUB-2 a). */
export const MODULE_GROUPS: Readonly<
  Record<ModuleGroupKey, { name: { pt: string; en: string }; members: readonly ModuleKey[] }>
> = {
  'CRM-2': { name: { pt: 'Contas e contatos', en: 'Accounts and contacts' }, members: ['CRM-2A', 'CRM-2B'] },
};

/** Expande chaves de grupo em seus membros; deduplica e devolve na ordem do registro. */
export function expandModuleSelectors(selectors: readonly ModuleSelector[]): ModuleKey[] {
  const out = new Set<ModuleKey>();
  for (const s of selectors) {
    if ((MODULE_GROUP_KEYS as readonly string[]).includes(s)) {
      MODULE_GROUPS[s as ModuleGroupKey].members.forEach((m) => out.add(m));
    } else {
      out.add(s as ModuleKey);
    }
  }
  return MODULE_KEYS.filter((k) => out.has(k));
}

/** BRIEF item 11 (F-SUB-8 a): visão de um módulo exposta em `GET /dashboard/presets/:key` (`moduleViews`). */
export const presetModuleViewSchema = z
  .object({
    key: moduleKeySchema,
    group: moduleGroupKeySchema.optional(),
    name: z.object({ pt: z.string().min(1), en: z.string().min(1) }).strict(),
    fixed: z.boolean(),
    tables: z.array(z.string().min(1)).min(1),
    dependsOn: z.array(moduleKeySchema),
  })
  .strict();
export type PresetModuleView = z.infer<typeof presetModuleViewSchema>;

/** Visões dos módulos dados, na ordem do registro. */
export function presetModuleViews(keys: readonly ModuleKey[]): PresetModuleView[] {
  return MODULE_KEYS.filter((k) => keys.includes(k)).map((k) => {
    const { key, group, name, fixed, tables, dependsOn } = MODULE_REGISTRY[k];
    return {
      key,
      ...(group ? { group } : {}),
      name: { ...name },
      fixed,
      tables: [...tables],
      dependsOn: [...dependsOn],
    };
  });
}

/** Fonte de schema de cada tabela registrada (o módulo de preset que já existia). */
const TABLE_SOURCES: Readonly<Record<string, unknown>> = {
  leadPipelines: leadPipelinesModule,
  leadStages: leadStagesModule,
  leads: leadsModule,
  leadActivities: leadActivitiesModule,
  leadProposals: leadProposalsModule,
  crmAccounts: crmAccountsModule,
  crmContacts: crmContactsModule,
  crmOpportunities: opportunitiesModule,
};

/** Módulo dono de uma tabela de preset, ou `undefined` se a tabela não pertence a módulo (ex.: core). */
export function moduleOfTable(internalName: string): ModuleKey | undefined {
  return MODULE_KEYS.find((k) => MODULE_REGISTRY[k].tables.includes(internalName));
}

/** Compõe as tabelas de preset dos módulos dados, na ordem de registro e de instalação. */
export function composeModuleTables(keys: readonly ModuleKey[]): Record<string, PresetTableDefinition> {
  const tables: Record<string, PresetTableDefinition> = {};
  for (const key of MODULE_KEYS) {
    if (!keys.includes(key)) continue;
    for (const internalName of MODULE_REGISTRY[key].tables) {
      tables[internalName] = createTableFromModule(TABLE_SOURCES[internalName]);
    }
  }
  return tables;
}
