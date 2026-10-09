/**
 * TAX-ASSESSMENT-PERIODOS (BRIEF `docs/accounting/BE-INCR-TAX-ASSESSMENT-PERIODOS-brief.md` itens 1–3, 10, 11) — a rota
 * `GET /api/accounting/tax-assessments/periodos` pelo app Express REAL sobre SQLite REAL: 401/400/403/200, a rota
 * estática responde antes de `/:id`, e o estado vem das linhas gravadas (perfil e apurações semeados pelo Prisma).
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { AccountingPolicy } from '@/features/accounting/policies/AccountingPolicy';

const app = makeApp();
const UNIT = 'unit-periodos';
const URL = '/api/accounting/tax-assessments/periodos';
type Dono = { id: string; username: string };

let seq = 0;
async function novoDono(regime?: string, extra: Record<string, unknown> = {}): Promise<Dono> {
  seq += 1;
  const u = await prisma.user.create({ data: { name: `per-${seq}`, username: `per-${seq}`, email: `per-${seq}@test.local`, password: 'x', role: 'USER' } });
  if (regime) {
    await prisma.companyFiscalProfile.create({ data: { userId: u.id, anoCalendario: 2026, regime, createdById: u.id, updatedById: u.id, ...extra } });
  }
  return u;
}

const ler = (dono: Dono, query: Record<string, string> = { unitId: UNIT, anoCalendario: '2026' }) =>
  request(app).get(URL).query(query).set(authHeader(dono));

describe('GET /api/accounting/tax-assessments/periodos', () => {
  beforeAll(async () => {
    pushTestSchema();
  }, 120000);

  afterEach(() => jest.restoreAllMocks());

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('sem token ⇒ 401; chave extra / ano fora da faixa ⇒ 400', async () => {
    expect((await request(app).get(URL).query({ unitId: UNIT, anoCalendario: '2026' })).status).toBe(401);
    const dono = await novoDono();
    expect((await ler(dono, { unitId: UNIT, anoCalendario: '2026', foo: '1' })).status).toBe(400);
    expect((await ler(dono, { unitId: UNIT, anoCalendario: '1999' })).status).toBe(400);
  });

  it('sem canReadTaxAssessment ⇒ 403', async () => {
    const dono = await novoDono('PRESUMIDO');
    jest.spyOn(AccountingPolicy.prototype, 'canReadTaxAssessment').mockReturnValue(false);
    expect((await ler(dono)).status).toBe(403);
  });

  it('rota estática antes de /:id: perfil ausente ⇒ 200 com PERFIL_AUSENTE (não 404 de apuração)', async () => {
    const dono = await novoDono();
    const res = await ler(dono);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ anoCalendario: 2026, regime: null });
    expect(res.body.data.familias.map((f: { motivo: string }) => f.motivo)).toEqual(['PERFIL_AUSENTE', 'PERFIL_AUSENTE', 'PERFIL_AUSENTE']);
  });

  it('Presumido com T01 confirmado e início em fevereiro: estado, id e aPagarCents vêm do banco; escopo do dono', async () => {
    const dono = await novoDono('PRESUMIDO', { inicioAtividadeEm: '2026-02-10' });
    const outro = await novoDono('PRESUMIDO');
    const t1 = await prisma.taxAssessment.create({
      data: {
        userId: dono.id, unitId: UNIT, anoCalendario: 2026, tributo: 'IRPJ', regime: 'PRESUMIDO', forma: 'TRIMESTRAL', periodo: 'T01',
        modo: 'PRESUMIDO', codigoReceita: '208901', baseCents: 0n, devidoCents: 777n, deducoesCents: 0n, aPagarCents: 777n,
        memoria: [], tabelaVersao: 't', status: 'CONFIRMED', confirmedById: dono.id, confirmedAt: new Date(),
      },
    });
    await prisma.taxAssessment.create({
      data: {
        userId: outro.id, unitId: UNIT, anoCalendario: 2026, tributo: 'CSLL', regime: 'PRESUMIDO', forma: 'TRIMESTRAL', periodo: 'T01',
        modo: 'PRESUMIDO', codigoReceita: '237201', baseCents: 0n, devidoCents: 1n, deducoesCents: 0n, aPagarCents: 1n,
        memoria: [], tabelaVersao: 't', status: 'CONFIRMED', confirmedById: outro.id, confirmedAt: new Date(),
      },
    });
    const res = await ler(dono);
    expect(res.status).toBe(200);
    const [x7, x8, simples] = res.body.data.familias;
    expect(x7).toMatchObject({ familia: 'X7', apuravel: true, forma: 'TRIMESTRAL' });
    expect(x7.periodos[0]).toEqual({ periodo: 'T01', tributos: { IRPJ: { estado: 'CONFIRMED', id: t1.id, aPagarCents: '777' }, CSLL: { estado: 'SEM_APURACAO' } } });
    expect(x8).toMatchObject({ familia: 'X8', apuravel: true, modalidade: 'CUMULATIVO' });
    expect(x8.periodos[0].tributos.PIS).toEqual({ estado: 'FORA_DA_ATIVIDADE' });
    expect(x8.periodos[1].tributos.PIS).toEqual({ estado: 'SEM_APURACAO' });
    expect(simples).toEqual({ familia: 'SIMPLES', apuravel: false, motivo: 'REGIME_NAO_SIMPLES', periodos: [] });
  });
});
