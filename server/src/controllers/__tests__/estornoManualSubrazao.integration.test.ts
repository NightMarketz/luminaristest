/**
 * TESTE-GUARDA — lacuna L-20261124-132000-6449: o estorno manual (`POST /api/accounting/reverse`) aceitava lançamento
 * cujo dono é o subrazão (ar.* / ap.*). Estornar por fora diverge o razão do título: o recibo segue ACTIVE com o
 * lançamento Reversed, e o reconcile do #1359 passa a "concluir" isso como se fosse crash entre os dois commits.
 *
 * Esperado: a rota manual recusa com 409 `SUBLEDGER_OWNED_ENTRY` e o recibo segue ACTIVE; o cliente não abre a porta
 * interna mandando `automaticWriter` no corpo; o serviço do título (`cancelReceipt`) continua estornando; e lançamento
 * manual segue estornável pela rota (controle).
 *
 * App Express REAL sobre supertest + SQLite REAL, sem mock.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';
import { getFactory } from '@/lib/factory';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';

const app = makeApp();
const UNIT = 'unit-estorno-manual-subrazao';
const DATA = '2026-06-15';

let dono: { id: string; username: string };
let revenueId: string;

const scope = () => resolveAccountingScopeInternal({ userId: dono.id }, UNIT);
const auth = () => authHeader(dono);
const ar = () => getFactory().getReceivableService();
const posting = () => getFactory().getPostingService();

async function recebido(n: number) {
  const rec = await ar().createReceivable(scope(), {
    unitId: UNIT, customerName: `Cliente ${n}`, documentNumber: `FAT-${n}`, description: 'serviço',
    issueDate: DATA, dueDate: '2026-12-15', amountCents: 50000, revenueAccountId: revenueId,
  });
  const receipt = await ar().registerReceipt(scope(), rec.id, { unitId: UNIT, method: 'Pix', receivedAt: DATA, amountCents: 50000 });
  const settlement = await posting().findEntryBySource(scope(), 'ar.receipt', receipt.id);
  expect(settlement?.status).toBe('Posted');
  return { receivableId: rec.id, receiptId: receipt.id, settlementId: settlement!.id };
}

const estornoManual = (lancamentoId: string, extra: Record<string, unknown> = {}) =>
  request(app).post('/api/accounting/reverse').set(auth())
    .send({ unitId: UNIT, lancamentoId, reversalPostingDate: DATA, reason: 'estorno manual', ...extra });

const estornos = (originalId: string) =>
  prisma.journalEntry.count({ where: { userId: dono.id, unitId: UNIT, sourceType: 'reversal', sourceId: originalId } });

describe('lacuna 6449 — estorno manual de lançamento de subrazão', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({
      data: { name: 'estorno-subrazao', username: 'estorno-subrazao', email: 'estorno-subrazao@test.local', password: 'x', role: 'USER' },
    });
    await seedUnit({ userId: dono.id, id: UNIT });
    await prisma.accountingPeriod.create({
      data: { userId: dono.id, unitId: UNIT, year: 2026, month: 6, status: 'OPEN', openedAt: new Date(), openedById: dono.id },
    });
    const conta = (code: string, nature: string) =>
      prisma.account.create({ data: { userId: dono.id, unitId: UNIT, code, name: `Conta ${code}`, nature, acceptsEntries: true } });
    revenueId = (await conta('3.1', 'Revenue')).id;
    await conta('1.1.5', 'Asset');
    await conta('1.1.1', 'Asset');
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('POST /reverse de lançamento ar.receipt → 409 SUBLEDGER_OWNED_ENTRY, recibo ACTIVE, nenhum estorno gravado', async () => {
    const t = await recebido(1);
    const res = await estornoManual(t.settlementId);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('SUBLEDGER_OWNED_ENTRY');
    expect((await prisma.receivableReceipt.findUniqueOrThrow({ where: { id: t.receiptId } })).status).toBe('ACTIVE');
    expect((await prisma.journalEntry.findUniqueOrThrow({ where: { id: t.settlementId } })).status).toBe('Posted');
    expect(await estornos(t.settlementId)).toBe(0);
  });

  it('o corpo não abre a porta interna: `automaticWriter: true` no POST continua 409', async () => {
    const t = await recebido(2);
    const res = await estornoManual(t.settlementId, { automaticWriter: true });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('SUBLEDGER_OWNED_ENTRY');
    expect(await estornos(t.settlementId)).toBe(0);
  });

  it('o dono do título estorna: cancelReceipt depois da recusa cancela o recibo e grava 1 estorno', async () => {
    const t = await recebido(3);
    expect((await estornoManual(t.settlementId)).status).toBe(409);
    await ar().cancelReceipt(scope(), t.receivableId, t.receiptId, { unitId: UNIT, reversalDate: DATA, reason: 'cancelamento do recebimento' });
    expect((await prisma.receivableReceipt.findUniqueOrThrow({ where: { id: t.receiptId } })).status).toBe('CANCELLED');
    expect((await prisma.journalEntry.findUniqueOrThrow({ where: { id: t.settlementId } })).status).toBe('Reversed');
    expect(await estornos(t.settlementId)).toBe(1);
  });

  it('controle: lançamento manual segue estornável pela rota manual (200)', async () => {
    const entry = await posting().postEntry(scope(), {
      unitId: UNIT, date: DATA, description: 'lançamento manual', sourceType: 'manual',
      lines: [
        { accountCode: '1.1.1', debitCents: 1000, creditCents: 0 },
        { accountCode: '3.1', debitCents: 0, creditCents: 1000 },
      ],
    });
    const res = await estornoManual(entry.id);
    expect(res.status).toBe(200);
    expect(await estornos(entry.id)).toBe(1);
  });
});
