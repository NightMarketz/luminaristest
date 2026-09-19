/**
 * CONTRATO HTTP de /fixed-asset-classes + /fixed-assets (BE-INCR-FIXED-ASSETS, nó C8, PR-2) — app
 * Express REAL sobre supertest + SQLite REAL (molde: `bankSettlementController.integration.test.ts`).
 * Prova a FIAÇÃO (auth → rota → DTO → controller → serviço → Prisma) e o desvio temporário do
 * Passo 9 (dispose exige quota já refletida, sem runMonth do PR-3 ainda).
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
    costAccountId = cost.id;
    accDepAccountId = accDep.id;
    cashAccountId = cash.id;

    const settings = await request(app)
      .put('/api/accounting/settings')
      .set(authHeader(dono))
      .send({ unitId: UNIT, disposalGainAccountId: gain.id, disposalLossAccountId: loss.id });
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

  describe('dispose — desvio temporário do Passo 9 (sem runMonth do PR-3)', () => {
    it('dispor no mesmo mês da ativação SEM quota postada é 400 nomeando o mês', async () => {
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
        .send({ unitId: UNIT, assetId, disposedAt: '2026-01-31', proceedsCents: 0, version: 2 });
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toMatch(/Poste a depreciação/);
    });

    it('LAND (depreciable=false) dispõe sem exigir quota nenhuma', async () => {
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
    });

    it('quota corretamente refletida (seed via Prisma): baixa com GANHO posta a entry esperada', async () => {
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

      // Seed direto via Prisma: quotaCumulativa(100_000, 1000bp, k=1) = 833 (fórmula do PR-1,
      // testada isoladamente) — simula o que o runMonth do PR-3 teria postado no mês 1.
      await prisma.fixedAsset.update({ where: { id: assetId }, data: { accumulatedDepreciationCents: 833n } });

      // NBV = 100.000 - 833 = 99.167; proceeds = 100.000 → ganho de 833.
      const res = await request(app)
        .post(`/api/accounting/fixed-assets/${assetId}/dispose`)
        .set(authHeader(dono))
        .send({ unitId: UNIT, assetId, disposedAt: '2026-01-31', proceedsCents: 100_000, counterpartAccountId: cashAccountId, version: 2 });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('DISPOSED');
      expect(res.body.data.disposalEntryId).toBeTruthy();

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

      // Chamada sequencial SUBSEQUENTE (já DISPOSED) é 400 pelo guard de status — não é o caso do
      // CAS (esse exige as DUAS chamadas ainda encontrarem status=ACTIVE, testado abaixo em
      // concorrência de verdade).
      const again = await request(app)
        .post(`/api/accounting/fixed-assets/${assetId}/dispose`)
        .set(authHeader(dono))
        .send({ unitId: UNIT, assetId, disposedAt: '2026-01-31', proceedsCents: 100_000, counterpartAccountId: cashAccountId, version: 2 });
      expect(again.status).toBe(400);
      expect(await prisma.journalEntry.count({ where: { sourceType: 'fixed_asset.disposal', sourceId: assetId } })).toBe(1);
    });

    it('OPS-001 adversarial: 2 baixas CONCORRENTES (mesma version) — só 1 vence, a outra é 409, 1 entry só', async () => {
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
      await prisma.fixedAsset.update({ where: { id: assetId }, data: { accumulatedDepreciationCents: 833n } });

      const disposeCall = () =>
        request(app)
          .post(`/api/accounting/fixed-assets/${assetId}/dispose`)
          .set(authHeader(dono))
          .send({ unitId: UNIT, assetId, disposedAt: '2026-01-31', proceedsCents: 99_167, counterpartAccountId: cashAccountId, version: 2 }); // = NBV → sem ganho/perda, mas a contrapartida (recebimento) é sempre exigida quando proceeds > 0
      const [a, b] = await Promise.all([disposeCall(), disposeCall()]);
      const statuses = [a.status, b.status].sort();
      // Windows serializa SQLite (classe windows-serializa-sqlite-ci-linux-nao) — localmente as
      // duas podem serializar como 200+400 (a 2ª já vê DISPOSED) em vez de 200+409 (CAS pegando a
      // corrida); o invariante que NÃO pode falhar em nenhum dos dois SOs é "só 1 sucesso, 1 entry".
      expect(statuses[0]).toBe(200);
      expect([400, 409]).toContain(statuses[1]);
      expect(await prisma.journalEntry.count({ where: { sourceType: 'fixed_asset.disposal', sourceId: assetId } })).toBe(1);
    });
  });
});
