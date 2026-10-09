/**
 * BE-INCR-SIMPLES-NACIONAL PR-3 (nó X14, BRIEF itens 17–24 + lacuna 1 do PR-2) — apuração ME/EPP de ponta a ponta:
 * rotas, ponte real de venda/cancelamento/devolução, subrazão, gate dentro da tx, registro do DAS, provisão e matriz.
 * Os valores esperados são aritmética sobre a lei (o exemplo do PRE-ADR §7), não oráculo — o oráculo é o DAS do portal.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { ApplicationFactory } from '@/lib/factory';
import { resolveAccountingScope, type AccountingScope } from '@/features/accounting/scope/AccountingScope';
import { maybeSyncSaleFinalized } from '@/features/accounting/sync/bridges/SaleSalesAccountingBridge';
import { maybeReverseSale } from '@/features/accounting/sync/bridges/SaleReversalBridge';
import { reconcileReceitaFiscalEstornos } from '@/jobs/accountingSyncReconcile.job';
import { SimplesEntradasRepository } from '@/features/accounting/repositories/SimplesEntradasRepository';
import { PostingService } from '@/features/accounting/services/PostingService';
import { SIMPLES_DAS_PROVISION_SOURCE_TYPE } from '@/features/accounting/services/SimplesApuracaoService';
import { scopeToday } from '@/features/accounting/models/dates';

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
async function venda(date: string, reais: number, employee?: string) {
  const sale = await row('sales', { status: 'Finalized', unitId: UNIT, totalAmount: reais, currency: 'BRL', date, paymentStatus: 'Pending' });
  await row('saleItems', { saleId: sale.id, type: 'Service', serviceId: 'srv-corte', description: 'Corte', quantity: 1, unitPrice: reais, ...(employee ? { responsibleEmployeeId: employee } : {}) });
  await maybeSyncSaleFinalized({ userId: user.id }, tables.sales, { id: sale.id, data: sale.data });
  return sale;
}
async function mudarStatus(saleId: string, patch: Record<string, unknown>) {
  const atual = await prisma.dynamicTableData.findUniqueOrThrow({ where: { id: saleId } });
  const data = { ...(atual.data as Record<string, unknown>), ...patch };
  await prisma.dynamicTableData.update({ where: { id: saleId }, data: { data: data as never } });
  await maybeReverseSale({ userId: user.id }, tables.sales, { id: saleId, data });
}
const conta = async (code: string, nature: string) =>
  (await prisma.account.findFirst({ where: { userId: user.id, unitId: UNIT, code } })) ??
  prisma.account.create({ data: { userId: user.id, unitId: UNIT, code, name: code, nature, acceptsEntries: true } });
const calcular = (c: string) => request(app).post(`${S}/apuracoes/${c}/calcular`).set(authHeader(user)).send({ unitId: UNIT });
const das = (c: string, body: Record<string, unknown>) =>
  request(app).put(`${S}/apuracoes/${c}/das`).set(authHeader(user)).send({ unitId: UNIT, vencimento: '2026-07-20', ...body });
const provisoesVivas = () =>
  prisma.journalEntry.findMany({ where: { userId: user.id, sourceType: SIMPLES_DAS_PROVISION_SOURCE_TYPE, status: 'Posted', reversedById: null } });

// Síncrono à parte: o build a frio do banco-modelo passa de 5 s e estouraria o timeout de um hook async.
beforeAll(() => pushTestSchema());
beforeAll(async () => {
  const u = await prisma.user.create({ data: { name: 'x14p3', username: 'x14p3', email: 'x14p3@test.local', password: 'x', role: 'USER' } });
  user = { id: u.id, username: u.username };
  const created = await request(app).post('/api/dashboard/create').set(authHeader(user)).send({ suiteKey: 'beautySalon', unit: { name: 'Matriz' } });
  expect(created.status).toBe(201);
  const byName = async (n: string) => (await prisma.dynamicTable.findFirstOrThrow({ where: { userId: user.id, internalName: n } })).id;
  tables = { sales: await byName('sales'), saleItems: await byName('saleItems'), units: await byName('units') };
  UNIT = (await row('units', { name: 'Matriz', cnpj: CNPJ })).id;
  await f().getPostingService().ensureChartOfAccounts(scope());
  const hoje = scopeToday(scope()).slice(0, 7);
  for (const ym of new Set(['2026-06', '2026-07', hoje])) {
    await prisma.accountingPeriod.create({ data: { userId: user.id, unitId: UNIT, year: Number(ym.slice(0, 4)), month: Number(ym.slice(5, 7)), status: 'OPEN', openedAt: new Date() } });
  }
  await prisma.serviceFiscalProfile.create({ data: { userId: user.id, unitId: UNIT, serviceRef: 'srv-corte', cTribNac: '060101' } });
  const perfil = await request(app).put('/api/accounting/company-fiscal-profile/2026').set(authHeader(user)).send({ unitId: UNIT, regime: 'SIMPLES' });
  expect(perfil.status).toBe(200);
  // Pré-adoção: R$ 50.000/mês de 2025-06 a 2026-05 → RBT12 de 2026-06 = R$ 600.000 (exemplo do PRE-ADR §7).
  for (let i = 0; i < 12; i++) {
    const m = new Date(Date.UTC(2025, 5 + i, 1)).toISOString().slice(0, 7);
    await f().getSimplesEntradasService().upsertHistorico(scope(), m, { unitId: UNIT, receitaBrutaCents: 5_000_000 });
  }
});
afterAll(() => prisma.$disconnect());

describe('itens 17–18 — calcular e espelho', () => {
  it('2026-06: serviço de R$ 50.000 vendido no sistema → R$ 5.280,00 (10,56%), espelho no item 7 do manual, tie-out ok', async () => {
    await venda('2026-06-10', 50_000);
    const r = await calcular('2026-06');
    expect(r.status).toBe(200);
    const a = r.body.data;
    expect([a.rbt12Cents, a.totalCalculadoCents, a.atividades[0].aliquotaEfetiva]).toEqual([60_000_000, 528_000, '10.5600']);
    expect(a.espelho).toEqual([
      expect.objectContaining({
        item: '7',
        atividade: '7 - Prestação de Serviços, exceto para o exterior',
        detalhe: 'Não sujeitos ao fator "r" e tributados pelo Anexo III, sem retenção/substituição tributária de ISS, com ISS devido ao próprio Município do estabelecimento',
        receitaCents: 5_000_000,
      }),
    ]);
    expect(a.tieOut.ok).toBe(true);
    expect(a.dasOficial).toBeNull();
    // X14 PR-4 item 31: a venda de serviço não tem NFS-e autorizada no sistema ⇒ o único alerta é a conferência.
    expect(a.alertas.map((x: { codigo: string }) => x.codigo)).toEqual(['NFSE_DIVERGE_RECEITA']);
  });

  it('histórico declarado num mês que tem subrazão: o subrazão prevalece e o alerta HISTORICO_IGNORADO avisa', async () => {
    await f().getSimplesEntradasService().upsertHistorico(scope(), '2026-06', { unitId: UNIT, receitaBrutaCents: 1 });
    const a = (await calcular('2026-06')).body.data;
    expect(a.totalCalculadoCents).toBe(528_000);
    expect(a.alertas.map((x: { codigo: string }) => x.codigo)).toEqual(['HISTORICO_IGNORADO', 'NFSE_DIVERGE_RECEITA']);
    await prisma.simplesHistoricoMensal.deleteMany({ where: { competencia: '2026-06' } });
  });

  it('perfil fora do Simples = 400', async () => {
    await request(app).put('/api/accounting/company-fiscal-profile/2025').set(authHeader(user)).send({ unitId: UNIT, regime: 'PRESUMIDO' });
    expect((await calcular('2025-12')).status).toBe(400);
  });
});

describe('itens 19–21 — registro do DAS, provisão, substituição', () => {
  it('item 21: sem contas no perfil ⇒ o DAS fica registrado, provisão pendente', async () => {
    const r = await das('2026-06', { numeroDocumento: '07202617000000001', valorCents: 528_010 });
    expect(r.status).toBe(200);
    expect(r.body.data.dasOficial).toMatchObject({ valorCents: 528_010, provisaoPendente: true });
    expect(r.body.data.divergenciaCents).toBe(10);
    expect(await provisoesVivas()).toHaveLength(0);
  });

  it('item 21 (reconcile): repetir o PUT com o mesmo DAS completa a provisão sem linha nova', async () => {
    const deducao = await conta('3.9', 'Revenue');
    const recolher = await conta('2.1.9', 'Liability');
    await prisma.fiscalProfile.create({
      data: { userId: user.id, unitId: UNIT, regimeTributario: 'SIMPLES', pisCofinsRegime: 'SIMPLES', simplesDasDeducaoAccountId: deducao.id, simplesRecolherAccountId: recolher.id },
    });
    const r = await das('2026-06', { numeroDocumento: '07202617000000001', valorCents: 528_010 });
    expect(r.body.data.dasOficial.provisaoPendente).toBe(false);
    expect(await prisma.simplesApuracao.count({ where: { userId: user.id } })).toBe(1);
    const [p] = await provisoesVivas();
    const legs = await prisma.posting.findMany({ where: { entryId: p.id }, include: { account: true } });
    expect(legs.map((l) => [l.account.code, Number(l.debitCents), Number(l.creditCents)]).sort()).toEqual([['2.1.9', 0, 528_010], ['3.9', 528_010, 0]]);
    expect(p.date.toISOString().slice(0, 10)).toBe('2026-06-30');
  });

  it('item 21: provisão pelo valor oficial; substituição estorna a anterior — 1 provisão viva', async () => {
    const r = await das('2026-06', { numeroDocumento: '07202617000000002', valorCents: 528_000 });
    expect(r.status).toBe(200);
    const linhas = await prisma.simplesApuracao.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'asc' } });
    expect(linhas.map((l) => l.status)).toEqual(['SUPERSEDED', 'CONFIRMED']);
    expect(linhas[1].supersedesId).toBe(linhas[0].id);
    const vivas = await provisoesVivas();
    expect(vivas.map((v) => v.sourceId)).toEqual([linhas[1].id]);
    const eventos = await prisma.auditEvent.findMany({ where: { eventType: { startsWith: 'tax.simples_das.' } }, orderBy: { createdAt: 'asc' } });
    expect(eventos.map((e) => e.eventType)).toEqual(['tax.simples_das.registrado', 'tax.simples_das.substituido']);
  });

  it('item 20: gate dentro da tx — entrada mudou entre o cálculo e o registro ⇒ 409, nada gravado', async () => {
    const antes = await prisma.simplesApuracao.count();
    // Simula uma escrita concorrente: só a releitura DENTRO da tx (a chamada com `tx`) vê o histórico mudado.
    const original = SimplesEntradasRepository.prototype.findHistorico;
    const spy = jest.spyOn(SimplesEntradasRepository.prototype, 'findHistorico').mockImplementation(async function (this: SimplesEntradasRepository, s, comps, tx) {
      const rows = await original.call(this, s, comps, tx);
      return tx ? rows.map((h) => (h.competencia === '2025-07' ? { ...h, folhaCents: 1n } : h)) : rows;
    });
    const r = await das('2026-06', { numeroDocumento: '07202617000000003', valorCents: 1 });
    spy.mockRestore();
    expect(r.status).toBe(409);
    expect(await prisma.simplesApuracao.count()).toBe(antes);
  });
});

describe('lacuna 1 do PR-2 — cancelamento e devolução no subrazão', () => {
  it('devolução: linhas negativas no dia da devolução; tie-out do mês fecha com o D 3.2', async () => {
    const v = await venda('2026-07-05', 1_000);
    await mudarStatus(v.id, { status: 'Returned', returnedAt: '2026-07-08T15:00:00.000Z' });
    const neg = await prisma.receitaFiscalLinha.findMany({ where: { saleId: v.id, tipo: 'DEVOLUCAO' } });
    expect(neg.map((l) => [l.dia, Number(l.receitaCents)])).toEqual([['2026-07-08', -100_000]]);
    expect(await f().getReceitaFiscalService().tieOut(scope(), '2026-07')).toMatchObject({ ok: true, subrazaoCents: 0 });
  });

  it('cancelamento: linhas negativas no dia do ESTORNO (o razão estorna hoje); o reconcile regrava se o commit 2 se perder', async () => {
    const v = await venda('2026-07-06', 2_000);
    await mudarStatus(v.id, { status: 'Cancelled' });
    const hoje = scopeToday(scope());
    const neg = await prisma.receitaFiscalLinha.findMany({ where: { saleId: v.id, tipo: 'CANCELAMENTO' } });
    expect(neg.map((l) => [l.dia, Number(l.receitaCents)])).toEqual([[hoje, -200_000]]);
    expect((await f().getReceitaFiscalService().tieOut(scope(), hoje.slice(0, 7))).ok).toBe(true);

    await prisma.receitaFiscalLinha.deleteMany({ where: { saleId: v.id, tipo: 'CANCELAMENTO' } });
    const svc = f().getReceitaFiscalService();
    const journal = await import('@/features/accounting/repositories/JournalEntryRepository');
    const repo = new journal.JournalEntryRepository();
    const dia = (e: { date: Date } | null) => (e ? e.date.toISOString().slice(0, 10) : null);
    const summary = await reconcileReceitaFiscalEstornos({
      listSales: async () => [{ ownerUserId: user.id, saleId: v.id, unitId: UNIT, amount: 2_000, tipo: 'CANCELAMENTO' }],
      eventDay: async (s) => {
        const o = await repo.findBySource(s, 'sale.finalized', v.id);
        return o?.reversedById ? dia(await repo.findById(s, o.reversedById)) : null;
      },
      revenueDay: async (s, id) => dia(await repo.findBySource(s, 'sale.finalized', id)),
      alreadyRecorded: (s, id, t) => svc.vendaRegistrada(s, id, t),
      recordVenda: async () => 0,
      recordEstorno: (s, sale, d) => svc.registrarEstorno(s, sale.saleId, sale.tipo, d),
    });
    expect(summary).toMatchObject({ synced: 1, failed: 0 });
    expect(await prisma.receitaFiscalLinha.count({ where: { saleId: v.id, tipo: 'CANCELAMENTO' } })).toBe(1);
  });
});

describe('itens 13 (parceria), 20 e 23 em 2026-07', () => {
  it('cota de aluguel do salão-parceiro vira locação de bem móvel (Anexo III sem ISS); limite de ME excedido no ano', async () => {
    await request(app).post(`${S}/parcerias`).set(authHeader(user)).send({
      unitId: UNIT, profissionalContactId: 'emp-ana', cotaSalaoBp: 4000, naturezaCota: 'ALUGUEL_BEM_MOVEL',
      homologadoEm: '2026-01-10', sindicato: 'Sindicato X', vigenteDesde: '2026-01-01', vigenteAte: null,
    });
    await venda('2026-07-15', 100_000, 'emp-ana'); // R$ 100.000 brutos; o salão fica com 40%
    const a = (await calcular('2026-07')).body.data;
    const loc = a.atividades.find((x: { natureza: string }) => x.natureza === 'LOCACAO_MOVEL');
    expect(loc).toMatchObject({ anexo: 'III', receitaCents: 4_000_000 });
    expect(loc.tributos.ISS).toBeUndefined();
    expect(a.espelho.map((e: { item: string }) => e.item)).toContain('5');
    // Acumulado 2026: 5 × 50.000 (histórico) + 50.000 (jun) + 40.000 (jul, cota) = 340.000 → abaixo de 360.000.
    expect(a.alertas.map((x: { codigo: string }) => x.codigo)).not.toContain('LIMITE_ME_EXCEDIDO');
    await venda('2026-07-16', 30_000);
    const b = (await calcular('2026-07')).body.data;
    expect(b.alertas.map((x: { codigo: string }) => x.codigo)).toContain('LIMITE_ME_EXCEDIDO');
  });

  it('item 20: RBT12 incompleto bloqueia o registro (400) e nada é gravado', async () => {
    await prisma.simplesHistoricoMensal.deleteMany({ where: { competencia: '2025-08' } });
    const antes = await prisma.simplesApuracao.count();
    const r = await das('2026-07', { numeroDocumento: '1', valorCents: 1 });
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.body)).toContain('RBT12_INCOMPLETO');
    expect(await prisma.simplesApuracao.count()).toBe(antes);
  });
});

describe('item 22 — matriz de obrigações', () => {
  it('Simples: PGDAS-D e DEFIS obrigatórias, Livro Caixa dispensado; a DASN-SIMEI é só do MEI (a matriz é lida hoje)', async () => {
    const r = await request(app).get(`/api/accounting/company-fiscal-profile/2026/obligations?unitId=${UNIT}`).set(authHeader(user));
    const st = Object.fromEntries(r.body.data.obrigacoes.map((o: { obrigacao: string; status: string }) => [o.obrigacao, o.status]));
    expect(st).toMatchObject({ PGDAS_D: 'OBRIGATORIA', DEFIS: 'OBRIGATORIA', LIVRO_CAIXA: 'NAO_SE_APLICA' });
    expect(st).not.toHaveProperty('DASN_SIMEI');
  });
});

describe('review do PR-3', () => {
  it('achado 2: o estorno da provisão anterior falha na substituição; repetir o PUT estorna e deixa 1 provisão viva', async () => {
    await f().getSimplesEntradasService().upsertHistorico(scope(), '2025-08', { unitId: UNIT, receitaBrutaCents: 5_000_000 }); // o teste do item 20 o apagou
    const spy = jest.spyOn(PostingService.prototype, 'reverseEntry').mockRejectedValueOnce(new Error('período fechado (simulado)'));
    const r = await das('2026-06', { numeroDocumento: '07202617000000009', valorCents: 527_990 });
    spy.mockRestore();
    expect(r.status).toBe(200);
    expect(r.body.data.dasOficial.provisaoPendente).toBe(true);
    await das('2026-06', { numeroDocumento: '07202617000000009', valorCents: 527_990 });
    const vivas = await provisoesVivas();
    expect(vivas).toHaveLength(1);
    expect(vivas[0].sourceId).toBe(r.body.data.dasOficial.id);
  });

  it('achado 1: uma parcela segregada é abatida UMA vez, mesmo com dois grupos da mesma natureza', async () => {
    const mes = scopeToday(scope()).slice(0, 7);
    await prisma.serviceFiscalProfile.create({ data: { userId: user.id, unitId: UNIT, serviceRef: 'srv-escova', cTribNac: '060201' } });
    const dia = `${mes}-01`;
    // O mês corrente já tem o cancelamento de R$ 2.000 (−200.000), compensado no grupo 060101 (achado 5).
    await venda(dia, 5_000);
    const sale = await row('sales', { status: 'Finalized', unitId: UNIT, totalAmount: 5_000, currency: 'BRL', date: dia, paymentStatus: 'Pending' });
    await row('saleItems', { saleId: sale.id, type: 'Service', serviceId: 'srv-escova', description: 'Escova', quantity: 1, unitPrice: 5_000 });
    await maybeSyncSaleFinalized({ userId: user.id }, tables.sales, { id: sale.id, data: sale.data });
    await f().getSimplesEntradasService().upsertSegregacao(scope(), mes, { unitId: UNIT, parcelas: [{ natureza: 'SERVICO', receitaCents: 50_000, motivo: 'ISS_RETIDO' }] });
    const resp = await calcular(mes);
    expect(resp.status).toBe(200);
    const a = resp.body.data;
    const retidas = a.espelho.flatMap((e: { parcelas: Array<{ receitaCents: number; qualificacoes: Record<string, string> }> }) => e.parcelas).filter((p: { qualificacoes: Record<string, string> }) => p.qualificacoes.ISS);
    expect(retidas.reduce((s: number, p: { receitaCents: number }) => s + p.receitaCents, 0)).toBe(50_000);
    // achado 5: Σ das atividades = receita do PA (5.000 + 5.000 − 2.000 do cancelamento).
    expect(a.atividades.reduce((s: number, x: { receitaCents: number }) => s + x.receitaCents, 0)).toBe(800_000);
  });
});

describe('X14 PR-4 item 29 — alíquotas para os documentos da prestação no mês', () => {
  it('prestação em 2026-07: ISS a reter = % efetivo de ISS da faixa de 2026-06 (10,56% × 32,50% = 3,4320%); pTotTribSN só sugerido', async () => {
    const r = await request(app).get(`${S}/aliquotas/2026-07`).query({ unitId: UNIT }).set(authHeader(user));
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ competencia: '2026-07', mesReferencia: '2026-06' });
    const servico = r.body.data.atividades.find((a: { natureza: string }) => a.natureza === 'SERVICO');
    expect(servico).toMatchObject({ anexo: 'III', cTribNac: '060101', aliquotaEfetiva: '10.5600', issRetencao: '3.4320', pTotTribSNSugerido: '10.5600', creditoAdquirente: null });
  });
});

describe('X14 PR-4 item 28 — DEFIS espelho mínimo', () => {
  const defis = (ano: number) => request(app).get(`${S}/defis/${ano}`).query({ unitId: UNIT }).set(authHeader(user));

  it('2026: meses apurados aqui, lucro contábil da DRE do ano, estoques do razão em 31/12; prazo 31/03', async () => {
    const r = await defis(2026);
    expect(r.status).toBe(200);
    const dre = await f().getAccountingReportService().incomeStatement(scope(), new Date('2026-12-31T23:59:59.999Z'));
    expect(r.body.data).toMatchObject({ ano: 2026, prazo: '2027-03-31', mesesApurados: ['2026-06'], estoqueInicialCents: 0, estoqueFinalCents: 0, digitado: null });
    expect(r.body.data.lucroContabilCents).toBe(Number(dre.netResult.amountCents));
  });

  it('PUT grava os digitados; participação dos sócios acima de 100% ⇒ 400', async () => {
    const socio = { contactId: 'ct-1', rendimentosIsentosCents: 100_000, rendimentosTributaveisCents: 50_000, participacaoBp: 10_000, irrfCents: 0 };
    const corpo = { unitId: UNIT, empregadosInicio: 2, empregadosFim: 3, ganhosRendaVariavelCents: 0 };
    expect((await request(app).put(`${S}/defis/2026`).set(authHeader(user)).send({ ...corpo, socios: [socio, { ...socio, contactId: 'ct-2', participacaoBp: 1 }] })).status).toBe(400);
    const ok = await request(app).put(`${S}/defis/2026`).set(authHeader(user)).send({ ...corpo, socios: [socio] });
    expect(ok.status).toBe(200);
    expect(ok.body.data.digitado).toEqual({ empregadosInicio: 2, empregadosFim: 3, ganhosRendaVariavelCents: 0, socios: [socio] });
  });

  it('2027 (a declaração muda pela LC 214) e ano fora do Simples (2025 = Presumido) ⇒ 400', async () => {
    expect((await defis(2027)).status).toBe(400);
    expect((await defis(2025)).status).toBe(400);
  });
});
