/**
 * Achados da revisão do #861 (IBS-CBS-2027 PR-5; autorização: dono, chat do coordenador, 2026-10-23) — testes-guarda sobre
 * SQLite real e HTTP. Decisões do dono por questionário em 23/10: regra de vencimento desconhecida ⇒ `null` + aviso (achado
 * 2); apuração SUPERSEDED ⇒ 200 + aviso (achado 3). Os guardas puros estão em
 * features/accounting/models/__tests__/ibsCbsPr5Achados.test.ts.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { getFactory } from '@/lib/factory';
import { Role } from '@/features/users/models/User.model';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';

const app = makeApp();
const BASE = '/api/accounting/ibs-cbs-assessments';
const FONTE_TESTE = 'teste achados #861 (linha hipotética)';
// O papel não existe no enum do domínio (L-2) — só no Prisma e no JWT (molde legalParameter.integration.test.ts).
const PADMIN = { id: 'ach861-padmin', username: 'ach861-padmin', role: 'PLATFORM_ADMIN' as Role };
type Dono = { id: string; username: string; unitId: string };

let seq = 0;
async function novoDono(regime = 'REAL', comPerfilDaUnidade = true): Promise<Dono> {
  seq += 1;
  const u = await prisma.user.create({ data: { name: `ach861-${seq}`, username: `ach861-${seq}`, email: `ach861-${seq}@test.local`, password: 'x', role: 'USER' } });
  for (const anoCalendario of [2027, 2031]) {
    await prisma.companyFiscalProfile.create({ data: { userId: u.id, anoCalendario, regime, ecfIndAliqCsll: '1', ecfIndRecReceita: '2', createdById: u.id, updatedById: u.id } });
  }
  const unitId = `unit-ach861-${seq}`;
  await seedUnit({ userId: u.id, id: unitId });
  if (comPerfilDaUnidade) {
    await prisma.fiscalProfile.create({ data: { userId: u.id, unitId, regimeTributario: regime, pisCofinsRegime: 'CUMULATIVO', codMun: '3550308' } });
  }
  return { ...u, unitId };
}

async function apuracao(dono: Dono, over: Record<string, unknown> = {}) {
  return prisma.consumptionTaxAssessment.create({
    data: {
      userId: dono.id, unitId: dono.unitId, anoCalendario: 2027, mes: 1, tributo: 'CBS', regime: 'REAL',
      debitosCents: 1000n, creditosCents: 0n, saldoCents: 1000n,
      memoria: [{ codigo: 'SALDO', descricao: 'saldo = débitos − créditos', valorCents: '1000', fonte: 'LC 214/2025 art. 45' }],
      parametrosIds: [], parametrosSha256: 'a'.repeat(64), status: 'CONFIRMED', confirmedById: dono.id, confirmedAt: new Date('2027-02-05T12:00:00.000Z'),
      ...over,
    },
  });
}

const resumo = (dono: Dono, id: string) => request(app).get(`${BASE}/${id}/resumo`).set(authHeader(dono)).query({ unitId: dono.unitId });
const propor = (extra: Record<string, unknown>) =>
  request(app)
    .post('/api/legal-parameters')
    .set(authHeader(PADMIN))
    .send({ tabela: 'IBS_CBS', chave: 'IBS', discriminador: 'VENCIMENTO', fonte: FONTE_TESTE, vigenteDesde: '2032-01-01', motivo: 'teste', ...extra });

describe('achados da revisão do #861 (IBS-CBS-2027 PR-5)', () => {
  beforeAll(async () => {
    pushTestSchema();
  }, 120000);

  afterAll(async () => {
    await prisma.legalParameter.deleteMany({ where: { fonte: FONTE_TESTE } });
    await getFactory().getLegalParameterService().aquecer();
    await prisma.$disconnect();
  });

  it('achado 1: propor IBS_CBS/IBS/VENCIMENTO com valorTexto (a regra) ⇒ 201; só valorInt ou regra desconhecida ⇒ 400', async () => {
    const ok = await propor({ valorTexto: 'ULTIMO_DIA_UTIL_MES_SEGUINTE' });
    expect([ok.status, ok.body.data?.valorTexto]).toEqual([201, 'ULTIMO_DIA_UTIL_MES_SEGUINTE']);
    expect((await propor({ valorInt: 20 })).status).toBe(400);
    expect((await propor({ valorTexto: 'DIA_20' })).status).toBe(400);
  });

  it('achado 2: linha VENCIMENTO publicada só com valorInt ⇒ resumo 200 com vencimento null + aviso (dono 23/10), não 500', async () => {
    await prisma.legalParameter.create({
      data: { tabela: 'IBS_CBS', chave: 'IBS', discriminador: 'VENCIMENTO', valorInt: 20, fonte: FONTE_TESTE, vigenteDesde: '2031-01-01', vigenteAte: '2031-12-31', status: 'PUBLISHED', motivo: 'teste', proposedById: 'teste', publishedById: 'teste', publishedAt: new Date() },
    });
    await getFactory().getLegalParameterService().aquecer();
    const dono = await novoDono();
    const a = await apuracao(dono, { tributo: 'IBS', anoCalendario: 2031, mes: 5 });
    const r = await resumo(dono, a.id);
    expect([r.status, r.body.data?.vencimento]).toEqual([200, null]);
    expect(r.body.data.avisos.join(' ')).toContain('VENCIMENTO_REGRA_DESCONHECIDA');
  });

  it('achado 3: resumo de apuração SUPERSEDED ⇒ 200 com aviso APURACAO_SUBSTITUIDA (dono 23/10); a viva não o recebe', async () => {
    const dono = await novoDono();
    const velha = await apuracao(dono, { status: 'SUPERSEDED' });
    const viva = await apuracao(dono, { supersedesId: velha.id });
    const r = await resumo(dono, velha.id);
    expect(r.status).toBe(200);
    expect(r.body.data.avisos.join(' ')).toContain('APURACAO_SUBSTITUIDA');
    expect((await resumo(dono, viva.id)).body.data.avisos.join(' ')).not.toContain('APURACAO_SUBSTITUIDA');
  });

  it('achado 5: a confirmação não conta as linhas VENCIMENTO entre os parâmetros de cálculo (parametrosIds/sha256)', async () => {
    const dono = await novoDono('REAL', false);
    const c = await request(app).post(BASE).set(authHeader(dono)).send({ unitId: dono.unitId, anoCalendario: 2027, mes: 2, tributo: 'IBS', expectedSupersedesId: null });
    expect(c.status).toBe(201);
    const row = await prisma.consumptionTaxAssessment.findUniqueOrThrow({ where: { id: c.body.data.assessment.id } });
    const ids = row.parametrosIds as string[];
    expect(ids.length).toBeGreaterThan(0);
    const vencimentos = await prisma.legalParameter.findMany({ where: { tabela: 'IBS_CBS', discriminador: 'VENCIMENTO' }, select: { id: true } });
    expect(ids.filter((id) => vencimentos.some((v) => v.id === id))).toEqual([]);
  });
});
