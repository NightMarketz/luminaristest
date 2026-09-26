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
 */

export const MODULE_KEYS = ['CRM-0', 'CRM-1', 'CRM-2', 'CRM-3'] as const;
export const moduleKeySchema = z.enum(MODULE_KEYS);
export type ModuleKey = z.infer<typeof moduleKeySchema>;

/** Contrato §3 do BRIEF, materializado. */
export const moduleDefSchema = z
  .object({
    key: moduleKeySchema,
    category: z.literal('crm'),
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
    freeSelects: { leads: ['source'] },
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
  'CRM-2': {
    key: 'CRM-2',
    category: 'crm',
    name: { pt: 'Contas e contatos', en: 'Accounts and contacts' },
    aiDescription:
      'Empresas (contas) e pessoas (contatos) para vendas B2B; habilita converter lead em conta + contato.',
    fixed: false,
    tables: ['crmAccounts', 'crmContacts'],
    dependsOn: ['CRM-0'],
    freeSelects: { crmAccounts: ['segment', 'size'], crmContacts: ['role'] },
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
