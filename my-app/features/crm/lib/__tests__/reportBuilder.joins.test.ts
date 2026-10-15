import { describe, it, expect } from 'vitest';
import type { ISchemaField } from '../../../dashboard/components/shared/dynamic-tables.client';
import type { CrmReportRow } from '../../../../lib/services/crmReports.service';
import {
  aliasProblem,
  blockReason,
  measureFieldOptions as measureOptions,
  settle,
  buildPatch,
  combinedFields,
  currencyIndexes,
  currencyRequirements,
  dimensionFieldOptions,
  emptyDraft,
  fromReport,
  itemsLost,
  joinLeftFieldOptions,
  joinedFields,
  kpiAllowedDimensionFields,
  measureFieldOptions,
  prunedForFields,
  removeJoin,
  renameJoinAlias,
  reportFields,
  sourceChangeLosesItems,
  suggestAlias,
  toSpec,
  withJoinSource,
  type JoinDraft,
  type ReportDraft,
  type ReportSource,
} from '../reportBuilder';

/**
 * Joins do builder de relatórios do CRM — FE-INCR-CRM-REPORT-BUILDER PR-B (BRIEF §1 item 10, F-FRB5=(a)) e as decisões
 * de [[D-2026-10-13-FE-CRM-RB-PR-B-D-LACUNAS]]. Contrato: `ReportJoinSchema` + `CrmReportService.validate/resolveRef`.
 */
const LABELS = { id: 'ID', createdAt: 'Criado em', updatedAt: 'Atualizado em' };
/** `moneyCurrencyPairs` como o BE devolve em `GET /api/crm/reports/templates` (PR-C: fonte única dos pares). */
const PAIRS = {
  leads: { latestProposalAmount: 'latestProposalCurrency' },
  leadProposals: { amount: 'currency' },
  crmOpportunities: { amount: 'currency' },
};
const OPP: ISchemaField[] = reportFields(
  [
    { name: 'title', label: 'Título', type: 'string' },
    { name: 'amount', label: 'Valor', type: 'number', numberFormat: 'currency' },
    { name: 'currency', label: 'Moeda', type: 'select', options: ['BRL', 'USD'] },
    { name: 'leadId', label: 'Lead', type: 'relation', relation: { targetTable: '@@PRESET_TABLE_KEY::leads' } },
  ],
  LABELS,
  PAIRS.crmOpportunities,
);
const LEADS: ISchemaField[] = reportFields(
  [
    { name: 'name', label: 'Nome', type: 'string' },
    { name: 'status', label: 'Status', type: 'select', options: ['Novo', 'Ganho'] },
    { name: 'ownerId', label: 'Dono', type: 'relation', relation: { targetTable: 'users' } },
    { name: 'leads', label: 'Campo homônimo', type: 'string' },
  ],
  LABELS,
  PAIRS.leads,
);
const right = (map: Partial<Record<ReportSource, ISchemaField[]>>) => (s: ReportSource) => map[s] ?? null;
const RF = right({ leads: LEADS, crmOpportunities: OPP });
const join = (patch: Partial<JoinDraft> = {}): JoinDraft => ({ rightSource: 'leads', leftField: 'leadId', rightField: 'id', alias: 'lead', ...patch });
const oppDraft = (patch: Partial<ReportDraft> = {}): ReportDraft => ({ ...emptyDraft(), source: 'crmOpportunities', joins: [join()], ...patch });
const fieldsOf = (d: ReportDraft) => combinedFields(OPP, d.joins, RF);

describe('item 10 — campos do join como apelido.campo nos itens 5–7', () => {
  it('prefixa nome e rótulo; inclui os sintéticos; NÃO inclui apelido.id (a linha do join não carrega o id no BE)', () => {
    const names = joinedFields([join()], RF).map((f) => f.name);
    expect(names).toEqual(['lead.name', 'lead.status', 'lead.ownerId', 'lead.leads', 'lead._createdAt', 'lead._updatedAt']);
    expect(joinedFields([join()], RF).find((f) => f.name === 'lead.status')?.label).toBe('lead.Status');
  });

  it('join sem tabela, sem apelido ou com schema não carregado não contribui campos', () => {
    expect(joinedFields([join({ rightSource: null })], RF)).toEqual([]);
    expect(joinedFields([join({ alias: '' })], RF)).toEqual([]);
    expect(joinedFields([join({ rightSource: 'leadActivities' })], RF)).toEqual([]);
  });

  it('medidas, filtros e período enxergam os campos do join; "agrupar por campo" esconde a relação do join (id cru no BE)', () => {
    const fields = fieldsOf(oppDraft());
    expect(measureFieldOptions('count', fields).map((f) => f.name)).toContain('lead.status');
    const dims = dimensionFieldOptions(fields).map((f) => f.name);
    expect(dims).toContain('lead.status');
    expect(dims).not.toContain('lead.ownerId');
    expect(dims).toContain('leadId'); // relação da FONTE continua (o BE resolve o nome)
  });

  it('o campo da esquerda do vínculo só oferece campos da fonte', () => {
    expect(joinLeftFieldOptions(fieldsOf(oppDraft())).map((f) => f.name)).toEqual(['title', 'amount', 'currency', 'leadId', 'id', '_createdAt', '_updatedAt']);
  });
});

describe('item 10 — apelido obrigatório, pré-preenchido, validado como o BE', () => {
  const joins = [join({ alias: 'lead' }), join({ alias: '' })];
  it.each([
    ['', 'REQUIRED'],
    ['a.b', 'CHARS'],
    ['a b', 'CHARS'],
    ['x'.repeat(41), 'TOO_LONG'],
    ['id', 'RESERVED'],
    ['_x', 'RESERVED'],
    ['lead', 'DUPLICATE'],
    ['amount', 'FIELD_CONFLICT'],
    ['lead2', null],
  ])('%s → %s', (alias, problem) => {
    expect(aliasProblem(alias, 1, joins, OPP)).toBe(problem);
  });

  it('o próprio join não conta como repetido', () => {
    expect(aliasProblem('lead', 0, joins, OPP)).toBeNull();
  });

  it('sugestão = nome da tabela; _2 se outro join já usa ou se a fonte tem campo homônimo', () => {
    expect(suggestAlias('leads', 0, [join({ alias: '' })], OPP)).toBe('leads');
    expect(suggestAlias('leads', 1, [join({ alias: 'leads' }), join({ alias: '' })], OPP)).toBe('leads_2');
    expect(suggestAlias('leads', 0, [join({ alias: '' })], LEADS)).toBe('leads_2');
  });

  it('bloqueia visualizar: join incompleto, depois apelido inválido', () => {
    expect(blockReason(oppDraft({ joins: [join({ rightField: '' })] }), OPP)).toBe('JOIN_INCOMPLETE');
    expect(blockReason(oppDraft({ joins: [join({ rightSource: null })] }), OPP)).toBe('JOIN_INCOMPLETE');
    expect(blockReason(oppDraft({ joins: [join({ alias: 'amount' })] }), OPP)).toBe('JOIN_ALIAS_INVALID');
    expect(blockReason(oppDraft(), fieldsOf(oppDraft()))).toBeNull();
  });
});

describe('item 10 — join em uso: renomear reescreve, remover/trocar tabela limpa (com confirmação)', () => {
  const used = oppDraft({
    joins: [join({ alias: 'lead' }), join({ rightSource: 'leads', alias: 'leadx', leftField: 'title', rightField: 'name' })],
    measures: [{ type: 'count', field: 'lead.name', alias: '' }],
    dimensions: [
      { type: 'field', field: 'lead.status' },
      { type: 'period', dateField: 'lead._createdAt', period: 'month' },
    ],
    filters: [
      { field: 'lead.status', op: 'eq', value: 'Novo' },
      { field: 'leadx.status', op: 'eq', value: 'Ganho' },
    ],
  });

  it('renomear o apelido reescreve medidas, agrupamentos (campo e período) e filtros — só os desse join', () => {
    const next = renameJoinAlias(used, 0, 'cliente');
    expect(next.joins[0].alias).toBe('cliente');
    expect(next.measures[0].field).toBe('cliente.name');
    expect(next.dimensions).toEqual([
      { type: 'field', field: 'cliente.status' },
      { type: 'period', dateField: 'cliente._createdAt', period: 'month' },
    ]);
    expect(next.filters.map((f) => f.field)).toEqual(['cliente.status', 'leadx.status']);
    expect(next.measures).toHaveLength(used.measures.length);
  });

  it('remover o join tira os itens que o citam e acusa perda (pede confirmação)', () => {
    const next = removeJoin(used, 0, OPP, RF);
    expect(next.joins.map((j) => j.alias)).toEqual(['leadx']);
    expect(next.measures).toEqual([{ type: 'count', field: '', alias: '' }]);
    expect(next.dimensions).toEqual([]);
    expect(next.filters.map((f) => f.field)).toEqual(['leadx.status']);
    expect(itemsLost(used, next)).toBe(true);
  });

  it('remover join que ninguém usa não pede confirmação', () => {
    const d = oppDraft();
    expect(itemsLost(d, removeJoin(d, 0, OPP, RF))).toBe(false);
  });

  it('trocar a tabela da direita: tira TODO item do apelido, zera o campo da direita, mantém o apelido escrito pelo usuário', () => {
    const next = withJoinSource(used, 0, 'crmOpportunities', OPP, RF);
    expect(next.joins[0]).toEqual({ rightSource: 'crmOpportunities', leftField: 'leadId', rightField: '', alias: 'lead' });
    expect(next.filters.map((f) => f.field)).toEqual(['leadx.status']);
    // `lead._createdAt` existe nas duas tabelas, mas é outro dado — sai também (review do PR-B, achado 2)
    expect(next.dimensions).toEqual([]);
    expect(itemsLost(used, next)).toBe(true);
  });

  it('escolher a tabela num join novo pré-preenche o apelido', () => {
    const d = oppDraft({ joins: [{ rightSource: null, leftField: '', rightField: '', alias: '' }] });
    expect(withJoinSource(d, 0, 'leads', OPP, RF).joins[0].alias).toBe('leads');
  });
});

describe('item 3 com joins — trocar a fonte', () => {
  it('mantém o join cujo campo da esquerda existe na fonte nova; tira o outro e avisa', () => {
    const d = oppDraft({
      joins: [join({ alias: 'a', leftField: 'title', rightField: 'name' }), join({ alias: 'b', leftField: 'leadId' })],
      filters: [{ field: 'b.status', op: 'eq', value: 'Novo' }],
    });
    const proposal = reportFields([{ name: 'title', label: 'Título', type: 'string' }], LABELS, PAIRS.leadProposals);
    const next = prunedForFields({ ...d, source: 'leadProposals' }, proposal, RF);
    expect(next.joins.map((j) => j.alias)).toEqual(['a']);
    expect(next.filters).toEqual([]);
    expect(sourceChangeLosesItems(d, proposal, RF)).toBe(true);
    expect(sourceChangeLosesItems(oppDraft({ joins: [join({ alias: 'a', leftField: 'title', rightField: 'name' })] }), proposal, RF)).toBe(false);
  });
});

describe('item 8 com joins — dinheiro do lado do join usa o par prefixado (pairFieldOf do BE)', () => {
  const d = (patch: Partial<ReportDraft> = {}) =>
    ({
      ...emptyDraft(),
      source: 'leads',
      joins: [{ rightSource: 'crmOpportunities', leftField: 'id', rightField: 'leadId', alias: 'opp' }],
      measures: [{ type: 'sum', field: 'opp.amount', alias: '' }],
      ...patch,
    }) satisfies ReportDraft;
  const fields = (x: ReportDraft) => combinedFields(LEADS, x.joins, RF);

  it('exige separar por moeda ou fixar a moeda em opp.currency', () => {
    expect(currencyRequirements(d(), fields(d()))).toEqual([{ measureIndex: 0, field: 'opp.amount', pairField: 'opp.currency', satisfied: false }]);
    expect(blockReason(d(), fields(d()))).toBe('CURRENCY_CHOICE_REQUIRED');
    const split = d({ dimensions: [{ type: 'field', field: 'opp.currency' }] });
    expect(blockReason(split, fields(split))).toBeNull();
    const single = d({ filters: [{ field: 'opp.currency', op: 'eq', value: 'USD' }] });
    expect(blockReason(single, fields(single))).toBeNull();
  });

  it('KPI aceita a dimensão de moeda do join; o símbolo segue o meta.currency.field prefixado', () => {
    expect(kpiAllowedDimensionFields(d(), fields(d()))).toEqual(['opp.currency']);
    expect(currencyIndexes(d(), fields(d()), { mode: 'dimension', field: 'opp.currency' })).toEqual([0]);
  });
});

describe('item 10 — rascunho ⇄ contrato', () => {
  it('toSpec manda os joins completos, sempre com o apelido', () => {
    expect(toSpec(oppDraft())?.joins).toEqual([{ leftField: 'leadId', rightSource: 'leads', rightField: 'id', alias: 'lead' }]);
  });

  const row: CrmReportRow = {
    id: 'r1',
    userId: 'eu',
    name: 'Opps por status do lead',
    description: null,
    kind: 'chart',
    chartType: 'bar',
    spec: {
      source: 'crmOpportunities',
      joins: [{ leftField: 'leadId', rightSource: 'leads', rightField: 'id' }],
      measures: [{ type: 'count' }],
      dimensions: [{ type: 'field', field: 'right.status' }],
    },
    createdAt: '2026-10-13T10:00:00.000Z',
    updatedAt: '2026-10-13T10:00:00.000Z',
  };

  it('relatório salvo com join sem apelido abre com o padrão do BE ("right") e não acusa mudança', () => {
    const d = fromReport(row);
    expect(d.joins).toEqual([{ rightSource: 'leads', leftField: 'leadId', rightField: 'id', alias: 'right' }]);
    expect(d.dimensions).toEqual([{ type: 'field', field: 'right.status' }]);
    expect(buildPatch(row, d)).toBeNull();
    expect(buildPatch(row, renameJoinAlias(d, 0, 'lead'))?.spec?.dimensions).toEqual([{ type: 'field', field: 'lead.status' }]);
  });
});

describe('review do PR-B — regressões', () => {
  it('achado 2: trocar a tabela não reaponta campo homônimo e troca o apelido sugerido pelo da tabela nova', () => {
    const d = oppDraft({
      joins: [join({ alias: 'leads' })],
      filters: [{ field: 'leads.status', op: 'eq', value: 'Ganho' }],
    });
    const statusOpp: ISchemaField[] = [...OPP, { name: 'status', label: 'Status', type: 'select', options: ['Aberta'] }];
    const next = withJoinSource(d, 0, 'crmOpportunities', OPP, right({ leads: LEADS, crmOpportunities: statusOpp }));
    expect(next.filters).toEqual([]);
    expect(next.joins[0].alias).toBe('crmOpportunities');
    expect(itemsLost(d, next)).toBe(true);
  });

  it('achado 3: apelido digitado e inválido bloqueia visualizar, mesmo sem ter sido aplicado', () => {
    const d = oppDraft({ joins: [{ ...join(), pendingAlias: 'id' }] });
    expect(blockReason(d, fieldsOf(d))).toBe('JOIN_ALIAS_INVALID');
    expect(toSpec(d)?.joins?.[0].alias).toBe('lead'); // o pendente nunca vai ao spec
    const ok = oppDraft({ joins: [{ ...join(), pendingAlias: 'cliente' }] });
    expect(blockReason(ok, fieldsOf(ok))).toBeNull();
    expect(renameJoinAlias(ok, 0, 'cliente').joins[0]).toEqual({ rightSource: 'leads', leftField: 'leadId', rightField: 'id', alias: 'cliente' });
  });

  it('achado 4: campo json da fonte entra na lista oculto — apelido igual a ele é conflito, e ele não é oferecido', () => {
    const fields = reportFields([{ name: 'payload', label: 'Payload', type: 'json' }, ...OPP.filter((f) => !['id', '_createdAt', '_updatedAt'].includes(f.name))], LABELS, PAIRS.crmOpportunities);
    expect(aliasProblem('payload', 0, [join({ alias: '' })], fields)).toBe('FIELD_CONFLICT');
    expect(measureOptions('count', fields).map((f) => f.name)).not.toContain('payload');
  });

  it('achado 5: join cujo schema não carregou não perde itens nem desmarca a conversão; apelido.id salvo também fica', () => {
    const notLoaded = right({ crmOpportunities: OPP });
    const d: ReportDraft = {
      ...emptyDraft(),
      source: 'crmOpportunities',
      joins: [join({ alias: 'lead' }), join({ alias: 'b', leftField: 'title', rightField: 'name' })],
      measures: [{ type: 'sum', field: 'lead.amount', alias: '' }],
      filters: [{ field: 'lead.status', op: 'eq', value: 'Novo' }, { field: 'b.id', op: 'eq', value: 'x' }],
      convertTo: true,
    };
    const after = removeJoin({ ...d, joins: [...d.joins, join({ rightSource: 'crmOpportunities', alias: 'c' })] }, 2, OPP, notLoaded);
    expect(after.measures).toEqual(d.measures);
    expect(after.filters).toEqual(d.filters);
    expect(after.convertTo).toBe(true);
    expect(itemsLost(d, after)).toBe(false);
    expect(settle(d, combinedFields(OPP, d.joins, notLoaded)).convertTo).toBe(true);
  });
});

describe('review do PR-B — 2ª passada', () => {
  it('count sobre join sem schema não segura a conversão quando não sobra medida de dinheiro', () => {
    const notLoaded = right({ crmOpportunities: OPP });
    const d: ReportDraft = {
      ...emptyDraft(),
      source: 'crmOpportunities',
      joins: [join({ alias: 'lead' })],
      measures: [{ type: 'count', field: 'lead.id', alias: '' }],
      dimensions: [{ type: 'field', field: 'currency' }],
      convertTo: true,
    };
    expect(settle(d, combinedFields(OPP, d.joins, notLoaded)).convertTo).toBe(false);
  });
});
