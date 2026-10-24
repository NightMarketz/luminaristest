/**
 * IBS-CBS-2027 PR-5 (BRIEF `docs/accounting/BE-INCR-IBS-CBS-2027-brief.md` itens 22 e 24; dono 23/10) — sobre SQLite real:
 * GET /ibs-cbs-assessments/:id/resumo (vencimento da linha semeada pela migração, feriados do município da unidade),
 * EXPORT_IBS_CBS_MEMO baixado pelo HTTP e o job de recálculo do LEGAL-PARAMS gravando `avisoParametroLegal` (só aviso).
 * As apurações são gravadas direto no banco: o resumo, o export e o job só LEEM o que foi confirmado (a confirmação tem
 * suíte própria em controllers/__tests__/ibsCbsAssessment.integration.test.ts).
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { ApplicationFactory } from '@/lib/factory';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';
import { avisoReconfirme } from '@/features/accounting/services/TaxAssessmentRecalcService';

const app = makeApp();
const BASE = '/api/accounting/ibs-cbs-assessments';
const FONTE_TESTE = 'teste IBS-CBS-2027 PR-5 (alíquota hipotética)';
type Dono = { id: string; username: string; unitId: string };

let seq = 0;
async function novoDono(regime = 'REAL', codMun: string | null = '3550308'): Promise<Dono> {
  seq += 1;
  const u = await prisma.user.create({ data: { name: `ibs5-${seq}`, username: `ibs5-${seq}`, email: `ibs5-${seq}@test.local`, password: 'x', role: 'USER' } });
  await prisma.companyFiscalProfile.create({ data: { userId: u.id, anoCalendario: 2027, regime, ecfIndAliqCsll: '1', ecfIndRecReceita: '2', createdById: u.id, updatedById: u.id } });
  const unitId = `unit-ibs-pr5-${seq}`;
  await seedUnit({ userId: u.id, id: unitId });
  await prisma.fiscalProfile.create({ data: { userId: u.id, unitId, regimeTributario: regime === 'MEI' ? 'SIMPLES' : regime, pisCofinsRegime: 'CUMULATIVO', codMun } });
  return { ...u, unitId };
}

async function apuracao(dono: Dono, over: Record<string, unknown> = {}) {
  return prisma.consumptionTaxAssessment.create({
    data: {
      userId: dono.id, unitId: dono.unitId, anoCalendario: 2027, mes: 1, tributo: 'CBS', regime: 'REAL',
      debitosCents: 1500n, creditosCents: 500n, saldoCents: 1000n,
      memoria: [
        { codigo: 'DEBITO_DOC_1', descricao: 'CBS do documento fd-1 (2027-01-10)', valorCents: '1500', fonte: 'LC 214/2025 art. 60 § 1º' },
        { codigo: 'SPLIT_EXTINCAO_1', descricao: 'split', valorCents: '300', fonte: 'Decreto 12.955/2026 art. 44 § 3º' },
        { codigo: 'SALDO', descricao: 'saldo = débitos − créditos', valorCents: '1000', fonte: 'LC 214/2025 art. 45' },
      ],
      parametrosIds: [], parametrosSha256: 'a'.repeat(64), status: 'CONFIRMED', confirmedById: dono.id, confirmedAt: new Date('2027-02-05T12:00:00.000Z'),
      ...over,
    },
  });
}

const resumo = (dono: Dono, id: string) => request(app).get(`${BASE}/${id}/resumo`).set(authHeader(dono)).query({ unitId: dono.unitId });

describe('IBS-CBS-2027 PR-5 — resumo, export do contador e job de recálculo', () => {
  beforeAll(async () => {
    pushTestSchema();
  }, 120000);

  afterAll(async () => {
    await prisma.legalParameter.deleteMany({ where: { fonte: FONTE_TESTE } });
    await prisma.legalParameterRecalcJob.deleteMany();
    await prisma.$disconnect();
  });

  it('item 22: CBS — saldo a recolher = saldo − split; vencimento = último dia útil de fevereiro (Dec. 12.955 art. 45); memória', async () => {
    const dono = await novoDono();
    const a = await apuracao(dono);
    const r = await resumo(dono, a.id);
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ id: a.id, tributo: 'CBS', anoCalendario: 2027, mes: 1, saldoARecolherCents: '700', vencimento: '2027-02-26', avisos: [] });
    expect(r.body.data.memoria.map((l: { codigo: string }) => l.codigo)).toEqual(['DEBITO_DOC_1', 'SPLIT_EXTINCAO_1', 'SALDO']);
  });

  it('item 22: IBS sem linha publicada ⇒ vencimento null + aviso, 200 (não 400); unidade sem município ⇒ aviso', async () => {
    const dono = await novoDono('PRESUMIDO', null);
    const ibs = await apuracao(dono, { tributo: 'IBS', regime: 'PRESUMIDO' });
    const r = await resumo(dono, ibs.id);
    expect(r.status).toBe(200);
    expect(r.body.data.vencimento).toBeNull();
    expect(r.body.data.avisos.join(' ')).toContain('VENCIMENTO_NAO_PUBLICADO');
    const cbs = await apuracao(dono, { regime: 'PRESUMIDO' });
    expect((await resumo(dono, cbs.id)).body.data.avisos.join(' ')).toContain('VENCIMENTO_SEM_MUNICIPIO');
  });

  it('item 22 (invariante §10.9): Simples/MEI ⇒ 400 nomeado; apuração de outra PJ ⇒ 404; sem unitId ⇒ 400', async () => {
    const simples = await novoDono('SIMPLES');
    const a = await apuracao(simples);
    const r = await resumo(simples, a.id);
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.body)).toContain('IBS_CBS_SIMPLES_MEI');
    const outro = await novoDono();
    expect((await resumo(outro, a.id)).status).toBe(404);
    expect((await request(app).get(`${BASE}/${a.id}/resumo`).set(authHeader(outro))).status).toBe(400);
  });

  it('item 24: EXPORT_IBS_CBS_MEMO — sem janela 400; só as CONFIRMED vivas do dono; RESUMO + MEMORIA; período no job', async () => {
    const dono = await novoDono();
    const viva = await apuracao(dono);
    await apuracao(dono, { status: 'SUPERSEDED', tributo: 'IBS' });
    await apuracao(dono, { mes: 2 });
    const exportar = (body: Record<string, unknown>) =>
      request(app).post('/api/accounting/data-exchange/exports').set(authHeader(dono)).send({ kind: 'EXPORT_IBS_CBS_MEMO', format: 'csv', unitId: dono.unitId, ...body });
    expect((await exportar({})).status).toBe(400);
    const res = await exportar({ periodStart: '2027-01-01', periodEnd: '2027-01-31' });
    expect(res.status).toBe(201);
    const job = await prisma.accountingDataExchangeJob.findUniqueOrThrow({ where: { id: res.body.data.id } });
    expect([job.kind, job.periodStart?.toISOString(), job.periodEnd?.toISOString()]).toEqual(['EXPORT_IBS_CBS_MEMO', '2027-01-01T00:00:00.000Z', '2027-01-31T00:00:00.000Z']);
    const file = await request(app).get(`/api/accounting/data-exchange/jobs/${res.body.data.id}/download`).query({ unitId: dono.unitId }).set(authHeader(dono));
    expect(file.status).toBe(200);
    const lines = String(file.text).replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.length > 0);
    expect(lines[0]).toMatch(/^# kind=EXPORT_IBS_CBS_MEMO; periodStart=2027-01-01; periodEnd=2027-01-31; apuracoes=1; geradoEm=/);
    expect(lines[1]).toBe('anoCalendario,mes,tributo,regime,parametrosSha256,confirmedAt,apuracaoId,substitui,tipoLinha,codigo,descricao,valorCents,fonte');
    expect(lines.slice(2).every((l) => l.includes(viva.id))).toBe(true);
    expect(lines.slice(2).map((l) => l.split(',')[8])).toEqual(['RESUMO', 'RESUMO', 'RESUMO', 'MEMORIA', 'MEMORIA', 'MEMORIA']);
  });

  it('item 24 (invariante §10.10): linha IBS_CBS publicada depois da confirmação ⇒ job grava avisoParametroLegal (só aviso, nada reconfirmado); VENCIMENTO não alcança; 2ª execução idempotente', async () => {
    const dono = await novoDono();
    const alcancada = await apuracao(dono, { anoCalendario: 2031, mes: 5 });
    const outroTributo = await apuracao(dono, { anoCalendario: 2031, mes: 5, tributo: 'IBS' });
    const foraDaVigencia = await apuracao(dono, { anoCalendario: 2030, mes: 12 });
    const linha = await prisma.legalParameter.create({
      data: { tabela: 'IBS_CBS', chave: 'CBS', discriminador: 'ALIQUOTA', valorInt: 880, fonte: FONTE_TESTE, vigenteDesde: '2031-01-01', vigenteAte: '2031-12-31', status: 'PUBLISHED', motivo: 'teste', proposedById: 'teste', publishedById: 'teste', publishedAt: new Date() },
    });
    const venc = await prisma.legalParameter.create({
      data: { tabela: 'IBS_CBS', chave: 'IBS', discriminador: 'VENCIMENTO', valorTexto: 'ULTIMO_DIA_UTIL_MES_SEGUINTE', fonte: FONTE_TESTE, vigenteDesde: '2031-01-01', vigenteAte: '2031-12-31', status: 'PUBLISHED', motivo: 'teste', proposedById: 'teste', publishedById: 'teste', publishedAt: new Date() },
    });
    await prisma.legalParameterRecalcJob.create({ data: { legalParameterId: linha.id, evento: 'PUBLISHED', status: 'PENDING' } });
    await prisma.legalParameterRecalcJob.create({ data: { legalParameterId: venc.id, evento: 'PUBLISHED', status: 'PENDING' } });

    const r = await ApplicationFactory.getInstance().getTaxAssessmentRecalcService().processarPendentes();
    expect(r).toMatchObject({ jobs: 2, falhas: 0, avisos: 1, reconfirmadas: 0 });
    const ler = (id: string) => prisma.consumptionTaxAssessment.findUniqueOrThrow({ where: { id } });
    const motivo = `publicada a linha IBS_CBS/CBS de 2031-01-01`;
    expect(await ler(alcancada.id)).toMatchObject({ avisoParametroLegal: avisoReconfirme(motivo), status: 'CONFIRMED', saldoCents: 1000n, confirmedById: dono.id });
    expect((await ler(outroTributo.id)).avisoParametroLegal).toBeNull();
    expect((await ler(foraDaVigencia.id)).avisoParametroLegal).toBeNull();
    expect(await prisma.consumptionTaxAssessment.count({ where: { userId: dono.id } })).toBe(3); // nenhuma versão nova
    expect((await resumo(dono, alcancada.id)).body.data.avisos.join(' ')).toContain('PARAMETRO_LEGAL');
    expect(await ApplicationFactory.getInstance().getTaxAssessmentRecalcService().processarPendentes()).toMatchObject({ jobs: 0 });
  });
});
