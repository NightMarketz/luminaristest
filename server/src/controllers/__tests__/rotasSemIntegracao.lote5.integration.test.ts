/**
 * FIX-TESTES item 4, lote 5 (BRIEF `FIX-TESTES-REPO-FALSO-POR-ROTA`, itens 2–4): a última escrita cadastral que o
 * inventário tinha contado como leitura (`POST /simples/simulacoes/fator-r/sugestao`, que grava a sugestão do SYSTEM) e
 * 7 leituras sem `request(app)` em integração (`docs/operating-manual/COBERTURA-ROTAS-CONTABIL-2026-11-05.md`): linhas do
 * extrato, sugestões de uma linha, relatório de pendências da conciliação, lista de revisões, lista dos perfis fiscais de
 * serviço, anexos de um lançamento e signatário por id.
 *
 * Cada rota: caminho feliz pela HTTP (`makeApp` + `authHeader`, policy e repositórios reais, SQLite de integração) e uma
 * guarda no estado em que ela morde (A2). Na escrita, 2ª leitura (a linha gravada e o GET da simulação). Nas leituras, o
 * esperado é FIXO, calculado à mão do cenário semeado, com datas literais (A7). Não repete os valores dos units (A1).
 *
 * Por `prisma.*` (fora das rotas testadas): usuário, unidade, período OPEN, linha de job ECD (atalho do lote 1), perfil
 * fiscal de serviço do cenário do fator r e UMA linha de parâmetro legal (enquadramento sujeito ao fator r, que a carga
 * oficial não tem: as 5 linhas `SIMPLES_ENQUADRAMENTO` semeadas são `fatorR:false`), apagada no fim.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';
import { ApplicationFactory } from '@/lib/factory';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';
import { maybeSyncSaleFinalized } from '@/features/accounting/sync/bridges/SaleSalesAccountingBridge';

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

async function lancar(u: U, unitId: string, date: string, debito: string, credito: string, cents: number) {
  const res = await request(app)
    .post(`${A}/post`)
    .set(authHeader(u))
    .send({
      unitId,
      date,
      description: `lançamento ${date}`,
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

// ── 1. Escrita cadastral: POST /simples/simulacoes/fator-r/sugestao ───────────────────────────────────────────────
describe('fator r: POST /api/accounting/simples/simulacoes/fator-r/sugestao', () => {
  const CNPJ_UNIDADE = '11222333000181';
  const ENQ_ID = 'l5-enq-servico-170101';
  const f = () => ApplicationFactory.getInstance();
  let dono: U;
  let UNIT: string;
  let tables: Record<'sales' | 'saleItems' | 'units', string>;
  const scope = (): AccountingScope => resolveAccountingScopeInternal({ userId: dono.id }, UNIT);

  async function row(table: keyof typeof tables, data: Record<string, unknown>) {
    const stored = typeof data.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.date) ? { ...data, date: `${data.date}T00:00:00.000Z` } : data;
    return prisma.dynamicTableData.create({ data: { dynamicTableId: tables[table], data: stored as never } });
  }

  const q = (folhaAlvoCents: string) => ({ unitId: UNIT, competencia: '2026-06', folhaAlvoCents, tipoFolha: 'PRO_LABORE' });
  const propor = (folhaAlvoCents: string) => request(app).post(`${A}/simples/simulacoes/fator-r/sugestao`).set(authHeader(dono)).send(q(folhaAlvoCents));
  const simular = (folhaAlvoCents: string) => request(app).get(`${A}/simples/simulacoes/fator-r`).query(q(folhaAlvoCents)).set(authHeader(dono));

  beforeAll(async () => {
    dono = await criarDono('l5-fatorr');
    const created = await request(app).post('/api/dashboard/create').set(authHeader(dono)).send({ suiteKey: 'beautySalon', unit: { name: 'Matriz' } });
    expect(created.status).toBe(201);
    const byName = async (n: string) => (await prisma.dynamicTable.findFirstOrThrow({ where: { userId: dono.id, internalName: n } })).id;
    tables = { sales: await byName('sales'), saleItems: await byName('saleItems'), units: await byName('units') };
    UNIT = (await row('units', { name: 'Matriz', cnpj: CNPJ_UNIDADE })).id;
    await f().getPostingService().ensureChartOfAccounts(scope());
    await abrirPeriodo(dono, UNIT, 2026, 6);
    // LC 116 item 17.01; Res. CGSN 140 art. 25 § 1º V e art. 26 (Anexo V, III com r ≥ 0,28) — só no teste.
    await prisma.legalParameter.create({
      data: {
        id: ENQ_ID, tabela: 'SIMPLES_ENQUADRAMENTO', chave: 'SERVICO:170101', valorJson: JSON.stringify({ anexo: 'V', fatorR: true, semIss: false }),
        fonte: 'teste do lote 5 — enquadramento sujeito ao fator r', vigenteDesde: '2018-01-01', status: 'PUBLISHED', motivo: 'teste', proposedById: dono.id,
      },
    });
    await f().getLegalParameterService().aquecer();
    await prisma.serviceFiscalProfile.create({ data: { userId: dono.id, unitId: UNIT, serviceRef: 'srv-consultoria', cTribNac: '170101' } });
    expect((await request(app).put(`${A}/company-fiscal-profile/2026`).set(authHeader(dono)).send({ unitId: UNIT, regime: 'SIMPLES' })).status).toBe(200);
    // Pré-adoção, 2025-06 a 2026-05: R$ 50.000 de receita e R$ 12.000 de folha por mês ⇒ RBT12 R$ 600.000, FS12 R$ 144.000.
    for (let i = 0; i < 12; i++) {
      const m = new Date(Date.UTC(2025, 5 + i, 1)).toISOString().slice(0, 7);
      await f().getSimplesEntradasService().upsertHistorico(scope(), m, { unitId: UNIT, receitaBrutaCents: 5_000_000, folhaCents: 1_200_000 });
    }
    // O PA: uma venda de R$ 50.000 do serviço 17.01, pela ponte real.
    const sale = await row('sales', { status: 'Finalized', unitId: UNIT, subtotal: 50_000, totalAmount: 50_000, currency: 'BRL', date: '2026-06-15', paymentStatus: 'Pending' });
    await row('saleItems', { saleId: sale.id, type: 'Service', serviceId: 'srv-consultoria', description: 'Consultoria', quantity: 1, unitPrice: 50_000 });
    await maybeSyncSaleFinalized({ userId: dono.id }, tables.sales, { id: sale.id, data: sale.data });
  }, 120000);

  afterAll(async () => {
    await prisma.legalParameter.deleteMany({ where: { id: ENQ_ID } });
    await f().getLegalParameterService().aquecer();
  });

  it('POST 201: grava 1 PROPOSED do SYSTEM; a releitura (linha e GET da simulação) tem a economia calculada à mão', async () => {
    // À mão (RBT12 R$ 600.000, faixa 3): Anexo V 19,5% − R$ 9.900 ⇒ 17,85% × R$ 50.000 = R$ 8.925,00 (r = 144/600 = 0,24);
    // Anexo III 13,5% − R$ 17.640 ⇒ 10,56% × R$ 50.000 = R$ 5.280,00 (r = 168/600 = 0,28). Folha adicional R$ 24.000 =
    // R$ 2.000/mês × 11% (abaixo do teto do RGPS) × 12 = R$ 2.640,00. Economia = 8.925 − 5.280 − 2.640 = R$ 1.005,00.
    const res = await propor('16800000');
    expect(res.status).toBe(201);
    expect([res.body.data.reaproveitada, res.body.data.avisos]).toEqual([false, []]);
    const id = res.body.data.suggestionId as string;

    const linha = await prisma.taxOptimizationSuggestion.findUniqueOrThrow({ where: { id } });
    expect(linha).toMatchObject({
      unitId: UNIT, practice: 'FATOR_R_FOLHA', subjectType: 'COMPETENCIA', subjectId: '2026-06', status: 'PROPOSED', proposedBy: 'SYSTEM', estimatedSavingCents: 100_500n,
    });

    const sim = await simular('16800000');
    expect(sim.status).toBe(200);
    expect(sim.body.data).toMatchObject({
      rAtual: 0.24, rSimulado: 0.28, anexoAtual: 'V', anexoSimulado: 'III',
      fs12AtualCents: '14400000', folhaAdicionalCents: '2400000', dasAtualCents: '892500', dasSimuladoCents: '528000',
      custoFolhaAdicionalCents: '264000', economiaLiquidaCents: '100500',
    });
    expect(linha.parametrosSha256).toBe(sim.body.data.parametrosSha256);
  });

  it('guarda: PROPOSED viva calculada com outra folha-alvo → mesmo id, aviso I-10 e a linha não é recalculada', async () => {
    const viva = await prisma.taxOptimizationSuggestion.findFirstOrThrow({ where: { unitId: UNIT, practice: 'FATOR_R_FOLHA', status: 'PROPOSED' } });

    const res = await propor('17000000');
    expect(res.status).toBe(201);
    expect(res.body.data.suggestionId).toBe(viva.id);
    expect(res.body.data.avisos[0]).toMatch(/não foi recalculada \(I-10\)/);
    expect(await prisma.taxOptimizationSuggestion.count({ where: { unitId: UNIT } })).toBe(1);
    const relida = await prisma.taxOptimizationSuggestion.findUniqueOrThrow({ where: { id: viva.id } });
    expect([relida.parametrosSha256, relida.estimatedSavingCents]).toEqual([viva.parametrosSha256, 100_500n]);
  });
});

// ── 2–4. Conciliação: GET /statements/:id/lines, /lines/:id/suggestions, /pending ─────────────────────────────────
describe('conciliação: GET /statements/:id/lines, /lines/:id/suggestions, /reconciliation/pending', () => {
  const UNIT = 'unit-l5-recon';
  const UNIT_OUTRO = 'unit-l5-recon-outro';
  let dono: U;
  let outro: U;
  let bancoId: string;
  let bancoDoOutro: string;
  let statementId: string;
  const linhas: Record<'L1' | 'L2' | 'L3', string> = { L1: '', L2: '', L3: '' };
  const entradas: Record<'E1' | 'E2' | 'E3' | 'E5' | 'E6', string> = { E1: '', E2: '', E3: '', E5: '', E6: '' };
  const postingDoBanco = async (entryId: string) => (await prisma.posting.findFirstOrThrow({ where: { entryId, accountId: bancoId } })).id;

  const lerLinhas = (u: U, unitId: string, status?: string) =>
    request(app).get(`${A}/reconciliation/statements/${statementId}/lines`).query({ unitId, ...(status ? { status } : {}) }).set(authHeader(u));
  const sugestoes = (lineId: string) => request(app).get(`${A}/reconciliation/lines/${lineId}/suggestions`).query({ unitId: UNIT }).set(authHeader(dono));
  const pendencias = (u: U, unitId: string, glAccountId: string, janela: Record<string, string> = {}) =>
    request(app).get(`${A}/reconciliation/pending`).query({ unitId, glAccountId, ...janela }).set(authHeader(u));

  beforeAll(async () => {
    dono = await criarDono('l5-recon');
    outro = await criarDono('l5-recon-outro');
    await seedUnit({ userId: dono.id, id: UNIT });
    await seedUnit({ userId: outro.id, id: UNIT_OUTRO });
    await abrirPeriodo(dono, UNIT, 2026, 6);
    await abrirPeriodo(outro, UNIT_OUTRO, 2026, 6);
    // Banco 1.1.1.01: entradas de R$ 150 em 10/06, 13/06 e 15/06; R$ 80 em 20/06; saída de R$ 30 em 22/06.
    entradas.E1 = await lancar(dono, UNIT, '2026-06-10', '1.1.1.01', '3.1', 15000);
    entradas.E2 = await lancar(dono, UNIT, '2026-06-13', '1.1.1.01', '3.1', 15000);
    entradas.E5 = await lancar(dono, UNIT, '2026-06-15', '1.1.1.01', '3.1', 15000);
    entradas.E3 = await lancar(dono, UNIT, '2026-06-20', '1.1.1.01', '3.1', 8000);
    entradas.E6 = await lancar(dono, UNIT, '2026-06-22', '4.1', '1.1.1.01', 3000);
    await lancar(outro, UNIT_OUTRO, '2026-06-10', '1.1.1.01', '3.1', 15000);
    bancoId = (await prisma.account.findFirstOrThrow({ where: { userId: dono.id, unitId: UNIT, code: '1.1.1.01' } })).id;
    bancoDoOutro = (await prisma.account.findFirstOrThrow({ where: { userId: outro.id, unitId: UNIT_OUTRO, code: '1.1.1.01' } })).id;

    const csv = Buffer.from(
      'date,amountCents,description,externalRef\n2026-06-11,15000,PIX A,tx-1\n2026-06-22,-3000,Tarifa,tx-2\n2026-06-28,99900,Sem par,tx-3\n',
      'utf8',
    );
    const imp = await request(app)
      .post(`${A}/reconciliation/statements`)
      .set(authHeader(dono))
      .field('unitId', UNIT)
      .field('glAccountId', bancoId)
      .field('periodStart', '2026-06-01')
      .field('periodEnd', '2026-06-30')
      .attach('file', csv, { filename: 'extrato.csv', contentType: 'text/csv' });
    expect(imp.status).toBe(201);
    statementId = (imp.body.data.statement?.id ?? imp.body.data.id) as string;
    const gravadas = await prisma.bankStatementLine.findMany({ where: { statementId }, orderBy: { lineNumber: 'asc' } });
    [linhas.L1, linhas.L2, linhas.L3] = gravadas.map((l) => l.id);
  }, 120000);

  it('GET /lines 200: as 3 linhas do CSV na ordem do arquivo, todas UNMATCHED e sem vínculo', async () => {
    const res = await lerLinhas(dono, UNIT);
    expect(res.status).toBe(200);
    expect(res.body.data.statement.id).toBe(statementId);
    expect(
      res.body.data.lines.map((l: { id: string; amountCents: number; status: string; activeMatches: unknown[] }) => [l.id, l.amountCents, l.status, l.activeMatches.length]),
    ).toEqual([
      [linhas.L1, 15000, 'UNMATCHED', 0],
      [linhas.L2, -3000, 'UNMATCHED', 0],
      [linhas.L3, 99900, 'UNMATCHED', 0],
    ]);
  });

  it('GET /suggestions 200: valor exato no lado certo dentro de ±3 dias, do mais perto ao mais longe', async () => {
    // L1 (11/06, +150): E1 (10/06, 1 dia) e E2 (13/06, 2 dias); E5 (15/06, 4 dias) fica fora da janela.
    const l1 = await sugestoes(linhas.L1);
    expect(l1.status).toBe(200);
    expect(l1.body.data.map((s: { posting: { id: string }; deltaDays: number }) => [s.posting.id, s.deltaDays])).toEqual([
      [await postingDoBanco(entradas.E1), 1],
      [await postingDoBanco(entradas.E2), 2],
    ]);
    // L2 (22/06, −30): a saída E6 no crédito do banco, mesmo dia.
    const l2 = await sugestoes(linhas.L2);
    expect(l2.body.data.map((s: { posting: { id: string }; deltaDays: number }) => [s.posting.id, s.deltaDays])).toEqual([[await postingDoBanco(entradas.E6), 0]]);
    // L3 (+999): nenhum lançamento de R$ 999.
    expect((await sugestoes(linhas.L3)).body.data).toEqual([]);
  });

  it('depois do vínculo L1↔E1: GET /lines filtra por status e mostra o vínculo; GET /pending tem os totais à mão', async () => {
    const m = await request(app)
      .post(`${A}/reconciliation/matches`)
      .set(authHeader(dono))
      .send({ unitId: UNIT, statementLineId: linhas.L1, postingIds: [await postingDoBanco(entradas.E1)] });
    expect(m.status).toBe(201);

    const casadas = await lerLinhas(dono, UNIT, 'MATCHED');
    expect(casadas.body.data.lines.map((l: { id: string; activeMatches: Array<{ postingId: string; entry: { id: string } }> }) => [l.id, l.activeMatches.map((x) => x.entry.id)])).toEqual([
      [linhas.L1, [entradas.E1]],
    ]);
    const abertas = await lerLinhas(dono, UNIT, 'UNMATCHED');
    expect(abertas.body.data.lines.map((l: { id: string }) => l.id)).toEqual([linhas.L2, linhas.L3]);

    // Sem janela: linhas L2 (−30) + L3 (+999) = R$ 969; lançamentos do banco sem vínculo E2, E5, E3, E6 (por data).
    const tudo = await pendencias(dono, UNIT, bancoId);
    expect(tudo.status).toBe(200);
    expect(tudo.body.data.account).toMatchObject({ id: bancoId, code: '1.1.1.01' });
    expect(tudo.body.data.totals).toEqual({ lineCount: 2, lineTotalCents: 96900, postingCount: 4 });
    expect(tudo.body.data.unmatchedLines.map((l: { id: string }) => l.id)).toEqual([linhas.L2, linhas.L3]);
    expect(tudo.body.data.unmatchedPostings.map((p: { entry: { id: string }; debitCents: number; creditCents: number }) => [p.entry.id, p.debitCents, p.creditCents])).toEqual([
      [entradas.E2, 15000, 0],
      [entradas.E5, 15000, 0],
      [entradas.E3, 8000, 0],
      [entradas.E6, 0, 3000],
    ]);

    // Janela 14/06–25/06: só L2 (−30); lançamentos E5, E3, E6.
    const janela = await pendencias(dono, UNIT, bancoId, { from: '2026-06-14', to: '2026-06-25' });
    expect(janela.body.data.totals).toEqual({ lineCount: 1, lineTotalCents: -3000, postingCount: 3 });
    expect(janela.body.data.unmatchedPostings.map((p: { entry: { id: string } }) => p.entry.id)).toEqual([entradas.E5, entradas.E3, entradas.E6]);
  });

  it('guarda das sugestões: linha já MATCHED → lista vazia (E2 tem o mesmo valor e segue sem vínculo)', async () => {
    expect((await prisma.bankStatementLine.findUniqueOrThrow({ where: { id: linhas.L1 } })).status).toBe('MATCHED');
    const res = await sugestoes(linhas.L1);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('guarda das linhas: extrato de outro tenant → 404 e nenhuma linha devolvida', async () => {
    const res = await lerLinhas(outro, UNIT_OUTRO);
    expect(res.status).toBe(404);
    expect(res.body.data).toBeUndefined();
  });

  it('guarda das pendências: conta do banco de outro tenant → 404', async () => {
    const res = await pendencias(dono, UNIT, bancoDoOutro);
    expect(res.status).toBe(404);
    expect(res.body.data).toBeUndefined();
  });
});

// ── 5. GET /reviews ──────────────────────────────────────────────────────────────────────────────────────────────
describe('GET /api/accounting/reviews', () => {
  const UNIT = 'unit-l5-reviews';
  const UNIT_OUTRO = 'unit-l5-reviews-outro';
  let dono: U;
  let outro: U;
  const ids: Record<'r2025' | 'r2026a' | 'r2026b', string> = { r2025: '', r2026a: '', r2026b: '' };

  const criarJobEcd = (year: number) =>
    prisma.accountingDataExchangeJob.create({
      data: {
        userId: dono.id, unitId: UNIT, direction: 'EXPORT', kind: 'EXPORT_SPED_ECD', status: 'EXPORTED', requestedById: dono.id, sha256: 'c'.repeat(64),
        periodStart: new Date(Date.UTC(year, 0, 1)), periodEnd: new Date(Date.UTC(year, 11, 31)),
      },
    });
  const abrir = async (year: number) => {
    const job = await criarJobEcd(year);
    const res = await request(app).post(`${A}/reviews`).set(authHeader(dono)).send({ unitId: UNIT, year, ecdJobId: job.id });
    expect(res.status).toBe(201);
    return res.body.data.id as string;
  };
  const listar = (u: U, query: Record<string, string>, unitId = UNIT) => request(app).get(`${A}/reviews`).query({ unitId, ...query }).set(authHeader(u));

  beforeAll(async () => {
    dono = await criarDono('l5-reviews');
    outro = await criarDono('l5-reviews-outro');
    await seedUnit({ userId: dono.id, id: UNIT });
    await seedUnit({ userId: outro.id, id: UNIT_OUTRO });
    ids.r2025 = await abrir(2025);
    ids.r2026a = await abrir(2026);
    ids.r2026b = await abrir(2026);
    const rej = await request(app).post(`${A}/reviews/${ids.r2026a}/reject`).set(authHeader(dono)).send({ unitId: UNIT, reason: 'ECD com saldo errado' });
    expect(rej.status).toBe(200);
  }, 120000);

  it('200: as 3 revisões da unidade, a mais recente primeiro; filtros por ano e por status', async () => {
    const tudo = await listar(dono, {});
    expect(tudo.status).toBe(200);
    expect(tudo.body.data.map((r: { id: string; year: number; status: string }) => [r.id, r.year, r.status])).toEqual([
      [ids.r2026b, 2026, 'OPEN'],
      [ids.r2026a, 2026, 'REJECTED'],
      [ids.r2025, 2025, 'OPEN'],
    ]);
    expect((await listar(dono, { year: '2025' })).body.data.map((r: { id: string }) => r.id)).toEqual([ids.r2025]);
    expect((await listar(dono, { status: 'OPEN' })).body.data.map((r: { id: string }) => r.id)).toEqual([ids.r2026b, ids.r2025]);
    expect((await listar(dono, { year: '2026', status: 'REJECTED' })).body.data.map((r: { id: string }) => r.id)).toEqual([ids.r2026a]);
  });

  it('guarda: outro usuário na própria unidade → lista vazia; pedindo as do dono (ownerUserId) sem vínculo de contador ativo → 403', async () => {
    const proprio = await listar(outro, {}, UNIT_OUTRO);
    expect(proprio.status).toBe(200);
    expect(proprio.body.data).toEqual([]);
    const delegado = await listar(outro, { ownerUserId: dono.id });
    expect(delegado.status).toBe(403);
    expect(delegado.body.data).toBeUndefined();
  });
});

// ── 6. GET /service-fiscal-profiles ──────────────────────────────────────────────────────────────────────────────
describe('GET /api/accounting/service-fiscal-profiles', () => {
  const UNIT = 'unit-l5-sfp';
  let dono: U;
  const put = (ref: string, body: Record<string, unknown>) =>
    request(app).put(`${A}/service-fiscal-profiles/${ref}`).set(authHeader(dono)).send({ unitId: UNIT, ...body });
  const listar = () => request(app).get(`${A}/service-fiscal-profiles`).query({ unitId: UNIT }).set(authHeader(dono));

  beforeAll(async () => {
    dono = await criarDono('l5-sfp');
    await seedUnit({ userId: dono.id, id: UNIT });
    expect((await put('pedicure-l5', { cTribNac: '060101', finalidade: 'BELEZA' })).status).toBe(200);
    expect((await put('drenagem-l5', { cTribNac: '060201', cNBS: '123456789', finalidade: 'ESTETICA' })).status).toBe(200);
    expect((await put('massagem-l5', { cTribNac: '060201' })).status).toBe(200);
  }, 120000);

  it('200: os 3 perfis em ordem de serviceRef, cada um com o que foi gravado', async () => {
    const res = await listar();
    expect(res.status).toBe(200);
    expect(
      res.body.data.map((p: { serviceRef: string; cTribNac: string; cNBS: string | null; finalidade: string | null }) => [p.serviceRef, p.cTribNac, p.cNBS, p.finalidade]),
    ).toEqual([
      ['drenagem-l5', '060201', '123456789', 'ESTETICA'],
      ['massagem-l5', '060201', null, null],
      ['pedicure-l5', '060101', null, 'BELEZA'],
    ]);
  });

  it('guarda: perfil apagado sai da lista (a linha soft-deleted continua no banco)', async () => {
    expect((await request(app).delete(`${A}/service-fiscal-profiles/massagem-l5`).query({ unitId: UNIT }).set(authHeader(dono))).status).toBe(200);
    const res = await listar();
    expect(res.body.data.map((p: { serviceRef: string }) => p.serviceRef)).toEqual(['drenagem-l5', 'pedicure-l5']);
    expect(await prisma.serviceFiscalProfile.count({ where: { userId: dono.id, unitId: UNIT, deletedAt: { not: null } } })).toBe(1);
  });
});

// ── 7. GET /journal-entries/:journalEntryId/attachments ──────────────────────────────────────────────────────────
describe('GET /api/accounting/journal-entries/:journalEntryId/attachments', () => {
  const UNIT = 'unit-l5-anexos';
  let dono: U;
  let entryId: string;
  let outraEntry: string;
  const PDF = (n: string) => Buffer.from(`%PDF-1.4\n% lote 5 ${n}\n%%EOF\n`);

  const anexar = async (targetId: string, nome: string) => {
    const res = await request(app)
      .post(`${A}/attachments`)
      .set(authHeader(dono))
      .field('unitId', UNIT)
      .field('targetId', targetId)
      .attach('file', PDF(nome), { filename: nome, contentType: 'application/pdf' });
    expect(res.status).toBe(201);
    return res.body.data.id as string;
  };
  const listar = (id: string) => request(app).get(`${A}/journal-entries/${id}/attachments`).query({ unitId: UNIT }).set(authHeader(dono));
  const ids: string[] = [];

  beforeAll(async () => {
    dono = await criarDono('l5-anexos');
    await seedUnit({ userId: dono.id, id: UNIT });
    await abrirPeriodo(dono, UNIT, 2026, 6);
    entryId = await lancar(dono, UNIT, '2026-06-10', '1.1.1.01', '3.1', 5000);
    outraEntry = await lancar(dono, UNIT, '2026-06-11', '1.1.1.01', '3.1', 7000);
    ids.push(await anexar(entryId, 'nota-1.pdf'));
    ids.push(await anexar(entryId, 'nota-2.pdf'));
    await anexar(outraEntry, 'outra.pdf');
  }, 120000);

  it('200: só os 2 anexos deste lançamento, o mais novo primeiro, com nome, tipo e tamanho gravados', async () => {
    const res = await listar(entryId);
    expect(res.status).toBe(200);
    expect(res.body.data.map((a: { id: string; targetId: string; mimeType: string; fileSize: number }) => [a.id, a.targetId, a.mimeType, a.fileSize])).toEqual([
      [ids[1], entryId, 'application/pdf', PDF('nota-2.pdf').length],
      [ids[0], entryId, 'application/pdf', PDF('nota-1.pdf').length],
    ]);
  });

  it('guarda: anexo apagado sai da lista', async () => {
    expect((await request(app).delete(`${A}/attachments/${ids[1]}`).query({ unitId: UNIT }).set(authHeader(dono))).status).toBe(200);
    const res = await listar(entryId);
    expect(res.body.data.map((a: { id: string }) => a.id)).toEqual([ids[0]]);
  });
});

// ── 8. GET /company-signers/:id ──────────────────────────────────────────────────────────────────────────────────
describe('GET /api/accounting/company-signers/:id', () => {
  const UNIT = 'unit-l5-signer';
  const UNIT_OUTRO = 'unit-l5-signer-outro';
  let dono: U;
  let outro: U;
  const SIGNER = { unitId: UNIT, nome: 'Maria Sócia', cpf: '529.982.247-25', qualifEcd: '205', qualifEcf: '205', email: 'maria@empresa.com.br', fone: '11987654321' };
  const ler = (u: U, unitId: string, id: string) => request(app).get(`${A}/company-signers/${id}`).query({ unitId }).set(authHeader(u));

  beforeAll(async () => {
    dono = await criarDono('l5-signer');
    outro = await criarDono('l5-signer-outro');
    await seedUnit({ userId: dono.id, id: UNIT });
    await seedUnit({ userId: outro.id, id: UNIT_OUTRO });
  }, 120000);

  it('200: devolve o signatário como gravado, com o CPF normalizado', async () => {
    const c = await request(app).post(`${A}/company-signers`).set(authHeader(dono)).send(SIGNER);
    expect(c.status).toBe(201);
    const res = await ler(dono, UNIT, c.body.data.id);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: c.body.data.id, nome: 'Maria Sócia', cpf: '52998224725', qualifEcd: '205', qualifEcf: '205', email: 'maria@empresa.com.br', fone: '11987654321' });
  });

  it('guarda: signatário com deletedAt → 404; de outro dono → 404', async () => {
    const c = await request(app).post(`${A}/company-signers`).set(authHeader(dono)).send({ ...SIGNER, nome: 'João Sócio', cpf: '111.444.777-35' });
    expect(c.status).toBe(201);
    await prisma.companySigner.update({ where: { id: c.body.data.id }, data: { deletedAt: new Date() } });
    expect((await ler(dono, UNIT, c.body.data.id)).status).toBe(404);

    const vivo = await prisma.companySigner.findFirstOrThrow({ where: { userId: dono.id, deletedAt: null } });
    const alheio = await ler(outro, UNIT_OUTRO, vivo.id);
    expect(alheio.status).toBe(404);
    expect(alheio.body.data).toBeUndefined();
  });
});
