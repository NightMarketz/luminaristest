/**
 * EFICIENCIA-FISCAL PR-4 itens 19–23 (BRIEF BE-INCR-EFICIENCIA-FISCAL; D-2026-10-28-EFICIENCIA-FISCAL-PR4-EXECUCAO) — de ponta a
 * ponta pelas rotas: os alertas na apuração do Simples (#1) a partir do contrato de parceria (#2) e do cadastro do sócio (#3),
 * a projeção (#4), o relatório de economia (#5, #6, item 22) e o EXPORT_ECONOMIA_FISCAL. Ponte real da venda.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { ApplicationFactory } from '@/lib/factory';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';
import { maybeSyncSaleFinalized } from '@/features/accounting/sync/bridges/SaleSalesAccountingBridge';
import { TaxOptimizationReportSchema } from '@/features/accounting/dtos/TaxOptimizationDto';

const app = makeApp();
const CNPJ_UNIDADE = '11222333000181';
const CNPJ_PARCEIRO = '11444777000161';
const CNPJ_OUTRA = '45723174000110';
let user: { id: string; username: string };
let tables: Record<'sales' | 'saleItems' | 'units', string>;
let UNIT: string;
const scope = (): AccountingScope => resolveAccountingScopeInternal({ userId: user.id }, UNIT);
const f = () => ApplicationFactory.getInstance();
const S = '/api/accounting/simples';
const CHECK_OK = { clausulaLocacaoBemMovel: 'SIM', clausulaCusteio: 'SIM', nfseEmitidaPeloParceiro: 'SIM' };

async function row(table: keyof typeof tables, data: Record<string, unknown>) {
  const stored = typeof data.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.date) ? { ...data, date: `${data.date}T00:00:00.000Z` } : data;
  return prisma.dynamicTableData.create({ data: { dynamicTableId: tables[table], data: stored as never } });
}
async function venda(date: string, reais: number, extra: { employee?: string; descontoIncondicional?: number } = {}) {
  const desconto = extra.descontoIncondicional ?? 0;
  const sale = await row('sales', {
    status: 'Finalized', unitId: UNIT, subtotal: reais + desconto, totalAmount: reais, currency: 'BRL', date, paymentStatus: 'Pending',
    ...(desconto > 0 ? { discountAmount: desconto, discountKind: 'UNCONDITIONAL' } : {}),
  });
  await row('saleItems', { saleId: sale.id, type: 'Service', serviceId: 'srv-corte', description: 'Corte', quantity: 1, unitPrice: reais + desconto, ...(extra.employee ? { responsibleEmployeeId: extra.employee } : {}) });
  await maybeSyncSaleFinalized({ userId: user.id }, tables.sales, { id: sale.id, data: sale.data });
  return sale;
}
const calcular = (c: string) => request(app).post(`${S}/apuracoes/${c}/calcular`).set(authHeader(user)).send({ unitId: UNIT });
const codigos = async (c: string): Promise<string[]> => {
  const r = await calcular(c);
  expect(r.status).toBe(200);
  return r.body.data.alertas.map((x: { codigo: string }) => x.codigo);
};
const relatorio = (competencia: string) => request(app).get('/api/accounting/tax-optimization/report').set(authHeader(user)).query({ unitId: UNIT, competencia });
const parceria = (body: Record<string, unknown>) =>
  request(app).post(`${S}/parcerias`).set(authHeader(user)).send({
    unitId: UNIT, cotaSalaoBp: 4000, naturezaCota: 'GESTAO', homologadoEm: '2026-01-10', sindicato: 'Sindicato X', vigenteDesde: '2026-01-01', vigenteAte: null, ...body,
  });

beforeAll(() => pushTestSchema());
beforeAll(async () => {
  const u = await prisma.user.create({ data: { name: 'efpr4', username: 'efpr4', email: 'efpr4@test.local', password: 'x', role: 'USER' } });
  user = { id: u.id, username: u.username };
  const created = await request(app).post('/api/dashboard/create').set(authHeader(user)).send({ suiteKey: 'beautySalon', unit: { name: 'Matriz' } });
  expect(created.status).toBe(201);
  const byName = async (n: string) => (await prisma.dynamicTable.findFirstOrThrow({ where: { userId: user.id, internalName: n } })).id;
  tables = { sales: await byName('sales'), saleItems: await byName('saleItems'), units: await byName('units') };
  UNIT = (await row('units', { name: 'Matriz', cnpj: CNPJ_UNIDADE })).id;
  await f().getPostingService().ensureChartOfAccounts(scope());
  for (const m of [6, 7]) await prisma.accountingPeriod.create({ data: { userId: user.id, unitId: UNIT, year: 2026, month: m, status: 'OPEN', openedAt: new Date() } });
  await prisma.serviceFiscalProfile.create({ data: { userId: user.id, unitId: UNIT, serviceRef: 'srv-corte', cTribNac: '060101' } });
  expect((await request(app).put('/api/accounting/company-fiscal-profile/2026').set(authHeader(user)).send({ unitId: UNIT, regime: 'SIMPLES' })).status).toBe(200);
  // Pré-adoção: R$ 50.000/mês de 2025-06 a 2026-05.
  for (let i = 0; i < 12; i++) {
    const m = new Date(Date.UTC(2025, 5 + i, 1)).toISOString().slice(0, 7);
    await f().getSimplesEntradasService().upsertHistorico(scope(), m, { unitId: UNIT, receitaBrutaCents: 5_000_000 });
  }
});
afterAll(() => prisma.$disconnect());

describe('item 19 — salão-parceiro na apuração (#1, #2)', () => {
  let contratoAna: string;

  it('contrato sem CNPJ nem checklist e com cota no mês ⇒ PARCEIRO_SEM_CNPJ e PARCERIA_CHECKLIST_INCOMPLETO; a cota existe, então sem os outros dois', async () => {
    const c = await parceria({ profissionalContactId: 'emp-ana' });
    expect(c.status).toBe(201);
    expect([c.body.data.profissionalCnpj, c.body.data.checklistDeclarado]).toEqual([null, null]);
    contratoAna = c.body.data.id;
    await venda('2026-06-10', 50_000, { employee: 'emp-ana' });
    const cs = await codigos('2026-06');
    expect(cs).toEqual(expect.arrayContaining(['PARCEIRO_SEM_CNPJ', 'PARCERIA_CHECKLIST_INCOMPLETO']));
    expect(cs).not.toContain('PARCERIA_SEM_COTA');
    expect(cs).not.toContain('PARCERIA_COTA_SEM_CONTRATO');
  });

  it('PATCH com CNPJ e checklist todo SIM grava, volta na lista e apaga os dois alertas', async () => {
    const p = await request(app).patch(`${S}/parcerias/${contratoAna}`).set(authHeader(user)).send({ unitId: UNIT, profissionalCnpj: CNPJ_PARCEIRO, checklistDeclarado: CHECK_OK });
    expect(p.status).toBe(200);
    const lista = await request(app).get(`${S}/parcerias`).set(authHeader(user)).query({ unitId: UNIT });
    expect(lista.body.data.find((x: { id: string }) => x.id === contratoAna)).toMatchObject({ profissionalCnpj: CNPJ_PARCEIRO, checklistDeclarado: CHECK_OK });
    const cs = await codigos('2026-06');
    expect(cs.filter((x) => x.startsWith('PARCEI') || x.startsWith('PARCERIA'))).toEqual([]);
    expect((await request(app).patch(`${S}/parcerias/${contratoAna}`).set(authHeader(user)).send({ unitId: UNIT, profissionalCnpj: '11444777000162' })).status).toBe(400);
  });

  it('contrato em efeito sem receita com a cota ⇒ PARCERIA_SEM_COTA; removido o contrato da Ana ⇒ PARCERIA_COTA_SEM_CONTRATO', async () => {
    const bia = await parceria({ profissionalContactId: 'emp-bia', profissionalCnpj: CNPJ_PARCEIRO, checklistDeclarado: CHECK_OK });
    expect(bia.status).toBe(201);
    expect(await codigos('2026-06')).toContain('PARCERIA_SEM_COTA');
    expect((await request(app).delete(`${S}/parcerias/${contratoAna}`).set(authHeader(user)).query({ unitId: UNIT })).status).toBe(204);
    expect(await codigos('2026-06')).toContain('PARCERIA_COTA_SEM_CONTRATO');
    await request(app).delete(`${S}/parcerias/${bia.body.data.id}`).set(authHeader(user)).query({ unitId: UNIT });
  });
});

describe('item 20 — interdependência pelo sócio (#3)', () => {
  const SOCIO = { unitId: '', nome: 'Ana Sócia', taxId: '52998224725', residenteBrasil: true, participacaoBp: 10000, entradaEm: '2026-01-01' };
  const outra = { cnpj: CNPJ_OUTRA, participacaoBp: 500, empresaNoSimples: true, administrador: false };

  it('participação sem receita informada ⇒ INFO pedindo o dado; com receita que leva a global acima de R$ 4,8 mi ⇒ INTERDEPENDENCIA_SOCIO', async () => {
    const criado = await request(app).post('/api/accounting/partners').set(authHeader(user)).send({ ...SOCIO, unitId: UNIT, outrasParticipacoes: [outra] });
    expect(criado.status).toBe(201);
    expect(criado.body.data.outrasParticipacoes).toEqual([outra]);
    let cs = await codigos('2026-06');
    expect(cs).toContain('INTERDEPENDENCIA_RECEITA_NAO_INFORMADA');
    expect(cs).not.toContain('INTERDEPENDENCIA_SOCIO');
    // Empresa: (5 × 50.000 + 20.000 da cota do salão) ÷ 6 × 12 = R$ 540.000 projetados; + R$ 4.700.000 informados > R$ 4.800.000.
    const upd = await request(app)
      .put(`/api/accounting/partners/${criado.body.data.id}`)
      .set(authHeader(user))
      .send({ ...SOCIO, unitId: UNIT, outrasParticipacoes: [{ ...outra, receitaBrutaAnualCents: 470_000_000 }] });
    expect(upd.status).toBe(200);
    cs = await codigos('2026-06');
    expect(cs).toContain('INTERDEPENDENCIA_SOCIO');
    expect(cs).not.toContain('INTERDEPENDENCIA_RECEITA_NAO_INFORMADA');
    // Abaixo do limite global (R$ 4.100.000 + R$ 540.000) ⇒ nada.
    await request(app).put(`/api/accounting/partners/${criado.body.data.id}`).set(authHeader(user)).send({ ...SOCIO, unitId: UNIT, outrasParticipacoes: [{ ...outra, receitaBrutaAnualCents: 410_000_000 }] });
    expect((await codigos('2026-06')).filter((x) => x.startsWith('INTERDEPENDENCIA'))).toEqual([]);
  });
});

describe('itens 22–23 — relatório de economia (#5, #6) e export', () => {
  it('400 sem competência válida; 200 no contrato; só ACCEPTED soma; consumidas NAO_DISPONIVEL; desconto incondicional medido pelo DAS', async () => {
    expect((await relatorio('2026-6')).status).toBe(400);
    await venda('2026-06-20', 9_000, { descontoIncondicional: 1_000 });
    const base = { userId: user.id, unitId: UNIT, subjectType: 'COMPETENCIA', subjectId: '2026-06', legalBasis: [{ norma: 'LC 123/2006', artigo: 'art. 18 § 4º-A' }], calc: {}, parametrosSha256: 'x', proposedBy: 'SYSTEM' };
    await prisma.taxOptimizationSuggestion.create({ data: { ...base, practice: 'SEGREGACAO_NCM', status: 'ACCEPTED', estimatedSavingCents: 1234n, decidedById: user.id, decidedAt: new Date() } });
    await prisma.taxOptimizationSuggestion.create({ data: { ...base, practice: 'FATOR_R_FOLHA', status: 'PROPOSED', pendingSlot: 'PROPOSED', estimatedSavingCents: 999_999n } });

    const r = await relatorio('2026-06');
    expect(r.status).toBe(200);
    const rel = r.body.data;
    expect(TaxOptimizationReportSchema.safeParse(rel).success).toBe(true);
    expect(rel.contagem).toEqual({ PROPOSED: 1, REJECTED: 0, EXPIRED: 0 });
    expect(rel.totais.aceitasCents).toBe('1234');
    const por = Object.fromEntries(rel.linhas.map((l: { codigo: string }) => [l.codigo, l]));
    expect(por.RETENCAO_SOFRIDA).toMatchObject({ disponivel: false, noDependente: 'RETENCOES-FONTE' });
    expect(por.CREDITO_NAO_TOMADO).toMatchObject({ disponivel: false, noDependente: 'IBS-CBS-2027' });
    expect(por.SEGREGACAO_MEDIDA).toMatchObject({ disponivel: true, economiaCents: '0' });

    const ap = (await calcular('2026-06')).body.data;
    const receitaPa = ap.atividades.reduce((t: number, a: { receitaCents: number }) => t + a.receitaCents, 0);
    const esperado = (100_000n * BigInt(ap.totalCalculadoCents)) / BigInt(receitaPa);
    expect(esperado > 0n).toBe(true);
    expect(por.DESCONTO_INCONDICIONAL_MEDIDO).toMatchObject({ disponivel: true, economiaCents: esperado.toString() });
    expect(rel.totais.medidaCents).toBe(esperado.toString());
  });

  it('fora do Simples (2025 no Presumido) a medida fica NAO_DISPONIVEL com o motivo', async () => {
    expect((await request(app).put('/api/accounting/company-fiscal-profile/2025').set(authHeader(user)).send({ unitId: UNIT, regime: 'PRESUMIDO' })).status).toBe(200);
    const rel = (await relatorio('2025-12')).body.data;
    const medidas = rel.linhas.filter((l: { tipo: string }) => l.tipo === 'MEDIDA');
    expect(medidas.map((l: { disponivel: boolean; detalhe: string }) => [l.disponivel, l.detalhe.startsWith('fora do Simples')])).toEqual([[false, true], [false, true]]);
  });

  it('EXPORT_ECONOMIA_FISCAL: janela obrigatória; o arquivo traz a linha-meta com a contagem e uma linha por linha do relatório', async () => {
    const exportar = (body: Record<string, unknown>) =>
      request(app).post('/api/accounting/data-exchange/exports').set(authHeader(user)).send({ kind: 'EXPORT_ECONOMIA_FISCAL', format: 'csv', unitId: UNIT, ...body });
    expect((await exportar({})).status).toBe(400);
    const res = await exportar({ periodStart: '2026-06-01', periodEnd: '2026-06-30' });
    expect(res.status).toBe(201);
    const file = await request(app).get(`/api/accounting/data-exchange/jobs/${res.body.data.id}/download`).query({ unitId: UNIT }).set(authHeader(user));
    expect(file.status).toBe(200);
    const lines = String(file.text).replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.length > 0);
    expect(lines[0]).toMatch(/^# kind=EXPORT_ECONOMIA_FISCAL; periodStart=2026-06-01; periodEnd=2026-06-30; aceitasCents=1234; medidaCents=\d+; proposed=1; rejected=0; expired=0; geradoEm=/);
    expect(lines[1]).toBe('competencia,tipo,codigo,disponivel,economiaCents,baseLegal,detalhe,noDependente,suggestionId');
    expect(lines.slice(2)).toHaveLength(5); // 1 aceita + 2 medidas + 2 consumidas
    expect(lines.some((l) => l.includes('999999'))).toBe(false);
  });
});

describe('item 21 — projeção do ano na apuração (#4)', () => {
  it('acumulado de R$ 2,55 mi em junho ⇒ projeção de R$ 5,1 mi: aviso do sublimite (excesso > 20%) e do limite da EPP (até 20%)', async () => {
    for (let m = 1; m <= 5; m++) await f().getSimplesEntradasService().upsertHistorico(scope(), `2026-0${m}`, { unitId: UNIT, receitaBrutaCents: 50_000_000 });
    const ap = (await calcular('2026-06')).body.data;
    const alerta = (c: string) => ap.alertas.find((a: { codigo: string }) => a.codigo === c);
    expect(alerta('PROJECAO_SUBLIMITE_ICMS_ISS').detalhe).toContain('mês seguinte ao excesso');
    expect(alerta('PROJECAO_LIMITE_EPP').detalhe).toContain('janeiro do ano seguinte');
    expect(ap.alertas.map((a: { codigo: string }) => a.codigo)).not.toContain('SUBLIMITE_ICMS_ISS');
  });
});
