/**
 * X7 Fase C PR-1 (BRIEF `docs/accounting/BE-INCR-TAX-ASSESSMENT-C-brief.md` itens 1–4, 6, 12) — memória de cálculo
 * das apurações exportada ponta a ponta: POST /data-exchange/exports com o kind novo → download do arquivo. As
 * apurações são gravadas direto no banco (o export só LÊ o que foi confirmado; o cálculo tem suíte própria). Prova o
 * que o unit não alcança: a leitura real pelo `TaxAssessmentRepository` (escopo do dono, SUPERSEDED/soft-deleted fora)
 * e o período do job gravado, que o pacote do contador usa (item 9).
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();
const UNIT = 'unit-x7c-memo';
type Dono = { id: string; username: string };

let seq = 0;
async function novoDono(): Promise<Dono> {
  seq += 1;
  return prisma.user.create({ data: { name: `x7c-${seq}`, username: `x7c-${seq}`, email: `x7c-${seq}@test.local`, password: 'x', role: 'USER' } });
}

async function apuracao(dono: Dono, periodo: string, extra: Record<string, unknown> = {}) {
  return prisma.taxAssessment.create({
    data: {
      userId: dono.id, unitId: UNIT, anoCalendario: 2026, tributo: 'IRPJ', regime: 'PRESUMIDO', forma: 'TRIMESTRAL', periodo,
      modo: 'PRESUMIDO', codigoReceita: '208901', baseCents: 100000n, devidoCents: 15000n, deducoesCents: 0n, aPagarCents: 15000n,
      memoria: [{ codigo: 'RB', descricao: 'Receita bruta', valorCents: '1250000', fonte: 'razão' }],
      tabelaVersao: 'v-test', status: 'CONFIRMED', confirmedById: dono.id, confirmedAt: new Date('2026-04-10T12:00:00.000Z'), ...extra,
    },
  });
}

const exportar = (dono: Dono, body: Record<string, unknown>) =>
  request(app).post('/api/accounting/data-exchange/exports').set(authHeader(dono))
    .send({ kind: 'EXPORT_TAX_ASSESSMENT_MEMO', format: 'csv', unitId: UNIT, ...body });

async function baixar(dono: Dono, jobId: string): Promise<string[]> {
  const file = await request(app).get(`/api/accounting/data-exchange/jobs/${jobId}/download`).query({ unitId: UNIT }).set(authHeader(dono));
  expect(file.status).toBe(200);
  return String(file.text).replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.length > 0);
}

describe('X7 Fase C PR-1 — EXPORT_TAX_ASSESSMENT_MEMO pelo HTTP', () => {
  beforeAll(async () => {
    pushTestSchema();
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('item 2: sem janela ⇒ 400; campo de outro kind ⇒ 400', async () => {
    const dono = await novoDono();
    expect((await exportar(dono, {})).status).toBe(400);
    expect((await exportar(dono, { periodStart: '2026-01-01', periodEnd: '2026-03-31', asOf: '2026-03-31' })).status).toBe(400);
  });

  it('itens 3/4/6: só as CONFIRMED vivas do dono, inteiras na janela; memória idêntica; período gravado no job', async () => {
    const dono = await novoDono();
    const outro = await novoDono();
    const t01 = await apuracao(dono, 'T01');
    await apuracao(dono, 'T01', { status: 'SUPERSEDED', tributo: 'CSLL', codigoReceita: '237201' });
    await apuracao(dono, 'T01', { deletedAt: new Date(), tributo: 'CSLL', codigoReceita: '237201' });
    await apuracao(dono, 'T02');
    await apuracao(outro, 'T01');

    const res = await exportar(dono, { periodStart: '2026-01-01', periodEnd: '2026-03-31' });
    expect(res.status).toBe(201);
    const job = await prisma.accountingDataExchangeJob.findUniqueOrThrow({ where: { id: res.body.data.id } });
    expect(job.kind).toBe('EXPORT_TAX_ASSESSMENT_MEMO');
    expect(job.periodStart?.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(job.periodEnd?.toISOString()).toBe('2026-03-31T00:00:00.000Z');

    const lines = await baixar(dono, res.body.data.id);
    expect(lines[0]).toMatch(/^# kind=EXPORT_TAX_ASSESSMENT_MEMO; periodStart=2026-01-01; periodEnd=2026-03-31; apuracoes=1; geradoEm=/);
    expect(lines[1]).toBe('anoCalendario,periodo,tributo,regime,forma,modo,codigoReceita,tabelaVersao,confirmedAt,apuracaoId,substitui,tipoLinha,codigo,descricao,valorCents,fonte');
    expect(lines).toHaveLength(2 + 7);
    expect(lines.slice(2).every((l) => l.includes(t01.id))).toBe(true);
    expect(lines[8]).toBe(`2026,T01,IRPJ,PRESUMIDO,TRIMESTRAL,PRESUMIDO,208901,v-test,2026-04-10T12:00:00.000Z,${t01.id},,MEMORIA,RB,Receita bruta,1250000,razão`);
  });

  it('item 12: janela sem apuração ⇒ 201 com meta + cabeçalho e 0 linhas', async () => {
    const dono = await novoDono();
    const res = await exportar(dono, { periodStart: '2026-01-01', periodEnd: '2026-03-31' });
    expect(res.status).toBe(201);
    const lines = await baixar(dono, res.body.data.id);
    expect(lines[0]).toContain('apuracoes=0');
    expect(lines).toHaveLength(2);
  });
});
