/**
 * BE-INCR-SIMPLES-NACIONAL PR-2 (nó X14, BRIEF itens 10–16) — entradas da apuração do Simples e subrazão fiscal de
 * receita, ponta a ponta: rotas HTTP, ponte de finalização real (`maybeSyncSaleFinalized`), reconcile e tie-out contra o
 * razão.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { ApplicationFactory } from '@/lib/factory';
import { resolveAccountingScope, type AccountingScope } from '@/features/accounting/scope/AccountingScope';
import { maybeSyncSaleFinalized } from '@/features/accounting/sync/bridges/SaleSalesAccountingBridge';
import { reconcileReceitaFiscal } from '@/jobs/accountingSyncReconcile.job';
import { loadSaleRevenueLines } from '@/features/accounting/sync/bridges/saleItems';
import { ibsCbsNoDas } from '@/features/accounting/services/CompanyFiscalProfileService';

const app = makeApp();
const CNPJ = '11222333000181';
let user: { id: string; username: string };
let tables: Record<'sales' | 'saleItems' | 'units', string>;
let UNIT: string;
const scope = (): AccountingScope => resolveAccountingScope({ userId: user.id }, UNIT);
const f = () => ApplicationFactory.getInstance();
const S = '/api/accounting/simples';

async function row(table: keyof typeof tables, data: Record<string, unknown>) {
  const stored = typeof data.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.date) ? { ...data, date: `${data.date}T00:00:00.000Z` } : data;
  return prisma.dynamicTableData.create({ data: { dynamicTableId: tables[table], data: stored as never } });
}

/** Venda Finalized pela ponte real: itens de serviço/produto com profissional opcional. */
async function venda(date: string, totalReais: number, itens: Array<{ type: 'Service' | 'Product'; ref: string; qty: number; price: number; employee?: string }>) {
  const sale = await row('sales', { status: 'Finalized', unitId: UNIT, totalAmount: totalReais, currency: 'BRL', date, paymentStatus: 'Pending' });
  for (const i of itens) {
    await row('saleItems', {
      saleId: sale.id,
      type: i.type,
      ...(i.type === 'Service' ? { serviceId: i.ref } : { productId: i.ref }),
      description: i.ref,
      quantity: i.qty,
      unitPrice: i.price,
      ...(i.employee ? { responsibleEmployeeId: i.employee } : {}),
    });
  }
  await maybeSyncSaleFinalized({ userId: user.id }, tables.sales, { id: sale.id, data: sale.data });
  return sale.id;
}

const linhasDaVenda = (saleId: string) => prisma.receitaFiscalLinha.findMany({ where: { saleId }, orderBy: { itemRef: 'asc' } });

// Síncrono à parte: o build a frio do banco-modelo passa de 5 s e estouraria o timeout de um hook async.
beforeAll(() => pushTestSchema());
beforeAll(async () => {
  const u = await prisma.user.create({ data: { name: 'x14p2', username: 'x14p2', email: 'x14p2@test.local', password: 'x', role: 'USER' } });
  user = { id: u.id, username: u.username };
  const created = await request(app).post('/api/dashboard/create').set(authHeader(user)).send({ suiteKey: 'beautySalon', unit: { name: 'Matriz' } });
  expect(created.status).toBe(201);
  const byName = async (n: string) => (await prisma.dynamicTable.findFirstOrThrow({ where: { userId: user.id, internalName: n } })).id;
  tables = { sales: await byName('sales'), saleItems: await byName('saleItems'), units: await byName('units') };
  UNIT = (await row('units', { name: 'Matriz', cnpj: CNPJ })).id;
  await f().getPostingService().ensureChartOfAccounts(scope());
  for (const month of [4, 5, 6]) {
    await prisma.accountingPeriod.create({ data: { userId: user.id, unitId: UNIT, year: 2026, month, status: 'OPEN', openedAt: new Date() } });
  }
  await prisma.serviceFiscalProfile.create({ data: { userId: user.id, unitId: UNIT, serviceRef: 'srv-corte', cTribNac: '060101' } });
});
afterAll(() => prisma.$disconnect());

describe('itens 10–11 — histórico pré-adoção', () => {
  it('PUT grava e regrava (upsert) receita e folha; competência fora do formato = 400', async () => {
    const put = (c: string, body: Record<string, unknown>) => request(app).put(`${S}/historico/${c}`).set(authHeader(user)).send(body);
    const r1 = await put('2025-06', { unitId: UNIT, receitaBrutaCents: 5_000_000, folhaCents: 1_400_000 });
    expect(r1.status).toBe(200);
    expect(r1.body.data).toMatchObject({ competencia: '2025-06', receitaBrutaCents: 5_000_000, folhaCents: 1_400_000 });
    const r2 = await put('2025-06', { unitId: UNIT, receitaBrutaCents: 5_100_000 });
    expect(r2.body.data).toMatchObject({ id: r1.body.data.id, receitaBrutaCents: 5_100_000, folhaCents: null });
    expect((await put('2025-13', { unitId: UNIT, receitaBrutaCents: 1 })).status).toBe(400);
    expect((await put('2025-07', { unitId: UNIT, receitaBrutaCents: 1, extra: 1 })).status).toBe(400);
  });

  it('documento de origem de outra unidade = 404', async () => {
    const r = await request(app).put(`${S}/historico/2025-07`).set(authHeader(user)).send({ unitId: UNIT, receitaBrutaCents: 1, sourceDocumentId: 'nao-existe' });
    expect(r.status).toBe(404);
  });

  it('RBT12_INCOMPLETO lista os meses da janela sem histórico nem subrazão; o subrazão conta como declarado', async () => {
    for (let m = 7; m <= 12; m++) await f().getSimplesEntradasService().upsertHistorico(scope(), `2025-${String(m).padStart(2, '0')}`, { unitId: UNIT, receitaBrutaCents: 100 });
    for (let m = 1; m <= 4; m++) await f().getSimplesEntradasService().upsertHistorico(scope(), `2026-0${m}`, { unitId: UNIT, receitaBrutaCents: 100 });
    // PA 2026-06 → janela 2025-06..2026-05: falta só 2026-05.
    const alerta = await f().getSimplesEntradasService().alertaRbt12(scope(), '2026-06', new Set());
    expect(alerta).toEqual({ codigo: 'RBT12_INCOMPLETO', detalhe: 'sem receita declarada em 2026-05' });
    expect(await f().getSimplesEntradasService().alertaRbt12(scope(), '2026-06', new Set(['2026-05']))).toBeNull();
  });
});

describe('item 12 — segregação manual por combinação', () => {
  it('PUT grava as parcelas; os tributos excluídos derivam do motivo (mono+ST tira PIS, COFINS e ICMS) e o alerta SEGREGACAO_MANUAL acende', async () => {
    const r = await request(app)
      .put(`${S}/segregacao/2026-05`)
      .set(authHeader(user))
      .send({ unitId: UNIT, parcelas: [{ natureza: 'REVENDA', receitaCents: 50_000, motivo: 'MONOFASICO_E_ICMS_ST' }, { natureza: 'SERVICO', receitaCents: 10_000, motivo: 'ISS_RETIDO' }] });
    expect(r.status).toBe(200);
    expect(r.body.data.parcelas.map((p: { excluir: string[] }) => p.excluir)).toEqual([['PIS', 'COFINS', 'ICMS'], ['ISS']]);
    const lida = await f().getSimplesEntradasService().segregacaoDaCompetencia(scope(), '2026-05');
    expect(lida.alerta?.codigo).toBe('SEGREGACAO_MANUAL');
    expect((await f().getSimplesEntradasService().segregacaoDaCompetencia(scope(), '2026-04')).alerta).toBeNull();
  });

  it('motivo fora da lista (ex.: ISS de outro município, que continua no DAS) = 400', async () => {
    const r = await request(app).put(`${S}/segregacao/2026-05`).set(authHeader(user)).send({ unitId: UNIT, parcelas: [{ natureza: 'SERVICO', receitaCents: 1, motivo: 'ISS_OUTRO_MUNICIPIO' }] });
    expect(r.status).toBe(400);
  });
});

describe('item 13 — contrato de parceria', () => {
  const base = { cotaSalaoBp: 4000, naturezaCota: 'ALUGUEL_BEM_MOVEL', homologadoEm: '2026-05-10', sindicato: 'Sindicato X', vigenteDesde: '2026-05-01', vigenteAte: null };
  let contratoId: string;

  it('POST cria; sobreposição de vigência do mesmo profissional = 409; vigência invertida = 400', async () => {
    const r = await request(app).post(`${S}/parcerias`).set(authHeader(user)).send({ unitId: UNIT, profissionalContactId: 'emp-ana', ...base });
    expect(r.status).toBe(201);
    contratoId = r.body.data.id;
    const dup = await request(app).post(`${S}/parcerias`).set(authHeader(user)).send({ unitId: UNIT, profissionalContactId: 'emp-ana', ...base, vigenteDesde: '2026-08-01' });
    expect(dup.status).toBe(409);
    const inv = await request(app).post(`${S}/parcerias`).set(authHeader(user)).send({ unitId: UNIT, profissionalContactId: 'emp-bia', ...base, vigenteAte: '2026-04-01' });
    expect(inv.status).toBe(400);
  });

  it('sem homologação o contrato não produz efeito (§ 8º): antes de homologadoEm, contratoEmEfeito = null', async () => {
    const svc = f().getSimplesEntradasService();
    expect(await svc.contratoEmEfeito(scope(), 'emp-ana', '2026-05-05')).toBeNull();
    expect((await svc.contratoEmEfeito(scope(), 'emp-ana', '2026-05-10'))?.id).toBe(contratoId);
  });

  it('PATCH altera; DELETE é soft-delete (some da lista, a linha fica)', async () => {
    const p = await request(app).patch(`${S}/parcerias/${contratoId}`).set(authHeader(user)).send({ unitId: UNIT, cotaSalaoBp: 3000 });
    expect(p.body.data.cotaSalaoBp).toBe(3000);
    const tmp = await request(app).post(`${S}/parcerias`).set(authHeader(user)).send({ unitId: UNIT, profissionalContactId: 'emp-tmp', ...base });
    expect((await request(app).delete(`${S}/parcerias/${tmp.body.data.id}?unitId=${UNIT}`).set(authHeader(user))).status).toBe(204);
    const lista = await request(app).get(`${S}/parcerias?unitId=${UNIT}`).set(authHeader(user));
    expect(lista.body.data.map((c: { id: string }) => c.id)).toEqual([contratoId]);
    expect(await prisma.salaoParceriaContrato.count({ where: { id: tmp.body.data.id, deletedAt: { not: null } } })).toBe(1);
  });
});

describe('item 14 — opção IBS/CBS por semestre', () => {
  const perfil = (ano: number, body: Record<string, unknown>) =>
    request(app).put(`/api/accounting/company-fiscal-profile/${ano}`).set(authHeader(user)).send({ unitId: UNIT, regime: 'SIMPLES', ...body });

  it('antes de 2027 = 400; fora do Simples = 400; Simples 2027 grava e ibsCbsNoDas segue a opção do semestre', async () => {
    expect((await perfil(2026, { ibsCbsOpcaoS1: 'REGULAR' })).status).toBe(400);
    expect((await perfil(2027, { regime: 'PRESUMIDO', ibsCbsOpcaoS1: 'REGULAR' })).status).toBe(400);
    const ok = await perfil(2027, { ibsCbsOpcaoS2: 'REGULAR' });
    expect(ok.status).toBe(200);
    expect(ok.body.data).toMatchObject({ ibsCbsOpcaoS1: null, ibsCbsOpcaoS2: 'REGULAR' });
    expect([ibsCbsNoDas(ok.body.data, '2026-12'), ibsCbsNoDas(ok.body.data, '2027-06'), ibsCbsNoDas(ok.body.data, '2027-07')]).toEqual([false, true, false]);
  });
});

describe('itens 15–16 — subrazão fiscal de receita na finalização + tie-out', () => {
  let vendaMista: string;

  it('venda mista: uma linha por item, rateio = créditos 3.1/3.3 do razão, cTribNac do serviço, cota do parceiro fora', async () => {
    // R$ 300 brutos (serviço 200 com a Ana + produto 100) vendidos por R$ 290 (desconto no cabeçalho).
    vendaMista = await venda('2026-05-20', 290, [
      { type: 'Service', ref: 'srv-corte', qty: 2, price: 100, employee: 'emp-ana' },
      { type: 'Product', ref: 'prd-shampoo', qty: 1, price: 100 },
    ]);
    const l = await linhasDaVenda(vendaMista);
    const servico = l.find((x) => x.natureza === 'SERVICO')!;
    const revenda = l.find((x) => x.natureza === 'REVENDA')!;
    // splitRevenueCredit: 29000 × 200/300 = 19333; revenda = 9667.
    expect([Number(servico.receitaCents), Number(revenda.receitaCents)]).toEqual([19_333, 9_667]);
    expect(servico).toMatchObject({ competencia: '2026-05', dia: '2026-05-20', cTribNac: '060101', productRef: null });
    // Contrato com cota do salão 30% (PATCH acima) → profissional 70%: 13533,1 → 13533.
    expect(Number(servico.cotaProfissionalCents)).toBe(13_533);
    expect(revenda).toMatchObject({ productRef: 'prd-shampoo', parceriaContratoId: null, cotaProfissionalCents: 0n });
  });

  it('a ponte de novo não duplica (idempotente pela @@unique)', async () => {
    const sale = await prisma.dynamicTableData.findUniqueOrThrow({ where: { id: vendaMista } });
    await maybeSyncSaleFinalized({ userId: user.id }, tables.sales, { id: sale.id, data: sale.data });
    expect(await prisma.receitaFiscalLinha.count({ where: { saleId: vendaMista } })).toBe(2);
  });

  it('tie-out: Σ subrazão = (C − D) de 3.1 + 3.3 + 3.2 no mês', async () => {
    const t = await f().getReceitaFiscalService().tieOut(scope(), '2026-05');
    expect(t).toMatchObject({ subrazaoCents: 29_000, razaoCents: 29_000, ok: true, alerta: null });
  });

  it('commit 2 perdido: tie-out diverge (TIEOUT_DIVERGENTE) e o reconcile regrava só a venda que falta', async () => {
    const outra = await venda('2026-05-21', 50, [{ type: 'Service', ref: 'srv-corte', qty: 1, price: 50 }]);
    await prisma.receitaFiscalLinha.deleteMany({ where: { saleId: outra } });
    const antes = await f().getReceitaFiscalService().tieOut(scope(), '2026-05');
    expect(antes).toMatchObject({ ok: false, subrazaoCents: 29_000, razaoCents: 34_000 });
    expect(antes.alerta?.codigo).toBe('TIEOUT_DIVERGENTE');

    const svc = f().getReceitaFiscalService();
    const all = await prisma.dynamicTableData.findMany({ where: { dynamicTableId: tables.sales } });
    const summary = await reconcileReceitaFiscal({
      listSales: async () =>
        all.map((r) => {
          const d = r.data as Record<string, unknown>;
          return { ownerUserId: user.id, saleId: r.id, unitId: String(d.unitId), amount: Number(d.totalAmount), date: String(d.date) };
        }),
      hasExistingEntry: async (s, t, id) => (await f().getPostingService().findEntryBySource(s, t, id)) !== null,
      alreadyRecorded: (s, id) => svc.vendaRegistrada(s, id),
      record: async (s, sale, dia) => svc.registrarVenda(s, { saleId: sale.saleId, amount: sale.amount, dia, lines: await loadSaleRevenueLines(user.id, sale.saleId) }),
    });
    expect(summary).toMatchObject({ total: 2, synced: 1, idempotentHits: 1, failed: 0 });
    expect(await f().getReceitaFiscalService().tieOut(scope(), '2026-05')).toMatchObject({ ok: true, subrazaoCents: 34_000 });
  });

  it('mesesComSubrazao alimenta o alerta do RBT12', async () => {
    expect([...(await f().getReceitaFiscalService().mesesComSubrazao(scope(), ['2026-04', '2026-05']))]).toEqual(['2026-05']);
  });
});
