/**
 * CONTRATO HTTP da baixa parcial (BE-INCR-PARTIAL-SETTLEMENT, F-PS10 → b rota-irmã) — app real
 * (`makeApp`), SQLite real, Bearer real. Prova o que o teste de serviço com repositório FALSO não
 * prova (memória `repositorios-de-contabilidade-nao-sao-exercitados`): a rota nova está montada e
 * protegida, o serviço real + repositório real + PostingService real fecham um ciclo de N recibos,
 * a leitura devolve `paidCents`/`remainingCents`, e a rota histórica `/pay` continua funcionando
 * (consumidor real: `my-app/lib/services/accountsPayable.service.ts`).
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();
const UNIT = 'unit-settle-http';
const DATA = '2026-06-15';

let dono: { id: string; username: string };
let outro: { id: string; username: string };

const criarUsuario = (username: string) =>
  prisma.user.create({
    data: { name: username, username, email: `${username}@test.local`, password: 'x', role: 'USER' },
  });

const criarConta = (userId: string, code: string, nature: string) =>
  prisma.account.create({ data: { userId, unitId: UNIT, code, name: `Conta ${code}`, nature, acceptsEntries: true } });

const settle = (ator: { id: string; username: string }, payableId: string, amountCents: number) =>
  request(app)
    .post(`/api/payables/${payableId}/settlements`)
    .set(authHeader(ator))
    .send({ unitId: UNIT, method: 'Pix', paidAt: DATA, amountCents });

describe('/api/payables/{id}/settlements — contrato HTTP da baixa parcial', () => {
  let payableId: string;

  beforeAll(async () => {
    pushTestSchema();
    dono = await criarUsuario('settle-http-a');
    outro = await criarUsuario('settle-http-b');
    await prisma.accountingPeriod.create({
      data: { userId: dono.id, unitId: UNIT, year: 2026, month: 6, status: 'OPEN', openedAt: new Date(), openedById: dono.id },
    });
    await criarConta(dono.id, '4.1', 'Expense');
    await criarConta(dono.id, '2.1.2', 'Liability');
    await criarConta(dono.id, '1.1.1', 'Asset');
    const expense = await prisma.account.findFirstOrThrow({ where: { userId: dono.id, unitId: UNIT, code: '4.1' } });
    const created = await request(app)
      .post('/api/payables')
      .set(authHeader(dono))
      .send({
        unitId: UNIT, supplierName: 'ACME HTTP', documentNumber: 'NF-settle-1', description: 'serviço',
        issueDate: DATA, dueDate: '2026-07-15', amountCents: 50000, expenseAccountId: expense.id,
      });
    expect(created.status).toBe(201);
    payableId = created.body.data.id;
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('sem Bearer, as rotas-irmãs respondem 401 (nascem protegidas — deny-by-default)', async () => {
    expect((await request(app).post(`/api/payables/${payableId}/settlements`).send({})).status).toBe(401);
    expect((await request(app).post(`/api/payables/${payableId}/settlements/x/cancel`).send({})).status).toBe(401);
  });

  it('outro inquilino não liquida o título do dono (404 pelo escopo), e nada é escrito', async () => {
    const res = await settle(outro, payableId, 10000);
    expect(res.status).toBe(404);
    expect(await prisma.payablePayment.count({ where: { payableId } })).toBe(0);
  });

  it('1º recibo parcial (30000 de 50000) → 201, título PARTIALLY_PAID, leitura devolve paidCents/remainingCents (number no wire — F-W2B-3, como amountCents)', async () => {
    const res = await settle(dono, payableId, 30000);
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('ACTIVE');
    expect(res.body.data.entryId).toBeTruthy();

    const row = await prisma.payable.findUniqueOrThrow({ where: { id: payableId } });
    expect(row.status).toBe('PARTIALLY_PAID');
    expect(Number(row.paidCents)).toBe(30000);

    const read = await request(app).get(`/api/payables/${payableId}`).set(authHeader(dono)).query({ unitId: UNIT });
    expect(read.status).toBe(200);
    // F-W2B-3 (jsonBigintReplacer): bigint vira number no wire, igual a amountCents — o BRIEF esboçou
    // string, mas a decisão ratificada da fronteira JSON prevalece sobre o esboço.
    expect(read.body.data.amountCents).toBe(50000);
    expect(read.body.data.paidCents).toBe(30000);
    expect(read.body.data.remainingCents).toBe(20000);
  });

  it('recibo acima do saldo (25000 > 20000) → 400, sem recibo novo e sem lançamento novo', async () => {
    const entriesBefore = await prisma.journalEntry.count({ where: { userId: dono.id, unitId: UNIT } });
    const res = await settle(dono, payableId, 25000);
    expect(res.status).toBe(400);
    expect(await prisma.payablePayment.count({ where: { payableId, status: 'ACTIVE' } })).toBe(1);
    expect(await prisma.journalEntry.count({ where: { userId: dono.id, unitId: UNIT } })).toBe(entriesBefore);
  });

  it('rota histórica /pay fecha o saldo (20000) → 201 e PAID; a listagem filtra por PARTIALLY_PAID e por PAID', async () => {
    const res = await request(app)
      .post(`/api/payables/${payableId}/pay`)
      .set(authHeader(dono))
      .send({ unitId: UNIT, method: 'Pix', paidAt: DATA, amountCents: 20000 });
    expect(res.status).toBe(201);
    const row = await prisma.payable.findUniqueOrThrow({ where: { id: payableId } });
    expect(row.status).toBe('PAID');
    expect(Number(row.paidCents)).toBe(50000);

    const paid = await request(app).get('/api/payables').set(authHeader(dono)).query({ unitId: UNIT, status: 'PAID' });
    expect(paid.body.data.payables.map((p: { id: string }) => p.id)).toContain(payableId);
    const partial = await request(app).get('/api/payables').set(authHeader(dono)).query({ unitId: UNIT, status: 'PARTIALLY_PAID' });
    expect(partial.status).toBe(200);
    expect(partial.body.data.payables).toHaveLength(0);
  });

  it('cancelar o 1º recibo pela rota-irmã → 200, título volta a PARTIALLY_PAID com paidCents 20000; auditoria settlement_cancelled', async () => {
    const first = await prisma.payablePayment.findFirstOrThrow({ where: { payableId, amountCents: 30000 } });
    const res = await request(app)
      .post(`/api/payables/${payableId}/settlements/${first.id}/cancel`)
      .set(authHeader(dono))
      .send({ unitId: UNIT, reversalDate: DATA, reason: 'cheque devolvido' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CANCELLED');

    const row = await prisma.payable.findUniqueOrThrow({ where: { id: payableId } });
    expect(row.status).toBe('PARTIALLY_PAID');
    expect(Number(row.paidCents)).toBe(20000);
    // Invariante campo↔filhos (BRIEF item 14) sobre o banco real.
    const active = await prisma.payablePayment.findMany({ where: { payableId, status: 'ACTIVE' } });
    expect(active.reduce((n, p) => n + Number(p.amountCents), 0)).toBe(20000);

    const events = await prisma.auditEvent.findMany({ where: { scopeUserId: dono.id, unitId: UNIT, targetId: payableId } });
    const types = events.map((e) => e.eventType);
    expect(types.filter((t) => t === 'payable.settlement_registered')).toHaveLength(2);
    expect(types.filter((t) => t === 'payable.settlement_cancelled')).toHaveLength(1);
    expect(types).not.toContain('payable.payment_registered');
  });

  // Review #307 delta, F8 (CRÍTICO): duplo cancel CONCORRENTE do mesmo recibo (duplo clique / retry) — a
  // checagem "já CANCELLED" fora da tx deixa as duas passarem e o saldo é decrementado 2×. Correto: o flip
  // do recibo é condicional e autoritativo DENTRO da tx (ACTIVE → CANCELLED, count), e só quem flipou
  // libera os centavos. Invariante `paidCents === Σ ACTIVE` sobrevive; o 2º cancel é idempotente.
  it('F8: 2 cancels concorrentes do MESMO recibo → invariante paidCents === Σ ACTIVE sobrevive (só um decrementa)', async () => {
    // Estado atual: 1 recibo ACTIVE de 20000 (PARTIALLY_PAID, paidCents 20000). Registra mais um de 10000.
    expect((await settle(dono, payableId, 10000)).status).toBe(201);
    const target = await prisma.payablePayment.findFirstOrThrow({ where: { payableId, amountCents: 10000, status: 'ACTIVE' } });
    const cancel = () =>
      request(app)
        .post(`/api/payables/${payableId}/settlements/${target.id}/cancel`)
        .set(authHeader(dono))
        .send({ unitId: UNIT, reversalDate: DATA, reason: 'duplo clique' });
    const [a, b] = await Promise.all([cancel(), cancel()]);
    expect([a.status, b.status].sort()).toEqual([200, 200]); // ambos idempotentes, nenhum 500

    const row = await prisma.payable.findUniqueOrThrow({ where: { id: payableId } });
    const active = await prisma.payablePayment.findMany({ where: { payableId, status: 'ACTIVE' } });
    const sumActive = active.reduce((n, p) => n + Number(p.amountCents), 0);
    expect(sumActive).toBe(20000);
    expect(Number(row.paidCents)).toBe(sumActive); // LACUNA: hoje 10000 (decrementou 2×)
    expect(row.status).toBe('PARTIALLY_PAID');
    // E a auditoria de cancelamento é emitida UMA vez para este recibo.
    const events = await prisma.auditEvent.findMany({ where: { scopeUserId: dono.id, unitId: UNIT, targetId: payableId, eventType: 'payable.settlement_cancelled' } });
    expect(events.filter((e) => e.payload.includes(target.id))).toHaveLength(1);
  });

  it('cancelar a conta com baixa ativa → 400 com a mensagem do 3º ramo (ADR F-PS2 site 3)', async () => {
    const res = await request(app)
      .post(`/api/payables/${payableId}/cancel`)
      .set(authHeader(dono))
      .send({ unitId: UNIT, reversalDate: DATA });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('Desfaça as baixas ativas');
  });
});
