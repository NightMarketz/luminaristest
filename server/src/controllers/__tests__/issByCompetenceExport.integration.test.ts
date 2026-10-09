/**
 * X7 Fase C PR-2 (BRIEF `docs/accounting/BE-INCR-TAX-ASSESSMENT-C-brief.md` itens 14, 15, 17, 20; F-TC-1 a, F-TC-3 a,
 * F-TC-4 a, F-TC-7 b) — ISS por competência ponta a ponta: `FiscalDocument` + tentativas gravados direto no banco
 * (a emissão tem suíte própria), POST /data-exchange/exports com o kind novo, download do arquivo. Prova o que o unit
 * não alcança: o filtro real do `FiscalDocumentRepository.findForIssReport` e o município lido do payload da tentativa
 * CORRENTE.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();
const UNIT = 'unit-x7c-iss';
const SP = '3550308';
const RJ = '3304557';
type Dono = { id: string; username: string };

let seq = 0;
async function novoDono(): Promise<Dono> {
  seq += 1;
  return prisma.user.create({ data: { name: `x7iss-${seq}`, username: `x7iss-${seq}`, email: `x7iss-${seq}@test.local`, password: 'x', role: 'USER' } });
}

const payload = (mun: string) => JSON.stringify({ versao: '1.01', infDPS: { serv: { locPrest: { cLocPrestacao: mun } } } });

let nota = 0;
async function documento(dono: Dono, over: Record<string, unknown> = {}, attempts: string[] = [SP]) {
  nota += 1;
  const doc = await prisma.fiscalDocument.create({
    data: {
      userId: dono.id, unitId: UNIT, kind: 'NFSE', status: 'AUTHORIZED', saleId: `sale-${nota}`, saleKey: `sale-${nota}`,
      cTribNac: '060101', anchorEntryId: `je-${nota}`, ambiente: 'producao', partner: 'manual', serie: 1, numero: BigInt(nota),
      dCompet: '2026-03-10', vServCents: 10000n, baseIssCents: 10000n, aliqIssBp: 500, vIssCents: 500n, tpRetISSQN: 1,
      currentAttemptNo: attempts.length, ...over,
    },
  });
  for (const [i, mun] of attempts.entries()) {
    await prisma.fiscalDocumentAttempt.create({ data: { documentId: doc.id, attemptNo: i + 1, ref: `${doc.id}:${i + 1}`, payloadJson: payload(mun) } });
  }
  return doc;
}

const exportar = (dono: Dono, body: Record<string, unknown>) =>
  request(app).post('/api/accounting/data-exchange/exports').set(authHeader(dono))
    .send({ kind: 'EXPORT_ISS_BY_COMPETENCE', format: 'csv', unitId: UNIT, ...body });

async function baixar(dono: Dono, jobId: string): Promise<string[]> {
  const file = await request(app).get(`/api/accounting/data-exchange/jobs/${jobId}/download`).query({ unitId: UNIT }).set(authHeader(dono));
  expect(file.status).toBe(200);
  return String(file.text).replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.length > 0);
}

describe('X7 Fase C PR-2 — EXPORT_ISS_BY_COMPETENCE pelo HTTP', () => {
  beforeAll(async () => {
    pushTestSchema();
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('sem janela ⇒ 400', async () => {
    const dono = await novoDono();
    expect((await exportar(dono, {})).status).toBe(400);
  });

  it('item 14 + F-TC-3/4: só NFS-e de produção, vivas, AUTHORIZED/AUTHORIZED_DIVERGENT, da unidade e da janela; município da tentativa corrente; retido separado', async () => {
    const dono = await novoDono();
    const outro = await novoDono();
    await documento(dono); // entra: SP próprio
    await documento(dono, { status: 'AUTHORIZED_DIVERGENT' }); // entra (F-TC-4 a), contado
    await documento(dono, { tpRetISSQN: 2, vIssCents: 300n }); // entra: SP retido (linha à parte)
    await documento(dono, { vIssCents: null, baseIssCents: null }, [SP, RJ]); // tentativa corrente = 2 ⇒ RJ; sem vIss
    // ficam fora:
    await documento(dono, { kind: 'NFE' });
    await documento(dono, { ambiente: 'homologacao' });
    for (const status of ['SENT', 'PROCESSING', 'REJECTED', 'CANCELLED']) await documento(dono, { status });
    await documento(dono, { deletedAt: new Date() });
    await documento(dono, { dCompet: '2026-04-01' });
    await documento(dono, { unitId: 'outra-unidade' });
    await documento(outro);

    const res = await exportar(dono, { periodStart: '2026-03-01', periodEnd: '2026-03-31' });
    expect(res.status).toBe(201);
    const job = await prisma.accountingDataExchangeJob.findUniqueOrThrow({ where: { id: res.body.data.id } });
    expect(job.periodStart?.toISOString()).toBe('2026-03-01T00:00:00.000Z');
    expect(job.periodEnd?.toISOString()).toBe('2026-03-31T00:00:00.000Z');

    const lines = await baixar(dono, res.body.data.id);
    expect(lines[0]).toMatch(/^# kind=EXPORT_ISS_BY_COMPETENCE; periodStart=2026-03-01; periodEnd=2026-03-31; documentos=4; documentosSemIss=1; geradoEm=.+; aviso=1 nota/);
    expect(lines.slice(1)).toEqual([
      'competencia,municipioIbge,retido,documentos,documentosSemIss,divergentes,vServCents,baseIssCents,vIssCents',
      `2026-03,${RJ},false,1,1,0,10000,0,0`,
      `2026-03,${SP},false,2,0,1,20000,20000,1000`,
      `2026-03,${SP},true,1,0,0,10000,10000,300`,
    ]);
  });
});
