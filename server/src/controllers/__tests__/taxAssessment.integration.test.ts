/**
 * BE-INCR-TAX-ASSESSMENT Fase A PR-2 (nó X7, BRIEF itens 12–14, 17, 19, 22; testes 23 e, f, g) — prévia, confirmação e
 * leitura ponta a ponta pelo HTTP. Cada cenário usa um dono próprio (a apuração é da PJ inteira).
 *
 * Números (Presumido, 2026, receita só de serviço, CSLL 9% — `indAliqCsll '1'`), receita < R$ 1,25 mi ⇒ sem LC 224:
 *  - T01 receita R$ 1.000.000,00: base 32% = 320.000,00; IRPJ 15% = 48.000,00 + adicional 10% × (320.000 − 60.000)
 *    = 26.000,00 ⇒ 74.000,00; CSLL 9% × 320.000,00 = 28.800,00.
 *  - T02 receita R$ 100.000,00: base 32.000,00; IRPJ 4.800,00 (sem adicional); CSLL 2.880,00.
 * Real, T01, LAIR R$ 100.000,00, sem linhas da Parte A: IRPJ 15.000,00 + 4.000,00 = 19.000,00; CSLL 9.000,00.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { TaxAssessmentRepository } from '@/features/accounting/repositories/TaxAssessmentRepository';
import { PAYLOAD_ALLOWLIST } from '@/features/accounting/audit/auditCanonical';

const app = makeApp();
const UNIT = 'unit-x7-pr2';
const BASE = '/api/accounting/tax-assessments';
type Dono = { id: string; username: string };

let seq = 0;
async function novoDono(regime: string, extra: Record<string, unknown> = {}): Promise<Dono> {
  seq += 1;
  const u = await prisma.user.create({ data: { name: `x7p2-${seq}`, username: `x7p2-${seq}`, email: `x7p2-${seq}@test.local`, password: 'x', role: 'USER' } });
  await prisma.companyFiscalProfile.create({
    data: { userId: u.id, anoCalendario: 2026, regime, ecfIndAliqCsll: '1', ecfIndRecReceita: '2', createdById: u.id, updatedById: u.id, ...extra },
  });
  return u;
}

async function lancar(dono: Dono, unitId: string, data: string, receitaCents: number, code = '3.1'): Promise<void> {
  const conta = async (c: string, nature: string) =>
    (await prisma.account.findFirst({ where: { userId: dono.id, unitId, code: c } })) ??
    prisma.account.create({ data: { userId: dono.id, unitId, code: c, name: c, nature, acceptsEntries: true } });
  const caixa = await conta('1.1', 'Asset');
  const receita = await conta(code, 'Revenue');
  const e = await prisma.journalEntry.create({ data: { userId: dono.id, unitId, date: new Date(`${data}T12:00:00.000Z`), description: 'venda', status: 'Posted' } });
  await prisma.posting.create({ data: { userId: dono.id, unitId, entryId: e.id, accountId: caixa.id, debitCents: receitaCents, creditCents: 0 } });
  await prisma.posting.create({ data: { userId: dono.id, unitId, entryId: e.id, accountId: receita.id, debitCents: 0, creditCents: receitaCents } });
}

const preview = (dono: Dono, periodo: string, extra: Record<string, unknown> = {}) =>
  request(app).post(`${BASE}/preview`).set(authHeader(dono)).send({ unitId: UNIT, anoCalendario: 2026, periodo, ...extra });
const confirm = (dono: Dono, periodo: string, irpj: string, csll: string, extra: Record<string, unknown> = {}) =>
  request(app)
    .post(BASE)
    .set(authHeader(dono))
    .send({ unitId: UNIT, anoCalendario: 2026, periodo, expectedAPagarCents: { IRPJ: irpj, CSLL: csll }, ...extra });
const linhas = (dono: Dono) => prisma.taxAssessment.findMany({ where: { userId: dono.id }, orderBy: [{ periodo: 'asc' }, { tributo: 'asc' }, { createdAt: 'asc' }] });
const perfil = (dono: Dono) => prisma.companyFiscalProfile.findFirstOrThrow({ where: { userId: dono.id, anoCalendario: 2026 } });
const eventos = async (dono: Dono, eventType: string): Promise<Record<string, string>[]> =>
  (await prisma.auditEvent.findMany({ where: { scopeUserId: dono.id, eventType }, orderBy: { seq: 'asc' } })).map((e) => JSON.parse(e.payload));

describe('X7 PR-2 — apuração IRPJ/CSLL: prévia, confirmação, leitura', () => {
  beforeAll(async () => {
    pushTestSchema();
  }, 120000);

  afterEach(() => jest.restoreAllMocks());

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('23 f / item 13: SIMPLES ⇒ 400 "DAS é da onda 3" na prévia e na confirmação; perfil ausente ⇒ 400; ANUAL ⇒ 400', async () => {
    const simples = await novoDono('SIMPLES');
    for (const r of [await preview(simples, 'T01'), await confirm(simples, 'T01', '0', '0')]) {
      expect(r.status).toBe(400);
      expect(JSON.stringify(r.body)).toContain('DAS é da onda 3');
    }
    expect(await linhas(simples)).toHaveLength(0);

    const semPerfil = await novoDono('PRESUMIDO');
    const r = await request(app).post(`${BASE}/preview`).set(authHeader(semPerfil)).send({ unitId: UNIT, anoCalendario: 2027, periodo: 'T01' });
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.body)).toContain('perfil fiscal da empresa de 2027 ausente');

    const anual = await novoDono('REAL', { formaApuracaoIrpjCsll: 'ANUAL', lucroRealObrigatorio: false }); // só o DTO do PUT barra ANUAL
    const a = await preview(anual, 'T01');
    expect(a.status).toBe(400);
    expect(JSON.stringify(a.body)).toContain('forma anual é da Fase B');
  });

  it('23 g / item 13: outra unidade da PJ com movimento no período ⇒ 400 listando as unidades; fora do período não conta', async () => {
    const dono = await novoDono('PRESUMIDO');
    await lancar(dono, UNIT, '2026-02-10', 100_000_00);
    await lancar(dono, 'unit-x7-filial', '2026-03-05', 1_000_00);
    await lancar(dono, 'unit-x7-outra', '2026-05-05', 1_000_00); // T02 — fora da janela do T01
    const r = await preview(dono, 'T01');
    expect(r.status).toBe(400);
    expect(r.body.details ?? r.body.error).toBeDefined();
    expect(JSON.stringify(r.body)).toContain('unit-x7-filial');
    expect(JSON.stringify(r.body)).not.toContain('unit-x7-outra');
  });

  it('itens 13, 14, 17, 22: Presumido T01 — prévia, CAS 409, confirmação 201 com trava e auditoria, segunda confirmação 409', async () => {
    const dono = await novoDono('PRESUMIDO');
    await lancar(dono, UNIT, '2026-02-10', 1_000_000_00);

    const p = await preview(dono, 'T01');
    expect(p.status).toBe(200);
    expect(p.body.data.irpj).toMatchObject({ periodo: 'T01', modo: 'PRESUMIDO', codigoReceita: '208901', baseCents: '32000000', devidoCents: '7400000', aPagarCents: '7400000' });
    expect(p.body.data.csll).toMatchObject({ codigoReceita: '237201', devidoCents: '2880000', aPagarCents: '2880000' });
    expect(p.body.data.provisaoContasConfiguradas).toBe(false);
    expect(p.body.data.avisos.join(' ')).toContain('provisão ficará pendente');
    expect(await linhas(dono)).toHaveLength(0); // a prévia não persiste

    const cas = await confirm(dono, 'T01', '7399999', '2880000');
    expect(cas.status).toBe(409);
    expect(cas.body.errorCode ?? JSON.stringify(cas.body)).toContain('TAX_ASSESSMENT_CAS');
    expect(await linhas(dono)).toHaveLength(0);
    expect((await perfil(dono)).formaApuracaoTravadaEm).toBeNull();

    const ok = await confirm(dono, 'T01', '7400000', '2880000');
    expect(ok.status).toBe(201);
    expect(ok.body.data.irpj).toMatchObject({ tributo: 'IRPJ', status: 'CONFIRMED', supersedesId: null, provisaoPendente: true, aPagarCents: '7400000' });
    expect(ok.body.data.reconfirmar).toEqual([]);
    const rows = await linhas(dono);
    expect(rows.map((r) => [r.tributo, r.status, r.regime, r.forma, r.unitId])).toEqual([
      ['CSLL', 'CONFIRMED', 'PRESUMIDO', 'TRIMESTRAL', UNIT],
      ['IRPJ', 'CONFIRMED', 'PRESUMIDO', 'TRIMESTRAL', UNIT],
    ]);
    expect((await perfil(dono)).formaApuracaoTravadaEm).not.toBeNull();

    const ev = await eventos(dono, 'tax.assessment.confirmed');
    expect(ev).toHaveLength(2);
    expect(Object.keys(ev[0]).sort()).toEqual([...PAYLOAD_ALLOWLIST['tax.assessment.confirmed']].sort());
    expect(ev.find((e) => e.tributo === 'IRPJ')).toMatchObject({ periodo: 'T01', anoCalendario: '2026', aPagarCents: '7400000', devidoCents: '7400000' });

    const deNovo = await confirm(dono, 'T01', '7400000', '2880000');
    expect(deNovo.status).toBe(409);
    expect(JSON.stringify(deNovo.body)).toContain('TAX_ASSESSMENT_ALREADY_CONFIRMED');
    const errado = await confirm(dono, 'T01', '7400000', '2880000', { supersedesIds: ['nao-existe'] });
    expect(errado.status).toBe(409);
    expect(JSON.stringify(errado.body)).toContain('TAX_ASSESSMENT_SUPERSEDES');
    expect(await linhas(dono)).toHaveLength(2);
  });

  it('item 14 (F-TA-3 a + cascata): T03 sem T02 ⇒ 409; substituir T01 derruba o T02 confirmado e pede reconfirmação; leitura', async () => {
    const dono = await novoDono('PRESUMIDO');
    await lancar(dono, UNIT, '2026-02-10', 1_000_000_00);
    await lancar(dono, UNIT, '2026-05-10', 100_000_00);
    expect((await confirm(dono, 'T01', '7400000', '2880000')).status).toBe(201);

    const fora = await confirm(dono, 'T03', '0', '0');
    expect(fora.status).toBe(409);
    expect(JSON.stringify(fora.body)).toContain('confirme T02/2026');

    const t02 = await confirm(dono, 'T02', '480000', '288000');
    expect(t02.status).toBe(201);

    // Substituição do T01 (com dedução de IRRF): os 2 vivos do T01 nomeados; o T02 cai em cascata.
    const vivosT01 = (await linhas(dono)).filter((r) => r.periodo === 'T01');
    const sub = await confirm(dono, 'T01', '7300000', '2880000', {
      supersedesIds: vivosT01.map((r) => r.id),
      deducoes: [{ tributo: 'IRPJ', tipo: 'IRRF', valorCents: '100000' }],
    });
    expect(sub.status).toBe(201);
    expect(sub.body.data.reconfirmar).toEqual(['T02']);
    expect(sub.body.data.irpj.supersedesId).toBe(vivosT01.find((r) => r.tributo === 'IRPJ')!.id);
    const depois = await linhas(dono);
    expect(depois.filter((r) => r.status === 'CONFIRMED').map((r) => `${r.periodo}/${r.tributo}`)).toEqual(['T01/CSLL', 'T01/IRPJ']);
    expect(depois.filter((r) => r.status === 'SUPERSEDED').map((r) => r.periodo).sort()).toEqual(['T01', 'T01', 'T02', 'T02']);
    const sup = await eventos(dono, 'tax.assessment.superseded');
    expect(sup).toHaveLength(4);
    expect(Object.keys(sup[0]).sort()).toEqual([...PAYLOAD_ALLOWLIST['tax.assessment.superseded']].sort());
    expect(new Set(sup.map((e) => e.supersededById))).toEqual(new Set([sub.body.data.irpj.id, sub.body.data.csll.id]));

    // O T02 volta a ser confirmável (a ordem só exige o T01 vivo).
    expect((await confirm(dono, 'T02', '480000', '288000')).status).toBe(201);

    // Item 17 — leitura.
    const lista = await request(app).get(BASE).set(authHeader(dono)).query({ unitId: UNIT, anoCalendario: 2026, status: 'CONFIRMED' });
    expect(lista.status).toBe(200);
    expect(lista.body.data.map((v: { periodo: string; tributo: string }) => `${v.periodo}/${v.tributo}`)).toEqual(['T01/CSLL', 'T01/IRPJ', 'T02/CSLL', 'T02/IRPJ']);
    const um = await request(app).get(`${BASE}/${sub.body.data.irpj.id}`).set(authHeader(dono)).query({ unitId: UNIT });
    expect(um.status).toBe(200);
    expect(um.body.data.memoria.map((m: { codigo: string }) => m.codigo)).toEqual(expect.arrayContaining(['RECEITA_SERVICO', 'BASE', 'DEVIDO', 'DEDUCAO_1', 'A_PAGAR']));
    expect(um.body.data).toMatchObject({ aPagarCents: '7300000', deducoesCents: '100000', provisaoPendente: true });

    const outro = await novoDono('PRESUMIDO');
    expect((await request(app).get(`${BASE}/${sub.body.data.irpj.id}`).set(authHeader(outro)).query({ unitId: UNIT })).status).toBe(404);
    expect((await request(app).get(BASE).set(authHeader(dono)).query({ anoCalendario: 2026 })).status).toBe(400); // unitId obrigatório
  });

  it('23 e / item 14: a trava nasce na tx — falha forçada depois da trava ⇒ nem apuração nem trava', async () => {
    const dono = await novoDono('PRESUMIDO');
    await lancar(dono, UNIT, '2026-02-10', 1_000_000_00);
    jest.spyOn(TaxAssessmentRepository.prototype, 'create').mockRejectedValueOnce(new Error('falha forçada depois da trava'));
    const r = await confirm(dono, 'T01', '7400000', '2880000');
    expect(r.status).toBe(500);
    expect(await linhas(dono)).toHaveLength(0);
    expect((await perfil(dono)).formaApuracaoTravadaEm).toBeNull();
  });

  it('Real T01: Parte B aberta ⇒ 400; fechada ⇒ LAIR na memória, códigos 0220/6012, guarda sem contas sinalizada', async () => {
    const dono = await novoDono('REAL', { lucroRealObrigatorio: true });
    await lancar(dono, UNIT, '2026-02-10', 100_000_00);
    const aberta = await preview(dono, 'T01');
    expect(aberta.status).toBe(400);
    expect(JSON.stringify(aberta.body)).toContain('Feche a Parte B');

    await prisma.lalurParteBClosing.create({ data: { userId: dono.id, unitId: UNIT, year: 2026, quarter: 'T01', balancesSha256: 'x' } });
    const p = await preview(dono, 'T01');
    expect(p.status).toBe(200);
    expect(p.body.data.irpj).toMatchObject({ modo: 'REAL_TRIMESTRAL', codigoReceita: '022001', devidoCents: '1900000' });
    expect(p.body.data.csll).toMatchObject({ codigoReceita: '601201', devidoCents: '900000' });
    expect(p.body.data.irpj.memoria.find((m: { codigo: string }) => m.codigo === 'LAIR').valorCents).toBe('10000000');
    expect(p.body.data.avisos.join(' ')).toContain('guarda de circularidade sem contas configuradas');
  });
});
