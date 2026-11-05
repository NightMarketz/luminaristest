/**
 * FIX-TESTES item 4, lote 6 (BRIEF `FIX-TESTES-REPO-FALSO-POR-ROTA`, itens 2–4): as 4 últimas leituras de
 * `/api/accounting` sem `request(app)` em integração (`docs/operating-manual/COBERTURA-ROTAS-CONTABIL-2026-11-05.md`):
 * comprovante PDF do lançamento, lista de jobs de intercâmbio, esqueleto do de-para referencial e JCP por id.
 *
 * Cada rota: caminho feliz pela HTTP (`makeApp` + `authHeader`, policy e repositórios reais, SQLite de integração) e uma
 * guarda no estado em que ela morde (A2). O esperado é FIXO, calculado à mão do cenário semeado, com datas literais (A7).
 * Não repete os valores dos units (A1).
 *
 * Comprovante: o Jest do server mapeia `puppeteer` para `test/mocks/puppeteer.ts` (pacote só ESM; `launch()` rejeita), então
 * nenhum teste renderiza Chromium. Segue o padrão de `packageAcceptance.integration.test.ts`: `htmlToPdf` devolve
 * `%PDF-stub <html>`, e a asserção é sobre o CONTEÚDO que o serviço real mandou renderizar (número, data, histórico,
 * contas e valor), não só sobre o tamanho do corpo. Fica de fora a fidelidade do Chromium (layout, fontes).
 *
 * Por `prisma.*` (fora das rotas testadas): usuário, unidade, período OPEN, jobs de intercâmbio com `createdAt` literal,
 * de-para das folhas que não entram no esqueleto, e o cenário do JCP (contas, perfis fiscais, sócios — molde do
 * `jcpConfirm.integration.test.ts`). O JCP em si nasce pela rota de confirmação.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { htmlToPdf } from '@/lib/pdf';
import { getFactory } from '@/lib/factory';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';

jest.mock('@/lib/pdf', () => ({ htmlToPdf: jest.fn(async (html: string) => Buffer.from(`%PDF-stub ${html}`, 'utf8')) }));

const app = makeApp();
const A = '/api/accounting';
type U = { id: string; username: string };

async function criarDono(tag: string): Promise<U> {
  return prisma.user.create({
    data: { name: tag, username: tag, email: `${tag}@test.local`, password: 'x', role: 'USER' },
  });
}

const abrirPeriodo = (u: U, unitId: string, year: number, month: number) =>
  prisma.accountingPeriod.create({
    data: { userId: u.id, unitId, year, month, status: 'OPEN', openedAt: new Date(), openedById: u.id },
  });

async function lancar(u: U, unitId: string, date: string, debito: string, credito: string, cents: number, description = `lançamento ${date}`) {
  const res = await request(app)
    .post(`${A}/post`)
    .set(authHeader(u))
    .send({
      unitId,
      date,
      description,
      lines: [
        { accountCode: debito, debitCents: cents, creditCents: 0 },
        { accountCode: credito, debitCents: 0, creditCents: cents },
      ],
    });
  expect(res.status).toBe(201);
  return res.body.data.id as string;
}

beforeAll(() => {
  pushTestSchema();
}, 120000);

afterAll(async () => {
  await prisma.$disconnect();
});

// ── 1. GET /journal-entries/:entryId/receipt (PDF) ────────────────────────────────────────────────────────────────
describe('comprovante: GET /api/accounting/journal-entries/:entryId/receipt', () => {
  const UNIT = 'unit-l6-recibo';
  const UNIT_OUTRO = 'unit-l6-recibo-outro';
  let dono: U;
  let outro: U;
  let entryId: string;

  const recibo = (u: U, unitId: string, id: string) =>
    request(app)
      .get(`${A}/journal-entries/${id}/receipt`)
      .query({ unitId })
      .set(authHeader(u))
      .buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on('data', (c: Buffer) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });

  beforeAll(async () => {
    dono = await criarDono('l6-recibo');
    outro = await criarDono('l6-recibo-outro');
    await seedUnit({ userId: dono.id, id: UNIT });
    await seedUnit({ userId: outro.id, id: UNIT_OUTRO });
    await abrirPeriodo(dono, UNIT, 2026, 6);
    // 1º lançamento da unidade em 2026: D Banco / C Receita de Serviços, R$ 1.234,56 em 10/06/2026.
    entryId = await lancar(dono, UNIT, '2026-06-10', '1.1.1.01', '3.1', 123_456, 'Serviço L6 prestado');
  }, 120000);

  it('200 application/pdf: o documento renderizado tem o nº 1/2026, a data, o histórico, as duas contas e R$ 1.234,56', async () => {
    (htmlToPdf as jest.Mock).mockClear();
    const res = await recibo(dono, UNIT, entryId);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^application\/pdf/);
    expect(res.headers['content-disposition']).toBe('attachment; filename="comprovante-lancamento-2026-1.pdf"');
    const pdf = res.body as Buffer;
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(res.headers['content-length']).toBe(String(pdf.length));
    expect(htmlToPdf).toHaveBeenCalledTimes(1);

    const text = pdf.toString('utf8');
    expect(text).toContain('Comprovante de Lançamento Contábil');
    expect(text).toContain('Lançamento nº 1/2026');
    expect(text).toContain('10/06/2026');
    expect(text).toContain('Serviço L6 prestado');
    expect(text).toMatch(/1\.1\.1\.01<\/td>\s*<td class="name">Banco<\/td>\s*<td class="num">R\$ 1\.234,56<\/td>\s*<td class="num"><\/td>/);
    expect(text).toMatch(/3\.1<\/td>\s*<td class="name">Receita de Serviços<\/td>\s*<td class="num"><\/td>\s*<td class="num">R\$ 1\.234,56<\/td>/);
    // Débito do banco, crédito da receita e os dois totais: 4 ocorrências do mesmo valor.
    expect(text.match(/R\$ 1\.234,56/g)).toHaveLength(4);
  });

  it('guarda: lançamento de outro dono → 404 sem PDF; id inexistente → 404', async () => {
    (htmlToPdf as jest.Mock).mockClear();
    const alheio = await recibo(outro, UNIT_OUTRO, entryId);
    expect(alheio.status).toBe(404);
    expect(alheio.headers['content-type']).not.toMatch(/pdf/);

    const inexistente = await recibo(dono, UNIT, 'l6-nao-existe');
    expect(inexistente.status).toBe(404);
    expect(htmlToPdf).not.toHaveBeenCalled();
  });
});

// ── 2. GET /data-exchange/jobs ────────────────────────────────────────────────────────────────────────────────────
describe('intercâmbio: GET /api/accounting/data-exchange/jobs', () => {
  const UNIT = 'unit-l6-jobs';
  const UNIT_OUTRO = 'unit-l6-jobs-outro';
  let dono: U;
  let outro: U;
  const ids: Record<'ecdOriginal' | 'ecdSubstituta' | 'importCsv' | 'doOutro', string> = {
    ecdOriginal: '', ecdSubstituta: '', importCsv: '', doOutro: '',
  };

  const job = (u: U, unitId: string, data: Record<string, unknown>) =>
    prisma.accountingDataExchangeJob.create({ data: { userId: u.id, unitId, requestedById: u.id, ...data } as never });
  const listar = (u: U, unitId: string, filtro: Record<string, string> = {}) =>
    request(app).get(`${A}/data-exchange/jobs`).query({ unitId, ...filtro }).set(authHeader(u));

  beforeAll(async () => {
    dono = await criarDono('l6-jobs');
    outro = await criarDono('l6-jobs-outro');
    await seedUnit({ userId: dono.id, id: UNIT });
    await seedUnit({ userId: outro.id, id: UNIT_OUTRO });
    const ecd = { direction: 'EXPORT', kind: 'EXPORT_SPED_ECD', status: 'EXPORTED', periodStart: new Date('2026-01-01T00:00:00.000Z'), periodEnd: new Date('2026-12-31T00:00:00.000Z') };
    ids.ecdOriginal = (await job(dono, UNIT, { ...ecd, sha256: 'a'.repeat(64), sizeBytes: 1000, createdAt: new Date('2026-07-01T10:00:00.000Z') })).id;
    ids.importCsv = (await job(dono, UNIT, {
      direction: 'IMPORT', kind: 'IMPORT_JOURNAL_CSV', status: 'COMMITTED', originalName: 'lancamentos.csv', mimeType: 'text/csv',
      totalRows: 3, validRows: 2, invalidRows: 1, committedRows: 2, createdAt: new Date('2026-07-02T10:00:00.000Z'),
    })).id;
    ids.ecdSubstituta = (await job(dono, UNIT, {
      ...ecd, sha256: 'b'.repeat(64), sizeBytes: 1100, supersedesJobId: ids.ecdOriginal, createdAt: new Date('2026-07-03T10:00:00.000Z'),
    })).id;
    ids.doOutro = (await job(outro, UNIT_OUTRO, { ...ecd, sha256: 'c'.repeat(64), createdAt: new Date('2026-07-04T10:00:00.000Z') })).id;
  }, 120000);

  it('200: os 3 jobs do dono, do mais novo ao mais velho, com a ligação substituta ↔ original nas duas pontas', async () => {
    const res = await listar(dono, UNIT);
    expect(res.status).toBe(200);
    expect([res.body.data.total, res.body.data.page, res.body.data.limit]).toEqual([3, 1, 20]);
    const resumo = (res.body.data.items as Array<Record<string, unknown>>).map((j) => [
      j.id, j.direction, j.kind, j.status, j.periodStart, j.periodEnd, j.supersedesJobId, j.supersededByJobId,
    ]);
    expect(resumo).toEqual([
      [ids.ecdSubstituta, 'EXPORT', 'EXPORT_SPED_ECD', 'EXPORTED', '2026-01-01', '2026-12-31', ids.ecdOriginal, null],
      [ids.importCsv, 'IMPORT', 'IMPORT_JOURNAL_CSV', 'COMMITTED', null, null, null, null],
      [ids.ecdOriginal, 'EXPORT', 'EXPORT_SPED_ECD', 'EXPORTED', '2026-01-01', '2026-12-31', null, ids.ecdSubstituta],
    ]);
    expect(res.body.data.items[1]).toMatchObject({ fileName: 'lancamentos.csv', mimeType: 'text/csv', totalRows: 3, validRows: 2, invalidRows: 1, committedRows: 2 });

    // Filtro + paginação: só EXPORT de 2026, 1 por página, 2ª página = a original.
    const pag = await listar(dono, UNIT, { direction: 'EXPORT', year: '2026', limit: '1', page: '2' });
    expect(pag.status).toBe(200);
    expect([pag.body.data.total, pag.body.data.items.map((j: { id: string }) => j.id)]).toEqual([2, [ids.ecdOriginal]]);
  });

  it('guarda: o job do outro dono (mais novo, mesmo tipo e ano) não entra na lista do dono; o outro vê só o dele', async () => {
    const res = await listar(dono, UNIT, { kind: 'EXPORT_SPED_ECD', year: '2026' });
    expect(res.status).toBe(200);
    expect([res.body.data.total, res.body.data.items.map((j: { id: string }) => j.id)]).toEqual([2, [ids.ecdSubstituta, ids.ecdOriginal]]);

    const doOutro = await listar(outro, UNIT_OUTRO);
    expect(doOutro.status).toBe(200);
    expect([doOutro.body.data.total, doOutro.body.data.items.map((j: { id: string }) => j.id)]).toEqual([1, [ids.doOutro]]);
  });
});

// ── 3. GET /referential/skeleton ──────────────────────────────────────────────────────────────────────────────────
describe('de-para referencial: GET /api/accounting/referential/skeleton', () => {
  const UNIT = 'unit-l6-esq';
  const UNIT_OUTRO = 'unit-l6-esq-outro';
  const VERSAO = 'L6-ESQ';
  let dono: U;
  let outro: U;
  const contasDo = async (u: U, unitId: string) => {
    expect((await request(app).get(`${A}/accounts`).query({ unitId }).set(authHeader(u))).status).toBe(200);
    return prisma.account.findMany({ where: { userId: u.id, unitId, deletedAt: null } });
  };
  const esqueleto = (u: U, unitId: string, version = VERSAO) =>
    request(app).get(`${A}/referential/skeleton`).query({ unitId, version }).set(authHeader(u));

  beforeAll(async () => {
    dono = await criarDono('l6-esq');
    outro = await criarDono('l6-esq-outro');
    await seedUnit({ userId: dono.id, id: UNIT });
    await seedUnit({ userId: outro.id, id: UNIT_OUTRO });
    // Mapeia todas as folhas do plano padrão do dono menos Banco (1.1.1.01) e Receita de Serviços (3.1).
    const folhas = (await contasDo(dono, UNIT)).filter((c) => c.acceptsEntries && !['1.1.1.01', '3.1'].includes(c.code));
    await prisma.referentialMapping.createMany({
      data: folhas.map((c, i) => ({ userId: dono.id, unitId: UNIT, accountId: c.id, referentialCode: `9.${i}`, label: `ref ${c.code}`, mappingVersion: VERSAO })),
    });
    // O outro dono mapeia o Banco DELE na mesma versão.
    const bancoDoOutro = (await contasDo(outro, UNIT_OUTRO)).find((c) => c.code === '1.1.1.01');
    await prisma.referentialMapping.create({
      data: { userId: outro.id, unitId: UNIT_OUTRO, accountId: bancoDoOutro!.id, referentialCode: '9.99', label: 'ref banco outro', mappingVersion: VERSAO },
    });
  }, 120000);

  it('200: o esqueleto da versão tem só as 2 folhas sem de-para, em ordem de código, com nome e natureza', async () => {
    const banco = await prisma.account.findFirstOrThrow({ where: { userId: dono.id, unitId: UNIT, code: '1.1.1.01' } });
    const receita = await prisma.account.findFirstOrThrow({ where: { userId: dono.id, unitId: UNIT, code: '3.1' } });
    const res = await esqueleto(dono, UNIT);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      unitId: UNIT,
      mappingVersion: VERSAO,
      items: [
        { accountId: banco.id, code: '1.1.1.01', name: 'Banco', nature: 'Asset' },
        { accountId: receita.id, code: '3.1', name: 'Receita de Serviços', nature: 'Revenue' },
      ],
    });
  });

  it('guarda: o de-para do Banco do outro dono não tira o Banco do esqueleto do dono; folha com deletedAt sai do esqueleto', async () => {
    const receita = await prisma.account.findFirstOrThrow({ where: { userId: dono.id, unitId: UNIT, code: '3.1' } });
    await prisma.account.update({ where: { id: receita.id }, data: { deletedAt: new Date('2026-07-01T00:00:00.000Z') } });
    try {
      const res = await esqueleto(dono, UNIT);
      expect(res.status).toBe(200);
      expect(res.body.data.items.map((i: { code: string }) => i.code)).toEqual(['1.1.1.01']);
    } finally {
      await prisma.account.update({ where: { id: receita.id }, data: { deletedAt: null } });
    }
  });
});

// ── 4. GET /jcp/:id ──────────────────────────────────────────────────────────────────────────────────────────────
describe('JCP: GET /api/accounting/jcp/:id', () => {
  const CONTAS = [
    { code: '1.1.1.01', name: 'Banco', nature: 'Asset' },
    { code: '2.1.7.02', name: 'JCP a Pagar', nature: 'Liability' },
    { code: '2.1.7.03', name: 'IRRF a Recolher', nature: 'Liability' },
    { code: '2.3.1.01', name: 'Lucros Acumulados', nature: 'Equity' },
    { code: '2.3.2.01', name: 'Capital Social Integralizado', nature: 'Equity' },
    { code: '2.3.3.01', name: 'Reserva Legal', nature: 'Equity' },
    { code: '4.3.4', name: 'Juros sobre o Capital Próprio', nature: 'Expense' },
  ];
  type Dono = U & { unitId: string; ids: Record<string, string>; socios: string[] };
  let dono: Dono;
  let outro: U;
  const UNIT_OUTRO = 'unit-l6-jcp-outro';
  let jcpId: string;

  async function cenario(tag: string): Promise<Dono> {
    const u = await criarDono(tag);
    const unitId = `unit-${tag}`;
    await seedUnit({ userId: u.id, id: unitId });
    const ids: Record<string, string> = {};
    for (const c of CONTAS) ids[c.code] = (await prisma.account.create({ data: { userId: u.id, unitId, ...c, acceptsEntries: true } })).id;
    for (const year of [2025, 2026]) {
      for (let month = 1; month <= 12; month++) await abrirPeriodo(u, unitId, year, month);
    }
    await prisma.companyFiscalProfile.create({
      data: {
        userId: u.id, anoCalendario: 2026, regime: 'REAL', ecfIndAliqCsll: '1', ecfIndRecReceita: '2',
        jcpBaseContas: {
          CAPITAL_INTEGRALIZADO: [ids['2.3.2.01']], RESERVAS_CAPITAL: [], RESERVAS_LUCROS: [ids['2.3.3.01']], ACOES_TESOURARIA: [], LUCROS_ACUMULADOS: [ids['2.3.1.01']],
        },
      },
    });
    await prisma.fiscalProfile.create({
      data: {
        userId: u.id, unitId, regimeTributario: 'REAL', pisCofinsRegime: 'NAO_CUMULATIVO',
        jcpDespesaAccountId: ids['4.3.4'], jcpPagarAccountId: ids['2.1.7.02'], irrfRecolherAccountId: ids['2.1.7.03'],
      },
    });
    const socios: string[] = [];
    for (const [i, [taxId, bp]] of ([['52998224725', 6000], ['39053344705', 4000]] as const).entries()) {
      socios.push((await prisma.partner.create({ data: { userId: u.id, nome: `S${i}`, taxId, tipoPessoa: 'PF', residenteBrasil: true, participacaoBp: bp, entradaEm: '2025-01-01' } })).id);
    }
    const scope = resolveAccountingScopeInternal({ userId: u.id }, unitId);
    // PL em 31/12/2025: capital R$ 1.000.000,00 + lucros acumulados R$ 100.000,00.
    for (const [credito, cents] of [['2.3.2.01', 100_000_000], ['2.3.1.01', 10_000_000]] as const) {
      await getFactory().getPostingService().postEntry(scope, {
        unitId, date: '2025-12-31', description: `PL ${credito}`, sourceType: 'manual',
        lines: [{ accountCode: '1.1.1.01', debitCents: cents, creditCents: 0 }, { accountCode: credito, debitCents: 0, creditCents: cents }],
      });
    }
    return { ...u, unitId, ids, socios };
  }

  const ler = (u: U, unitId: string, id: string) => request(app).get(`${A}/jcp/${id}`).query({ unitId }).set(authHeader(u));

  beforeAll(async () => {
    dono = await cenario('l6-jcp');
    outro = await criarDono('l6-jcp-outro');
    await seedUnit({ userId: outro.id, id: UNIT_OUTRO });
    const corpo = { unitId: dono.unitId, anoCalendario: 2026, periodo: 'T01', dataCredito: '2026-01-31', forma: 'DESPESA', totalCents: 500_000 };
    const previa = await request(app).post(`${A}/jcp/preview`).set(authHeader(dono)).send(corpo);
    expect(previa.status).toBe(200);
    const conf = await request(app).post(`${A}/jcp`).set(authHeader(dono)).send({ ...corpo, previaSha256: previa.body.data.previaSha256 });
    expect(conf.status).toBe(201);
    jcpId = conf.body.data.id;
  }, 120000);

  it('200: o JCP gravado relido com os valores calculados à mão (TJLP T01, limite, IRRF 17,5%, rateio 60/40)', async () => {
    // À mão: base R$ 1.100.000,00 × TJLP de jan/2026 0,7658% = R$ 8.423,80 (crédito em 31/01: mês cheio).
    // Limite: sem receita, 50% do lucro = 0; 50% de lucros acumulados + reservas = R$ 50.000,00; o maior (50.000) contra os
    // juros (8.423,80) ⇒ 8.423,80. Total R$ 5.000,00 < limite ⇒ excesso 0. IRRF 17,5% = R$ 875,00; líquido R$ 4.125,00.
    // Rateio: 60% = 3.000 (IRRF 525, líquido 2.475); 40% = 2.000 (IRRF 350, líquido 1.650).
    const res = await ler(dono, dono.unitId, jcpId);
    expect(res.status).toBe(200);
    const entry = await prisma.journalEntry.findFirstOrThrow({ where: { userId: dono.id, sourceType: 'jcp.credit' } });
    expect(res.body.data).toMatchObject({
      id: jcpId,
      unitId: dono.unitId,
      anoCalendario: 2026,
      periodo: 'T01',
      dataCredito: '2026-01-31',
      forma: 'DESPESA',
      debitoAccountId: dono.ids['4.3.4'],
      totalCents: 500_000,
      irrfCents: 87_500,
      liquidoCents: 412_500,
      jurosMaxTjlpCents: 842_380,
      limiteDedutivelCents: 842_380,
      excessoCents: 0,
      status: 'POSTED',
      entryId: entry.id,
      lalurEntryIds: [],
    });
    expect(res.body.data.alocacoes).toEqual([
      { partnerId: dono.socios[0], participacaoBp: 6000, brutoCents: 300_000, irrfCents: 52_500, liquidoCents: 247_500 },
      { partnerId: dono.socios[1], participacaoBp: 4000, brutoCents: 200_000, irrfCents: 35_000, liquidoCents: 165_000 },
    ]);
  });

  it('guarda: JCP de outro dono → 404; JCP com deletedAt → 404; id inexistente → 404', async () => {
    expect((await ler(outro, UNIT_OUTRO, jcpId)).status).toBe(404);
    expect((await ler(dono, dono.unitId, 'l6-jcp-nao-existe')).status).toBe(404);

    await prisma.interestOnEquityCalculation.update({ where: { id: jcpId }, data: { deletedAt: new Date('2026-07-01T00:00:00.000Z') } });
    try {
      expect((await ler(dono, dono.unitId, jcpId)).status).toBe(404);
    } finally {
      await prisma.interestOnEquityCalculation.update({ where: { id: jcpId }, data: { deletedAt: null } });
    }
  });
});
