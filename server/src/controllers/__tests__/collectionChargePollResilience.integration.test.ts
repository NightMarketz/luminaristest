/**
 * Onda 4 / 4.3 (auditoria fiscal/contábil de 24/11/2026) — o webhook do Mercado Pago deixa a falha da re-consulta "para o
 * job" (200), e o job (`pollPending`) re-consultava a cobrança PENDING a CADA tick, para sempre, mesmo quando o
 * `getCharge` falha sempre. Aqui, SQLite real + um MP fake atrás do `fetch` global (nenhuma chamada real):
 *
 * - 5xx/rede do provedor é transitório: a cobrança continua PENDING (o provedor volta, ela vira PAID), mas com backoff — o
 *   tick seguinte não a re-consulta enquanto `nextPollAt` não vence;
 * - 4xx definitivo (404/403/422…) repetido não reenfileira para sempre: no 3º, FAILED terminal + audit + `logger.error`;
 * - 401 é do caminho da credencial (conta CREDENTIAL_INVALID, P2-4) e não conta como falha da cobrança;
 * - a cobrança que falha não impede a sadia de ser atualizada no mesmo tick.
 */
import { randomBytes } from 'node:crypto';
import request from 'supertest';
import prisma from '@/lib/prisma';
import { getFactory } from '@/lib/factory';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';

const app = makeApp();
const UNIT = 'unit-f5-poll-res';
const TOKEN = 'APP_USR-FIXTURE-TOKEN-POLLRES-0000000000-wxyz';
const SECRET = 'webhook-secret-FIXTURE-POLLRES-0001';

type GetMode = 'ok' | 500 | 503 | 404 | 'network';
interface FakeOrder { id: string; status: string; status_detail: string; external_reference: string; kind: string; getMode: GetMode }
const mp = {
  orders: new Map<string, FakeOrder>(),
  byKey: new Map<string, string>(),
  gets: [] as string[],
  seq: 0,
};
function orderJson(o: FakeOrder) {
  return {
    id: o.id, status: o.status, status_detail: o.status_detail, external_reference: o.external_reference,
    transactions: { payments: [{ id: `PAY${o.id.slice(3)}`, status: o.status, status_detail: o.status_detail, payment_method: { id: 'pix', type: 'bank_transfer', qr_code: '000201-fixture', qr_code_base64: 'iVBOR-fixture', ticket_url: 'https://mp.test/t' } }] },
  };
}
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
async function fakeFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const url = String(input);
  const headers = (init?.headers ?? {}) as Record<string, string>;
  if (headers.Authorization !== `Bearer ${TOKEN}`) return json(401, { errors: [{ code: 'unauthorized' }] });
  const key = headers['X-Idempotency-Key'];
  if (url.endsWith('/v1/orders') && init?.method === 'POST') {
    const body = JSON.parse(String(init.body));
    const existing = mp.byKey.get(key);
    if (existing) return json(201, orderJson(mp.orders.get(existing)!));
    const id = `ORD01POLLRES${String(++mp.seq).padStart(4, '0')}`;
    const o: FakeOrder = { id, status: 'action_required', status_detail: 'waiting_transfer', external_reference: body.external_reference, kind: 'pix', getMode: 'ok' };
    mp.orders.set(id, o);
    mp.byKey.set(key, id);
    return json(201, orderJson(o));
  }
  const get = url.match(/\/v1\/orders\/([^/]+)$/);
  if (get) {
    const id = decodeURIComponent(get[1]);
    mp.gets.push(id);
    const o = mp.orders.get(id);
    if (!o) return json(404, { errors: [{ code: 'not_found' }] });
    if (o.getMode === 'network') throw new TypeError('fetch failed');
    if (o.getMode === 500 || o.getMode === 503) return json(o.getMode, { errors: [{ code: 'internal_error' }] });
    if (o.getMode === 404) return json(404, { errors: [{ code: 'not_found' }] });
    return json(200, orderJson(o));
  }
  return json(404, {});
}

let dono: { id: string; username: string };
let accountId: string;
let revenueId: string;
let cpId: string;
const payerPix = { firstName: 'Ana', lastName: 'Lima', email: 'ana@cliente.test', identification: { type: 'CPF', number: '12345678901' } };

async function novaCobranca(): Promise<{ id: string; providerRef: string }> {
  const t = await prisma.receivable.create({
    data: {
      userId: dono.id, unitId: UNIT, customerName: 'Cliente', documentNumber: `FAT-${randomBytes(3).toString('hex')}`, description: 'Serviço',
      issueDate: new Date('2026-10-01'), dueDate: new Date('2026-10-30'), amountCents: 10000n, receivedCents: 0n, revenueAccountId: revenueId,
      counterpartyId: cpId, status: 'OPEN',
    },
  });
  const r = await request(app).post(`/api/receivables/${t.id}/charges`).set(authHeader(dono)).send({ unitId: UNIT, kind: 'PIX', payer: payerPix });
  expect(r.status).toBe(201);
  return { id: r.body.data.id, providerRef: r.body.data.providerRef };
}
const row = (id: string) => prisma.collectionCharge.findUniqueOrThrow({ where: { id } });
const getsDe = (ref: string) => mp.gets.filter((g) => g === ref).length;
/** O backoff é provado sem esperar: vence o relógio da cobrança no banco (o serviço lê `nextPollAt` do banco). */
const vencerBackoff = (id: string) => prisma.collectionCharge.update({ where: { id }, data: { nextPollAt: new Date(Date.now() - 1000) } });
const poll = () => getFactory().getCollectionChargeService().pollPending();

describe('Onda 4 / 4.3 — pollPending: 4xx definitivo não reenfileira para sempre, 5xx tem backoff (SQLite real)', () => {
  const spies: jest.SpyInstance[] = [];
  const errorLogs: string[] = [];

  beforeAll(async () => {
    pushTestSchema();
    process.env.PAYMENT_CREDENTIAL_KEYS = `1:${randomBytes(32).toString('base64')}`;
    process.env.PAYMENT_CREDENTIAL_KEY_ACTIVE = '1';
    dono = await prisma.user.create({ data: { name: 'f5pr', username: 'f5-pollres', email: 'f5pollres@test.local', password: 'x', role: 'USER' } });
    await seedUnit({ userId: dono.id, id: UNIT });
    const folha = await prisma.account.create({ data: { userId: dono.id, unitId: UNIT, code: '1.1.9', name: 'Saldo MP', nature: 'Asset', acceptsEntries: true } });
    revenueId = (await prisma.account.create({ data: { userId: dono.id, unitId: UNIT, code: '3.1.1', name: 'Receita', nature: 'Revenue', acceptsEntries: true } })).id;
    cpId = (await prisma.counterparty.create({ data: { userId: dono.id, unitId: UNIT, type: 'CUSTOMER', name: 'Cliente', nameNormalized: 'cliente', taxId: '12345678901' } })).id;
    const cfg = { provider: 'MERCADO_PAGO', label: 'MP', config: { provider: 'MERCADO_PAGO', credentialSource: 'OWN' } };
    accountId = (await request(app).post('/api/payment-accounts').set(authHeader(dono)).send({ unitId: UNIT, glAccountId: folha.id, ...cfg })).body.data.id;
    await request(app).put(`/api/payment-accounts/${accountId}/credential`).set(authHeader(dono)).send({ unitId: UNIT, accessToken: TOKEN, webhookSecret: SECRET });
    for (const m of ['log', 'info', 'warn', 'debug'] as const) spies.push(jest.spyOn(console, m).mockImplementation(() => {}));
    spies.push(jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => { errorLogs.push(JSON.stringify(args)); }));
  }, 120000);
  beforeEach(() => {
    mp.gets = [];
    spies.push(jest.spyOn(global, 'fetch').mockImplementation(fakeFetch as typeof fetch));
  });
  afterEach(() => spies.pop()?.mockRestore());
  afterAll(async () => {
    spies.forEach((s) => s.mockRestore());
    delete process.env.PAYMENT_CREDENTIAL_KEYS;
    delete process.env.PAYMENT_CREDENTIAL_KEY_ACTIVE;
    await prisma.$disconnect();
  });

  it('5xx do provedor: a cobrança continua PENDING, o tick seguinte NÃO re-consulta (backoff) e, vencido o backoff e o MP de volta, ela é atualizada e zera', async () => {
    const c = await novaCobranca();
    mp.orders.get(c.providerRef)!.getMode = 503;

    const s1 = await poll();
    expect(s1.failed).toBe(1);
    const aposFalha = await row(c.id);
    expect(aposFalha.status).toBe('PENDING');
    expect(aposFalha.pollAttempts).toBe(1);
    expect(aposFalha.nextPollAt!.getTime()).toBeGreaterThan(Date.now());
    expect(aposFalha.pollLastError).toContain('503');
    expect(getsDe(c.providerRef)).toBe(1);

    await poll(); // dentro do backoff: nem chega ao provedor
    expect(getsDe(c.providerRef)).toBe(1);

    await vencerBackoff(c.id);
    await poll();
    expect(getsDe(c.providerRef)).toBe(2);
    expect((await row(c.id)).pollAttempts).toBe(2);

    // o provedor volta e diz que foi pago: aplica, e o controle de retentativa zera
    const o = mp.orders.get(c.providerRef)!;
    o.getMode = 'ok'; o.status = 'processed'; o.status_detail = 'accredited';
    await vencerBackoff(c.id);
    const s3 = await poll();
    expect(s3.refreshed).toBeGreaterThanOrEqual(1);
    const fim = await row(c.id);
    expect(fim.status).toBe('PAID');
    expect(fim.pollAttempts).toBe(0);
    expect(fim.nextPollAt).toBeNull();
    expect(fim.pollLastError).toBeNull();
  });

  it('falha de rede (fetch lança) também é transitória: PENDING, com backoff', async () => {
    const c = await novaCobranca();
    mp.orders.get(c.providerRef)!.getMode = 'network';
    await poll();
    const r = await row(c.id);
    expect(r).toMatchObject({ status: 'PENDING', pollAttempts: 1 });
    await poll();
    expect(getsDe(c.providerRef)).toBe(1);
  });

  it('4xx definitivo (404) repetido: no 3º vira FAILED terminal + audit, e o job para de re-consultar', async () => {
    const c = await novaCobranca();
    mp.orders.get(c.providerRef)!.getMode = 404;

    for (let i = 1; i <= 2; i += 1) {
      await poll();
      const r = await row(c.id);
      expect(r).toMatchObject({ status: 'PENDING', pollAttempts: i });
      await vencerBackoff(c.id);
    }
    const s3 = await poll();
    expect(s3.failed).toBeGreaterThanOrEqual(1);
    const r = await row(c.id);
    expect(r.status).toBe('FAILED');
    expect(r.failReason).toContain('404');
    const ev = await prisma.auditEvent.findMany({ where: { eventType: 'collection_charge.failed' }, orderBy: { seq: 'asc' } });
    expect(ev.map((e) => JSON.parse(e.payload))).toContainEqual({ collectionChargeId: c.id, fromStatus: 'PENDING', toStatus: 'FAILED' });
    expect(errorLogs.some((l) => l.includes('collection_charge_poll') && l.includes(c.id))).toBe(true);

    const antes = getsDe(c.providerRef);
    await poll();
    await poll();
    expect(getsDe(c.providerRef)).toBe(antes); // terminal: nunca mais consultada
  });

  it('a cobrança que falha não impede a sadia de ser atualizada no mesmo tick', async () => {
    const ruim = await novaCobranca();
    const boa = await novaCobranca();
    mp.orders.get(ruim.providerRef)!.getMode = 500;
    const o = mp.orders.get(boa.providerRef)!;
    o.status = 'processed'; o.status_detail = 'accredited';
    await poll();
    expect((await row(boa.id)).status).toBe('PAID');
    expect((await row(ruim.id)).status).toBe('PENDING');
  });

  it('webhook com a re-consulta falhando (5xx) responde 200 e a cobrança fica para o job — que a re-consulta com backoff', async () => {
    const c = await novaCobranca();
    mp.orders.get(c.providerRef)!.getMode = 500;
    const ts = String(Date.now());
    const { createHmac } = await import('node:crypto');
    const sig = `ts=${ts},v1=${createHmac('sha256', SECRET).update(`id:${c.providerRef};request-id:req-1;ts:${ts};`).digest('hex')}`;
    const r = await request(app)
      .post(`/api/payment-collection/webhook/MERCADO_PAGO/${accountId}?data.id=${c.providerRef}&type=order`)
      .set('x-signature', sig)
      .set('x-request-id', 'req-1')
      .send({ action: 'order.processed', type: 'order', data: { id: c.providerRef } });
    expect(r.status).toBe(200);
    expect((await row(c.id)).status).toBe('PENDING');

    // o MP volta e diz pago: o job (sem backoff gravado pelo webhook) a atualiza
    const o = mp.orders.get(c.providerRef)!;
    o.getMode = 'ok'; o.status = 'processed'; o.status_detail = 'accredited';
    await poll();
    expect((await row(c.id)).status).toBe('PAID');
  });
});
