/**
 * CONTRATO HTTP de /fixed-asset-classes + /fixed-assets + /fixed-assets/depreciation/run +
 * /fixed-assets/reconcile (BE-INCR-FIXED-ASSETS, nó C8, PR-2+PR-3) — app Express REAL sobre
 * supertest + SQLite REAL (molde: `bankSettlementController.integration.test.ts`). Prova a FIAÇÃO
 * (auth → rota → DTO → controller → serviço → Prisma) e a baixa sequencial do Passo 14 (dispose
 * posta a quota do mês antes da baixa, idempotente pelo mesmo mecanismo do `runMonth`).
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();
const UNIT = 'unit-fixed-assets-http';

let dono: { id: string; username: string };
let outro: { id: string; username: string };

const criarUsuario = (username: string) =>
  prisma.user.create({ data: { name: username, username, email: `${username}@test.local`, password: 'x', role: 'USER' } });
const criarConta = (code: string, nature: string) =>
  prisma.account.create({ data: { userId: dono.id, unitId: UNIT, code, name: `Conta ${code}`, nature, acceptsEntries: true } });

let costAccountId: string;
let accDepAccountId: string;
let cashAccountId: string;
let depreciationExpenseAccountId: string;

describe('/api/accounting/fixed-asset-classes + /fixed-assets — contrato HTTP', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await criarUsuario('fixedasset-http-a');
    outro = await criarUsuario('fixedasset-http-b');
    await prisma.accountingPeriod.create({
      data: { userId: dono.id, unitId: UNIT, year: 2026, month: 1, status: 'OPEN', openedAt: new Date(), openedById: dono.id },
    });
    const cost = await criarConta('1.2.1', 'Asset');
    const accDep = await criarConta('1.2.9.1', 'Asset');
    const cash = await criarConta('1.1.1', 'Asset');
    const gain = await criarConta('3.9', 'Revenue');
    const loss = await criarConta('4.9', 'Expense');
    const depExpense = await criarConta('4.1', 'Expense');
    costAccountId = cost.id;
    accDepAccountId = accDep.id;
    cashAccountId = cash.id;
    depreciationExpenseAccountId = depExpense.id;

    const settings = await request(app)
      .put('/api/accounting/settings')
      .set(authHeader(dono))
      .send({ unitId: UNIT, disposalGainAccountId: gain.id, disposalLossAccountId: loss.id, depreciationExpenseAccountId });
    expect(settings.status).toBe(200);
  }, 60000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('sem Bearer, as rotas respondem 401', async () => {
    expect((await request(app).get('/api/accounting/fixed-asset-classes').query({ unitId: UNIT })).status).toBe(401);
    expect((await request(app).get('/api/accounting/fixed-assets').query({ unitId: UNIT })).status).toBe(401);
  });

  it('CONTROLE: cria classe, cria ativo, ativa, e lista', async () => {
    const klass = await request(app)
      .post('/api/accounting/fixed-asset-classes')
      .set(authHeader(dono))
      .send({ unitId: UNIT, code: 'MAQ', name: 'Máquinas', depreciable: true, costAccountId, accumulatedDepreciationAccountId: accDepAccountId });
    expect(klass.status).toBe(201);
    const classId = klass.body.data.id as string;

    const asset = await request(app)
      .post('/api/accounting/fixed-assets')
      .set(authHeader(dono))
      .send({ unitId: UNIT, classId, code: 'A-CTRL', description: 'Torno CNC', quantity: 1, costCents: 100_000, residualValueCents: 0, acquiredAt: '2026-01-01', annualRateBp: 1000 });
    expect(asset.status).toBe(201);
    expect(asset.body.data.status).toBe('PENDING_ACTIVATION');
    const assetId = asset.body.data.id as string;

    const activated = await request(app)
      .post(`/api/accounting/fixed-assets/${assetId}/activate`)
      .set(authHeader(dono))
      .send({ unitId: UNIT, assetId, activatedAt: '2026-01-01', version: 1 });
    expect(activated.status).toBe(200);
    expect(activated.body.data.status).toBe('ACTIVE');

    const list = await request(app).get('/api/accounting/fixed-assets').set(authHeader(dono)).query({ unitId: UNIT, status: 'ACTIVE' });
    expect(list.body.data.some((a: { id: string }) => a.id === assetId)).toBe(true);
  });

  it('depreciable=true SEM accumulatedDepreciationAccountId é 400 (superRefine)', async () => {
    const res = await request(app)
      .post('/api/accounting/fixed-asset-classes')
      .set(authHeader(dono))
      .send({ unitId: UNIT, code: 'SEM-ACC', name: 'x', depreciable: true, costAccountId });
    expect(res.status).toBe(400);
  });

  it('DELETE de classe com ativo vivo é 400; sem ativo, remove', async () => {
    const klass = await request(app)
      .post('/api/accounting/fixed-asset-classes')
      .set(authHeader(dono))
      .send({ unitId: UNIT, code: 'DEL-TEST', name: 'x', depreciable: false, costAccountId });
    const classId = klass.body.data.id as string;

    const asset = await request(app)
      .post('/api/accounting/fixed-assets')
      .set(authHeader(dono))
      .send({ unitId: UNIT, classId, code: 'A-DEL', description: 'x', costCents: 1000, residualValueCents: 0, acquiredAt: '2026-01-01', annualRateBp: 1000 });
    expect(asset.status).toBe(201);

    const blocked = await request(app)
      .delete(`/api/accounting/fixed-asset-classes/${classId}`)
      .set(authHeader(dono))
      .send({ unitId: UNIT, classId });
    expect(blocked.status).toBe(400);

    await request(app).delete(`/api/accounting/fixed-assets/${asset.body.data.id}`).set(authHeader(dono)).send({ unitId: UNIT, assetId: asset.body.data.id });
    const ok = await request(app)
      .delete(`/api/accounting/fixed-asset-classes/${classId}`)
      .set(authHeader(dono))
      .send({ unitId: UNIT, classId });
    expect(ok.status).toBe(200);
  });

  it('activate com version divergente é 409 (CAS)', async () => {
    const klass = await request(app).post('/api/accounting/fixed-asset-classes').set(authHeader(dono)).send({ unitId: UNIT, code: 'CAS-1', name: 'x', depreciable: false, costAccountId });
    const asset = await request(app)
      .post('/api/accounting/fixed-assets')
      .set(authHeader(dono))
      .send({ unitId: UNIT, classId: klass.body.data.id, code: 'A-CAS', description: 'x', costCents: 1000, residualValueCents: 0, acquiredAt: '2026-01-01', annualRateBp: 1000 });
    const assetId = asset.body.data.id as string;
    const res = await request(app)
      .post(`/api/accounting/fixed-assets/${assetId}/activate`)
      .set(authHeader(dono))
      .send({ unitId: UNIT, assetId, activatedAt: '2026-01-01', version: 999 });
    expect(res.status).toBe(409);
  });

  it('assetId do corpo divergente do :id é 400 — nunca um dos dois ignorado', async () => {
    const res = await request(app)
      .put('/api/accounting/fixed-assets/qualquer-id')
      .set(authHeader(dono))
      .send({ unitId: UNIT, assetId: 'outro-id', description: 'x' });
    expect(res.status).toBe(400);
  });

  it('ativo/classe de OUTRO escopo é 404, nunca 403 (D11)', async () => {
    const klass = await request(app).post('/api/accounting/fixed-asset-classes').set(authHeader(dono)).send({ unitId: UNIT, code: 'ALHEIA', name: 'x', depreciable: false, costAccountId });
    const asset = await request(app)
      .post('/api/accounting/fixed-assets')
      .set(authHeader(dono))
      .send({ unitId: UNIT, classId: klass.body.data.id, code: 'A-ALHEIO', description: 'x', costCents: 1000, residualValueCents: 0, acquiredAt: '2026-01-01', annualRateBp: 1000 });
    const assetId = asset.body.data.id as string;

    const res = await request(app)
      .get(`/api/accounting/fixed-assets/${assetId}`)
      .set(authHeader(outro))
      .query({ unitId: 'unit-do-outro' });
    expect(res.status).toBe(404);
  });

  describe('dispose — baixa sequencial (Passo 14, PR-3): posta a quota antes da baixa', () => {
    it('dispor no mesmo mês da ativação SEM quota postada: 2 entries na ordem (quota, depois baixa), sem 400', async () => {
      const klass = await request(app)
        .post('/api/accounting/fixed-asset-classes')
        .set(authHeader(dono))
        .send({ unitId: UNIT, code: 'DISP-1', name: 'x', depreciable: true, costAccountId, accumulatedDepreciationAccountId: accDepAccountId });
      const asset = await request(app)
        .post('/api/accounting/fixed-assets')
        .set(authHeader(dono))
        .send({ unitId: UNIT, classId: klass.body.data.id, code: 'A-DISP-1', description: 'x', costCents: 100_000, residualValueCents: 0, acquiredAt: '2026-01-01', annualRateBp: 1000 });
      const assetId = asset.body.data.id as string;
      await request(app).post(`/api/accounting/fixed-assets/${assetId}/activate`).set(authHeader(dono)).send({ unitId: UNIT, assetId, activatedAt: '2026-01-01', version: 1 });

      const res = await request(app)
        .post(`/api/accounting/fixed-assets/${assetId}/dispose`)
        .set(authHeader(dono))
        .send({ unitId: UNIT, assetId, disposedAt: '2026-01-31', proceedsCents: 0, version: 2 }); // activate() já incrementou o version p/ 2
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('DISPOSED');

      const quotaEntry = await prisma.journalEntry.findFirst({ where: { sourceType: 'fixed_asset.depreciation', sourceId: `${assetId}:2026-01` } });
      const disposalEntry = await prisma.journalEntry.findFirst({ where: { sourceType: 'fixed_asset.disposal', sourceId: assetId } });
      expect(quotaEntry).toBeTruthy();
      expect(disposalEntry).toBeTruthy();
      expect(quotaEntry!.entryNumber).toBeLessThan(disposalEntry!.entryNumber!); // ordem: quota ANTES da baixa

      const finalAsset = await prisma.fixedAsset.findUnique({ where: { id: assetId } });
      expect(finalAsset!.accumulatedDepreciationCents).toBe(833n); // quota do mês 1 (10% a.a.) refletida
    });

    it('LAND (depreciable=false) dispõe sem gerar entry de depreciação nenhuma', async () => {
      const klass = await request(app).post('/api/accounting/fixed-asset-classes').set(authHeader(dono)).send({ unitId: UNIT, code: 'LAND-1', name: 'Terreno', depreciable: false, costAccountId });
      const asset = await request(app)
        .post('/api/accounting/fixed-assets')
        .set(authHeader(dono))
        .send({ unitId: UNIT, classId: klass.body.data.id, code: 'A-LAND-1', description: 'Terreno X', costCents: 50_000, residualValueCents: 0, acquiredAt: '2026-01-01', annualRateBp: 1000 });
      const assetId = asset.body.data.id as string;
      await request(app).post(`/api/accounting/fixed-assets/${assetId}/activate`).set(authHeader(dono)).send({ unitId: UNIT, assetId, activatedAt: '2026-01-01', version: 1 });

      const res = await request(app)
        .post(`/api/accounting/fixed-assets/${assetId}/dispose`)
        .set(authHeader(dono))
        .send({ unitId: UNIT, assetId, disposedAt: '2026-01-31', proceedsCents: 50_000, counterpartAccountId: cashAccountId, version: 2 });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('DISPOSED');
      expect(await prisma.journalEntry.count({ where: { sourceType: 'fixed_asset.depreciation', sourceId: `${assetId}:2026-01` } })).toBe(0);
    });

    it('quota já postada via /depreciation/run: dispose com GANHO posta a entry esperada, sem duplicar a quota', async () => {
      const klass = await request(app)
        .post('/api/accounting/fixed-asset-classes')
        .set(authHeader(dono))
        .send({ unitId: UNIT, code: 'DISP-GANHO', name: 'x', depreciable: true, costAccountId, accumulatedDepreciationAccountId: accDepAccountId });
      const asset = await request(app)
        .post('/api/accounting/fixed-assets')
        .set(authHeader(dono))
        .send({ unitId: UNIT, classId: klass.body.data.id, code: 'A-GANHO', description: 'x', costCents: 100_000, residualValueCents: 0, acquiredAt: '2026-01-01', annualRateBp: 1000 });
      const assetId = asset.body.data.id as string;
      await request(app).post(`/api/accounting/fixed-assets/${assetId}/activate`).set(authHeader(dono)).send({ unitId: UNIT, assetId, activatedAt: '2026-01-01', version: 1 });

      const run = await request(app)
        .post('/api/accounting/fixed-assets/depreciation/run')
        .set(authHeader(dono))
        .send({ unitId: UNIT, yearMonth: '2026-01' });
      expect(run.status).toBe(200);
      expect(run.body.data.posted).toBeGreaterThanOrEqual(1);
      const afterRun = await prisma.fixedAsset.findUnique({ where: { id: assetId } });
      expect(afterRun!.accumulatedDepreciationCents).toBe(833n);

      // NBV = 100.000 - 833 = 99.167; proceeds = 100.000 → ganho de 833.
      const res = await request(app)
        .post(`/api/accounting/fixed-assets/${assetId}/dispose`)
        .set(authHeader(dono))
        .send({ unitId: UNIT, assetId, disposedAt: '2026-01-31', proceedsCents: 100_000, counterpartAccountId: cashAccountId, version: afterRun!.version });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('DISPOSED');
      expect(res.body.data.disposalEntryId).toBeTruthy();

      // A quota do mês NÃO duplica — postQuotaForDisposal achou a entry via read-first e não repostou.
      expect(await prisma.journalEntry.count({ where: { sourceType: 'fixed_asset.depreciation', sourceId: `${assetId}:2026-01` } })).toBe(1);

      const entry = await prisma.journalEntry.findUnique({
        where: { id: res.body.data.disposalEntryId as string },
        include: { postings: { include: { account: true } } },
      });
      expect(entry).toBeTruthy();
      const byCode = new Map(entry!.postings.map((p) => [p.account.code, p]));
      expect(Number(byCode.get('1.2.1')?.creditCents)).toBe(100_000); // baixa do custo
      expect(Number(byCode.get('1.2.9.1')?.debitCents)).toBe(833); // zera a acumulada
      expect(Number(byCode.get('1.1.1')?.debitCents)).toBe(100_000); // caixa recebido
      expect(Number(byCode.get('3.9')?.creditCents)).toBe(833); // ganho

      // Chamada sequencial SUBSEQUENTE (já DISPOSED) é 400 pelo guard de status.
      const again = await request(app)
        .post(`/api/accounting/fixed-assets/${assetId}/dispose`)
        .set(authHeader(dono))
        .send({ unitId: UNIT, assetId, disposedAt: '2026-01-31', proceedsCents: 100_000, counterpartAccountId: cashAccountId, version: afterRun!.version });
      expect(again.status).toBe(400);
      expect(await prisma.journalEntry.count({ where: { sourceType: 'fixed_asset.disposal', sourceId: assetId } })).toBe(1);
    });

    it('OPS-001 adversarial: 2 baixas CONCORRENTES (mesma version, mês sem quota postada) — só 1 vence, a outra 400/409, 1 entry de baixa só', async () => {
      const klass = await request(app)
        .post('/api/accounting/fixed-asset-classes')
        .set(authHeader(dono))
        .send({ unitId: UNIT, code: 'DISP-CONC', name: 'x', depreciable: true, costAccountId, accumulatedDepreciationAccountId: accDepAccountId });
      const asset = await request(app)
        .post('/api/accounting/fixed-assets')
        .set(authHeader(dono))
        .send({ unitId: UNIT, classId: klass.body.data.id, code: 'A-CONC', description: 'x', costCents: 100_000, residualValueCents: 0, acquiredAt: '2026-01-01', annualRateBp: 1000 });
      const assetId = asset.body.data.id as string;
      await request(app).post(`/api/accounting/fixed-assets/${assetId}/activate`).set(authHeader(dono)).send({ unitId: UNIT, assetId, activatedAt: '2026-01-01', version: 1 });

      const disposeCall = () =>
        request(app)
          .post(`/api/accounting/fixed-assets/${assetId}/dispose`)
          .set(authHeader(dono))
          .send({ unitId: UNIT, assetId, disposedAt: '2026-01-31', proceedsCents: 99_167, counterpartAccountId: cashAccountId, version: 2 }); // activate() já incrementou p/ 2; NBV pós-quota (100.000-833) → sem ganho/perda
      const [a, b] = await Promise.all([disposeCall(), disposeCall()]);
      const statuses = [a.status, b.status].sort();
      // Windows serializa SQLite (classe windows-serializa-sqlite-ci-linux-nao) — localmente as
      // duas podem serializar como 200+400; o invariante que NÃO pode falhar em nenhum dos dois SOs
      // é "só 1 sucesso, 1 entry de baixa" (a quota do mês, por sua vez, é idempotente por sourceId
      // e nunca duplica em nenhum dos dois casos — read-first + P2002 race-close).
      expect(statuses[0]).toBe(200);
      expect([400, 409]).toContain(statuses[1]);
      expect(await prisma.journalEntry.count({ where: { sourceType: 'fixed_asset.disposal', sourceId: assetId } })).toBe(1);
      expect(await prisma.journalEntry.count({ where: { sourceType: 'fixed_asset.depreciation', sourceId: `${assetId}:2026-01` } })).toBe(1);
    });
  });

  describe('/api/accounting/fixed-assets/depreciation/run (PR-3, item 12)', () => {
    it('sem Bearer, 401', async () => {
      const res = await request(app).post('/api/accounting/fixed-assets/depreciation/run').send({ unitId: UNIT, yearMonth: '2026-01' });
      expect(res.status).toBe(401);
    });

    it('yearMonth fora do formato AAAA-MM é 400', async () => {
      const res = await request(app).post('/api/accounting/fixed-assets/depreciation/run').set(authHeader(dono)).send({ unitId: UNIT, yearMonth: '2026-13' });
      expect(res.status).toBe(400);
    });

    it('posta a quota de um ativo ACTIVE depreciável; 2ª chamada do MESMO mês é idempotente (posted=0)', async () => {
      const klass = await request(app)
        .post('/api/accounting/fixed-asset-classes')
        .set(authHeader(dono))
        .send({ unitId: UNIT, code: 'RUN-1', name: 'x', depreciable: true, costAccountId, accumulatedDepreciationAccountId: accDepAccountId });
      const asset = await request(app)
        .post('/api/accounting/fixed-assets')
        .set(authHeader(dono))
        .send({ unitId: UNIT, classId: klass.body.data.id, code: 'A-RUN-1', description: 'x', costCents: 100_000, residualValueCents: 0, acquiredAt: '2026-01-01', annualRateBp: 1000 });
      const assetId = asset.body.data.id as string;
      await request(app).post(`/api/accounting/fixed-assets/${assetId}/activate`).set(authHeader(dono)).send({ unitId: UNIT, assetId, activatedAt: '2026-01-01', version: 1 });

      const first = await request(app).post('/api/accounting/fixed-assets/depreciation/run').set(authHeader(dono)).send({ unitId: UNIT, yearMonth: '2026-01' });
      expect(first.status).toBe(200);
      expect(first.body.data).toMatchObject({ yearMonth: '2026-01', failed: [] });
      expect(first.body.data.posted).toBeGreaterThanOrEqual(1);

      const second = await request(app).post('/api/accounting/fixed-assets/depreciation/run').set(authHeader(dono)).send({ unitId: UNIT, yearMonth: '2026-01' });
      expect(second.status).toBe(200);
      expect(second.body.data.posted).toBe(0); // idempotente — nenhuma entry nova
      expect(await prisma.journalEntry.count({ where: { sourceType: 'fixed_asset.depreciation', sourceId: `${assetId}:2026-01` } })).toBe(1);
    });
  });

  describe('/api/accounting/fixed-assets/reconcile (PR-3, item 13/14)', () => {
    it('sem Bearer, 401', async () => {
      const res = await request(app).post('/api/accounting/fixed-assets/reconcile').send({ unitId: UNIT });
      expect(res.status).toBe(401);
    });

    it('devolve draftsCreated=0 (gancho de re-drive de payables vazio até o PR-5)', async () => {
      const res = await request(app).post('/api/accounting/fixed-assets/reconcile').set(authHeader(dono)).send({ unitId: UNIT });
      expect(res.status).toBe(200);
      expect(res.body.data.draftsCreated).toBe(0);
    });

    it('repara drift real: accumulatedDepreciationCents divergente do razão é recomputado', async () => {
      const klass = await request(app)
        .post('/api/accounting/fixed-asset-classes')
        .set(authHeader(dono))
        .send({ unitId: UNIT, code: 'RECON-1', name: 'x', depreciable: true, costAccountId, accumulatedDepreciationAccountId: accDepAccountId });
      const asset = await request(app)
        .post('/api/accounting/fixed-assets')
        .set(authHeader(dono))
        .send({ unitId: UNIT, classId: klass.body.data.id, code: 'A-RECON-1', description: 'x', costCents: 100_000, residualValueCents: 0, acquiredAt: '2026-01-01', annualRateBp: 1000 });
      const assetId = asset.body.data.id as string;
      await request(app).post(`/api/accounting/fixed-assets/${assetId}/activate`).set(authHeader(dono)).send({ unitId: UNIT, assetId, activatedAt: '2026-01-01', version: 1 });
      await request(app).post('/api/accounting/fixed-assets/depreciation/run').set(authHeader(dono)).send({ unitId: UNIT, yearMonth: '2026-01' });

      // Simula o drift que o predicado [D3] do runMonth existe para fechar: accumulated "perdido".
      await prisma.fixedAsset.update({ where: { id: assetId }, data: { accumulatedDepreciationCents: 0n } });

      const res = await request(app).post('/api/accounting/fixed-assets/reconcile').set(authHeader(dono)).send({ unitId: UNIT });
      expect(res.status).toBe(200);
      expect(res.body.data.repaired).toBeGreaterThanOrEqual(1);
      const fixed = await prisma.fixedAsset.findUnique({ where: { id: assetId } });
      expect(fixed!.accumulatedDepreciationCents).toBe(833n);
    });
  });
});
