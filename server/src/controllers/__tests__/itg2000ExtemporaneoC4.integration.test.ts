/**
 * TESTE-GUARDA — ITG 2000 (R1) item 36 nos caminhos que o #907 deixou de fora (C4 do handoff
 * `docs/accounting/HANDOFF-2026-11-02-delegacao-dono.md`; GAP-MAP linha "aprovação de rascunho e estorno em período
 * fechado e reaberto"), mais a importação que o dono decidiu em 04/11 (questionário na sessão do C1: "exigir razão").
 *
 * Regra (D-2026-11-02-DELEGACAO-DONO §3, já valendo no `PostingService.postEntry`): lançamento com data num período
 * fechado e reaberto exige a razão do registro extemporâneo, e o histórico consigna
 * `— registro extemporâneo; ocorrência em dd/mm/aaaa; razão: <razão>`. A razão automática vale só para chamada interna.
 *
 * Caminhos aqui, todos pela fronteira HTTP (o DTO é parte da regra: sem o campo no DTO o cliente não tem como mandar a
 * razão, e com DTO `.strict()` ele leva 400 de schema):
 *   1. aprovação de rascunho (`POST /api/entry-approvals/:id/approve`);
 *   2. estorno com data num período reaberto (`POST /api/accounting/reverse`), e o gravador interno com o marcador;
 *   4. importação de lançamentos e de saldos iniciais: sem razão, a linha já sai INVÁLIDA na prévia; com a razão do
 *      job, o commit consigna a razão digitada (não a automática).
 *
 * App Express REAL sobre supertest + SQLite REAL, sem mock. Cada negativo tem o seu CONTROLE.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';
import { getFactory } from '@/lib/factory';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';

const app = makeApp();

const UNIT = 'unit-itg2000-c4';
const RAZAO = 'nota fiscal recebida depois do fechamento';

let dono: { id: string; username: string };

const scope = () => resolveAccountingScopeInternal({ userId: dono.id }, UNIT);
const posting = () => getFactory().getPostingService();

const linhas = (centavos: number) => [
  { accountCode: '4.1', debitCents: centavos, creditCents: 0 },
  { accountCode: '1.1.1.01', debitCents: 0, creditCents: centavos },
];

const auth = () => authHeader(dono);

async function rascunhoSubmetido(descricao: string, data: string): Promise<{ id: string; version: number }> {
  const criado = await request(app)
    .post('/api/entry-approvals/drafts')
    .set(auth())
    .send({ unitId: UNIT, date: data, description: descricao, lines: linhas(3100) });
  expect(criado.status).toBe(201);
  const submetido = await request(app)
    .post(`/api/entry-approvals/drafts/${criado.body.data.id}/submit`)
    .set(auth())
    .send({ unitId: UNIT, expectedVersion: criado.body.data.version });
  expect(submetido.status).toBe(200);
  expect(submetido.body.data.status).toBe('PendingApproval');
  return { id: submetido.body.data.id, version: submetido.body.data.version };
}

const CSV_LANCAMENTOS = (ref: string, data: string) =>
  'entryKey,documentDate,postingDate,description,accountCode,debitCents,creditCents,lineDescription,externalReference\n' +
  `L1,${data},${data},Despesa importada,4.1,2200,0,,${ref}\n` +
  `L1,${data},${data},Despesa importada,1.1.1.01,0,2200,,${ref}\n`;

const CSV_SALDOS = (data: string) =>
  'accountCode,postingDate,description,debitCents,creditCents\n' +
  `4.1,${data},Saldo,1500,0\n` +
  `1.1.1.01,${data},Saldo,0,1500\n`;

function upload(kind: string, csv: string, razao?: string) {
  const req = request(app)
    .post('/api/accounting/data-exchange/imports')
    .set(auth())
    .field('kind', kind)
    .field('unitId', UNIT);
  if (razao) req.field('extemporaneousReason', razao);
  return req.attach('file', Buffer.from(csv, 'utf8'), { filename: 'import.csv', contentType: 'text/csv' });
}

const linhasDoJob = (jobId: string) =>
  request(app).get(`/api/accounting/data-exchange/jobs/${jobId}/rows`).query({ unitId: UNIT }).set(auth());

describe('ITG 2000 (R1) item 36 — aprovação, estorno e importação em período fechado e reaberto (C4)', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({
      data: { name: 'itg2000-c4', username: 'itg2000-c4', email: 'itg2000-c4@test.local', password: 'x', role: 'USER' },
    });
    await seedUnit({ userId: dono.id, id: UNIT });
    const junho = await prisma.accountingPeriod.create({
      data: { userId: dono.id, unitId: UNIT, year: 2026, month: 6, status: 'OPEN', openedAt: new Date(), openedById: dono.id },
    });
    await prisma.accountingPeriod.create({
      data: { userId: dono.id, unitId: UNIT, year: 2026, month: 7, status: 'OPEN', openedAt: new Date(), openedById: dono.id },
    });
    // Semeia o plano canônico (a validação da importação lê as contas existentes).
    await posting().postEntry(scope(), { unitId: UNIT, date: '2026-07-01', description: 'abertura do plano', sourceType: 'manual', lines: linhas(100) });
    await getFactory().getPeriodService().softClosePeriod(scope(), junho.id, 'fechamento de junho');
    const reaberto = await getFactory().getPeriodService().reopenPeriod(scope(), junho.id, 'ajuste após o fechamento');
    expect(reaberto.status).toBe('OPEN');
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ------------------------------------------------------------------ 1 · aprovação de rascunho
  describe('1 — aprovação de rascunho (approve == post)', () => {
    it('CONTROLE: rascunho em período nunca fechado aprova sem razão e o histórico não muda', async () => {
      const r = await rascunhoSubmetido('rascunho de julho', '2026-07-08');
      const res = await request(app).post(`/api/entry-approvals/${r.id}/approve`).set(auth()).send({ unitId: UNIT, expectedVersion: r.version });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Posted');
      expect(res.body.data.description).toBe('rascunho de julho');
    });

    it('rascunho datado no período reaberto, aprovado SEM razão, é recusado (400) e segue aguardando aprovação', async () => {
      const r = await rascunhoSubmetido('rascunho esquecido de junho', '2026-06-18');
      const res = await request(app).post(`/api/entry-approvals/${r.id}/approve`).set(auth()).send({ unitId: UNIT, expectedVersion: r.version });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toContain('registro extemporâneo');
      const naBase = await prisma.journalEntry.findUnique({ where: { id: r.id } });
      expect(naBase?.status).toBe('PendingApproval');
      expect(naBase?.entryNumber).toBeNull();
    });

    it('com a razão no corpo da aprovação, grava e o histórico consigna a data da ocorrência e a razão', async () => {
      const r = await rascunhoSubmetido('rascunho de junho com razão', '2026-06-19');
      const res = await request(app)
        .post(`/api/entry-approvals/${r.id}/approve`)
        .set(auth())
        .send({ unitId: UNIT, expectedVersion: r.version, extemporaneousReason: RAZAO });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Posted');
      expect(res.body.data.description).toBe(
        `rascunho de junho com razão — registro extemporâneo; ocorrência em 19/06/2026; razão: ${RAZAO}`,
      );
    });
  });

  // ------------------------------------------------------------------ 2 · estorno
  describe('2 — estorno com data no período reaberto', () => {
    const original = (descricao: string) =>
      posting().postEntry(scope(), { unitId: UNIT, date: '2026-06-10', description: descricao, sourceType: 'manual', lines: linhas(2700), extemporaneousReason: RAZAO });

    it('CONTROLE: estorno datado num período nunca fechado não exige razão de extemporâneo', async () => {
      const o = await original('compra para estornar em julho');
      const res = await request(app)
        .post('/api/accounting/reverse')
        .set(auth())
        .send({ unitId: UNIT, lancamentoId: o.id, reversalPostingDate: '2026-07-09', reason: 'valor em duplicidade' });

      expect(res.status).toBe(200);
      expect(res.body.data.reversal.description).not.toContain('registro extemporâneo');
    });

    it('estorno datado no período reaberto SEM razão do extemporâneo é recusado (400) e o original segue Posted', async () => {
      const o = await original('compra para estornar em junho sem razão');
      const res = await request(app)
        .post('/api/accounting/reverse')
        .set(auth())
        .send({ unitId: UNIT, lancamentoId: o.id, reversalPostingDate: '2026-06-25', reason: 'valor em duplicidade' });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toContain('registro extemporâneo');
      const naBase = await prisma.journalEntry.findUnique({ where: { id: o.id } });
      expect(naBase?.status).toBe('Posted');
    });

    it('com a razão, o histórico do estorno consigna a data do estorno e a razão do extemporâneo', async () => {
      const o = await original('compra para estornar em junho com razão');
      const res = await request(app)
        .post('/api/accounting/reverse')
        .set(auth())
        .send({ unitId: UNIT, lancamentoId: o.id, reversalPostingDate: '2026-06-25', reason: 'valor em duplicidade', extemporaneousReason: RAZAO });

      expect(res.status).toBe(200);
      expect(res.body.data.reversal.description).toContain('motivo: valor em duplicidade');
      expect(res.body.data.reversal.description).toContain(`registro extemporâneo; ocorrência em 25/06/2026; razão: ${RAZAO}`);
    });

    it('gravador interno (automaticWriter) estorna no período reaberto com a razão automática', async () => {
      const o = await original('compra estornada por gravador interno');
      // Variável (não literal) para o tipo aceitar o marcador interno como o PostEntryInput aceita.
      const entrada = {
        unitId: UNIT,
        lancamentoId: o.id,
        reversalPostingDate: '2026-06-26',
        reason: 'Cancelamento da venda',
        automaticWriter: true,
      };
      const { reversal } = await posting().reverseEntry(scope(), entrada);

      expect(reversal.description).toContain('registro extemporâneo; ocorrência em 26/06/2026; razão: lançamento automático');
    });
  });

  // ------------------------------------------------------------------ 4 · importação
  describe('4 — importação (decisão do dono, 04/11: exigir razão)', () => {
    it('CONTROLE: lançamentos importados em período nunca fechado saem VÁLIDOS na prévia sem razão', async () => {
      const res = await upload('IMPORT_JOURNAL_ENTRIES', CSV_LANCAMENTOS('C4-JUL', '2026-07-12'));

      expect(res.status).toBe(201);
      expect(res.body.data.validRows).toBe(2);
      expect(res.body.data.invalidRows).toBe(0);
    });

    it('lançamentos importados no período reaberto, SEM razão no job, saem INVÁLIDOS já na prévia', async () => {
      const res = await upload('IMPORT_JOURNAL_ENTRIES', CSV_LANCAMENTOS('C4-JUN-SEM', '2026-06-12'));

      expect(res.status).toBe(201);
      expect(res.body.data.invalidRows).toBe(2);
      const rows = await linhasDoJob(res.body.data.id);
      expect(rows.status).toBe(200);
      for (const row of rows.body.data) {
        expect(row.status).toBe('INVALID');
        expect(row.errorMessage).toContain('registro extemporâneo');
      }
    });

    it('saldos iniciais no período reaberto, SEM razão no job, saem INVÁLIDOS já na prévia', async () => {
      const res = await upload('IMPORT_OPENING_BALANCES', CSV_SALDOS('2026-06-01'));

      expect(res.status).toBe(201);
      expect(res.body.data.invalidRows).toBe(2);
      const rows = await linhasDoJob(res.body.data.id);
      for (const row of rows.body.data) {
        expect(row.status).toBe('INVALID');
        expect(row.errorMessage).toContain('registro extemporâneo');
      }
    });

    it('com a razão no job, a prévia sai VÁLIDA e o commit consigna a razão digitada, não a automática', async () => {
      const res = await upload('IMPORT_JOURNAL_ENTRIES', CSV_LANCAMENTOS('C4-JUN-COM', '2026-06-13'), RAZAO);
      expect(res.status).toBe(201);
      expect(res.body.data.validRows).toBe(2);

      const commit = await request(app)
        .post(`/api/accounting/data-exchange/jobs/${res.body.data.id}/commit`)
        .set(auth())
        .send({ unitId: UNIT });
      expect(commit.status).toBe(200);
      expect(commit.body.data.status).toBe('COMMITTED');

      const entry = await prisma.journalEntry.findFirst({
        where: { userId: dono.id, unitId: UNIT, sourceType: 'IMPORT_JOURNAL_ENTRIES', sourceId: 'C4-JUN-COM' },
      });
      expect(entry?.description).toBe(`Despesa importada — registro extemporâneo; ocorrência em 13/06/2026; razão: ${RAZAO}`);
    });
  });
});
