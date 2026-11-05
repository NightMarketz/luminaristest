/**
 * CONTRATO HTTP de /fixed-asset-classes + /fixed-assets + /fixed-assets/depreciation/run +
 * /fixed-assets/reconcile (BE-INCR-FIXED-ASSETS, nó C8, PR-2+PR-3) — app Express REAL sobre
 * supertest + SQLite REAL (molde: `bankSettlementController.integration.test.ts`). Prova a FIAÇÃO
 * (auth → rota → DTO → controller → serviço → Prisma) e a baixa sequencial do Passo 14 (dispose
 * posta a quota do mês antes da baixa, idempotente pelo mesmo mecanismo do `runMonth`).
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';

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
    await seedUnit({ userId: dono.id, id: UNIT });
    await seedUnit({ userId: outro.id, id: 'unit-do-outro' });
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

  // IMO-1 (RUNBOOK-H2-IMOBILIZADO passo 5; FE-INCR-FIXED-ASSETS-brief.md:38 e item 14 — "409 de CAS"). Outra aba já
  // ativou o bem (status E version mudaram); quem chega com o version VELHO tem de receber o 409 de CAS, que é o que faz
  // o FE recarregar a lista — hoje o serviço checa o status antes do version e devolve 400.
  it('IMO-1: activate com o version lido antes de outra ativação (1, banco em 2) é 409 (CAS), não 400 de status', async () => {
    const klass = await request(app).post('/api/accounting/fixed-asset-classes').set(authHeader(dono)).send({ unitId: UNIT, code: 'IMO1-ACT', name: 'x', depreciable: false, costAccountId });
    const asset = await request(app)
      .post('/api/accounting/fixed-assets')
      .set(authHeader(dono))
      .send({ unitId: UNIT, classId: klass.body.data.id, code: 'A-IMO1-ACT', description: 'x', costCents: 1000, residualValueCents: 0, acquiredAt: '2026-01-01', annualRateBp: 1000 });
    const assetId = asset.body.data.id as string;
    const primeira = await request(app).post(`/api/accounting/fixed-assets/${assetId}/activate`).set(authHeader(dono)).send({ unitId: UNIT, assetId, activatedAt: '2026-01-01', version: 1 });
    expect(primeira.status).toBe(200);
    expect(primeira.body.data.version).toBe(2);

    const segunda = await request(app)
      .post(`/api/accounting/fixed-assets/${assetId}/activate`)
      .set(authHeader(dono))
      .send({ unitId: UNIT, assetId, activatedAt: '2026-01-01', version: 1 });
    expect({ status: segunda.status, message: segunda.body.message }).toEqual({ status: 409, message: expect.stringContaining('version divergente') });
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

      // Chamada sequencial SUBSEQUENTE (já DISPOSED) com o version velho é recusada e não posta 2ª baixa. O status
      // dela (409 de CAS, dono 04/11: "409 (BRIEF item 14)") é o caso IMO-1 de baixa logo abaixo — aqui fica só o
      // invariante de não duplicar.
      const again = await request(app)
        .post(`/api/accounting/fixed-assets/${assetId}/dispose`)
        .set(authHeader(dono))
        .send({ unitId: UNIT, assetId, disposedAt: '2026-01-31', proceedsCents: 100_000, counterpartAccountId: cashAccountId, version: afterRun!.version });
      expect(again.status).not.toBe(200);
      expect(await prisma.journalEntry.count({ where: { sourceType: 'fixed_asset.disposal', sourceId: assetId } })).toBe(1);
    });

    // IMO-1, baixa (dono, chat, 04/11: "409 (BRIEF item 14)" — FE-INCR-FIXED-ASSETS-brief.md item 14, "409 de CAS
    // (ativar/baixar)"). Outra aba já baixou o bem (status E version mudaram); quem chega com o version VELHO tem de
    // receber o 409 de CAS — hoje o serviço checa o status antes do version e devolve 400.
    it('IMO-1: dispose com o version lido antes de outra baixa (2, banco em 3) é 409 (CAS), não 400 de status', async () => {
      const klass = await request(app).post('/api/accounting/fixed-asset-classes').set(authHeader(dono)).send({ unitId: UNIT, code: 'IMO1-DISP', name: 'x', depreciable: false, costAccountId });
      const asset = await request(app)
        .post('/api/accounting/fixed-assets')
        .set(authHeader(dono))
        .send({ unitId: UNIT, classId: klass.body.data.id, code: 'A-IMO1-DISP', description: 'x', costCents: 50_000, residualValueCents: 0, acquiredAt: '2026-01-01', annualRateBp: 1000 });
      const assetId = asset.body.data.id as string;
      const ativa = await request(app).post(`/api/accounting/fixed-assets/${assetId}/activate`).set(authHeader(dono)).send({ unitId: UNIT, assetId, activatedAt: '2026-01-01', version: 1 });
      expect(ativa.body.data.version).toBe(2);
      const baixa = { unitId: UNIT, assetId, disposedAt: '2026-01-31', proceedsCents: 50_000, counterpartAccountId: cashAccountId, version: 2 };
      const primeira = await request(app).post(`/api/accounting/fixed-assets/${assetId}/dispose`).set(authHeader(dono)).send(baixa);
      expect(primeira.status).toBe(200);
      expect(primeira.body.data.version).toBeGreaterThan(2);

      const segunda = await request(app).post(`/api/accounting/fixed-assets/${assetId}/dispose`).set(authHeader(dono)).send(baixa);
      expect({ status: segunda.status, message: segunda.body.message }).toEqual({ status: 409, message: expect.stringContaining('version divergente') });
    });

    it('OPS-001 adversarial: 2 baixas CONCORRENTES (mesma version, mês sem quota postada) — só 1 vence, a outra 409, 1 entry de baixa só', async () => {
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
      // Windows serializa SQLite (classe windows-serializa-sqlite-ci-linux-nao). Com o CAS de version antes da
      // checagem de status (IMO-1, dono 04/11: "Apertar para [200,409]"), a 2ª baixa dá 409 tanto serializada
      // (chega com version 2, banco já adiante) quanto concorrente (perde o CAS final). Invariante: só 1 sucesso,
      // 1 entry de baixa (a quota do mês é idempotente por sourceId — read-first + P2002 race-close).
      expect(statuses).toEqual([200, 409]);
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

  describe('C8 emenda 3.2, Parte 2 — benfeitoria em imóvel de terceiro (E8b, E9-E12)', () => {
    it('classe AMORTIZATION_LEASEHOLD + ativo com prazo: grava os campos e a quota linear debita a conta de amortização', async () => {
      const amort = await criarConta('4.1.7', 'Expense');
      const klass = await request(app)
        .post('/api/accounting/fixed-asset-classes')
        .set(authHeader(dono))
        .send({
          unitId: UNIT, code: 'BENF-1', name: 'Benfeitorias', depreciable: true, costAccountId,
          accumulatedDepreciationAccountId: accDepAccountId, kind: 'AMORTIZATION_LEASEHOLD', amortizationExpenseAccountId: amort.id,
        });
      expect(klass.status).toBe(201);
      expect(klass.body.data).toMatchObject({ kind: 'AMORTIZATION_LEASEHOLD', amortizationExpenseAccountId: amort.id });

      const indenizavel = await request(app)
        .post('/api/accounting/fixed-assets')
        .set(authHeader(dono))
        .send({ unitId: UNIT, classId: klass.body.data.id, code: 'A-BENF-X', description: 'x', costCents: 12_000, acquiredAt: '2026-01-01', annualRateBp: 1000, leaseEndDate: '2027-12-31', leaseIndemnifiable: true });
      expect(indenizavel.status).toBe(400);

      const asset = await request(app)
        .post('/api/accounting/fixed-assets')
        .set(authHeader(dono))
        .send({ unitId: UNIT, classId: klass.body.data.id, code: 'A-BENF-1', description: 'Reforma', costCents: 12_000, acquiredAt: '2026-01-01', annualRateBp: 1000, leaseEndDate: '2027-12-31', leaseIndemnifiable: false });
      expect(asset.status).toBe(201);
      const assetId = asset.body.data.id as string;
      const stored = await prisma.fixedAsset.findUnique({ where: { id: assetId } });
      expect([stored!.leaseEndDate, stored!.leaseIndemnifiable]).toEqual([new Date('2027-12-31T00:00:00.000Z'), false]);

      const activated = await request(app).post(`/api/accounting/fixed-assets/${assetId}/activate`).set(authHeader(dono)).send({ unitId: UNIT, assetId, activatedAt: '2026-01-01', version: 1 });
      expect(activated.status).toBe(200);
      const run = await request(app).post('/api/accounting/fixed-assets/depreciation/run').set(authHeader(dono)).send({ unitId: UNIT, yearMonth: '2026-01' });
      expect(run.status).toBe(200);

      const entry = await prisma.journalEntry.findFirst({
        where: { sourceType: 'fixed_asset.depreciation', sourceId: `${assetId}:2026-01` },
        include: { postings: true },
      });
      const debit = entry!.postings.find((p) => p.debitCents > 0n)!;
      expect([debit.accountId, debit.debitCents]).toEqual([amort.id, 500n]); // 12.000 / 24 meses
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

  // FIX-TESTES item 5, lote 1 (FIX-MENSAGENS-ID-INTERNO-brief.md itens 3–4; inventário em
  // docs/operating-manual/MENSAGENS-ID-INTERNO-2026-11-05.md). A mensagem que sai do handleApiError é a que o operador lê:
  // ela nomeia o bem pelo rótulo `código — descrição` e a classe por `código — nome` (F-MSG-2 a1), nunca pelo cuid de
  // um registro que o usuário vê pelo código ou não mandou (F-MSG-1 a). Um caso por site "corrigir" do inventário.
  describe('FIX-MENSAGENS-ID-INTERNO lote 1 — a mensagem nomeia o bem/classe pelo rótulo, nunca pelo cuid', () => {
    const novaClasse = async (code: string, name: string, extra: Record<string, unknown> = {}) => {
      const r = await request(app)
        .post('/api/accounting/fixed-asset-classes')
        .set(authHeader(dono))
        .send({ unitId: UNIT, code, name, depreciable: false, costAccountId, ...extra });
      expect(r.status).toBe(201);
      return r.body.data.id as string;
    };
    const novoAtivo = async (classId: string, code: string, description: string, costCents = 1000) => {
      const r = await request(app)
        .post('/api/accounting/fixed-assets')
        .set(authHeader(dono))
        .send({ unitId: UNIT, classId, code, description, costCents, residualValueCents: 0, acquiredAt: '2026-01-01', annualRateBp: 1000 });
      expect(r.status).toBe(201);
      return r.body.data.id as string;
    };
    const ativar = (assetId: string, version = 1) =>
      request(app).post(`/api/accounting/fixed-assets/${assetId}/activate`).set(authHeader(dono)).send({ unitId: UNIT, assetId, activatedAt: '2026-01-01', version });
    const baixar = (assetId: string, version: number, proceedsCents = 1000) =>
      request(app)
        .post(`/api/accounting/fixed-assets/${assetId}/dispose`)
        .set(authHeader(dono))
        .send({ unitId: UNIT, assetId, disposedAt: '2026-01-31', proceedsCents, counterpartAccountId: cashAccountId, version });
    /** Status certo, a mensagem contém o rótulo e não contém nenhum dos cuids. A `msg` vai no objeto para o diff mostrá-la. */
    const nomeiaSemId = (res: request.Response, status: number, rotulo: string, ...ids: string[]) => {
      const msg = String(res.body.message);
      expect({ status: res.status, nomeiaRotulo: msg.includes(rotulo), cuidNaMensagem: ids.filter((id) => msg.includes(id)), msg }).toEqual({
        status,
        nomeiaRotulo: true,
        cuidNaMensagem: [],
        msg,
      });
    };

    it('FixedAssetService:136 — editar bem ACTIVE (400) nomeia o bem', async () => {
      const classId = await novaClasse('IMSG-EDIT', 'Móveis');
      const assetId = await novoAtivo(classId, 'A-MSG-EDIT', 'Mesa');
      expect((await ativar(assetId)).status).toBe(200);
      const res = await request(app).put(`/api/accounting/fixed-assets/${assetId}`).set(authHeader(dono)).send({ unitId: UNIT, assetId, description: 'Mesa nova' });
      nomeiaSemId(res, 400, 'A-MSG-EDIT — Mesa', assetId);
    });

    it('FixedAssetService:140 — editar bem cuja classe sumiu, sem classId no corpo (404), nomeia o bem, não o cuid da classe', async () => {
      const classId = await novaClasse('IMSG-EDCL', 'Móveis');
      const assetId = await novoAtivo(classId, 'A-MSG-EDCL', 'Cadeira');
      await prisma.fixedAssetClass.update({ where: { id: classId }, data: { deletedAt: new Date() } });
      const res = await request(app).put(`/api/accounting/fixed-assets/${assetId}`).set(authHeader(dono)).send({ unitId: UNIT, assetId, description: 'Cadeira nova' });
      nomeiaSemId(res, 404, 'A-MSG-EDCL — Cadeira', classId, assetId);
    });

    it('FixedAssetService:183 — remover bem FULLY_DEPRECIATED (400) nomeia o bem', async () => {
      const classId = await novaClasse('IMSG-DELS', 'Móveis');
      const assetId = await novoAtivo(classId, 'A-MSG-DELS', 'Armário');
      await prisma.fixedAsset.update({ where: { id: assetId }, data: { status: 'FULLY_DEPRECIATED' } });
      const res = await request(app).delete(`/api/accounting/fixed-assets/${assetId}`).set(authHeader(dono)).send({ unitId: UNIT, assetId });
      nomeiaSemId(res, 400, 'A-MSG-DELS — Armário', assetId);
    });

    it('FixedAssetService:186 — remover bem com quota postada (400) nomeia o bem', async () => {
      const classId = await novaClasse('IMSG-DELQ', 'Móveis');
      const assetId = await novoAtivo(classId, 'A-MSG-DELQ', 'Estante');
      expect((await ativar(assetId)).status).toBe(200);
      await prisma.fixedAsset.update({ where: { id: assetId }, data: { accumulatedDepreciationCents: 100n } });
      const res = await request(app).delete(`/api/accounting/fixed-assets/${assetId}`).set(authHeader(dono)).send({ unitId: UNIT, assetId });
      nomeiaSemId(res, 400, 'A-MSG-DELQ — Estante', assetId);
    });

    it('FixedAssetService:196 — ativar com version divergente (409) nomeia o bem', async () => {
      const classId = await novaClasse('IMSG-ACAS', 'Móveis');
      const assetId = await novoAtivo(classId, 'A-MSG-ACAS', 'Balcão');
      nomeiaSemId(await ativar(assetId, 999), 409, 'A-MSG-ACAS — Balcão', assetId);
    });

    it('FixedAssetService:199 — ativar bem já ACTIVE com o version atual (400) nomeia o bem', async () => {
      const classId = await novaClasse('IMSG-ASTA', 'Móveis');
      const assetId = await novoAtivo(classId, 'A-MSG-ASTA', 'Gaveteiro');
      expect((await ativar(assetId)).status).toBe(200);
      nomeiaSemId(await ativar(assetId, 2), 400, 'A-MSG-ASTA — Gaveteiro', assetId);
    });

    it('FixedAssetService:206 — ativar bem cuja classe sumiu (404) nomeia o bem, não o cuid da classe', async () => {
      const classId = await novaClasse('IMSG-ACL', 'Móveis');
      const assetId = await novoAtivo(classId, 'A-MSG-ACL', 'Sofá');
      await prisma.fixedAssetClass.update({ where: { id: classId }, data: { deletedAt: new Date() } });
      nomeiaSemId(await ativar(assetId), 404, 'A-MSG-ACL — Sofá', classId, assetId);
    });

    it('FixedAssetService:196/226 — 2 ativações concorrentes: a que perde (409) nomeia o bem', async () => {
      const classId = await novaClasse('IMSG-ACON', 'Móveis');
      const assetId = await novoAtivo(classId, 'A-MSG-ACON', 'Poltrona');
      const [a, b] = await Promise.all([ativar(assetId), ativar(assetId)]);
      expect([a.status, b.status].sort()).toEqual([200, 409]);
      nomeiaSemId(a.status === 409 ? a : b, 409, 'A-MSG-ACON — Poltrona', assetId);
    });

    it('FixedAssetService:246 — baixar com version divergente (409) nomeia o bem', async () => {
      const classId = await novaClasse('IMSG-DCAS', 'Móveis');
      const assetId = await novoAtivo(classId, 'A-MSG-DCAS', 'Bancada');
      expect((await ativar(assetId)).status).toBe(200);
      nomeiaSemId(await baixar(assetId, 999), 409, 'A-MSG-DCAS — Bancada', assetId);
    });

    it('FixedAssetService:249 — baixar bem PENDING_ACTIVATION (400) nomeia o bem', async () => {
      const classId = await novaClasse('IMSG-DSTA', 'Móveis');
      const assetId = await novoAtivo(classId, 'A-MSG-DSTA', 'Prateleira');
      nomeiaSemId(await baixar(assetId, 1), 400, 'A-MSG-DSTA — Prateleira', assetId);
    });

    it('FixedAssetService:252 — baixar bem cuja classe sumiu (404) nomeia o bem, não o cuid da classe', async () => {
      const classId = await novaClasse('IMSG-DCL', 'Móveis');
      const assetId = await novoAtivo(classId, 'A-MSG-DCL', 'Biombo');
      expect((await ativar(assetId)).status).toBe(200);
      await prisma.fixedAssetClass.update({ where: { id: classId }, data: { deletedAt: new Date() } });
      nomeiaSemId(await baixar(assetId, 2), 404, 'A-MSG-DCL — Biombo', classId, assetId);
    });

    it('FixedAssetService:246/322 — 2 baixas concorrentes: a que perde (409) nomeia o bem', async () => {
      const classId = await novaClasse('IMSG-DCON', 'Móveis');
      const assetId = await novoAtivo(classId, 'A-MSG-DCON', 'Aparador');
      expect((await ativar(assetId)).status).toBe(200);
      const [a, b] = await Promise.all([baixar(assetId, 2), baixar(assetId, 2)]);
      expect([a.status, b.status].sort()).toEqual([200, 409]);
      nomeiaSemId(a.status === 409 ? a : b, 409, 'A-MSG-DCON — Aparador', assetId);
    });

    it('FixedAssetService:425 — baixar bem cuja conta do bem (da classe) sumiu (400) nomeia a classe, não o cuid da conta', async () => {
      const contaPropria = await criarConta('1.2.7', 'Asset');
      const classId = await novaClasse('IMSG-CONTA', 'Móveis', { costAccountId: contaPropria.id });
      const assetId = await novoAtivo(classId, 'A-MSG-CONTA', 'Divisória');
      expect((await ativar(assetId)).status).toBe(200);
      await prisma.account.update({ where: { id: contaPropria.id }, data: { deletedAt: new Date() } });
      nomeiaSemId(await baixar(assetId, 2), 400, 'IMSG-CONTA — Móveis', contaPropria.id, classId, assetId);
    });

    it('FixedAssetService:425 — baixar com a conta de ganho das settings sumida (400) nomeia o bem, não o cuid da conta', async () => {
      const gain = await prisma.account.findFirstOrThrow({ where: { userId: dono.id, unitId: UNIT, code: '3.9' } });
      const classId = await novaClasse('IMSG-GANHO', 'Móveis');
      const assetId = await novoAtivo(classId, 'A-MSG-GANHO', 'Painel');
      expect((await ativar(assetId)).status).toBe(200);
      await prisma.account.update({ where: { id: gain.id }, data: { deletedAt: new Date() } });
      try {
        nomeiaSemId(await baixar(assetId, 2, 2000), 400, 'A-MSG-GANHO — Painel', gain.id, assetId);
      } finally {
        await prisma.account.update({ where: { id: gain.id }, data: { deletedAt: null } });
      }
    });

    it('FixedAssetClassService:134 — remover classe com bem vivo (400) nomeia a classe', async () => {
      const classId = await novaClasse('IMSG-CDEL', 'Equipamentos de copa');
      await novoAtivo(classId, 'A-MSG-CDEL', 'Geladeira');
      const res = await request(app).delete(`/api/accounting/fixed-asset-classes/${classId}`).set(authHeader(dono)).send({ unitId: UNIT, classId });
      nomeiaSemId(res, 400, 'IMSG-CDEL — Equipamentos de copa', classId);
    });
  });
});
