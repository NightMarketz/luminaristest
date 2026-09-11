/**
 * CONTRATO HTTP da baixa parcial em Contas a Receber (BE-INCR-PARTIAL-SETTLEMENT, F-PS10 → b) — MIRROR
 * de `payableController.settlements.integration.test.ts` (review #307 F6b: a rota-irmã AR não tinha
 * prova HTTP). Inclui o cenário F1 do review reproduzido de ponta a ponta: cancelar um recibo JÁ
 * finalizado enquanto OUTRO está em trânsito (RECEIVING) sucede, e o finalize seguinte resolve o
 * status pelo saldo já decrementado.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();
const UNIT = 'unit-ar-settle-http';
const DATA = '2026-06-15';

let dono: { id: string; username: string };

const criarConta = (userId: string, code: string, nature: string) =>
  prisma.account.create({ data: { userId, unitId: UNIT, code, name: `Conta ${code}`, nature, acceptsEntries: true } });

const settle = (receivableId: string, amountCents: number) =>
  request(app)
    .post(`/api/receivables/${receivableId}/settlements`)
    .set(authHeader(dono))
    .send({ unitId: UNIT, method: 'Pix', receivedAt: DATA, amountCents });

describe('/api/receivables/{id}/settlements — contrato HTTP da baixa parcial (AR)', () => {
  let receivableId: string;

  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({
      data: { name: 'ar-settle', username: 'ar-settle-http', email: 'ar-settle@test.local', password: 'x', role: 'USER' },
    });
    await prisma.accountingPeriod.create({
      data: { userId: dono.id, unitId: UNIT, year: 2026, month: 6, status: 'OPEN', openedAt: new Date(), openedById: dono.id },
    });
    await criarConta(dono.id, '3.1', 'Revenue');
    await criarConta(dono.id, '1.1.5', 'Asset');
    await criarConta(dono.id, '1.1.1', 'Asset');
    const revenue = await prisma.account.findFirstOrThrow({ where: { userId: dono.id, unitId: UNIT, code: '3.1' } });
    const created = await request(app)
      .post('/api/receivables')
      .set(authHeader(dono))
      .send({
        unitId: UNIT, customerName: 'Cliente HTTP', documentNumber: 'FAT-settle-1', description: 'serviço',
        issueDate: DATA, dueDate: '2026-07-15', amountCents: 50000, revenueAccountId: revenue.id,
      });
    expect(created.status).toBe(201);
    receivableId = created.body.data.id;
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('sem Bearer → 401 nas rotas-irmãs', async () => {
    expect((await request(app).post(`/api/receivables/${receivableId}/settlements`).send({})).status).toBe(401);
    expect((await request(app).post(`/api/receivables/${receivableId}/settlements/x/cancel`).send({})).status).toBe(401);
  });

  it('dois recibos parciais (20000 + 15000) → PARTIALLY_RECEIVED, receivedCents 35000, remainingCents 15000', async () => {
    expect((await settle(receivableId, 20000)).status).toBe(201);
    expect((await settle(receivableId, 15000)).status).toBe(201);
    const read = await request(app).get(`/api/receivables/${receivableId}`).set(authHeader(dono)).query({ unitId: UNIT });
    expect(read.body.data.status).toBe('PARTIALLY_RECEIVED');
    expect(read.body.data.receivedCents).toBe(35000);
    expect(read.body.data.remainingCents).toBe(15000);
  });

  it('F1 (review #307): cancelar o 1º recibo enquanto o título está RECEIVING (outro em trânsito) → 200; o finalize resolve pelo saldo decrementado', async () => {
    // Simula o recibo em trânsito: claim já feito (RECEIVING, +10000) sem finalize.
    await prisma.receivable.update({ where: { id: receivableId }, data: { status: 'RECEIVING', receivedCents: 45000 } });
    const first = await prisma.receivableReceipt.findFirstOrThrow({ where: { receivableId, amountCents: 20000 } });
    const res = await request(app)
      .post(`/api/receivables/${receivableId}/settlements/${first.id}/cancel`)
      .set(authHeader(dono))
      .send({ unitId: UNIT, reversalDate: DATA, reason: 'devolvido' });
    expect(res.status).toBe(200);
    let row = await prisma.receivable.findUniqueOrThrow({ where: { id: receivableId } });
    expect(Number(row.receivedCents)).toBe(25000); // 45000 − 20000
    expect(row.status).toBe('RECEIVING'); // status é do finalize em curso, não do cancel
    // O finalize do recibo em trânsito (simulado pelo repo real) resolve pelo saldo já decrementado.
    const { ReceivableRepository } = await import('@/features/accounting/repositories/ReceivableRepository');
    const { resolveAccountingScope } = await import('@/features/accounting/scope/AccountingScope');
    const scope = resolveAccountingScope({ userId: dono.id }, UNIT);
    expect(await new ReceivableRepository().finalizeIfReceiving(scope, receivableId, 50000)).toBe(1);
    row = await prisma.receivable.findUniqueOrThrow({ where: { id: receivableId } });
    expect(row.status).toBe('PARTIALLY_RECEIVED');
  });

  it('F1 (review #307): comando rejeitado NÃO muta o razão — invariante quebrado é barrado ANTES do estorno', async () => {
    const second = await prisma.receivableReceipt.findFirstOrThrow({ where: { receivableId, amountCents: 15000, status: 'ACTIVE' } });
    // Força o invariante quebrado: saldo recebido menor que o recibo a estornar.
    await prisma.receivable.update({ where: { id: receivableId }, data: { receivedCents: 1000 } });
    const entriesBefore = await prisma.journalEntry.count({ where: { userId: dono.id, unitId: UNIT } });
    const res = await request(app)
      .post(`/api/receivables/${receivableId}/settlements/${second.id}/cancel`)
      .set(authHeader(dono))
      .send({ unitId: UNIT, reversalDate: DATA });
    expect(res.status).toBe(400);
    expect(await prisma.journalEntry.count({ where: { userId: dono.id, unitId: UNIT } })).toBe(entriesBefore); // nenhum estorno postado
    expect((await prisma.journalEntry.findUniqueOrThrow({ where: { id: second.entryId! } })).status).toBe('Posted');
    expect((await prisma.receivableReceipt.findUniqueOrThrow({ where: { id: second.id } })).status).toBe('ACTIVE');
    await prisma.receivable.update({ where: { id: receivableId }, data: { receivedCents: 25000 } }); // restaura o cenário
  });
});
