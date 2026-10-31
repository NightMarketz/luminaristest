import { z } from 'zod';
import type { PresetSuite, PresetTableDefinition } from '..';
import { createTableFromModule, lockedByAccounting } from '../../utils/TableFactory';
import { leadPipelinesModule } from './core/LeadPipelinesModule';
import { leadStagesModule } from './core/LeadStagesModule';
import { leadsModule } from './core/LeadsModule';
import { leadProposalsModule } from './core/LeadProposalsModule';
import { leadActivitiesModule } from './core/LeadActivitiesModule';
import { crmAccountsModule } from './crm/CrmAccountsModule';
import { crmContactsModule } from './crm/CrmContactsModule';
import { opportunitiesModule } from './crm/OpportunitiesModule';
import { customerModule } from './people/CustomerModule';
import { suppliersModule } from './people/SuppliersModule';
import { salesModule } from './finance/SalesModule';
import { saleItemsMixedModule } from './finance/SalesItemsMixed';
import { serviceModule } from './service/ServiceModule';
import { productModule } from './product/ProductModule';
import { packageCatalogModule } from './finance/PackageCatalogModule';
import { commissionsModule } from './finance/CommissionsModule';

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
 *
 * BE-INCR-MODULOS-BASE-SUBMODULOS (docs/accounting/BE-INCR-MODULOS-BASE-SUBMODULOS-brief.md, PR-1): o registro é
 * genérico por categoria — `category` é enum, cada categoria presente tem UMA base fixa (`assertRegistryInvariants`),
 * `dependsOn` pode cruzar categorias e `requiresOneOf` exige pelo menos um módulo de cada grupo. As entradas do
 * registro continuam só as do CRM; as demais categorias entram nos PR-2..4.
 *
 * PR-2 (itens 7, 9–11): PESSOAS (PES-0 base = customers; PES-FORN = suppliers) e VENDAS (VEN-0 base = sales +
 * saleItems; VEN-SERV, VEN-PROD, VEN-PAC, VEN-COM) entram no registro; salão e clínica passam a declará-los em
 * `modules`. A suíte pode trocar a fonte de uma tabela de módulo (`moduleOverrides`, item 11a — a clínica usa a ficha
 * própria em `customers`) e travar tabelas de módulo pela contabilidade (`lockedModuleTables`, item 11b, até o PR-5
 * mover a trava para o módulo).
 */

export const MODULE_CATEGORIES = ['crm', 'pessoas', 'vendas', 'estoque', 'agenda', 'financeiro', 'gestao'] as const;
export const moduleCategorySchema = z.enum(MODULE_CATEGORIES);
export type ModuleCategory = z.infer<typeof moduleCategorySchema>;

export const MODULE_KEYS = [
  'CRM-0', 'CRM-1', 'CRM-2A', 'CRM-2B', 'CRM-3',
  'PES-0', 'PES-FORN',
  'VEN-0', 'VEN-SERV', 'VEN-PROD', 'VEN-PAC', 'VEN-COM',
] as const;
export const moduleKeySchema = z.enum(MODULE_KEYS);
export type ModuleKey = z.infer<typeof moduleKeySchema>;

/** BRIEF item 7: um grupo por categoria, com a chave da categoria em maiúsculas — só as categorias que já têm módulos. */
export const MODULE_GROUP_KEYS = ['CRM-2', 'PESSOAS', 'VENDAS'] as const;
export const moduleGroupKeySchema = z.enum(MODULE_GROUP_KEYS);
export type ModuleGroupKey = z.infer<typeof moduleGroupKeySchema>;

/** Entrada de seleção (`modules` do create, `moduleKey` do install): chave atômica OU chave de grupo. */
export const moduleSelectorSchema = z.union([moduleKeySchema, moduleGroupKeySchema]);
export type ModuleSelector = z.infer<typeof moduleSelectorSchema>;

/** Contrato §3 do BRIEF, materializado. */
export const moduleDefSchema = z
  .object({
    key: moduleKeySchema,
    category: moduleCategorySchema,
    group: moduleGroupKeySchema.optional(),
    name: z.object({ pt: z.string().min(1), en: z.string().min(1) }).strict(),
    aiDescription: z.string().min(1),
    fixed: z.boolean(),
    tables: z.array(z.string().min(1)).min(1),
    dependsOn: z.array(moduleKeySchema),
    /** Cada grupo (≥2 chaves) exige pelo menos UM módulo selecionado/mantido (BRIEF item 4). */
    requiresOneOf: z.array(z.array(moduleKeySchema).min(2)).default([]),
    freeSelects: z.record(z.string(), z.array(z.string().min(1))),
  })
  .strict();
export type ModuleDef = z.infer<typeof moduleDefSchema>;
/** Registro como as regras puras o leem (chave string: o registro de teste pode ter chaves que o real ainda não tem). */
export type ModuleRegistry = Readonly<Record<string, ModuleDef>>;

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
    requiresOneOf: [],
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
    requiresOneOf: [],
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
    requiresOneOf: [],
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
    requiresOneOf: [],
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
    requiresOneOf: [],
    freeSelects: {},
  },
  // BRIEF §1 / F-MB-1: PESSOAS é categoria própria; a base é Clientes (sem `customers` o tomador da venda vira
  // NAO_IDENTIFICADO — BRIEF §0.2, E12). F-MS-6 (a): `freeSelects` nascem vazios.
  'PES-0': {
    key: 'PES-0',
    category: 'pessoas',
    group: 'PESSOAS',
    name: { pt: 'Clientes', en: 'Customers' },
    aiDescription:
      'Base de Pessoas: cadastro de clientes com identificação fiscal, contato e histórico de compras; é o tomador das vendas.',
    fixed: true,
    tables: ['customers'],
    dependsOn: [],
    requiresOneOf: [],
    freeSelects: {},
  },
  'PES-FORN': {
    key: 'PES-FORN',
    category: 'pessoas',
    group: 'PESSOAS',
    name: { pt: 'Fornecedores', en: 'Suppliers' },
    aiDescription: 'Cadastro de fornecedores, que podem ser ligados às entradas de estoque.',
    fixed: false,
    tables: ['suppliers'],
    dependsOn: [],
    requiresOneOf: [],
    freeSelects: {},
  },
  // BRIEF §1 / F-MB-2: VENDAS = base (sales + saleItems) + catálogo por `requiresOneOf` + Comissões (F-MS-8 a).
  // `saleItems` nasce na variante mista; o instalador troca a variante pelos catálogos ligados (item 12).
  // `lockedBy` do módulo só no PR-5: até lá a trava vem de `lockedModuleTables` da suíte (item 10/11b).
  'VEN-0': {
    key: 'VEN-0',
    category: 'vendas',
    group: 'VENDAS',
    name: { pt: 'Vendas', en: 'Sales' },
    aiDescription:
      'Base de Vendas: vendas e seus itens, com pagamento, desconto e status; a venda finalizada é lançada na contabilidade.',
    fixed: true,
    tables: ['sales', 'saleItems'],
    dependsOn: ['PES-0'],
    requiresOneOf: [['VEN-SERV', 'VEN-PROD', 'VEN-PAC']],
    freeSelects: {},
  },
  'VEN-SERV': {
    key: 'VEN-SERV',
    category: 'vendas',
    group: 'VENDAS',
    name: { pt: 'Serviços', en: 'Services' },
    aiDescription: 'Catálogo de serviços com preço e duração, vendidos como item de venda e usados na agenda.',
    fixed: false,
    tables: ['services'],
    dependsOn: ['VEN-0'],
    requiresOneOf: [],
    freeSelects: {},
  },
  'VEN-PROD': {
    key: 'VEN-PROD',
    category: 'vendas',
    group: 'VENDAS',
    name: { pt: 'Produtos', en: 'Products' },
    aiDescription: 'Catálogo de produtos para revenda ou uso interno, vendidos como item de venda.',
    fixed: false,
    tables: ['products'],
    dependsOn: ['VEN-0'],
    requiresOneOf: [],
    freeSelects: {},
  },
  'VEN-PAC': {
    key: 'VEN-PAC',
    category: 'vendas',
    group: 'VENDAS',
    name: { pt: 'Pacotes', en: 'Packages' },
    aiDescription: 'Pacotes de sessões pré-pagas com validade; a venda de pacote gera passivo até o consumo.',
    fixed: false,
    tables: ['packages'],
    dependsOn: ['VEN-0'],
    requiresOneOf: [],
    freeSelects: {},
  },
  'VEN-COM': {
    key: 'VEN-COM',
    category: 'vendas',
    group: 'VENDAS',
    name: { pt: 'Comissões', en: 'Commissions' },
    aiDescription: 'Comissões por profissional calculadas sobre os itens de venda.',
    fixed: false,
    tables: ['commissions'],
    dependsOn: ['VEN-0'],
    requiresOneOf: [],
    freeSelects: {},
  },
};

/** Grupos de módulos (F-SUB-5 a): só nome de UI + membros atômicos; o alias de entrada vem daqui (F-SUB-2 a). */
export const MODULE_GROUPS: Readonly<
  Record<ModuleGroupKey, { name: { pt: string; en: string }; members: readonly ModuleKey[] }>
> = {
  'CRM-2': { name: { pt: 'Contas e contatos', en: 'Accounts and contacts' }, members: ['CRM-2A', 'CRM-2B'] },
  PESSOAS: { name: { pt: 'Pessoas', en: 'People' }, members: ['PES-0', 'PES-FORN'] },
  VENDAS: { name: { pt: 'Vendas', en: 'Sales' }, members: ['VEN-0', 'VEN-SERV', 'VEN-PROD', 'VEN-PAC', 'VEN-COM'] },
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

/**
 * Fonte de schema de cada tabela, por módulo (BRIEF item 6): `systems/*.ts` não importam de novo o mesmo módulo de
 * preset — a tabela de um módulo registrado vem sempre daqui.
 */
export const MODULE_TABLE_SOURCES: Readonly<Record<ModuleKey, Readonly<Record<string, unknown>>>> = {
  'CRM-0': {
    leadPipelines: leadPipelinesModule,
    leadStages: leadStagesModule,
    leads: leadsModule,
    leadActivities: leadActivitiesModule,
  },
  'CRM-1': { leadProposals: leadProposalsModule },
  'CRM-2A': { crmAccounts: crmAccountsModule },
  'CRM-2B': { crmContacts: crmContactsModule },
  'CRM-3': { crmOpportunities: opportunitiesModule },
  'PES-0': { customers: customerModule },
  'PES-FORN': { suppliers: suppliersModule },
  'VEN-0': { sales: salesModule, saleItems: saleItemsMixedModule },
  'VEN-SERV': { services: serviceModule },
  'VEN-PROD': { products: productModule },
  'VEN-PAC': { packages: packageCatalogModule },
  'VEN-COM': { commissions: commissionsModule },
};

/**
 * Invariantes do registro (BRIEF item 2): cada categoria PRESENTE tem exatamente um módulo fixo (a base; pode ter N
 * tabelas) e todo módulo não-fixo tem exatamente uma tabela. Lança `Error` nomeando a categoria/módulo.
 */
export function assertRegistryInvariants(registry: ModuleRegistry = MODULE_REGISTRY): void {
  const defs = Object.values(registry);
  for (const category of new Set(defs.map((d) => d.category))) {
    const bases = defs.filter((d) => d.category === category && d.fixed).map((d) => d.key);
    if (bases.length !== 1) {
      throw new Error(
        `Registro de módulos: a categoria '${category}' precisa de exatamente uma base fixa (encontradas: ${bases.length}${bases.length ? ` — ${bases.join(', ')}` : ''}).`,
      );
    }
  }
  for (const d of defs) {
    if (!d.fixed && d.tables.length !== 1) {
      throw new Error(`Registro de módulos: o módulo não-fixo '${d.key}' precisa de exatamente uma tabela (tem ${d.tables.length}).`);
    }
  }
}

/** Módulo dono de uma tabela de preset, ou `undefined` se a tabela não pertence a módulo (ex.: core). */
export function moduleOfTable(internalName: string): ModuleKey | undefined {
  return MODULE_KEYS.find((k) => MODULE_REGISTRY[k].tables.includes(internalName));
}

/**
 * Opções de composição vindas da suíte (BRIEF itens 11a/11b): `overrides` troca a fonte de schema de uma tabela de
 * módulo (internalName → módulo-fonte); `locked` marca tabelas de módulo como lidas pela contabilidade
 * (`meta.lockedBy: 'accounting'`) até o PR-5 levar a trava para o módulo. Chave que não é tabela de módulo → `Error`
 * (opção aceita e ignorada seria bug silencioso).
 */
export type ModuleCompositionOptions = {
  overrides?: Readonly<Record<string, unknown>>;
  locked?: readonly string[];
};

/** As opções de composição que uma suíte declara (`moduleOverrides`, `lockedModuleTables`). */
export function suiteModuleOptions(
  suite: Pick<PresetSuite, 'moduleOverrides' | 'lockedModuleTables'>,
): ModuleCompositionOptions {
  return { overrides: suite.moduleOverrides, locked: suite.lockedModuleTables };
}

/** Compõe as tabelas de preset dos módulos dados, na ordem de registro e de instalação. */
export function composeModuleTables(
  keys: readonly ModuleKey[],
  options: ModuleCompositionOptions = {},
): Record<string, PresetTableDefinition> {
  const overrides = options.overrides ?? {};
  const locked = new Set(options.locked ?? []);
  for (const internalName of [...Object.keys(overrides), ...locked]) {
    if (!moduleOfTable(internalName)) {
      throw new Error(`Composição de módulos: '${internalName}' não é tabela de módulo do registro (override/trava inválidos).`);
    }
  }
  const tables: Record<string, PresetTableDefinition> = {};
  for (const key of MODULE_KEYS) {
    if (!keys.includes(key)) continue;
    for (const internalName of MODULE_REGISTRY[key].tables) {
      const def = createTableFromModule(overrides[internalName] ?? MODULE_TABLE_SOURCES[key][internalName]);
      tables[internalName] = locked.has(internalName) ? lockedByAccounting(def) : def;
    }
  }
  return tables;
}
