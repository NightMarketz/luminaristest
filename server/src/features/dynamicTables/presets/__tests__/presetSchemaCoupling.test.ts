import { tablePresetSuites } from '..';
import type { PresetTableDefinition } from '..';
import {
  buildUniverses,
  cloneTable,
  findingKey,
  hasField,
  partitionByKnownGaps,
  resolveTableRef,
  type CouplingFinding,
  knownGapsAcross,
  type KnownGap,
  type Universe,
} from './presetCouplingUniverse';

/**
 * TESTE-ACOPLAMENTO-PRESET (docs/accounting/TESTE-ACOPLAMENTO-PRESET-brief.md, forks F-TAP-1..5 ratificados em
 * D-2026-10-21-CHAT-C-FORKS) — acoplamento preset↔schema.
 *
 * Origem: ACHADOS-2026-10-19 §2.2 (a sonda das regras deu zero inconsistência, sem teste: "um typo num módulo vira
 * regra silenciosa") e §3.1 #2/#4/#17 (campo escrito por plugin fora do preset — Zod remove a chave, o teste do
 * plugin ficava verde porque a fixture inventava o nome).
 *
 * Este arquivo cobre os itens 1–4 e 6–8 do BRIEF; o item 5 (analytics) estende
 * `analyticsFieldMappingCoupling.test.ts`. Divergência real não corrigida entra em `KNOWN_GAPS` com o nó dono
 * (F-TAP-4 → a): o teste fica verde com a lista e falha se a lista tiver item que já não diverge.
 */

// --- Item 3 / F-TAP-3 → (a): relações opcionais descartadas por desenho ----------------------------------------

/**
 * `${tabela}.${campo}->${tabelaAlvo}` → motivo. Só vale quando a tabela-alvo está ausente do universo E o campo é
 * `required: false`: o create descarta relação opcional para módulo não instalado e responde 400 se ela for
 * obrigatória (`dashboardController.createDashboardFromPreset`, "Verificar dependências quebradas").
 */
const OPTIONAL_RELATIONS: Readonly<Record<string, string>> = {
  'leads.accountId->crmAccounts':
    'CRM-2A é opcional: sem Contas a relação é descartada na instalação e restaurada por sync (BE-INCR-CRM-SUBMODULES)',
  'leads.contactId->crmContacts':
    'CRM-2B é opcional: sem Contatos a relação é descartada na instalação e restaurada por sync (BE-INCR-CRM-SUBMODULES)',
  'crmContacts.accountId->crmAccounts':
    'F-SUB-3 (a): Contatos não depende de Contas — accountId opcional, descartado sem CRM-2A (registry.ts)',
  'crmOpportunities.accountId->crmAccounts':
    'F-CRM-5 (a): Oportunidades depende só de CRM-0 — accountId opcional, descartado sem CRM-2A (registry.ts)',
  'crmOpportunities.contactId->crmContacts':
    'F-CRM-5 (a): Oportunidades depende só de CRM-0 — contactId opcional, descartado sem CRM-2B (registry.ts)',
  // BE-INCR-MODULOS-BASE-SUBMODULOS PR-2: PESSOAS/VENDAS isolados (F-TAP-1 b) sem CRM, sem os outros catálogos e sem
  // as categorias que ainda são tabelas soltas da suíte (AGENDA, CRM-CAMP). Relação opcional sai na instalação (E5).
  'tasks.leadId->leads': 'CRM-0 é opcional fora das suítes que o declaram: sem Funil o vínculo da tarefa ao lead é descartado (E5)',
  'sales.campaignId->campaigns': 'F-MB-3b: sem Campanhas `sales.campaignId` (opcional) é descartado na instalação',
  'saleItems.productId->products': 'F-MB-2: catálogo por requiresOneOf — sem VEN-PROD o item não aponta produto (E5)',
  'saleItems.serviceId->services': 'F-MB-2: catálogo por requiresOneOf — sem VEN-SERV o item não aponta serviço (E5)',
  'saleItems.packageId->packages': 'F-MB-2 / F-MS-3 (a): sem VEN-PAC o item não aponta pacote (E5)',
  'saleItems.appointmentId->appointments': 'AGENDA é categoria própria (AGE-0, PR-3): sem ela o item não aponta atendimento (E5)',
  'services.associatedProducts->products': 'VEN-SERV não depende de VEN-PROD: sem Produtos a lista de produtos associados é descartada (E5)',
};

// --- Item 6 / F-TAP-2 → (a): manifesto estático dos campos que cada plugin escreve/lê ---------------------------

type PluginFieldManifest = {
  plugin: string;
  table: string;
  writes: readonly string[];
  reads: readonly string[];
  selectValues?: readonly { field: string; values: readonly string[] }[];
};

/**
 * Lido dos plugins em `rules/plugins/` (e `rules/plugins/sales/*`) em 2026-10-24. Manifesto desatualiza — a mitigação
 * é o item 7 (o varredor acusa typo) e a revisão do manifesto no FIX-PLUGINS-VENDA (BRIEF, F-TAP-2).
 */
const PLUGIN_MANIFEST: readonly PluginFieldManifest[] = [
  {
    plugin: 'StockMovementsApplyPlugin',
    table: 'stockMovements',
    reads: ['productId', 'unitId', 'type', 'quantity', 'detailKey', 'reason', 'cost', 'supplierId', 'paymentStatus'],
    writes: ['paymentStatus', 'cost'],
    selectValues: [{ field: 'paymentStatus', values: ['Pending'] }],
  },
  { plugin: 'StockMovementsApplyPlugin', table: 'productUnits', reads: ['productId', 'unitId', 'stock'], writes: ['stock'] },
  { plugin: 'CommissionsPlugin', table: 'commissions', reads: ['status', 'paidAt'], writes: ['paidAt'] },
  {
    plugin: 'GoalsPlugin',
    table: 'goals',
    reads: ['targetAmount', 'actualAmount', 'endDate'],
    writes: ['result'],
    selectValues: [{ field: 'result', values: ['Reached', 'Partial', 'Not Reached'] }],
  },
  { plugin: 'EmployeesPlugin', table: 'employees', reads: ['unitId', 'workSchedule', 'email'], writes: [] },
  {
    plugin: 'AppointmentsPlugin',
    table: 'appointments',
    reads: ['startAt', 'endAt', 'serviceId', 'responsibleEmployeeId', 'simpleCustomer', 'simpleCustomerName', 'customerId', 'status'],
    writes: [],
  },
  { plugin: 'AppointmentsPlugin', table: 'services', reads: ['duration'], writes: [] },
  { plugin: 'AppointmentsPlugin', table: 'employees', reads: ['workSchedule'], writes: [] },
  { plugin: 'ProductAutoStockPlugin', table: 'productUnits', reads: ['productId', 'unitId', 'stock'], writes: ['productId', 'unitId', 'stock', 'reserved'] },
  { plugin: 'UnitAutoStockPlugin', table: 'productUnits', reads: ['productId', 'unitId', 'stock'], writes: ['productId', 'unitId', 'stock', 'reserved'] },
  { plugin: 'LeadsSeedOnUnitPlugin', table: 'leadPipelines', reads: ['unitId'], writes: ['unitId', 'name', 'isDefault'] },
  {
    plugin: 'LeadsSeedOnUnitPlugin',
    table: 'leadStages',
    reads: [],
    writes: ['pipelineId', 'name', 'order', 'type', 'defaultWinProbability'],
    selectValues: [{ field: 'type', values: ['init', 'meeting', 'proposal', 'negotiation', 'closed_won', 'closed_lost'] }],
  },
  {
    plugin: 'LeadsPlugin',
    table: 'leads',
    reads: [
      'bantBudget', 'bantAuthority', 'bantNeed', 'bantTiming', 'score', 'stageId', 'pipelineId', 'unitId', 'nextActionAt',
      'latestProposalAmount', 'latestProposalCurrency', 'latestProposalWinProbability',
    ],
    writes: [
      'score', 'stageId', 'pipelineId', 'nextActionAt', 'latestProposalAmount', 'latestProposalCurrency',
      'latestProposalEtaClose', 'latestProposalWinProbability', 'lastContactAt',
    ],
  },
  { plugin: 'LeadsPlugin', table: 'leadStages', reads: ['pipelineId', 'order', 'type'], writes: [] },
  { plugin: 'LeadsPlugin', table: 'leadPipelines', reads: ['unitId', 'isDefault'], writes: [] },
  { plugin: 'LeadsPlugin', table: 'leadProposals', reads: ['leadId', 'amount', 'currency', 'winProbability', 'estimatedCloseDate'], writes: [] },
  {
    plugin: 'LeadsPlugin',
    table: 'leadActivities',
    reads: ['type', 'leadId'],
    writes: ['leadId', 'type', 'message', 'payload'],
    selectValues: [
      { field: 'type', values: ['proposal', 'field_update', 'stage_change', 'meeting', 'meeting_no_show', 'meeting_cancelled'] },
    ],
  },
  {
    plugin: 'SalesPlugin',
    table: 'sales',
    reads: [
      'status', 'paymentStatus', 'paymentTermDays', 'date', 'discountAmount', 'simpleCustomer', 'simpleCustomerName',
      'customerId', 'unitId', 'totalAmount',
    ],
    writes: ['status', 'dueDate', 'date', 'subtotal', 'totalAmount', 'isNewCustomer', 'isLoyalCustomer'],
    selectValues: [{ field: 'status', values: ['Finalized'] }],
  },
  {
    plugin: 'SalesPlugin',
    table: 'saleItems',
    reads: [
      'saleId', 'productId', 'serviceId', 'packageId', 'type', 'quantity', 'unitPrice', 'requiresAppointment',
      'appointmentId', 'responsibleEmployeeId', 'commission',
    ],
    writes: ['appointmentId'],
  },
  { plugin: 'SalesPlugin/stockSync', table: 'productUnits', reads: ['productId', 'unitId', 'stock', 'reserved'], writes: ['stock', 'reserved'] },
  {
    plugin: 'SalesPlugin/stockSync',
    table: 'stockMovements',
    reads: ['sourceId', 'detailKey'],
    writes: ['productId', 'type', 'quantity', 'date', 'reason', 'sourceId', 'detailKey', 'unitId'],
    selectValues: [
      { field: 'reason', values: ['SALE', 'RETURN'] },
      { field: 'type', values: ['In', 'Out'] },
    ],
  },
  {
    // #771 trocou `commissionRate` por `rate` (§3.1 #2) — o manifesto fixa como regressão.
    plugin: 'SalesPlugin/commissions',
    table: 'commissions',
    reads: ['saleId', 'saleItemId', 'status'],
    writes: ['employeeId', 'saleId', 'saleItemId', 'amount', 'rate', 'status'],
    selectValues: [{ field: 'status', values: ['Pending', 'Cancelled'] }],
  },
  {
    plugin: 'SalesPlugin/customerMetrics',
    table: 'customers',
    reads: ['totalSalesCount', 'totalSalesAmount', 'firstSaleAt', 'lastSaleAt', 'lifecycleStage'],
    writes: ['totalSalesCount', 'totalSalesAmount', 'firstSaleAt', 'lastSaleAt', 'lifecycleStage'],
    selectValues: [{ field: 'lifecycleStage', values: ['Prospect', 'New', 'Active', 'Loyal'] }],
  },
  {
    plugin: 'SalesPlugin/appointmentSync',
    table: 'appointments',
    reads: ['status', 'serviceId', 'responsibleEmployeeId', 'unitId'],
    writes: ['unitId', 'serviceId', 'responsibleEmployeeId', 'customerId', 'simpleCustomer', 'simpleCustomerName', 'startAt', 'endAt', 'status'],
    selectValues: [{ field: 'status', values: ['Scheduled', 'Cancelled'] }],
  },
];

// --- Item 8 / F-TAP-4 → (a): vermelhos conhecidos, com o nó dono — a lista só encolhe ----------------------------

// BE-INCR-MODULOS-BASE-SUBMODULOS PR-2 (F-TAP-1 b + F-TAP-4 a): os universos isolados de VENDAS revelam achados que já
// existiam (Controle Total podia remover despesas/estoque) e só agora ficam visíveis. Nó dono decidido pelo dono, 31/10/2026,
// questionário, opção "BUILDER-VERTICAIS (Recommended)": (a) `products.deleteConstraints` → productUnits/stockMovements
// ausentes fecha no PR-3, item 18 (E8: a constraint só é lida se outra tabela referencia a linha).
const COM_PRODUTO = ['VEN-0+VEN-PROD', 'VEN-PROD', 'VEN-COM+VEN-PROD'] as const;
const BUILDER_VERTICAIS_RULE: Readonly<Record<string, { universes: readonly string[]; refs: readonly string[] }>> = {
  COM_PRODUTO: {
    universes: COM_PRODUTO,
    refs: [
      'products:@@PRESET_TABLE_KEY::productUnits',
      'products:@@PRESET_TABLE_KEY::stockMovements',
    ],
  },
};
const KNOWN_GAPS: readonly KnownGap[] = Object.values(BUILDER_VERTICAIS_RULE).flatMap(({ universes, refs }) =>
  knownGapsAcross('rule', universes, refs, 'BUILDER-VERTICAIS', '2026-10-31'),
);

// --- Coletores ---------------------------------------------------------------------------------------------------

function dedupe(findings: CouplingFinding[]): CouplingFinding[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    const k = findingKey(f);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Item 2: regras de governança → campo existente na própria tabela. */
function collectRuleFindings(universes: readonly Universe[]): CouplingFinding[] {
  const out: CouplingFinding[] = [];
  for (const u of universes) {
    for (const [tableKey, table] of Object.entries(u.tables)) {
      const s = table.schema;
      const check = (ruleKind: NonNullable<CouplingFinding['ruleKind']>, ref: string) => {
        if (!hasField(table, ref)) out.push({ suite: u.name, table: tableKey, source: 'rule', ruleKind, ref, target: tableKey });
      };
      for (const r of s.compositeUnique ?? []) r.fields.forEach((f) => check('compositeUnique', f));
      for (const r of s.immutableAfter ?? []) {
        check('immutableAfter', r.condition.field);
        if (Array.isArray(r.scope)) r.scope.forEach((f) => check('immutableAfter', f));
      }
      for (const r of s.compare ?? []) {
        check('compare', r.left);
        check('compare', r.right);
      }
      for (const r of s.lifecycle ?? []) check('lifecycle', r.field);
      for (const r of s.noOverlap ?? []) {
        check('noOverlap', r.startField);
        check('noOverlap', r.endField);
        (r.scopeFields ?? []).forEach((f) => check('noOverlap', f));
      }
      for (const f of s.fields) if (f.requiredIf) check('requiredIf', f.requiredIf.field);
      if (s.defaultDisplayField) check('defaultDisplayField', s.defaultDisplayField);
    }
  }
  return dedupe(out);
}

/** Item 3: `deleteConstraints` e alvo de relação → tabela existente no universo (e campo do agregado nela). */
function collectRelationFindings(universes: readonly Universe[]): CouplingFinding[] {
  const out: CouplingFinding[] = [];
  for (const u of universes) {
    for (const [tableKey, table] of Object.entries(u.tables)) {
      for (const dc of table.schema.deleteConstraints ?? []) {
        const target = resolveTableRef(dc.targetTable, tableKey);
        if (!target || !u.tables[target]) {
          out.push({ suite: u.name, table: tableKey, source: 'rule', ruleKind: 'deleteConstraints', ref: dc.targetTable, target: `(universo ${u.name})` });
          continue;
        }
        if (dc.aggregate && !hasField(u.tables[target], dc.aggregate.field)) {
          out.push({ suite: u.name, table: tableKey, source: 'rule', ruleKind: 'deleteConstraints', ref: dc.aggregate.field, target });
        }
      }
      for (const f of table.schema.fields) {
        if (f.type !== 'relation' || !f.relation) continue;
        const target = resolveTableRef(f.relation.targetTable, tableKey);
        if (target && u.tables[target]) continue;
        if (target && !f.required && OPTIONAL_RELATIONS[`${tableKey}.${f.name}->${target}`]) continue;
        out.push({ suite: u.name, table: tableKey, source: 'relation', ref: `${f.name}->${f.relation.targetTable}`, target: `(universo ${u.name})` });
      }
    }
  }
  return dedupe(out);
}

/** Item 4: `defaultValue` de select ∈ opções. */
function collectSelectDefaultFindings(universes: readonly Universe[]): CouplingFinding[] {
  const out: CouplingFinding[] = [];
  for (const u of universes) {
    for (const [tableKey, table] of Object.entries(u.tables)) {
      for (const f of table.schema.fields) {
        if (f.type !== 'select' || f.defaultValue === undefined || f.defaultValue === null) continue;
        const values = Array.isArray(f.defaultValue) ? f.defaultValue : [f.defaultValue];
        for (const v of values) {
          if (!(f.options ?? []).includes(String(v))) {
            out.push({ suite: u.name, table: tableKey, source: 'select-default', ref: `${f.name}=${String(v)}`, target: `opções de ${tableKey}.${f.name}` });
          }
        }
      }
    }
  }
  return dedupe(out);
}

/** Item 6: campos escritos/lidos por plugin ⊆ preset; valores gravados em select ∈ opções. */
function collectPluginFindings(universes: readonly Universe[], manifest: readonly PluginFieldManifest[]): CouplingFinding[] {
  const out: CouplingFinding[] = [];
  for (const m of manifest) {
    const present = universes.filter((u) => u.tables[m.table]);
    if (present.length === 0) {
      out.push({ suite: '*', table: m.table, source: 'plugin-write', ref: m.plugin, target: '(tabela ausente em todos os universos)' });
      continue;
    }
    for (const u of present) {
      const table = u.tables[m.table];
      for (const name of new Set([...m.writes, ...m.reads])) {
        if (!hasField(table, name)) out.push({ suite: u.name, table: m.table, source: 'plugin-write', ref: name, target: m.table });
      }
      for (const sv of m.selectValues ?? []) {
        const field = table.schema.fields.find((f) => f.name === sv.field);
        if (!field || field.type !== 'select') continue; // ausência já acusada acima; campo livre aceita qualquer valor
        for (const v of sv.values) {
          if (!(field.options ?? []).includes(v)) {
            out.push({ suite: u.name, table: m.table, source: 'plugin-select-value', ref: `${sv.field}=${v}`, target: `opções de ${m.table}.${sv.field}` });
          }
        }
      }
    }
  }
  return dedupe(out);
}

function collectAll(universes: readonly Universe[]): CouplingFinding[] {
  return [
    ...collectRuleFindings(universes),
    ...collectRelationFindings(universes),
    ...collectSelectDefaultFindings(universes),
    ...collectPluginFindings(universes, PLUGIN_MANIFEST),
  ];
}

// --- Item 7: universo sintético com typo ------------------------------------------------------------------------

function salonUniverse(): Universe {
  const u = buildUniverses().find((x) => x.name === 'beautySalon');
  if (!u) throw new Error('universo beautySalon ausente');
  return u;
}

function withTable(u: Universe, key: string, mutate: (t: PresetTableDefinition) => void): Universe {
  const t = cloneTable(u.tables[key]);
  mutate(t);
  return { name: `${u.name}+typo`, tables: { ...u.tables, [key]: t } };
}

function firstTableWith(u: Universe, pick: (t: PresetTableDefinition) => boolean): string {
  const key = Object.keys(u.tables).find((k) => pick(u.tables[k]));
  if (!key) throw new Error('nenhuma tabela do salão serve de base para o caso sintético');
  return key;
}

// --- Testes -------------------------------------------------------------------------------------------------------

describe('TESTE-ACOPLAMENTO-PRESET — preset × schema', () => {
  const universes = buildUniverses();
  const all = collectAll(universes);
  const reportOf = (pick: (f: CouplingFinding) => boolean) => partitionByKnownGaps(all.filter(pick), KNOWN_GAPS).unexpected;
  const isDeleteConstraint = (f: CouplingFinding) => f.ruleKind === 'deleteConstraints';

  it('item 1 — o varredor percorre todas as suítes instaláveis e cada módulo isolado (sanidade)', () => {
    const names = universes.map((u) => u.name);
    const suiteKeys = Object.values(tablePresetSuites).flatMap((s) => Object.keys(s));
    expect(names).toEqual(expect.arrayContaining([...suiteKeys, 'module:CRM-0', 'module:CRM-1', 'module:CRM-2A', 'module:CRM-2B', 'module:CRM-3']));
    expect(Object.keys(salonUniverse().tables).length).toBeGreaterThanOrEqual(17);
    for (const u of universes) expect(Object.keys(u.tables).length).toBeGreaterThan(0);
  });

  it('item 2 — toda regra de governança aponta para campo existente', () => {
    expect(reportOf((f) => f.source === 'rule' && !isDeleteConstraint(f))).toEqual([]);
  });

  it('item 3 — deleteConstraints e alvo de relação apontam para tabela (e campo) existente no universo', () => {
    expect(reportOf((f) => f.source === 'relation' || isDeleteConstraint(f))).toEqual([]);
  });

  it('item 4 — defaultValue de select está nas opções', () => {
    expect(reportOf((f) => f.source === 'select-default')).toEqual([]);
  });

  it('item 6 — campos que os plugins escrevem/leem existem no preset e valores de select gravados estão nas opções', () => {
    expect(reportOf((f) => f.source === 'plugin-write' || f.source === 'plugin-select-value')).toEqual([]);
  });

  it('item 7 — cada varredor acusa um typo sintético (não é tautológico)', () => {
    const salon = salonUniverse();

    const ruleBase = firstTableWith(salon, (t) => !!t.schema.defaultDisplayField);
    const ruleTypo = withTable(salon, ruleBase, (t) => { t.schema.defaultDisplayField = 'nmae'; });
    expect(collectRuleFindings([ruleTypo]).some((f) => f.ref === 'nmae' && f.ruleKind === 'defaultDisplayField')).toBe(true);

    const relBase = firstTableWith(salon, (t) => t.schema.fields.some((f) => f.type === 'relation'));
    const relTypo = withTable(salon, relBase, (t) => {
      const f = t.schema.fields.find((x) => x.type === 'relation')!;
      f.relation = { targetTable: '@@PRESET_TABLE_KEY::unitz' };
    });
    expect(collectRelationFindings([relTypo]).some((f) => f.source === 'relation' && f.ref.endsWith('::unitz'))).toBe(true);

    // A allowlist F-TAP-3 não cobre relação obrigatória: o create responderia 400.
    const crm3 = buildUniverses().find((x) => x.name === 'module:CRM-3')!;
    const requiredTypo = withTable(crm3, 'crmOpportunities', (t) => {
      t.schema.fields.find((x) => x.name === 'accountId')!.required = true;
    });
    expect(collectRelationFindings([requiredTypo]).some((f) => f.ref.startsWith('accountId->'))).toBe(true);

    const selBase = firstTableWith(salon, (t) => t.schema.fields.some((f) => f.type === 'select' && (f.options ?? []).length > 0));
    const selTypo = withTable(salon, selBase, (t) => {
      const f = t.schema.fields.find((x) => x.type === 'select' && (x.options ?? []).length > 0)!;
      f.defaultValue = 'Pendding';
    });
    expect(collectSelectDefaultFindings([selTypo]).some((f) => f.ref.endsWith('=Pendding'))).toBe(true);

    const pluginTypo: PluginFieldManifest[] = [
      { plugin: 'Typo', table: 'commissions', reads: [], writes: ['commisionRate'], selectValues: [{ field: 'status', values: ['Payd'] }] },
    ];
    const pluginFindings = collectPluginFindings([salon], pluginTypo);
    expect(pluginFindings.some((f) => f.source === 'plugin-write' && f.ref === 'commisionRate')).toBe(true);
    expect(pluginFindings.some((f) => f.source === 'plugin-select-value' && f.ref === 'status=Payd')).toBe(true);
  });

  it('item 8 — KNOWN_GAPS só encolhe: nenhuma entrada que já não diverge', () => {
    expect(partitionByKnownGaps(all, KNOWN_GAPS).stale).toEqual([]);
  });
});
