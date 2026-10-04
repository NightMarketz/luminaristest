/**
 * BE-INCR-TAX-ASSESSMENT Fase A PR-2 (nó X7, BRIEF itens 12–14, 17; testes 23 e/f/g) — preview, confirmação e leitura
 * ponta a ponta pelo HTTP, sobre SQLite real (Presumido; o Real está coberto com repositórios falsos em
 * TaxAssessmentService.test.ts e na aritmética do PR-1).
 *
 * Conta de mão (Presumido 2026, serviço, sem LC 224 — receita abaixo de R$ 1,25 mi no trimestre):
 *   T01 receita 100.000,00 → base 32% = 32.000,00 → IRPJ 15% = 4.800,00 (sem adicional: base < 60.000,00);
 *   CSLL 9% (indAliqCsll '1') × 32.000,00 = 2.880,00.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { ApplicationFactory } from '@/lib/factory';
import { AuditService } from '@/features/accounting/services/AuditService';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();
const UNIT = 'unit-x7-pr2';
const OUTRA_UNIT = 'unit-x7-pr2-outra';
const BASE = '/api/accounting/tax-assessments';

let dono: { id: string; username: string };
let intruso: { id: string; username: string };

const preview = (body: Record<string, unknown>, who = dono) => request(app).post(`${BASE}/preview`).set(authHeader(who)).send({ unitId: UNIT, ...body });
const confirm = (body: Record<string, unknown>) => request(app).post(BASE).set(authHeader(dono)).send({ unitId: UNIT, ...body });

/** Preview + confirmação com o a pagar que o preview devolveu (o fluxo normal do operador). */
async function confirmar(ano: number, periodo: string, extra: Record<string, unknown> = {}) {
  const p = await preview({ anoCalendario: ano, periodo });
  expect(p.status).toBe(200);
  return confirm({ anoCalendario: ano, periodo, expectedAPagarCents: { IRPJ: p.body.data.irpj.aPagarCents, CSLL: p.body.data.csll.aPagarCents }, ...extra });
}

const perfil = (userId: string, ano: number, regime: string) =>
  prisma.companyFiscalProfile.create({ data: { userId, anoCalendario: ano, regime, ecfIndAliqCsll: '1', ecfIndRecReceita: '2' } });

async function receita(unitId: string, date: string, cents: number) {
  await ApplicationFactory.getInstance()
    .getPostingService()
    .postEntry(resolveAccountingScope({ userId: dono.id }, unitId), {
      unitId,
      date,
      sourceType: 'manual',
      description: `Serviço ${date}`,
      lines: [
        { accountCode: '1.1.1', debitCents: cents, creditCents: 0 },
        { accountCode: '3.1', debitCents: 0, creditCents: cents },
      ],
    });
}

async function seedUnit(unitId: string, year: number) {
  for (const acc of [
    { code: '1.1.1', name: 'Banco', nature: 'Asset' },
    { code: '3.1', name: 'Receita de Serviços', nature: 'Revenue' },
  ]) {
    await prisma.account.create({ data: { userId: dono.id, unitId, ...acc, acceptsEntries: true } });
  }
  for (let month = 1; month <= 12; month++) {
    await prisma.accountingPeriod.create({ data: { userId: dono.id, unitId, year, month, status: 'OPEN', openedAt: new Date() } });
  }
}

const auditPayloads = async (eventType: string) =>
  (await prisma.auditEvent.findMany({ where: { eventType }, orderBy: { seq: 'asc' } })).map((e) => JSON.parse(e.payload ?? '{}'));

describe('X7 PR-2 — apuração trimestral: preview, confirmação, leitura', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'x7b', username: 'x7-pr2', email: 'x7-pr2@test.local', password: 'x', role: 'USER' } });
    intruso = await prisma.user.create({ data: { name: 'x7c', username: 'x7-pr2-i', email: 'x7-pr2-i@test.local', password: 'x', role: 'USER' } });
    await seedUnit(UNIT, 2026);
    await perfil(dono.id, 2026, 'PRESUMIDO');
    await receita(UNIT, '2026-02-10', 10_000_000);
    await receita(UNIT, '2026-05-10', 5_000_000);
  }, 120000);

  afterAll(async () => {
    jest.restoreAllMocks();
    await prisma.$disconnect();
  });

  it('item 13: preview calcula IRPJ e CSLL juntos, não persiste e avisa das contas da provisão', async () => {
    const r = await preview({ anoCalendario: 2026, periodo: 'T01' });
    expect(r.status).toBe(200);
    expect(r.body.data.irpj).toMatchObject({ tributo: 'IRPJ', modo: 'PRESUMIDO', codigoReceita: '208901', baseCents: '3200000', devidoCents: '480000', aPagarCents: '480000' });
    expect(r.body.data.csll).toMatchObject({ tributo: 'CSLL', codigoReceita: '237201', devidoCents: '288000' });
    expect(r.body.data.provisaoContasConfiguradas).toBe(false);
    expect(r.body.data.avisos.join(' ')).toContain('F-TA-7');
    expect(await prisma.taxAssessment.count()).toBe(0);
  });

  it('23(f): SIMPLES ⇒ 400 no preview e na confirmação; perfil do ano ausente ⇒ 400', async () => {
    await perfil(dono.id, 2027, 'SIMPLES');
    for (const res of [await preview({ anoCalendario: 2027, periodo: 'T01' }), await confirm({ anoCalendario: 2027, periodo: 'T01', expectedAPagarCents: { IRPJ: '0', CSLL: '0' } })]) {
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toContain('DAS é da onda 3');
    }
    const semPerfil = await preview({ anoCalendario: 2029, periodo: 'T01' });
    expect(semPerfil.status).toBe(400);
    expect(JSON.stringify(semPerfil.body)).toContain('Perfil fiscal da empresa de 2029');
  });

  it('item 14: T02 antes do T01 ⇒ 409 (F-TA-3); a pagar defasado ⇒ 409; nada gravado', async () => {
    expect((await confirmar(2026, 'T02')).status).toBe(409);
    const stale = await confirm({ anoCalendario: 2026, periodo: 'T01', expectedAPagarCents: { IRPJ: '1', CSLL: '288000' } });
    expect(stale.status).toBe(409);
    expect(await prisma.taxAssessment.count()).toBe(0);
  });

  it('item 14: confirma T01 — 2 linhas, trava da forma gravada, evento só com a allowlist, provisão pendente', async () => {
    const r = await confirmar(2026, 'T01');
    expect(r.status).toBe(201);
    expect(r.body.data.map((v: { tributo: string; status: string; provisaoPendente: boolean }) => [v.tributo, v.status, v.provisaoPendente])).toEqual([
      ['IRPJ', 'CONFIRMED', true],
      ['CSLL', 'CONFIRMED', true],
    ]);
    const p = await prisma.companyFiscalProfile.findFirstOrThrow({ where: { userId: dono.id, anoCalendario: 2026 } });
    expect(p.formaApuracaoTravadaEm).not.toBeNull();
    const [ev] = await auditPayloads('tax.assessment.confirmed');
    expect(Object.keys(ev).sort()).toEqual(['aPagarCents', 'anoCalendario', 'assessmentId', 'devidoCents', 'periodo', 'tabelaVersao', 'tributo']);
    expect(ev).toMatchObject({ tributo: 'IRPJ', periodo: 'T01', aPagarCents: '480000' });
  });

  it('item 14: T01 de novo sem supersedesIds ⇒ 409; com id que não é o vivo ⇒ 409', async () => {
    const semId = await confirmar(2026, 'T01');
    expect(semId.status).toBe(409);
    expect(JSON.stringify(semId.body)).toContain('supersedesIds');
    expect((await confirmar(2026, 'T01', { supersedesIds: ['nao-existe'] })).status).toBe(409);
  });

  it('item 14 + L-A: substituir o T01 depois do T02 deixa o T02 obsoleto — T03 ⇒ 409 até reconfirmar o T02', async () => {
    expect((await confirmar(2026, 'T02')).status).toBe(201);
    const t01 = await prisma.taxAssessment.findMany({ where: { periodo: 'T01', status: 'CONFIRMED' } });
    const sub = await confirmar(2026, 'T01', { supersedesIds: t01.map((r) => r.id) });
    expect(sub.status).toBe(201);
    expect(sub.body.data.map((v: { supersedesId: string }) => v.supersedesId).sort()).toEqual(t01.map((r) => r.id).sort());
    expect(await prisma.taxAssessment.count({ where: { id: { in: t01.map((r) => r.id) }, status: 'SUPERSEDED' } })).toBe(2);
    expect((await auditPayloads('tax.assessment.superseded')).map((e) => e.assessmentId).sort()).toEqual(t01.map((r) => r.id).sort());

    const t03 = await confirmar(2026, 'T03');
    expect(t03.status).toBe(409);
    expect(JSON.stringify(t03.body)).toContain('T02');
    const t02 = await prisma.taxAssessment.findMany({ where: { periodo: 'T02', status: 'CONFIRMED' } });
    expect((await confirmar(2026, 'T02', { supersedesIds: t02.map((r) => r.id) })).status).toBe(201);
    expect((await confirmar(2026, 'T03')).status).toBe(201);
  });

  it('item 17: GET lista por ano com filtros; GET :id com memória; outra PJ ⇒ 404', async () => {
    const list = await request(app).get(BASE).set(authHeader(dono)).query({ unitId: UNIT, anoCalendario: 2026, status: 'SUPERSEDED' });
    expect(list.status).toBe(200);
    expect(list.body.data.map((v: { periodo: string }) => v.periodo)).toEqual(['T01', 'T01', 'T02', 'T02']);
    const id = list.body.data[0].id;
    const one = await request(app).get(`${BASE}/${id}`).set(authHeader(dono)).query({ unitId: UNIT });
    expect(one.status).toBe(200);
    expect(one.body.data.memoria.find((m: { codigo: string }) => m.codigo === 'BASE')).toBeDefined();
    expect((await request(app).get(`${BASE}/${id}`).set(authHeader(intruso)).query({ unitId: UNIT })).status).toBe(404);
    expect((await request(app).get(BASE).set(authHeader(dono)).query({ anoCalendario: 2026 })).status).toBe(400); // unitId obrigatório (L-B)
  });

  it('23(g): outra unidade da PJ com movimento no trimestre ⇒ 400 listando a unidade', async () => {
    await seedUnit(OUTRA_UNIT, 2026);
    await receita(OUTRA_UNIT, '2026-11-05', 100_000);
    const r = await preview({ anoCalendario: 2026, periodo: 'T04' });
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.body)).toContain(OUTRA_UNIT);
  });

  it('23(e): a trava nasce na tx — falha forçada depois de gravar a trava ⇒ nem apuração nem trava', async () => {
    const UNIT_E = 'unit-x7-pr2-trava';
    await seedUnit(UNIT_E, 2028);
    await perfil(dono.id, 2028, 'PRESUMIDO');
    await receita(UNIT_E, '2028-02-10', 1_000_000);
    const p = await request(app).post(`${BASE}/preview`).set(authHeader(dono)).send({ unitId: UNIT_E, anoCalendario: 2028, periodo: 'T01' });
    const spy = jest.spyOn(AuditService.prototype, 'append').mockRejectedValueOnce(new Error('falha forçada depois da trava'));
    const r = await request(app)
      .post(BASE)
      .set(authHeader(dono))
      .send({ unitId: UNIT_E, anoCalendario: 2028, periodo: 'T01', expectedAPagarCents: { IRPJ: p.body.data.irpj.aPagarCents, CSLL: p.body.data.csll.aPagarCents } });
    spy.mockRestore();
    expect(r.status).toBe(500);
    expect(await prisma.taxAssessment.count({ where: { anoCalendario: 2028 } })).toBe(0);
    const perfil2028 = await prisma.companyFiscalProfile.findFirstOrThrow({ where: { userId: dono.id, anoCalendario: 2028 } });
    expect(perfil2028.formaApuracaoTravadaEm).toBeNull();
  });
});
