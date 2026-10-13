/**
 * BE-INCR-CRM-REPORT-BUILDER PR-2 — o serviço do builder contra o motor falso (sem banco). Um `describe` por item do
 * BRIEF (`docs/crm/BE-INCR-CRM-REPORT-BUILDER-brief.md` §2 e §9).
 */
import { Role } from '../../../users/models/User.model';
import { RunCrmReportOutputSchema, type ReportSpec } from '../../dtos/CrmReportDto';
import { CRM_REPORT_ROW_CAP, periodBucket } from '../CrmReportService';
import { FakeEngine, makeService, user, type FakeRow } from './crmReportFakes';

const OWNER = user('owner');
const ADMIN = user('admin', Role.ADMIN);
const OTHER = user('other');

const lead = (id: string, data: Record<string, unknown>, createdAt?: Date): FakeRow => ({ id, data: { leadName: id, ...data }, createdAt });
const run = (svc: ReturnType<typeof makeService>['service'], spec: ReportSpec, timeZone?: string, actor = OWNER) =>
  svc.runPreview(actor, { spec, ...(timeZone ? { timeZone } : {}) });
const points = (s: { points: Array<{ name: string; value: number }> }) => s.points.map((p) => [p.name, p.value]);
const code = async (p: Promise<unknown>) => p.then(() => 'OK', (e: { errorCode?: string; details?: unknown }) => e.errorCode);

describe('item 7 — run sobre o agregador', () => {
  it('3 leads em 2 status → contagem por status; saída no contrato materializado', async () => {
    const e = new FakeEngine();
    e.addTable('owner', 'leads', [lead('a', { status: 'Open' }), lead('b', { status: 'Open' }), lead('c', { status: 'Won' })]);
    const out = await run(makeService(e).service, { source: 'leads', dimensions: [{ type: 'field', field: 'status' }], measures: [{ type: 'count' }] });
    expect(points(out.series[0])).toEqual([['Open', 2], ['Won', 1]]);
    expect(out.series[0].measure).toBe('count:*');
    expect(out.meta).toEqual({ rowsRead: 3, truncated: false, currency: null, timeZone: 'America/Sao_Paulo' });
    expect(RunCrmReportOutputSchema.safeParse(out).success).toBe(true);
  });

  it('F-RB10: count + sum sobre 2 linhas de 10 e 20 → séries 2 e 30, nunca 32', async () => {
    const e = new FakeEngine();
    e.addTable('owner', 'leads', [lead('a', { status: 'Open', latestProposalAmount: 10, latestProposalCurrency: 'BRL' }), lead('b', { status: 'Open', latestProposalAmount: 20, latestProposalCurrency: 'BRL' })]);
    const out = await run(makeService(e).service, {
      source: 'leads',
      filters: [{ field: 'latestProposalCurrency', op: 'eq', value: 'BRL' }],
      measures: [{ type: 'count' }, { type: 'sum', field: 'latestProposalAmount', alias: 'total' }],
    });
    expect(out.series.map((s) => [s.measure, s.points[0].value])).toEqual([['count:*', 2], ['total', 30]]);
  });

  it('F-RB9: top 3 por sum desc em 5 grupos → os 3 maiores, nessa ordem, em todas as séries', async () => {
    const e = new FakeEngine();
    const vals: Array<[string, number]> = [['A', 5], ['B', 50], ['C', 20], ['D', 40], ['E', 1]];
    e.addTable('owner', 'leads', vals.map(([s, v], i) => lead(`l${i}`, { source: s, latestProposalAmount: v, latestProposalCurrency: 'BRL' })));
    const out = await run(makeService(e).service, {
      source: 'leads',
      filters: [{ field: 'latestProposalCurrency', op: 'in', value: ['BRL'] }],
      dimensions: [{ type: 'field', field: 'source' }],
      measures: [{ type: 'count' }, { type: 'sum', field: 'latestProposalAmount', alias: 'valor' }],
      sort: { by: 'measure', key: 'valor', dir: 'desc' },
      limit: 3,
    });
    expect(points(out.series[1])).toEqual([['B', 50], ['D', 40], ['C', 20]]);
    expect(out.series[0].points.map((p) => p.name)).toEqual(['B', 'D', 'C']);
  });

  it('F-RB9: 2 medidas sem key → 400 no DTO; key sem medida → REPORT_SORT_KEY_NOT_FOUND', async () => {
    const { ReportSpecSchema } = await import('../../dtos/CrmReportDto');
    const r = ReportSpecSchema.safeParse({ source: 'leads', measures: [{ type: 'count' }, { type: 'count', alias: 'x' }], sort: { by: 'measure' } });
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toContain('REPORT_SORT_KEY_REQUIRED');
    const e = new FakeEngine();
    e.addTable('owner', 'leads', []);
    expect(await code(run(makeService(e).service, { source: 'leads', measures: [{ type: 'count' }], sort: { by: 'measure', key: 'nada' } }))).toBe('REPORT_SORT_KEY_NOT_FOUND');
  });

  it('F-RB9: uma medida e by:measure sem key ordena por ela; desempate pelo nome', async () => {
    const e = new FakeEngine();
    e.addTable('owner', 'leads', [lead('a', { source: 'Z' }), lead('b', { source: 'Y' }), lead('c', { source: 'X' }), lead('d', { source: 'X' })]);
    const out = await run(makeService(e).service, { source: 'leads', dimensions: [{ type: 'field', field: 'source' }], measures: [{ type: 'count' }], sort: { by: 'measure', dir: 'desc' } });
    expect(points(out.series[0])).toEqual([['X', 2], ['Y', 1], ['Z', 1]]);
  });
});

describe('§9 E4 / F-RB11 — período montado pelo serviço', () => {
  it('campo só-dia pelo dia escrito, em qualquer fuso do processo', () => {
    expect(periodBucket('2026-03-01T00:00:00.000Z', 'month', true, 'America/Sao_Paulo')).toBe('2026-03');
    expect(periodBucket('2026-03-01', 'day', true, 'Pacific/Kiritimati')).toBe('2026-03-01');
  });

  it('_createdAt 2026-03-01T02:00Z → 2026-02 sem timeZone (Brasília) e 2026-03 com UTC', async () => {
    const e = new FakeEngine();
    e.addTable('owner', 'leads', [lead('a', {}, new Date('2026-03-01T02:00:00.000Z'))]);
    const spec: ReportSpec = { source: 'leads', dimensions: [{ type: 'period', dateField: '_createdAt', period: 'month' }], measures: [{ type: 'count' }] };
    const { service } = makeService(e);
    expect(points((await run(service, spec)).series[0])).toEqual([['2026-02', 1]]);
    const utc = await run(service, spec, 'UTC');
    expect(points(utc.series[0])).toEqual([['2026-03', 1]]);
    expect(utc.meta.timeZone).toBe('UTC');
  });

  it('campo date do preset (latestProposalEtaClose) com ISO real → mês escrito', async () => {
    const e = new FakeEngine();
    e.addTable('owner', 'leads', [lead('a', { latestProposalEtaClose: '2026-03-01T00:00:00.000Z' })]);
    const out = await run(makeService(e).service, { source: 'leads', dimensions: [{ type: 'period', dateField: 'latestProposalEtaClose', period: 'quarter' }], measures: [{ type: 'count' }] });
    expect(points(out.series[0])).toEqual([['2026-Q1', 1]]);
  });

  it('timeZone inválido → 400 INVALID_TIME_ZONE no DTO', async () => {
    const { RunCrmReportSchema } = await import('../../dtos/CrmReportDto');
    const r = RunCrmReportSchema.safeParse({ spec: { source: 'leads', measures: [{ type: 'count' }] }, timeZone: 'Marte/Olympus' });
    expect(JSON.stringify(r.error?.issues)).toContain('INVALID_TIME_ZONE');
  });
});

describe('itens 5, 6 e §9 E3 — fonte, join e campos contra o schema vivo', () => {
  it('fonte fora da whitelist → 400 REPORT_SOURCE_NOT_ALLOWED no DTO', async () => {
    const { ReportSpecSchema } = await import('../../dtos/CrmReportDto');
    const r = ReportSpecSchema.safeParse({ source: 'employees', measures: [{ type: 'count' }] });
    expect(JSON.stringify(r.error?.issues)).toContain('REPORT_SOURCE_NOT_ALLOWED');
  });

  it('join com tabela não instalada → CRM_MODULE_NOT_INSTALLED com o internalName, nunca série vazia', async () => {
    const e = new FakeEngine();
    e.addTable('owner', 'leads', [lead('a', {})]);
    const err = await run(makeService(e).service, { source: 'leads', joins: [{ leftField: 'id', rightSource: 'crmOpportunities', rightField: 'leadId', alias: 'opp' }], measures: [{ type: 'count' }] }).catch((x) => x);
    expect(err).toMatchObject({ statusCode: 409, errorCode: 'CRM_MODULE_NOT_INSTALLED' });
    expect(err.message).toContain('crmOpportunities');
  });

  it('a fonte é sempre a do DONO: tabela de outro usuário nunca é lida (preview de quem não tem a tabela → 409)', async () => {
    const e = new FakeEngine();
    e.addTable('owner', 'leads', [lead('a', {})]);
    expect(await code(run(makeService(e).service, { source: 'leads', measures: [{ type: 'count' }] }, undefined, OTHER))).toBe('CRM_MODULE_NOT_INSTALLED');
  });

  it('salvar ok → campo renomeado no schema → run devolve REPORT_FIELD_NOT_FOUND {field}, não série vazia', async () => {
    const e = new FakeEngine();
    const t = e.addTable('owner', 'leads', [lead('a', { source: 'Web' })]);
    const { service } = makeService(e);
    const saved = await service.create(OWNER, { name: 'r', kind: 'chart', chartType: 'bar', spec: { source: 'leads', dimensions: [{ type: 'field', field: 'source' }], measures: [{ type: 'count' }] } });
    (t.schema as unknown as { fields: Array<{ name: string }> }).fields.find((x) => x.name === 'source')!.name = 'origem';
    const err = await service.runSaved(OWNER, saved.id, {}).catch((x) => x);
    expect(err).toMatchObject({ statusCode: 400, errorCode: 'REPORT_FIELD_NOT_FOUND', details: { field: 'source' } });
  });

  it('campo inexistente no save e campo de join inexistente → REPORT_FIELD_NOT_FOUND', async () => {
    const e = new FakeEngine();
    e.addTable('owner', 'leads', []);
    e.addTable('owner', 'crmOpportunities', []);
    const { service } = makeService(e);
    expect(await code(service.create(OWNER, { name: 'r', kind: 'chart', chartType: 'bar', spec: { source: 'leads', filters: [{ field: 'nope', op: 'eq', value: 1 }], measures: [{ type: 'count' }] } }))).toBe('REPORT_FIELD_NOT_FOUND');
    expect(await code(run(service, { source: 'leads', joins: [{ leftField: 'id', rightSource: 'crmOpportunities', rightField: 'leadId', alias: 'opp' }], measures: [{ type: 'sum', field: 'opp.nope' }] }))).toBe('REPORT_FIELD_NOT_FOUND');
  });

  it('join pela rightField pedida: oportunidades por status do lead', async () => {
    const e = new FakeEngine();
    e.addTable('owner', 'leads', [lead('L1', { status: 'Won' }), lead('L2', { status: 'Open' })]);
    e.addTable('owner', 'crmOpportunities', [
      { id: 'o1', data: { leadId: 'L1', amount: 100, currency: 'USD' } },
      { id: 'o2', data: { leadId: 'L1', amount: 50, currency: 'USD' } },
    ]);
    const out = await run(makeService(e).service, {
      source: 'crmOpportunities',
      joins: [{ leftField: 'leadId', rightSource: 'leads', rightField: 'id', alias: 'lead' }],
      filters: [{ field: 'currency', op: 'eq', value: 'USD' }],
      dimensions: [{ type: 'field', field: 'lead.status' }],
      measures: [{ type: 'sum', field: 'amount' }],
    });
    expect(points(out.series[0])).toEqual([['Won', 150]]);
    expect(out.meta.currency).toEqual({ mode: 'filter', field: 'currency', value: 'USD' });
  });

  it('dois joins com o mesmo alias → REPORT_JOIN_ALIAS_DUPLICATE', async () => {
    const e = new FakeEngine();
    e.addTable('owner', 'leads', []);
    e.addTable('owner', 'crmOpportunities', []);
    e.addTable('owner', 'crmAccounts', []);
    const j = (rightSource: 'crmOpportunities' | 'crmAccounts') => ({ leftField: 'id', rightSource, rightField: 'id' });
    expect(await code(run(makeService(e).service, { source: 'leads', joins: [j('crmOpportunities'), j('crmAccounts')], measures: [{ type: 'count' }] }))).toBe('REPORT_JOIN_ALIAS_DUPLICATE');
  });
});

describe('item 9 / §9 E2 — teto durante a leitura em lotes', () => {
  const many = (n: number, prefix = 'r'): FakeRow[] => Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}`, data: {} }));

  it('teto + 1 linhas → 422 REPORT_TOO_LARGE {rowsRead, cap} e nenhum lote pedido depois do estouro', async () => {
    const e = new FakeEngine();
    e.addTable('owner', 'leads', many(CRM_REPORT_ROW_CAP + 1));
    const err = await run(makeService(e).service, { source: 'leads', measures: [{ type: 'count' }] }).catch((x) => x);
    expect(err).toMatchObject({ statusCode: 422, errorCode: 'REPORT_TOO_LARGE', details: { cap: CRM_REPORT_ROW_CAP } });
    expect(err.details.rowsRead).toBeGreaterThan(CRM_REPORT_ROW_CAP);
    const read = e.batches.reduce((acc, [, size]) => acc + size, 0);
    expect(read).toBe(Math.ceil((CRM_REPORT_ROW_CAP + 1) / 1000) * 1000); // o lote do estouro é o último pedido
  });

  it('no teto exato → 200', async () => {
    const e = new FakeEngine();
    e.addTable('owner', 'leads', many(CRM_REPORT_ROW_CAP));
    const out = await run(makeService(e).service, { source: 'leads', measures: [{ type: 'count' }] });
    expect(out.meta.rowsRead).toBe(CRM_REPORT_ROW_CAP);
    expect(out.series[0].points[0].value).toBe(CRM_REPORT_ROW_CAP);
  });

  it('fonte + join que só juntas passam do teto → 422; o join pede só o que falta + 1', async () => {
    const e = new FakeEngine();
    e.addTable('owner', 'leads', many(CRM_REPORT_ROW_CAP - 10));
    e.addTable('owner', 'crmOpportunities', many(11, 'o'));
    expect(await code(run(makeService(e).service, { source: 'leads', joins: [{ leftField: 'id', rightSource: 'crmOpportunities', rightField: 'leadId', alias: 'o' }], measures: [{ type: 'count' }] }))).toBe('REPORT_TOO_LARGE');
    expect(e.batches.filter(([t]) => t === 'owner-crmOpportunities')).toEqual([['owner-crmOpportunities', 11, 0]]);
  });
});

describe('itens 17–19 — verdade por moeda (F-RB8)', () => {
  const twoCurrencies = () => {
    const e = new FakeEngine();
    e.addTable('owner', 'leads', [
      lead('a', { latestProposalAmount: 100, latestProposalCurrency: 'USD' }),
      lead('b', { latestProposalAmount: 300, latestProposalCurrency: 'USD' }),
      lead('c', { latestProposalAmount: 50, latestProposalCurrency: 'BRL' }),
    ]);
    return e;
  };

  it('sum sem moeda → 400 REPORT_CURRENCY_MIXED {field, currencyField}; count não é afetada', async () => {
    const { service } = makeService(twoCurrencies());
    const err = await run(service, { source: 'leads', measures: [{ type: 'sum', field: 'latestProposalAmount' }] }).catch((x) => x);
    expect(err).toMatchObject({ errorCode: 'REPORT_CURRENCY_MIXED', details: { field: 'latestProposalAmount', currencyField: 'latestProposalCurrency' } });
    expect(await code(run(service, { source: 'leads', measures: [{ type: 'count', field: 'latestProposalAmount' }] }))).toBe('OK');
    expect(await code(run(service, { source: 'leads', measures: [{ type: 'avg', field: 'latestProposalAmount' }] }))).toBe('REPORT_CURRENCY_MIXED');
  });

  it('dimensão de moeda → um ponto por moeda; filtro eq USD → 200; ne / nin / in com 2 → 400', async () => {
    const { service } = makeService(twoCurrencies());
    const byCur = await run(service, { source: 'leads', dimensions: [{ type: 'field', field: 'latestProposalCurrency' }], measures: [{ type: 'sum', field: 'latestProposalAmount' }] });
    expect(points(byCur.series[0])).toEqual([['BRL', 50], ['USD', 400]]);
    expect(byCur.meta.currency).toEqual({ mode: 'dimension', field: 'latestProposalCurrency' });
    const usd = await run(service, { source: 'leads', filters: [{ field: 'latestProposalCurrency', op: 'eq', value: 'USD' }], measures: [{ type: 'sum', field: 'latestProposalAmount' }] });
    expect(usd.series[0].points[0].value).toBe(400);
    for (const filter of [
      { field: 'latestProposalCurrency', op: 'ne' as const, value: 'USD' },
      { field: 'latestProposalCurrency', op: 'nin' as const, value: ['USD'] },
      { field: 'latestProposalCurrency', op: 'in' as const, value: ['USD', 'BRL'] },
    ]) {
      expect(await code(run(service, { source: 'leads', filters: [filter], measures: [{ type: 'sum', field: 'latestProposalAmount' }] }))).toBe('REPORT_CURRENCY_MIXED');
    }
  });

  it('medida sobre fonte de join exige o par do join, não o da fonte principal', async () => {
    const e = new FakeEngine();
    e.addTable('owner', 'leads', [lead('L1', { latestProposalCurrency: 'BRL' })]);
    e.addTable('owner', 'crmOpportunities', [{ id: 'o1', data: { leadId: 'L1', amount: 10, currency: 'USD' } }]);
    const { service } = makeService(e);
    const base: ReportSpec = { source: 'leads', joins: [{ leftField: 'id', rightSource: 'crmOpportunities', rightField: 'leadId', alias: 'opp' }], measures: [{ type: 'sum', field: 'opp.amount' }] };
    const err = await run(service, { ...base, filters: [{ field: 'latestProposalCurrency', op: 'eq', value: 'BRL' }] }).catch((x) => x);
    expect(err).toMatchObject({ errorCode: 'REPORT_CURRENCY_MIXED', details: { currencyField: 'opp.currency' } });
    const ok = await run(service, { ...base, dimensions: [{ type: 'field', field: 'opp.currency' }] });
    expect(points(ok.series[0])).toEqual([['USD', 10]]);
  });

  it('item 18: 2 leads USD + 1 com valor e sem moeda → 2 pontos, um deles __NO_CURRENCY__', async () => {
    const e = new FakeEngine();
    e.addTable('owner', 'leads', [
      lead('a', { latestProposalAmount: 10, latestProposalCurrency: 'USD' }),
      lead('b', { latestProposalAmount: 20, latestProposalCurrency: 'USD' }),
      lead('c', { latestProposalAmount: 5 }),
    ]);
    const out = await run(makeService(e).service, { source: 'leads', dimensions: [{ type: 'field', field: 'latestProposalCurrency' }], measures: [{ type: 'sum', field: 'latestProposalAmount' }] });
    expect(points(out.series[0])).toEqual([['__NO_CURRENCY__', 5], ['USD', 30]]);
  });

  it('item 19: campo monetário sem par soma sem 400, meta undeclared e sem converted.series', async () => {
    const e = new FakeEngine();
    e.addTable('owner', 'crmAccounts', [{ id: 'a', data: { revenue: 10 } }, { id: 'b', data: { revenue: 15 } }]);
    const { service } = makeService(e);
    const out = await run(service, { source: 'crmAccounts', measures: [{ type: 'sum', field: 'revenue' }] });
    expect(out.series[0].points[0].value).toBe(25);
    expect(out.meta.currency).toEqual({ mode: 'undeclared' });
    expect(await code(run(service, { source: 'crmAccounts', measures: [{ type: 'sum', field: 'revenue' }], convertTo: 'BRL' }))).toBe('REPORT_CONVERSION_NOT_APPLICABLE');
  });

  it('item 19: par sumido do schema vivo → undeclared, sem 400', async () => {
    const e = new FakeEngine();
    e.addTable('owner', 'leadProposals', [{ id: 'p', data: { amount: 7 } }], [{ name: 'amount', label: 'a', type: 'number', numberFormat: 'currency' }] as never);
    const out = await run(makeService(e).service, { source: 'leadProposals', measures: [{ type: 'sum', field: 'amount' }] });
    expect(out.meta.currency).toEqual({ mode: 'undeclared' });
  });
});

describe('item 24 — visão convertida à parte (PTAX venda, câmbio simulado)', () => {
  const mixed = (rows: Array<[number, string | undefined]>) => {
    const e = new FakeEngine();
    e.addTable('owner', 'leads', rows.map(([v, c], i) => lead(`l${i}`, { status: 'Open', latestProposalAmount: v, ...(c ? { latestProposalCurrency: c } : {}) })));
    return e;
  };
  const byCurrency: ReportSpec = { source: 'leads', dimensions: [{ type: 'field', field: 'latestProposalCurrency' }], measures: [{ type: 'sum', field: 'latestProposalAmount' }], convertTo: 'BRL' };

  it('100 USD + 50 BRL com PTAX 5,21320 → converted 571,32 e series intactas (2 pontos)', async () => {
    const { service, ptax } = makeService(mixed([[100, 'USD'], [50, 'BRL']]));
    ptax.rates.push({ currency: 'USD', rateDate: '2026-09-28', sellRateE5: 521320 });
    const out = await run(service, byCurrency);
    expect(points(out.series[0])).toEqual([['BRL', 50], ['USD', 100]]);
    expect(out.converted).toMatchObject({ target: 'BRL', referenceDate: '2026-09-28', excluded: [] });
    expect(points(out.converted!.series[0])).toEqual([['Total', 571.32]]);
    expect(out.converted!.rates).toEqual([{ currency: 'USD', side: 'venda', rate: 5.2132, rateDate: '2026-09-28', stale: false, source: 'BCB_PTAX_FECHAMENTO' }]);
    expect(RunCrmReportOutputSchema.safeParse(out).success).toBe(true);
  });

  it('avg com USD {100, 300} e BRL {50} → 711,76', async () => {
    const { service, ptax } = makeService(mixed([[100, 'USD'], [300, 'USD'], [50, 'BRL']]));
    ptax.rates.push({ currency: 'USD', rateDate: '2026-09-28', sellRateE5: 521320 });
    const out = await run(service, { ...byCurrency, measures: [{ type: 'avg', field: 'latestProposalAmount', alias: 'media' }] });
    expect(points(out.converted!.series[0])).toEqual([['Total', 711.76]]);
    expect(out.series[0].measure).toBe('media');
  });

  it('consulta no sábado → rateDate = sexta, stale false; taxa de 6 dias → stale true', async () => {
    const sabado = new Date('2026-09-26T15:00:00Z');
    const a = makeService(mixed([[100, 'USD']]), sabado);
    a.ptax.rates.push({ currency: 'USD', rateDate: '2026-09-25', sellRateE5: 519910 });
    const out = await run(a.service, byCurrency);
    expect(out.converted!.rates[0]).toMatchObject({ rateDate: '2026-09-25', stale: false });
    expect(out.converted!.referenceDate).toBe('2026-09-26');

    const b = makeService(mixed([[100, 'USD']]), new Date('2026-10-01T15:00:00Z'));
    b.ptax.rates.push({ currency: 'USD', rateDate: '2026-09-25', sellRateE5: 519910 });
    expect((await run(b.service, byCurrency)).converted!.rates[0].stale).toBe(true);
  });

  it('tabela vazia → excluded RATE_UNAVAILABLE com as linhas; sem moeda → NO_CURRENCY; nunca somem', async () => {
    const { service } = makeService(mixed([[100, 'USD'], [100, 'USD'], [50, 'BRL'], [9, undefined]]));
    const out = await run(service, byCurrency);
    expect(points(out.converted!.series[0])).toEqual([['Total', 50]]);
    expect(out.converted!.excluded).toEqual(
      expect.arrayContaining([
        { reason: 'RATE_UNAVAILABLE', measure: 'sum:latestProposalAmount', currency: 'USD', rows: 2 },
        { reason: 'NO_CURRENCY', measure: 'sum:latestProposalAmount', rows: 1 },
      ]),
    );
  });

  it('dimensão de moeda colapsa e as outras ficam: status × moeda → um ponto por status', async () => {
    const e = new FakeEngine();
    e.addTable('owner', 'leads', [
      lead('a', { status: 'Open', latestProposalAmount: 100, latestProposalCurrency: 'USD' }),
      lead('b', { status: 'Open', latestProposalAmount: 10, latestProposalCurrency: 'BRL' }),
      lead('c', { status: 'Won', latestProposalAmount: 1, latestProposalCurrency: 'BRL' }),
    ]);
    const { service, ptax } = makeService(e);
    ptax.rates.push({ currency: 'USD', rateDate: '2026-09-28', sellRateE5: 500000 });
    const out = await run(service, { ...byCurrency, dimensions: [{ type: 'field', field: 'status' }, { type: 'field', field: 'latestProposalCurrency' }] });
    expect(out.series[0].points.map((p) => p.name)).toEqual(['Open | BRL', 'Open | USD', 'Won | BRL']);
    expect(points(out.converted!.series[0])).toEqual([['Open', 510], ['Won', 1]]);
  });

  it('convertTo sem medida monetária → 400 REPORT_CONVERSION_NOT_APPLICABLE', async () => {
    const { service } = makeService(mixed([[1, 'BRL']]));
    expect(await code(run(service, { source: 'leads', measures: [{ type: 'count' }], convertTo: 'BRL' }))).toBe('REPORT_CONVERSION_NOT_APPLICABLE');
  });
});

describe('itens 3 e 12 — posse, ADMIN e widget', () => {
  const setup = async () => {
    const e = new FakeEngine();
    e.addTable('owner', 'leads', [lead('o1', { status: 'Open' }), lead('o2', { status: 'Open' })]);
    e.addTable('admin', 'leads', [lead('x1', { status: 'Won' })]);
    e.addTable('other', 'leads', []);
    const ctx = makeService(e);
    const r = await ctx.service.create(OWNER, { name: 'meu', kind: 'chart', chartType: 'bar', spec: { source: 'leads', dimensions: [{ type: 'field', field: 'status' }], measures: [{ type: 'count' }] } });
    await ctx.service.create(OTHER, { name: 'dele', kind: 'kpi', chartType: 'table', spec: { source: 'leads', measures: [{ type: 'count' }] } });
    return { ...ctx, r };
  };

  it('dono lista só os seus; ADMIN lista todos', async () => {
    const { service } = await setup();
    expect((await service.list(OWNER)).map((x) => x.name)).toEqual(['meu']);
    expect((await service.list(ADMIN)).map((x) => x.name).sort()).toEqual(['dele', 'meu']);
  });

  it('outro usuário comum → 404 REPORT_NOT_FOUND em get/put/delete/run', async () => {
    const { service, r } = await setup();
    for (const p of [service.get(OTHER, r.id), service.update(OTHER, r.id, { name: 'x' }), service.delete(OTHER, r.id), service.runSaved(OTHER, r.id, {})]) {
      expect(await p.catch((x) => [x.statusCode, x.errorCode])).toEqual([404, 'REPORT_NOT_FOUND']);
    }
  });

  it('ADMIN PUT/DELETE em alheio → ok e userId inalterado', async () => {
    const { service, reports, r } = await setup();
    const up = await service.update(ADMIN, r.id, { name: 'renomeado' });
    expect(up).toMatchObject({ name: 'renomeado', userId: 'owner' });
    await service.delete(ADMIN, r.id);
    expect(await reports.findById(r.id)).toBeNull();
  });

  it('run pelo ADMIN lê as linhas do DONO, não as do ADMIN', async () => {
    const { service, r } = await setup();
    expect(points((await service.runSaved(ADMIN, r.id, {})).series[0])).toEqual([['Open', 2]]);
  });

  it('widget com reportId apagado → 404 REPORT_NOT_FOUND', async () => {
    const { service, r } = await setup();
    await service.delete(OWNER, r.id);
    expect(await service.runSaved(OWNER, r.id, {}).catch((x) => x.errorCode)).toBe('REPORT_NOT_FOUND');
  });
});

describe('review independente do PR-2 — regressões', () => {
  it('duas etapas homônimas (funis diferentes) → dois pontos "Novo"; nenhum lead some, com e sem sort', async () => {
    const e = new FakeEngine();
    e.addTable('owner', 'leadStages', [{ id: 's1', data: { name: 'Novo' } }, { id: 's2', data: { name: 'Novo' } }]);
    e.addTable('owner', 'leads', [lead('a', { stageId: 's1' }), lead('b', { stageId: 's1' }), lead('c', { stageId: 's2' })]);
    const { service } = makeService(e);
    const spec: ReportSpec = { source: 'leads', dimensions: [{ type: 'field', field: 'stageId' }], measures: [{ type: 'count' }, { type: 'count', alias: 'n' }] };
    for (const s of [spec, { ...spec, sort: { by: 'measure' as const, key: 'n', dir: 'desc' as const } }]) {
      const out = await run(service, s);
      expect(out.series.map((x) => x.points.reduce((acc, p) => acc + p.value, 0))).toEqual([3, 3]);
      expect(out.series[1].points.map((p) => p.name)).toEqual(['Novo', 'Novo']);
    }
  });

  it('item 18 via join: linha sem par no join cai em __NO_CURRENCY__, nunca na chave vazia', async () => {
    const e = new FakeEngine();
    e.addTable('owner', 'leads', [lead('L1', {}), lead('L2', {})]);
    e.addTable('owner', 'crmOpportunities', [{ id: 'o1', data: { leadId: 'L1', amount: 10, currency: 'USD' } }]);
    const out = await run(makeService(e).service, {
      source: 'leads',
      joins: [{ leftField: 'id', rightSource: 'crmOpportunities', rightField: 'leadId', alias: 'opp' }],
      dimensions: [{ type: 'field', field: 'opp.currency' }],
      measures: [{ type: 'sum', field: 'opp.amount' }],
    });
    expect(points(out.series[0])).toEqual([['__NO_CURRENCY__', 0], ['USD', 10]]);
  });

  it('alias de join igual a campo da fonte → 400 REPORT_JOIN_ALIAS_DUPLICATE', async () => {
    const e = new FakeEngine();
    e.addTable('owner', 'leads', []);
    e.addTable('owner', 'crmOpportunities', []);
    expect(await code(run(makeService(e).service, { source: 'leads', joins: [{ leftField: 'id', rightSource: 'crmOpportunities', rightField: 'leadId', alias: 'status' }], measures: [{ type: 'count' }] }))).toBe('REPORT_JOIN_ALIAS_DUPLICATE');
  });

  it('E2 com dois joins: estourou no primeiro, o segundo nem começa a ler', async () => {
    const e = new FakeEngine();
    const many = (n: number, p: string): FakeRow[] => Array.from({ length: n }, (_, i) => ({ id: `${p}${i}`, data: {} }));
    e.addTable('owner', 'leads', many(CRM_REPORT_ROW_CAP - 5, 'l'));
    e.addTable('owner', 'crmOpportunities', many(10, 'o'));
    e.addTable('owner', 'crmAccounts', many(10, 'a'));
    const spec: ReportSpec = {
      source: 'leads',
      joins: [{ leftField: 'id', rightSource: 'crmOpportunities', rightField: 'id', alias: 'o' }, { leftField: 'id', rightSource: 'crmAccounts', rightField: 'id', alias: 'a' }],
      measures: [{ type: 'count' }],
    };
    expect(await code(run(makeService(e).service, spec))).toBe('REPORT_TOO_LARGE');
    expect(e.batches.some(([t]) => t === 'owner-crmAccounts')).toBe(false);
  });

  it('excluded NO_CURRENCY conta só linhas com valor (lead sem proposta não é excluído)', async () => {
    const e = new FakeEngine();
    e.addTable('owner', 'leads', [lead('a', { latestProposalAmount: 10, latestProposalCurrency: 'BRL' }), lead('b', { latestProposalAmount: 5 }), lead('c', {}), lead('d', {})]);
    const out = await run(makeService(e).service, { source: 'leads', dimensions: [{ type: 'field', field: 'latestProposalCurrency' }], measures: [{ type: 'sum', field: 'latestProposalAmount' }], convertTo: 'BRL' });
    expect(out.converted!.excluded).toEqual([{ reason: 'NO_CURRENCY', measure: 'sum:latestProposalAmount', rows: 1 }]);
  });
});
