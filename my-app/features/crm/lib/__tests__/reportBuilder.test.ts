import { describe, it, expect } from 'vitest';
import type { ISchemaField } from '../../../dashboard/components/shared/dynamic-tables.client';
import type { CrmReportRow } from '../../../../lib/services/crmReports.service';
import {
  allowedChartTypes,
  blockReason,
  buildPatch,
  conversionAvailable,
  currencyIndexes,
  currencyRequirements,
  displayPointName,
  emptyDraft,
  formatReportValue,
  fromReport,
  installedSources,
  measureFieldOptions,
  periodFieldOptions,
  pointCurrency,
  prunedForFields,
  reportError,
  reportFields,
  seriesViews,
  settle,
  sourceChangeLosesItems,
  toCreateInput,
  toSpec,
  withKind,
  type ReportDraft,
} from '../reportBuilder';

/**
 * Lógica pura do builder de relatórios do CRM — FE-INCR-CRM-REPORT-BUILDER PR-A (BRIEF §1, itens 3–9, 11–18).
 */
const LABELS = { id: 'ID', createdAt: 'Criado em', updatedAt: 'Atualizado em' };
const PROPOSAL_FIELDS: ISchemaField[] = reportFields(
  [
    { name: 'title', label: 'Título', type: 'string' },
    { name: 'amount', label: 'Valor', type: 'number', numberFormat: 'currency' },
    { name: 'currency', label: 'Moeda', type: 'select', options: ['BRL', 'USD', 'EUR'] },
    { name: 'status', label: 'Status', type: 'select', options: ['Draft', 'Sent'] },
    { name: 'estimatedCloseDate', label: 'Fechamento', type: 'date' },
    { name: 'probability', label: 'Probabilidade', type: 'number' },
    { name: 'secret', label: 'Oculto', type: 'string', hidden: true },
  ],
  LABELS,
);

const proposalsDraft = (patch: Partial<ReportDraft> = {}): ReportDraft => ({ ...emptyDraft(), source: 'leadProposals', ...patch });

describe('item 3 — fontes instaladas e troca de fonte', () => {
  it('só as fontes da whitelist que estão instaladas, na ordem da whitelist', () => {
    expect(installedSources(['units', 'leadProposals', 'leads', null, 'employees'])).toEqual(['leads', 'leadProposals']);
  });

  it('trocar a fonte limpa medidas, agrupamentos e filtros com campo ausente — e avisa antes', () => {
    const d = proposalsDraft({
      measures: [{ type: 'sum', field: 'amount', alias: '' }, { type: 'count', field: '', alias: '' }],
      dimensions: [{ type: 'field', field: 'status' }],
      filters: [{ field: 'currency', op: 'eq', value: 'BRL' }],
    });
    const leadFields = reportFields([{ name: 'status', label: 'Status', type: 'select' }], LABELS);
    expect(sourceChangeLosesItems(d, leadFields)).toBe(true);
    const next = prunedForFields(d, leadFields);
    expect(next.measures).toEqual([{ type: 'count', field: '', alias: '' }]);
    expect(next.dimensions).toEqual([{ type: 'field', field: 'status' }]);
    expect(next.filters).toEqual([]);
    expect(sourceChangeLosesItems(proposalsDraft(), leadFields)).toBe(false);
  });
});

describe('item 4 — campos do schema vivo + sintéticos', () => {
  it('acrescenta id, _createdAt e _updatedAt rotulados; oculto fica na lista mas não é oferecido', () => {
    const names = PROPOSAL_FIELDS.map((f) => f.name);
    expect(names).toEqual(['title', 'amount', 'currency', 'status', 'estimatedCloseDate', 'probability', 'secret', 'id', '_createdAt', '_updatedAt']);
    expect(measureFieldOptions('count', PROPOSAL_FIELDS).map((f) => f.name)).not.toContain('secret');
    expect(PROPOSAL_FIELDS.find((f) => f.name === '_createdAt')).toMatchObject({ label: 'Criado em', type: 'datetime' });
  });
});

describe('itens 5–6 — medidas e dimensões', () => {
  it('sum/avg só em number; count em qualquer campo', () => {
    expect(measureFieldOptions('sum', PROPOSAL_FIELDS).map((f) => f.name)).toEqual(['amount', 'probability']);
    expect(measureFieldOptions('count', PROPOSAL_FIELDS)).toHaveLength(PROPOSAL_FIELDS.length - 1); // sem o oculto
  });

  it('período só em campo de data (inclui os sintéticos)', () => {
    expect(periodFieldOptions(PROPOSAL_FIELDS).map((f) => f.name)).toEqual(['estimatedCloseDate', '_createdAt', '_updatedAt']);
  });
});

describe('item 8 — regra de moeda guiada', () => {
  const sum = { type: 'sum' as const, field: 'amount', alias: '' };

  it('soma de dinheiro com par, sem escolha → bloqueia com CURRENCY_CHOICE_REQUIRED', () => {
    const d = proposalsDraft({ measures: [sum] });
    expect(currencyRequirements(d, PROPOSAL_FIELDS)).toEqual([{ measureIndex: 0, field: 'amount', pairField: 'currency', satisfied: false }]);
    expect(blockReason(d, PROPOSAL_FIELDS)).toBe('CURRENCY_CHOICE_REQUIRED');
  });

  it('separar por moeda (dimensão do par) ou fixar uma moeda (eq, ou in com um valor) libera', () => {
    expect(blockReason(proposalsDraft({ measures: [sum], dimensions: [{ type: 'field', field: 'currency' }] }), PROPOSAL_FIELDS)).toBeNull();
    expect(blockReason(proposalsDraft({ measures: [sum], filters: [{ field: 'currency', op: 'eq', value: 'USD' }] }), PROPOSAL_FIELDS)).toBeNull();
    expect(blockReason(proposalsDraft({ measures: [sum], filters: [{ field: 'currency', op: 'in', value: ['USD'] }] }), PROPOSAL_FIELDS)).toBeNull();
    expect(
      blockReason(proposalsDraft({ measures: [sum], filters: [{ field: 'currency', op: 'in', value: ['USD', 'BRL'] }] }), PROPOSAL_FIELDS),
    ).toBe('CURRENCY_CHOICE_REQUIRED');
  });

  it('número que não é dinheiro não exige moeda', () => {
    expect(currencyRequirements(proposalsDraft({ measures: [{ type: 'avg', field: 'probability', alias: '' }] }), PROPOSAL_FIELDS)).toEqual([]);
  });
});

describe('item 9 — ordenação e limite', () => {
  it('com 2 medidas e "por medida", a medida é obrigatória; o key enviado é alias ou tipo:campo', () => {
    const d = proposalsDraft({
      measures: [{ type: 'count', field: '', alias: '' }, { type: 'avg', field: 'probability', alias: 'Prob' }],
      sort: { by: 'measure', measureIndex: null, dir: 'desc' },
    });
    expect(blockReason(d, PROPOSAL_FIELDS)).toBe('SORT_KEY_REQUIRED');
    expect(toSpec({ ...d, sort: { by: 'measure', measureIndex: 1, dir: 'desc' } })?.sort).toEqual({ by: 'measure', key: 'Prob', dir: 'desc' });
    expect(toSpec({ ...d, sort: { by: 'measure', measureIndex: 0, dir: 'asc' } })?.sort).toEqual({ by: 'measure', key: 'count:*', dir: 'asc' });
  });

  it('limite fora de 1..500 bloqueia', () => {
    expect(blockReason(proposalsDraft({ limit: 501 }), PROPOSAL_FIELDS)).toBe('LIMIT_RANGE');
    expect(blockReason(proposalsDraft({ limit: 500 }), PROPOSAL_FIELDS)).toBeNull();
  });
});

describe('item 7 — filtro incompleto bloqueia', () => {
  it('sem campo, sem valor, ou in vazio', () => {
    expect(blockReason(proposalsDraft({ filters: [{ field: '', op: 'eq', value: 'x' }] }), PROPOSAL_FIELDS)).toBe('FILTER_INCOMPLETE');
    expect(blockReason(proposalsDraft({ filters: [{ field: 'status', op: 'in', value: [] }] }), PROPOSAL_FIELDS)).toBe('FILTER_INCOMPLETE');
    expect(toSpec(proposalsDraft({ filters: [{ field: 'status', op: 'in', value: ['Draft', 'Sent'] }] }))?.filters).toEqual([
      { field: 'status', op: 'in', value: ['Draft', 'Sent'] },
    ]);
  });
});

describe('item 11 — conversão só com dinheiro que tem par', () => {
  it('sem medida de dinheiro → indisponível; com → disponível', () => {
    expect(conversionAvailable(proposalsDraft(), PROPOSAL_FIELDS)).toBe(false);
    expect(conversionAvailable(proposalsDraft({ measures: [{ type: 'sum', field: 'amount', alias: '' }] }), PROPOSAL_FIELDS)).toBe(true);
  });
});

describe('item 12 — combinações de tipo e gráfico (F-FRB6)', () => {
  it('table só com kind table; KPI e gráfico escolhem entre os gráficos', () => {
    expect(allowedChartTypes('table')).toEqual(['table']);
    expect(allowedChartTypes('kpi')).toEqual(['bar', 'line', 'area', 'pie', 'donut']);
    expect(allowedChartTypes('chart')).not.toContain('table');
  });

  it('KPI: só a dimensão de moeda sobrevive; outra dimensão bloqueia', () => {
    const d = proposalsDraft({
      measures: [{ type: 'sum', field: 'amount', alias: '' }],
      dimensions: [{ type: 'field', field: 'status' }, { type: 'field', field: 'currency' }],
      kind: 'table',
      chartType: 'table',
    });
    const kpi = withKind(d, 'kpi', PROPOSAL_FIELDS);
    expect(kpi.dimensions).toEqual([{ type: 'field', field: 'currency' }]);
    expect(kpi.chartType).toBe('bar');
    expect(blockReason({ ...kpi, dimensions: d.dimensions }, PROPOSAL_FIELDS)).toBe('KPI_DIMENSION');
  });
});

describe('item 14 — moeda do ponto e vistas por moeda', () => {
  const dims1 = [{ type: 'field' as const, field: 'currency' }];
  const dims2 = [{ type: 'field' as const, field: 'status' }, { type: 'field' as const, field: 'currency' }];

  it('modo dimension: a parte do nome que vem da dimensão de moeda (1ª ou 2ª)', () => {
    const meta = { mode: 'dimension' as const, field: 'currency' };
    expect(pointCurrency('USD', meta, dims1)).toBe('USD');
    expect(pointCurrency('Open | EUR', meta, dims2)).toBe('EUR');
    expect(pointCurrency('BRL | Draft', meta, [dims2[1], dims2[0]])).toBe('BRL');
    expect(pointCurrency('A | B | __NO_CURRENCY__', meta, dims2)).toBe('__NO_CURRENCY__');
  });

  it('modo filter: a moeda do filtro; undeclared e null: sem moeda', () => {
    expect(pointCurrency('Open', { mode: 'filter', field: 'currency', value: 'USD' }, [])).toBe('USD');
    expect(pointCurrency('Open', { mode: 'undeclared' }, [])).toBeNull();
    expect(pointCurrency('Open', null, [])).toBeNull();
  });

  it('__NO_CURRENCY__ vira o rótulo; o resto do nome fica como veio (F-FRB7)', () => {
    expect(displayPointName('Open | __NO_CURRENCY__', 'Sem moeda')).toBe('Open | Sem moeda');
    expect(displayPointName('A | B', 'Sem moeda')).toBe('A | B');
  });

  it('formata na moeda do ponto; sem moeda, número simples', () => {
    expect(formatReportValue(1500, 'USD', 'en-US')).toBe('$1,500.00');
    expect(formatReportValue(1500, null, 'en-US')).toBe('1,500');
    expect(formatReportValue(1500, '__NO_CURRENCY__', 'en-US')).toBe('1,500');
  });

  it('série de dinheiro em modo dimension vira uma vista por moeda; contagem fica inteira', () => {
    const output = {
      series: [
        { measure: 'sum:amount', points: [{ name: 'BRL', value: 10 }, { name: 'USD', value: 2 }, { name: '__NO_CURRENCY__', value: 1 }] },
        { measure: 'count:*', points: [{ name: 'BRL', value: 3 }, { name: 'USD', value: 1 }, { name: '__NO_CURRENCY__', value: 1 }] },
      ],
      meta: { rowsRead: 5, truncated: false as const, currency: { mode: 'dimension' as const, field: 'currency' }, timeZone: 'UTC' },
    };
    const views = seriesViews(output, dims1, new Set([0]));
    expect(views.map((v) => [v.key, v.currency, v.points.length])).toEqual([
      ['0:BRL', 'BRL', 1],
      ['0:USD', 'USD', 1],
      ['0:__NO_CURRENCY__', '__NO_CURRENCY__', 1],
      ['1', null, 3],
    ]);
  });
});

describe('item 16 — erros nomeados', () => {
  it('cada código conhecido mapeia para a chave i18n com os details', () => {
    for (const code of [
      'REPORT_FIELD_NOT_FOUND',
      'REPORT_TOO_LARGE',
      'REPORT_SOURCE_NOT_ALLOWED',
      'REPORT_CURRENCY_MIXED',
      'REPORT_CONVERSION_NOT_APPLICABLE',
      'REPORT_SORT_KEY_REQUIRED',
      'REPORT_SORT_KEY_NOT_FOUND',
      'REPORT_JOIN_ALIAS_DUPLICATE',
      'REPORT_NOT_FOUND',
      'INVALID_TIME_ZONE',
      'CRM_MODULE_NOT_INSTALLED',
    ]) {
      expect(reportError({ code, status: 400 }).key).toBe(`report_builder.errors.${code}`);
    }
    expect(reportError({ code: 'REPORT_TOO_LARGE', details: { rowsRead: 20001, cap: 20000 } }).params).toEqual({ rowsRead: 20001, cap: 20000 });
  });

  it('código desconhecido, VALIDATION_ERROR ou erro de rede → GENERIC', () => {
    expect(reportError({ code: 'VALIDATION_ERROR' }).key).toBe('report_builder.errors.GENERIC');
    expect(reportError({ error: 'Network request failed' }).key).toBe('report_builder.errors.GENERIC');
    expect(reportError(undefined).code).toBeNull();
  });
});

describe('itens 17–18 — salvar, patch e abrir', () => {
  const saved: CrmReportRow = {
    id: 'r1',
    userId: 'u1',
    name: 'Propostas',
    description: null,
    kind: 'chart',
    chartType: 'bar',
    spec: {
      source: 'leadProposals',
      measures: [{ type: 'count' }, { type: 'sum', field: 'amount', alias: 'Total' }],
      dimensions: [{ type: 'field', field: 'currency' }],
      sort: { by: 'measure', key: 'Total', dir: 'desc' },
      convertTo: 'BRL',
    },
    createdAt: '2026-10-13T10:00:00.000Z',
    updatedAt: '2026-10-13T10:00:00.000Z',
  };

  it('abrir: o spec salvo vira rascunho (sort.key → índice da medida) e volta igual', () => {
    const d = fromReport(saved);
    expect(d.sort).toEqual({ by: 'measure', measureIndex: 1, dir: 'desc' });
    expect(d.convertTo).toBe(true);
    expect(toSpec(d)).toEqual(saved.spec);
  });

  it('PUT só com o que mudou; nada mudou → null', () => {
    const d = fromReport(saved);
    expect(buildPatch(saved, d)).toBeNull();
    expect(buildPatch(saved, { ...d, name: 'Novo nome' })).toEqual({ name: 'Novo nome' });
    expect(buildPatch(saved, { ...d, limit: 10 })).toEqual({ spec: { ...saved.spec, limit: 10 } });
  });

  it('POST: descrição vazia não vai; alias vazio não vai (o BE usaria "" como nome da série)', () => {
    const body = toCreateInput(proposalsDraft({ name: ' Funil ', measures: [{ type: 'count', field: 'status', alias: '  ' }] }));
    expect(body).toEqual({ name: 'Funil', kind: 'chart', chartType: 'bar', spec: { source: 'leadProposals', measures: [{ type: 'count', field: 'status' }] } });
    expect(toCreateInput(proposalsDraft({ name: '' }))).toBeNull();
  });
});

describe('review independente do PR-A — regressões', () => {
  it('achado 1: conversão marcada que deixa de valer sai do rascunho (senão 400 REPORT_CONVERSION_NOT_APPLICABLE)', () => {
    const d = proposalsDraft({ measures: [{ type: 'count', field: '', alias: '' }], convertTo: true });
    expect(toSpec(settle(d, PROPOSAL_FIELDS))?.convertTo).toBeUndefined();
    const money = proposalsDraft({ measures: [{ type: 'sum', field: 'amount', alias: '' }], convertTo: true });
    expect(settle(money, PROPOSAL_FIELDS).convertTo).toBe(true);
  });

  it('achado 2: trocar a fonte mantém o sort na MESMA medida (índice remapeado) ou o solta', () => {
    const d = proposalsDraft({
      measures: [
        { type: 'avg', field: 'probability', alias: '' },
        { type: 'count', field: '', alias: 'Total' },
        { type: 'count', field: 'status', alias: 'ComStatus' },
      ],
      sort: { by: 'measure', measureIndex: 1, dir: 'desc' },
    });
    const next = reportFields([{ name: 'status', label: 'Status', type: 'select' }], LABELS);
    const pruned = prunedForFields(d, next);
    expect(toSpec(pruned)?.sort).toEqual({ by: 'measure', key: 'Total', dir: 'desc' });
    const lost = prunedForFields({ ...d, sort: { by: 'measure', measureIndex: 0, dir: 'asc' } }, next);
    expect(lost.sort).toEqual({ by: 'measure', measureIndex: null, dir: 'asc' });
  });

  it('achado 4: só a medida cujo par é o campo do meta leva moeda; dinheiro sem par e modo undeclared, não', () => {
    const fields = [...PROPOSAL_FIELDS, { name: 'fee', label: 'Taxa', type: 'number', numberFormat: 'currency' as const }];
    const d = proposalsDraft({
      measures: [{ type: 'sum', field: 'amount', alias: '' }, { type: 'sum', field: 'fee', alias: '' }, { type: 'count', field: '', alias: '' }],
    });
    expect(currencyIndexes(d, fields, { mode: 'filter', field: 'currency', value: 'USD' })).toEqual([0]);
    expect(currencyIndexes(d, fields, { mode: 'undeclared' })).toEqual([]);
    expect(currencyIndexes(d, fields, null)).toEqual([]);
  });

  it('par de moeda ausente do schema vivo → não exige escolha (o BE trata como undeclared, `pairFieldOf`)', () => {
    const semPar = PROPOSAL_FIELDS.filter((f) => f.name !== 'currency');
    expect(currencyRequirements(proposalsDraft({ measures: [{ type: 'sum', field: 'amount', alias: '' }] }), semPar)).toEqual([]);
  });

  it('label de dimensão de relatório salvo pela API não se perde no ida-e-volta', () => {
    const row: CrmReportRow = {
      id: 'r9',
      userId: 'u1',
      name: 'Com rótulo',
      description: null,
      kind: 'chart',
      chartType: 'bar',
      spec: { source: 'leads', measures: [{ type: 'count' }], dimensions: [{ type: 'field', field: 'status', label: 'Situação' }] },
      createdAt: '2026-10-13T10:00:00.000Z',
      updatedAt: '2026-10-13T10:00:00.000Z',
    };
    expect(toSpec(fromReport(row))).toEqual(row.spec);
  });

  it('2ª passada R1: par de moeda OCULTO ainda conta (o BE o enxerga) — a escolha de moeda continua exigida', () => {
    // pelo caminho real: schema cru com a moeda oculta → reportFields → regra
    const oculto = reportFields(
      [
        { name: 'amount', label: 'Valor', type: 'number', numberFormat: 'currency' },
        { name: 'currency', label: 'Moeda', type: 'select', options: ['BRL', 'USD'], hidden: true },
      ],
      LABELS,
    );
    const d = proposalsDraft({ measures: [{ type: 'sum', field: 'amount', alias: '' }] });
    expect(blockReason(d, oculto)).toBe('CURRENCY_CHOICE_REQUIRED');
  });
});
