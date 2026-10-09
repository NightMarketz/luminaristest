/**
 * BE-INCR-PAYMENT-PROVIDER (nó F5) PR-2 — cobrança + adaptador MP + webhook, ponta a ponta pela borda HTTP.
 * O Mercado Pago é um FAKE em memória atrás do `fetch` global (nenhuma chamada real, nenhuma credencial real):
 * ele guarda as ordens por `X-Idempotency-Key`, como a Orders API, para provar que o re-drive não cria 2ª ordem.
 * Itens: P2-2..P2-15; invariantes 1–7, 10, 13 do ADR §10; decisões F1–F9 do dono (10/10).
 */
import { createHmac, randomBytes } from 'node:crypto';
import request from 'supertest';
import prisma from '@/lib/prisma';
import { getFactory } from '@/lib/factory';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();
const UNIT = 'unit-f5-pr2';
const UNIT_SEM_CONTA = 'unit-f5-pr2-b';
const TOKEN = 'APP_USR-FIXTURE-TOKEN-PR2-0000000000-wxyz';
const SECRET = 'webhook-secret-FIXTURE-PR2-0001';
const SECRET_OUTRA = 'webhook-secret-FIXTURE-PR2-0002';

// ── fake MP ─────────────────────────────────────────────────────────────────────────────────────────
interface FakeOrder { id: string; status: string; status_detail: string; external_reference: string; kind: string }
const mp = {
  orders: new Map<string, FakeOrder>(),
  byKey: new Map<string, string>(),
  keys: [] as string[],
  bodies: [] as Record<string, unknown>[],
  nextCreate: null as null | 'network_after_store' | 'network' | 400 | 401,
  nextCancel: null as null | 409,
  seq: 0,
  reset() {
    this.keys = []; // ordens persistem entre os testes (o MP não esquece)
    this.bodies = []; this.nextCreate = null; this.nextCancel = null;
  },
};
function orderJson(o: FakeOrder) {
  const pm = o.kind === 'pix'
    ? { id: 'pix', type: 'bank_transfer', qr_code: '000201-fixture', qr_code_base64: 'iVBOR-fixture', ticket_url: 'https://mp.test/t' }
    : { id: 'boleto', type: 'ticket', digitable_line: '23793380296060054351030006333303799140000020000', barcode_content: '3335', ticket_url: 'https://mp.test/b' };
  return { id: o.id, status: o.status, status_detail: o.status_detail, external_reference: o.external_reference,
    transactions: { payments: [{ id: `PAY${o.id.slice(3)}`, status: o.status, status_detail: o.status_detail, payment_method: pm }] } };
}
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
async function fakeFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const url = String(input);
  const headers = (init?.headers ?? {}) as Record<string, string>;
  if (headers.Authorization !== `Bearer ${TOKEN}`) return json(401, { errors: [{ code: 'unauthorized' }] });
  const key = headers['X-Idempotency-Key'];
  if (url.endsWith('/v1/orders') && init?.method === 'POST') {
    mp.keys.push(key);
    const body = JSON.parse(String(init.body));
    mp.bodies.push(body);
    const mode = mp.nextCreate;
    mp.nextCreate = null;
    if (mode === 'network') throw new TypeError('fetch failed');
    if (mode === 400) return json(400, { errors: [{ code: 'invalid_identification' }] });
    if (mode === 401) return json(401, { errors: [{ code: 'unauthorized' }] });
    const existing = mp.byKey.get(key);
    if (existing) return json(201, orderJson(mp.orders.get(existing)!));
    const id = `ORD01FIXTURE${String(++mp.seq).padStart(4, '0')}`;
    const o = { id, status: 'action_required', status_detail: 'waiting_transfer', external_reference: body.external_reference, kind: body.transactions.payments[0].payment_method.id };
    mp.orders.set(id, o);
    mp.byKey.set(key, id);
    if (mode === 'network_after_store') throw new TypeError('fetch failed'); // o MP criou, a resposta se perdeu
    return json(201, orderJson(o));
  }
  const cancel = url.match(/\/v1\/orders\/([^/]+)\/cancel$/);
  if (cancel) {
    mp.keys.push(key);
    const o = mp.orders.get(cancel[1])!;
    if (mp.nextCancel === 409) { mp.nextCancel = null; return json(409, { errors: [{ code: 'cannot_cancel_order' }] }); }
    o.status = 'canceled'; o.status_detail = 'canceled';
    return json(200, orderJson(o));
  }
  const get = url.match(/\/v1\/orders\/([^/]+)$/);
  if (get) {
    const o = mp.orders.get(decodeURIComponent(get[1]));
    return o ? json(200, orderJson(o)) : json(404, { errors: [{ code: 'not_found' }] });
  }
  return json(404, {});
}

// ── fixtures ────────────────────────────────────────────────────────────────────────────────────────
let dono: { id: string; username: string };
let accountId: string;
let outraContaId: string;
let revenueId: string;
let cpId: string;
let cpSemCobrancaId: string;

const payerPix = { firstName: 'Ana', lastName: 'Lima', email: 'ana@cliente.test', identification: { type: 'CPF', number: '12345678901' } };
const address = { streetName: 'Rua A', streetNumber: '10', zipCode: '01001000', neighborhood: 'Sé', city: 'São Paulo', state: 'SP' };
const counts = async () => ({
  journal: await prisma.journalEntry.count(),
  receipts: await prisma.receivableReceipt.count(),
  audit: await prisma.auditEvent.count(),
});
const eventos = (eventType: string) => prisma.auditEvent.findMany({ where: { eventType }, orderBy: { seq: 'asc' } });
const dump = (v: unknown) => JSON.stringify(v, (_k, x) => (typeof x === 'bigint' ? String(x) : x));

async function novoTitulo(opts: { amount?: bigint; received?: bigint; status?: string; unitId?: string; cp?: string; doc?: string } = {}) {
  return prisma.receivable.create({
    data: {
      userId: dono.id, unitId: opts.unitId ?? UNIT, customerName: 'Cliente', documentNumber: opts.doc ?? `FAT-${randomBytes(3).toString('hex')}`,
      description: 'Serviço', issueDate: new Date('2026-10-01'), dueDate: new Date('2026-10-30'),
      amountCents: opts.amount ?? 10000n, receivedCents: opts.received ?? 0n, revenueAccountId: revenueId,
      counterpartyId: opts.cp ?? cpId, status: opts.status ?? 'OPEN',
    },
  });
}
const cobrar = (receivableId: string, body: Record<string, unknown>) =>
  request(app).post(`/api/receivables/${receivableId}/charges`).set(authHeader(dono)).send({ unitId: UNIT, ...body });
const sign = (dataId: string, secret = SECRET, ts = String(Date.now()), requestId = 'req-1') =>
  `ts=${ts},v1=${createHmac('sha256', secret).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest('hex')}`;
const webhook = (dataId: string, opts: { account?: string; provider?: string; secret?: string; ts?: string; body?: unknown } = {}) =>
  request(app)
    .post(`/api/payment-collection/webhook/${opts.provider ?? 'MERCADO_PAGO'}/${opts.account ?? accountId}?data.id=${dataId}&type=order`)
    .set('x-signature', sign(dataId, opts.secret ?? SECRET, opts.ts))
    .set('x-request-id', 'req-1')
    .send(opts.body ?? { action: 'order.processed', type: 'order', data: { id: dataId, status: 'processed', status_detail: 'accredited' } });

describe('F5 PR-2 — CollectionCharge + adaptador MP + webhook', () => {
  const logged: string[] = [];
  const spies: jest.SpyInstance[] = [];

  beforeAll(async () => {
    pushTestSchema();
    process.env.PAYMENT_CREDENTIAL_KEYS = `1:${randomBytes(32).toString('base64')}`;
    process.env.PAYMENT_CREDENTIAL_KEY_ACTIVE = '1';
    dono = await prisma.user.create({ data: { name: 'f5b', username: 'f5-pr2', email: 'f5pr2@test.local', password: 'x', role: 'USER' } });
    const folha = await prisma.account.create({ data: { userId: dono.id, unitId: UNIT, code: '1.1.9', name: 'Saldo MP', nature: 'Asset', acceptsEntries: true } });
    const folhaB = await prisma.account.create({ data: { userId: dono.id, unitId: UNIT_SEM_CONTA, code: '1.1.9', name: 'Saldo MP', nature: 'Asset', acceptsEntries: true } });
    revenueId = (await prisma.account.create({ data: { userId: dono.id, unitId: UNIT, code: '3.1.1', name: 'Receita', nature: 'Revenue', acceptsEntries: true } })).id;
    cpId = (await prisma.counterparty.create({ data: { userId: dono.id, unitId: UNIT, type: 'CUSTOMER', name: 'Cliente', nameNormalized: 'cliente', taxId: '12345678901' } })).id;
    cpSemCobrancaId = (await prisma.counterparty.create({ data: { userId: dono.id, unitId: UNIT, type: 'CUSTOMER', name: 'Outro', nameNormalized: 'outro', taxId: '11222333000181' } })).id;
    const cfg = { provider: 'MERCADO_PAGO', label: 'MP', config: { provider: 'MERCADO_PAGO', credentialSource: 'OWN' } };
    accountId = (await request(app).post('/api/payment-accounts').set(authHeader(dono)).send({ unitId: UNIT, glAccountId: folha.id, ...cfg })).body.data.id;
    await request(app).put(`/api/payment-accounts/${accountId}/credential`).set(authHeader(dono)).send({ unitId: UNIT, accessToken: TOKEN, webhookSecret: SECRET });
    // Conta de OUTRA unidade, ativa, com outro segredo — para a invariante 1 (segredo de outra conta).
    outraContaId = (await request(app).post('/api/payment-accounts').set(authHeader(dono)).send({ unitId: UNIT_SEM_CONTA, glAccountId: folhaB.id, ...cfg })).body.data.id;
    await request(app).put(`/api/payment-accounts/${outraContaId}/credential`).set(authHeader(dono)).send({ unitId: UNIT_SEM_CONTA, accessToken: TOKEN, webhookSecret: SECRET_OUTRA });
    await request(app).patch(`/api/payment-accounts/${outraContaId}`).set(authHeader(dono)).send({ unitId: UNIT_SEM_CONTA, status: 'DISABLED' });
    for (const m of ['log', 'info', 'warn', 'error', 'debug'] as const) {
      spies.push(jest.spyOn(console, m).mockImplementation((...args: unknown[]) => { logged.push(dump(args)); }));
    }
  }, 120000);

  beforeEach(() => {
    mp.reset();
    spies.push(jest.spyOn(global, 'fetch').mockImplementation(fakeFetch as typeof fetch));
  });
  afterEach(() => {
    const f = spies.pop();
    f?.mockRestore();
  });
  afterAll(async () => {
    spies.forEach((s) => s.mockRestore());
    delete process.env.PAYMENT_CREDENTIAL_KEYS;
    delete process.env.PAYMENT_CREDENTIAL_KEY_ACTIVE;
    await prisma.$disconnect();
  });

  let pixChargeId: string;
  let pixOrderId: string;
  let tituloPix: string;

  it('P2-2: Pix pelo saldo em aberto relido na tx; chave id:1; external_reference = id; 2 commits ⇒ PENDING', async () => {
    tituloPix = (await novoTitulo({ amount: 10000n, received: 2500n, status: 'PARTIALLY_RECEIVED', doc: 'FAT-777' })).id;
    const r = await cobrar(tituloPix, { kind: 'PIX', payer: payerPix });
    expect(r.status).toBe(201);
    pixChargeId = r.body.data.id;
    expect(r.body.data).toMatchObject({ status: 'PENDING', kind: 'PIX', amountCents: '7500', providerStatus: 'action_required' });
    expect(r.body.data.payer).toBeUndefined(); // F9: pagador fora da resposta de criação/lista
    expect(r.body.data.instrument).toMatchObject({ qrCode: '000201-fixture' });
    pixOrderId = r.body.data.providerRef;
    expect(r.body.data.providerPaymentRef).toBe(`PAY${pixOrderId.slice(3)}`);
    expect(mp.keys).toEqual([`${pixChargeId}:1`]);
    expect(mp.bodies[0]).toMatchObject({ external_reference: pixChargeId, total_amount: '75.00' });
    // F4 (a): prazo explícito (Pix 24 h) · F9: descrição = nº do título, sem dado pessoal.
    const pay = (mp.bodies[0].transactions as { payments: Array<Record<string, unknown>> }).payments[0];
    expect(pay.expiration_time).toBe('PT1440M');
    expect(mp.bodies[0].description).toBe('Título FAT-777');
    const ev = await eventos('collection_charge.created');
    expect(JSON.parse(ev[ev.length - 1].payload)).toEqual({
      collectionChargeId: pixChargeId, receivableId: tituloPix, paymentAccountId: accountId, kind: 'PIX', amountCents: '7500', status: 'CREATING',
    });
  });

  it('P2-2: 2ª cobrança viva no mesmo título ⇒ 409 CHARGE_LIVE_EXISTS, sem chamar o MP', async () => {
    const r = await cobrar(tituloPix, { kind: 'PIX', payer: payerPix });
    expect(r.status).toBe(409);
    expect(JSON.stringify(r.body)).toContain('CHARGE_LIVE_EXISTS');
    expect(mp.keys).toEqual([]);
  });

  it('P2-2/F9: título RECEIVED ou CANCELLED ⇒ 409; sem conta MP ativa na unidade ⇒ 409 PAYMENT_ACCOUNT_NOT_ACTIVE', async () => {
    for (const status of ['RECEIVED', 'CANCELLED']) {
      const t = await novoTitulo({ status });
      const r = await cobrar(t.id, { kind: 'PIX', payer: payerPix });
      expect(r.status).toBe(409);
      expect(JSON.stringify(r.body)).toContain('CHARGE_RECEIVABLE_NOT_CHARGEABLE');
    }
    const semConta = await novoTitulo({ unitId: UNIT_SEM_CONTA });
    const r = await request(app).post(`/api/receivables/${semConta.id}/charges`).set(authHeader(dono)).send({ unitId: UNIT_SEM_CONTA, kind: 'PIX', payer: payerPix });
    expect(r.status).toBe(409);
    expect(JSON.stringify(r.body)).toContain('PAYMENT_ACCOUNT_NOT_ACTIVE');
    expect(await prisma.collectionCharge.count({ where: { receivableId: semConta.id } })).toBe(0);
    expect(mp.keys).toEqual([]);
  });

  it('P2-12 (invariante 13): juros/multa/desconto, prazo do tipo errado ou boleto sem endereço ⇒ 400, nada gravado', async () => {
    const t = await novoTitulo();
    const antes = await prisma.collectionCharge.count();
    for (const extra of [{ interest: 1 }, { fine: 2 }, { discount: 3 }]) {
      expect((await cobrar(t.id, { kind: 'PIX', payer: payerPix, ...extra })).status).toBe(400);
    }
    expect((await cobrar(t.id, { kind: 'BOLETO', expiresInDays: 31, payer: { ...payerPix, address } })).status).toBe(400);
    const mismatch = await cobrar(t.id, { kind: 'BOLETO', expiresInMinutes: 60, payer: { ...payerPix, address } });
    expect(mismatch.status).toBe(400);
    expect(JSON.stringify(mismatch.body)).toContain('charge_expiry_field_mismatch');
    expect((await cobrar(t.id, { kind: 'PIX', expiresInDays: 2, payer: payerPix })).status).toBe(400);
    const semEndereco = await cobrar(t.id, { kind: 'BOLETO', payer: payerPix });
    expect(semEndereco.status).toBe(400);
    expect(JSON.stringify(semEndereco.body)).toContain('charge_address_required');
    expect(await prisma.collectionCharge.count()).toBe(antes);
    expect(mp.keys).toEqual([]);
  });

  it('P2-15/F9: GET lista sem pagador; detalhe com pagador para quem gerencia; nunca a credencial', async () => {
    const lista = await request(app).get(`/api/receivables/${tituloPix}/charges?unitId=${UNIT}`).set(authHeader(dono));
    expect(lista.status).toBe(200);
    expect(lista.body.data).toHaveLength(1);
    expect(lista.body.data[0].payer).toBeUndefined();
    const det = await request(app).get(`/api/collection-charges/${pixChargeId}?unitId=${UNIT}`).set(authHeader(dono));
    expect(det.status).toBe(200);
    expect(det.body.data.payer).toEqual(payerPix);
    expect(JSON.stringify([lista.body, det.body])).not.toContain(TOKEN);
  });

  it('P2-5 (invariante 1): assinatura inválida, janela vencida, conta inexistente/inativa/de outro provedor, segredo de outra conta ⇒ 401 e zero escrita', async () => {
    const antes = await counts();
    const row = await prisma.collectionCharge.findUniqueOrThrow({ where: { id: pixChargeId } });
    const casos = [
      webhook(pixOrderId, { secret: 'segredo-errado' }),
      webhook(pixOrderId, { ts: String(Date.now() - 16 * 86_400_000) }),
      webhook(pixOrderId, { account: 'conta-que-nao-existe' }),
      webhook(pixOrderId, { account: outraContaId, secret: SECRET_OUTRA }), // inativa
      webhook(pixOrderId, { provider: 'BANK_CNAB' }),
      webhook(pixOrderId, { secret: SECRET_OUTRA }), // segredo de OUTRA conta da mesma instância
    ];
    for (const c of casos) expect((await c).status).toBe(401);
    expect(await counts()).toEqual(antes);
    expect(await prisma.collectionCharge.findUniqueOrThrow({ where: { id: pixChargeId } })).toEqual(row);
    expect(mp.keys).toEqual([]); // nem re-consulta houve
  });

  it('publicApiRoutes: GET/HEAD no path do webhook continuam 401 (só POST é público)', async () => {
    expect((await request(app).get(`/api/payment-collection/webhook/MERCADO_PAGO/${accountId}`)).status).toBe(401);
    expect((await request(app).head(`/api/payment-collection/webhook/MERCADO_PAGO/${accountId}`)).status).toBe(401);
  });

  it('P2-5 (invariante 2): corpo diz "accredited", a re-consulta diz action_required ⇒ continua PENDING', async () => {
    const r = await webhook(pixOrderId);
    expect(r.status).toBe(200);
    expect((await prisma.collectionCharge.findUniqueOrThrow({ where: { id: pixChargeId } })).status).toBe('PENDING');
  });

  it('P2-6/P2-8 (invariantes 3 e 7): accredited ⇒ PAID uma vez; a 2ª notificação não transiciona nem audita; zero razão', async () => {
    const antes = await counts();
    const o = mp.orders.get(pixOrderId)!;
    o.status = 'processed'; o.status_detail = 'accredited';
    expect((await webhook(pixOrderId)).status).toBe(200);
    const pago = await prisma.collectionCharge.findUniqueOrThrow({ where: { id: pixChargeId } });
    expect(pago).toMatchObject({ status: 'PAID', providerStatus: 'processed', providerStatusDetail: 'accredited' });
    expect(pago.paidAt).not.toBeNull();
    const ev1 = await eventos('collection_charge.status_changed');
    expect(JSON.parse(ev1[ev1.length - 1].payload)).toEqual({ collectionChargeId: pixChargeId, from: 'PENDING', to: 'PAID', providerStatus: 'processed' });

    expect((await webhook(pixOrderId)).status).toBe(200); // 2ª chamada — asserida
    expect(await eventos('collection_charge.status_changed')).toHaveLength(ev1.length);
    expect(await prisma.collectionCharge.findUniqueOrThrow({ where: { id: pixChargeId } })).toEqual(pago);
    const depois = await counts();
    expect(depois.journal).toBe(antes.journal);
    expect(depois.receipts).toBe(antes.receipts);
    expect((await prisma.receivable.findUniqueOrThrow({ where: { id: tituloPix } })).status).toBe('PARTIALLY_RECEIVED');
  });

  it('P2-7: PAID → PARTIALLY_REFUNDED → REFUNDED seguem o MP; REFUNDED é terminal', async () => {
    const o = mp.orders.get(pixOrderId)!;
    o.status = 'processed'; o.status_detail = 'partially_refunded';
    await webhook(pixOrderId);
    expect((await prisma.collectionCharge.findUniqueOrThrow({ where: { id: pixChargeId } })).status).toBe('PARTIALLY_REFUNDED');
    o.status = 'refunded'; o.status_detail = 'refunded';
    await webhook(pixOrderId);
    expect((await prisma.collectionCharge.findUniqueOrThrow({ where: { id: pixChargeId } })).status).toBe('REFUNDED');
    o.status = 'processed'; o.status_detail = 'accredited';
    await webhook(pixOrderId);
    expect((await prisma.collectionCharge.findUniqueOrThrow({ where: { id: pixChargeId } })).status).toBe('REFUNDED');
  });

  it('P2-13 (F-PPB-7 a, F5 a): cancelar título com cobrança viva ⇒ 409 ANTES do estorno — nenhum lançamento', async () => {
    const t = await novoTitulo();
    expect((await cobrar(t.id, { kind: 'PIX', payer: payerPix })).status).toBe(201);
    const antes = await counts();
    const r = await request(app).post(`/api/receivables/${t.id}/cancel`).set(authHeader(dono)).send({ unitId: UNIT, reversalDate: '2026-10-09' });
    expect(r.status).toBe(409);
    expect(JSON.stringify(r.body)).toContain('receivable_has_live_charge');
    expect((await counts()).journal).toBe(antes.journal);
    expect((await prisma.receivable.findUniqueOrThrow({ where: { id: t.id } })).status).toBe('OPEN');
  });

  it('P2-10: cancelar PENDING com chave id:cancel ⇒ CANCELLED; 409 do MP ⇒ re-consulta e aplica o real (PAID)', async () => {
    const t = await novoTitulo();
    const c = (await cobrar(t.id, { kind: 'PIX', payer: payerPix })).body.data;
    mp.keys = [];
    const r = await request(app).post(`/api/collection-charges/${c.id}/cancel`).set(authHeader(dono)).send({ unitId: UNIT });
    expect(r.status).toBe(200);
    expect(r.body.data.status).toBe('CANCELLED');
    expect(mp.keys).toEqual([`${c.id}:cancel`]);
    const ev = await eventos('collection_charge.cancelled');
    expect(JSON.parse(ev[ev.length - 1].payload)).toEqual({ collectionChargeId: c.id, fromStatus: 'PENDING', toStatus: 'CANCELLED', providerStatus: 'canceled' });
    const deNovo = await request(app).post(`/api/collection-charges/${c.id}/cancel`).set(authHeader(dono)).send({ unitId: UNIT });
    expect(deNovo.status).toBe(409);
    expect(JSON.stringify(deNovo.body)).toContain('CHARGE_NOT_PENDING');

    const t2 = await novoTitulo();
    const c2 = (await cobrar(t2.id, { kind: 'PIX', payer: payerPix })).body.data;
    const o = mp.orders.get(c2.providerRef)!;
    o.status = 'processed'; o.status_detail = 'accredited';
    mp.nextCancel = 409;
    const r2 = await request(app).post(`/api/collection-charges/${c2.id}/cancel`).set(authHeader(dono)).send({ unitId: UNIT });
    expect(r2.status).toBe(200);
    expect(r2.body.data.status).toBe('PAID');
  });

  it('P2-3 (invariante 5) + P2-9: resposta perdida ⇒ CREATING; o job (depois de 10 min) reenvia a MESMA chave e não nasce 2ª ordem', async () => {
    const t = await novoTitulo();
    mp.nextCreate = 'network_after_store';
    const r = await cobrar(t.id, { kind: 'BOLETO', payer: { ...payerPix, address } });
    expect(r.status).toBe(502);
    expect(JSON.stringify(r.body)).toContain('provider_unavailable');
    const row = await prisma.collectionCharge.findFirstOrThrow({ where: { receivableId: t.id } });
    expect(row.status).toBe('CREATING');
    const ordens = mp.orders.size;
    // ainda não é velha: o job não toca
    await getFactory().getCollectionChargeService().pollPending();
    expect(mp.keys).toEqual([`${row.id}:1`]);
    await prisma.collectionCharge.update({ where: { id: row.id }, data: { updatedAt: new Date(Date.now() - 11 * 60_000) } });
    const summary = await getFactory().getCollectionChargeService().pollPending();
    expect(summary.redriven).toBe(1);
    expect(mp.keys).toEqual([`${row.id}:1`, `${row.id}:1`]);
    expect(mp.orders.size).toBe(ordens);
    const depois = await prisma.collectionCharge.findUniqueOrThrow({ where: { id: row.id } });
    expect(depois.status).toBe('PENDING');
    expect(depois.providerRef).toBe(mp.byKey.get(`${row.id}:1`));
    // F4 (a): boleto com prazo explícito em dias corridos
    expect(String((mp.bodies[0].transactions as { payments: Array<Record<string, unknown>> }).payments[0].expiration_time)).toMatch(/^P\d+D$/);
  });

  it('P2-3: erro definitivo do MP (400) ⇒ FAILED + failReason + audit failed', async () => {
    const t = await novoTitulo();
    mp.nextCreate = 400;
    const r = await cobrar(t.id, { kind: 'PIX', payer: payerPix });
    expect(r.status).toBe(201);
    expect(r.body.data.status).toBe('FAILED');
    expect(r.body.data.failReason).toContain('400');
    const ev = await eventos('collection_charge.failed');
    expect(JSON.parse(ev[ev.length - 1].payload)).toEqual({ collectionChargeId: r.body.data.id, fromStatus: 'CREATING', toStatus: 'FAILED' });
  });

  it('F9: terminal (EXPIRED) não muda quando o MP diz accredited depois — grava o cru e alerta no log', async () => {
    const t = await novoTitulo();
    const c = (await cobrar(t.id, { kind: 'PIX', payer: payerPix })).body.data;
    const o = mp.orders.get(c.providerRef)!;
    o.status = 'expired'; o.status_detail = 'expired';
    await webhook(c.providerRef);
    expect((await prisma.collectionCharge.findUniqueOrThrow({ where: { id: c.id } })).status).toBe('EXPIRED');
    o.status = 'processed'; o.status_detail = 'accredited';
    await webhook(c.providerRef);
    const row = await prisma.collectionCharge.findUniqueOrThrow({ where: { id: c.id } });
    expect(row).toMatchObject({ status: 'EXPIRED', providerStatus: 'processed', providerStatusDetail: 'accredited' });
    expect(logged.some((l) => l.includes('collection_charge_paid_after_terminal'))).toBe(true);
  });

  // ── Review independente do #609 (3 achados BAIXO) ─────────────────────────────────────────────────
  it('achado 1 (P2-14): o 2º commit CREATING → PENDING emite collection_charge.status_changed na mesma tx', async () => {
    const t = await novoTitulo();
    const r = await cobrar(t.id, { kind: 'PIX', payer: payerPix });
    expect(r.status).toBe(201);
    expect(r.body.data.status).toBe('PENDING');
    const ev = (await eventos('collection_charge.status_changed')).map((e) => JSON.parse(e.payload));
    expect(ev.filter((p) => p.collectionChargeId === r.body.data.id)).toEqual([
      { collectionChargeId: r.body.data.id, from: 'CREATING', to: 'PENDING', providerStatus: 'action_required' },
    ]);
  });

  it('achado 2: CREATING velha com expiresAt no passado NÃO é reenviada ao MP — CAS para EXPIRED com audit', async () => {
    const t = await novoTitulo();
    mp.nextCreate = 'network';
    const r = await cobrar(t.id, { kind: 'PIX', payer: payerPix });
    expect(r.status).toBe(502);
    const row = await prisma.collectionCharge.findFirstOrThrow({ where: { receivableId: t.id } });
    expect(row.status).toBe('CREATING');
    await prisma.collectionCharge.update({
      where: { id: row.id },
      data: { updatedAt: new Date(Date.now() - 11 * 60_000), expiresAt: new Date(Date.now() - 60_000) },
    });
    mp.reset();
    await getFactory().getCollectionChargeService().pollPending();
    expect(mp.keys).not.toContain(`${row.id}:1`); // o fake do MP não recebeu o reenvio desta cobrança
    expect((await prisma.collectionCharge.findUniqueOrThrow({ where: { id: row.id } })).status).toBe('EXPIRED');
    const ev = (await eventos('collection_charge.status_changed')).map((e) => JSON.parse(e.payload));
    expect(ev.filter((p) => p.collectionChargeId === row.id)).toEqual([
      { collectionChargeId: row.id, from: 'CREATING', to: 'EXPIRED' }, // sem providerStatus: o MP não foi consultado
    ]);
  });

  it('P2-11: sugestão do pagador = snapshot da última cobrança da contraparte; sem cobrança ⇒ só o taxId', async () => {
    const r = await request(app).get(`/api/receivables/${tituloPix}/charges/payer-suggestion?unitId=${UNIT}`).set(authHeader(dono));
    expect(r.status).toBe(200);
    expect(r.body.data).toEqual(payerPix);
    const t = await novoTitulo({ cp: cpSemCobrancaId });
    const r2 = await request(app).get(`/api/receivables/${t.id}/charges/payer-suggestion?unitId=${UNIT}`).set(authHeader(dono));
    expect(r2.body.data).toEqual({ identification: { number: '11222333000181' } });
  });

  it('P2-4 (F8 a): 401 do MP ⇒ conta CREDENTIAL_INVALID com audit próprio e 502 provider_credential_invalid', async () => {
    const t = await novoTitulo();
    mp.nextCreate = 401;
    const r = await cobrar(t.id, { kind: 'PIX', payer: payerPix });
    expect(r.status).toBe(502);
    expect(JSON.stringify(r.body)).toContain('provider_credential_invalid');
    expect((await prisma.paymentAccount.findUniqueOrThrow({ where: { id: accountId } })).status).toBe('CREDENTIAL_INVALID');
    const ev = await eventos('payment_account.credential_invalid');
    expect(ev).toHaveLength(1);
    expect(JSON.parse(ev[0].payload)).toEqual({ paymentAccountId: accountId, fromStatus: 'ACTIVE', toStatus: 'CREDENTIAL_INVALID' });
  });

  it('P2-14 + invariante 10: nenhum audit carrega pagador, instrumento ou credencial; nem o log', async () => {
    const all = await prisma.auditEvent.findMany({ where: { eventType: { startsWith: 'collection_charge.' } } });
    const blob = dump(all);
    for (const proibido of [TOKEN, SECRET, payerPix.email, payerPix.identification.number, '000201-fixture', '23793380296060054351030006333303799140000020000']) {
      expect(blob).not.toContain(proibido);
    }
    expect(logged.join('\n')).not.toContain(TOKEN);
    expect(logged.join('\n')).not.toContain(SECRET);
  });
});
