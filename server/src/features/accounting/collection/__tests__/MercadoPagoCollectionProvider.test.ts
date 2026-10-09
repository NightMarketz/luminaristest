/**
 * BE-INCR-PAYMENT-PROVIDER PR-2 — adaptador MP (P2-1), mapa de status (P2-7), prazo (F4 a) e assinatura do webhook
 * (P2-5; F1 a / F2 a, dono 10/10). Fixtures copiadas da doc oficial (boleto e Pix da Orders API, lidas em 10/10) e do
 * teste do SDK oficial `mercadopago` (`src/utils/webhook/webhook.spec.ts`: segredo, request-id, data.id e ts). Nenhuma
 * chamada real: o `fetch` global é trocado.
 */
import { createHmac } from 'node:crypto';
import { MercadoPagoCollectionProvider, formatCents } from '../MercadoPagoCollectionProvider';
import { NullCollectionProvider } from '../NullCollectionProvider';
import { CollectionProviderError, type ResolvedAccount } from '../CollectionProviderPort';
import { mapMercadoPagoStatus } from '../../models/CollectionCharge.model';
import { calendarDaysToBusinessDay, computeExpiry } from '../../services/CollectionChargeService';

const TOKEN = 'APP_USR-FIXTURE-TOKEN-0000000000-abcd';
const account: ResolvedAccount = { id: 'pa1', credentialSource: 'OWN', credential: { accessToken: TOKEN, webhookSecret: 'x' } };

// Resposta do exemplo da doc — boleto (Orders API).
const BOLETO_ORDER = {
  id: 'ORD01J6TC8BYRR0T4ZKY0QR39WGYE', processing_mode: 'automatic', external_reference: 'ext_ref_1234', total_amount: '50.00',
  status: 'action_required', status_detail: 'waiting_payment',
  transactions: { payments: [{ id: 'PAY01J6TC8BYRR0T4ZKY0QRTZ0E24', reference_id: '22dvqmsbq8c', amount: '50.00', status: 'action_required', status_detail: 'waiting_payment',
    payment_method: { id: 'boleto', type: 'ticket', ticket_url: 'https://www.mercadopago.com.ar/payments/86797024510/ticket', barcode_content: '3335008800000000006004835002100020000242462010', digitable_line: '23793380296060054351030006333303799140000020000' } }] },
};
// Resposta do exemplo da doc — Pix (Orders API).
const PIX_ORDER = {
  id: 'ORD01HRYFWNYRE1MR1E60MW3X0T2P', type: 'online', total_amount: '50.00', external_reference: 'ext_ref_1234', status: 'action_required', status_detail: 'waiting_transfer',
  transactions: { payments: [{ id: 'PAY01HRYFXQ53Q3JPEC48MYWMR0TE', status: 'action_required', status_detail: 'waiting_transfer', amount: '50.00',
    payment_method: { id: 'pix', type: 'bank_transfer', ticket_url: 'https://www.mercadopago.com.br/sandbox/payments/00000000000/ticket', qr_code: '00020126580014br.gov.bcb.pix', qr_code_base64: 'iVBORw0KGgo' } }] },
};

function mockFetch(status: number, body: unknown) {
  return jest.spyOn(global, 'fetch').mockImplementation(async () => new Response(JSON.stringify(body), { status }));
}

const payer = {
  firstName: 'John', lastName: 'Doe', email: 'test_user_br@testuser.com', identification: { type: 'CPF' as const, number: '99999999999' },
  address: { streetName: 'Av. das Nações Unidas', streetNumber: '3003', zipCode: '06233903', neighborhood: 'Bonfim', state: 'SP', city: 'Osasco' },
};

describe('MercadoPagoCollectionProvider (P2-1)', () => {
  afterEach(() => jest.restoreAllMocks());
  const mp = new MercadoPagoCollectionProvider();

  it('capabilities do MP (M2/M3/M7/M10)', () => {
    expect(mp.capabilities).toEqual({
      boleto: true, pix: true, webhook: true, cancel: true, releaseReport: true,
      interestAndFine: false, protest: false, bankRegistration: false, maxDaysToDue: 30,
    });
  });

  it('formatCents sem float (M1)', () => {
    expect(formatCents(5000n)).toBe('50.00');
    expect(formatCents(5n)).toBe('0.05');
    expect(formatCents(123456789n)).toBe('1234567.89');
  });

  it('boleto: POST /v1/orders com Bearer, X-Idempotency-Key e o corpo da doc; lê refs e instrumento', async () => {
    const spy = mockFetch(201, BOLETO_ORDER);
    const r = await mp.createCharge(account, {
      idempotencyKey: 'ch1:1', externalReference: 'ch1', kind: 'BOLETO', amountCents: 5000n, expiresIn: 'P3D', payer, description: 'Título 1',
    });
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.mercadopago.com/v1/orders');
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(headers['X-Idempotency-Key']).toBe('ch1:1');
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      type: 'online', external_reference: 'ch1', processing_mode: 'automatic', total_amount: '50.00', description: 'Título 1',
      payer: { email: payer.email, first_name: 'John', last_name: 'Doe', identification: { type: 'CPF', number: '99999999999' },
        address: { street_name: 'Av. das Nações Unidas', street_number: '3003', zip_code: '06233903', neighborhood: 'Bonfim', state: 'SP', city: 'Osasco' } },
      transactions: { payments: [{ amount: '50.00', payment_method: { id: 'boleto', type: 'ticket' }, expiration_time: 'P3D' }] },
    });
    expect(r).toEqual({
      providerStatus: 'action_required', providerStatusDetail: 'waiting_payment',
      providerRef: 'ORD01J6TC8BYRR0T4ZKY0QR39WGYE', providerPaymentRef: 'PAY01J6TC8BYRR0T4ZKY0QRTZ0E24',
      instrument: { digitableLine: BOLETO_ORDER.transactions.payments[0].payment_method.digitable_line, barcode: BOLETO_ORDER.transactions.payments[0].payment_method.barcode_content, ticketUrl: BOLETO_ORDER.transactions.payments[0].payment_method.ticket_url },
    });
  });

  it('Pix: payment_method pix/bank_transfer; instrumento QR', async () => {
    const spy = mockFetch(201, PIX_ORDER);
    const r = await mp.createCharge(account, {
      idempotencyKey: 'ch2:1', externalReference: 'ch2', kind: 'PIX', amountCents: 5000n, expiresIn: 'PT1440M', payer: { ...payer, address: undefined }, description: 'Título 2',
    });
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.transactions.payments[0]).toEqual({ amount: '50.00', payment_method: { id: 'pix', type: 'bank_transfer' }, expiration_time: 'PT1440M' });
    expect(body.payer.address).toBeUndefined();
    expect(r.instrument).toEqual({ qrCode: '00020126580014br.gov.bcb.pix', qrCodeBase64: 'iVBORw0KGgo', ticketUrl: PIX_ORDER.transactions.payments[0].payment_method.ticket_url });
  });

  it('GET e cancel: caminhos da doc (M5/M7); cancel manda a chave', async () => {
    const spy = mockFetch(200, { ...PIX_ORDER, status: 'canceled', status_detail: 'canceled' });
    await mp.getCharge(account, 'ORD1');
    const r = await mp.cancelCharge(account, 'ORD1', 'ch2:cancel');
    expect(spy.mock.calls[0][0]).toBe('https://api.mercadopago.com/v1/orders/ORD1');
    expect((spy.mock.calls[0][1] as RequestInit).method).toBe('GET');
    expect(spy.mock.calls[1][0]).toBe('https://api.mercadopago.com/v1/orders/ORD1/cancel');
    expect(((spy.mock.calls[1][1] as RequestInit).headers as Record<string, string>)['X-Idempotency-Key']).toBe('ch2:cancel');
    expect(r.providerStatus).toBe('canceled');
  });

  it('erro HTTP vira CollectionProviderError com o status; rede vira status null; mensagem nunca leva o token', async () => {
    mockFetch(401, { errors: [{ code: 'unauthorized', message: 'invalid token' }] });
    const e1 = await mp.getCharge(account, 'ORD1').catch((e: unknown) => e);
    expect(e1).toBeInstanceOf(CollectionProviderError);
    expect((e1 as CollectionProviderError).httpStatus).toBe(401);
    expect(String((e1 as Error).message)).not.toContain(TOKEN);
    jest.restoreAllMocks();
    jest.spyOn(global, 'fetch').mockRejectedValue(new TypeError(`fetch failed ${TOKEN}`));
    const e2 = await mp.getCharge(account, 'ORD1').catch((e: unknown) => e);
    expect((e2 as CollectionProviderError).httpStatus).toBeNull();
    expect(String((e2 as Error).message)).not.toContain(TOKEN);
  });
});

describe('verifyWebhook — template do SDK oficial (M9; F1 a, F2 a)', () => {
  // Constantes do webhook.spec.ts do SDK oficial mercadopago (sdk-nodejs).
  const SECRET = 'your_secret_key_here';
  const REQUEST_ID = '2066ca19-c6f1-498a-be75-1923005edd06';
  const DATA_ID_RAW = 'ORD01JQ4S4KY8HWQ6NA5PXB65B3D3';
  const TS = '1742505638683';
  const TS_SECONDS = '1742505638';
  const now = new Date(Number(TS));
  const mp = new MercadoPagoCollectionProvider();
  const hash = (dataId: string | undefined, requestId: string | undefined, ts: string, secret = SECRET) => {
    const parts: string[] = [];
    if (dataId) parts.push(`id:${dataId}`);
    if (requestId) parts.push(`request-id:${requestId}`);
    parts.push(`ts:${ts}`);
    return createHmac('sha256', secret).update(parts.join(';') + ';').digest('hex');
  };
  const req = (sig: string, dataId = DATA_ID_RAW, requestId: string | null = REQUEST_ID) => ({
    headers: { 'x-signature': sig, ...(requestId ? { 'x-request-id': requestId } : {}) },
    query: { 'data.id': dataId, type: 'order' },
  });

  it('F1 (a): data.id maiúsculo assinado como chega ⇒ ok; o minúsculo do mesmo id NÃO valida (não há lowercase)', () => {
    const sig = `ts=${TS},v1=${hash(DATA_ID_RAW, REQUEST_ID, TS)}`;
    expect(mp.verifyWebhook(req(sig), SECRET, now)).toEqual({ ok: true, resourceRef: DATA_ID_RAW });
    const sigLower = `ts=${TS},v1=${hash(DATA_ID_RAW.toLowerCase(), REQUEST_ID, TS)}`;
    expect(mp.verifyWebhook(req(sigLower), SECRET, now)).toEqual({ ok: false, reason: 'signature' });
  });

  it('F2 (a): ts de 10 dígitos = segundos; de 12 dígitos = malformed', () => {
    const sig = `ts=${TS_SECONDS},v1=${hash(DATA_ID_RAW, REQUEST_ID, TS_SECONDS)}`;
    expect(mp.verifyWebhook(req(sig), SECRET, now).ok).toBe(true);
    const ts12 = TS.slice(0, 12);
    expect(mp.verifyWebhook(req(`ts=${ts12},v1=${hash(DATA_ID_RAW, REQUEST_ID, ts12)}`), SECRET, now)).toEqual({ ok: false, reason: 'malformed' });
  });

  it('par ausente sai do template (sem x-request-id)', () => {
    const sig = `ts=${TS},v1=${hash(DATA_ID_RAW, undefined, TS)}`;
    expect(mp.verifyWebhook(req(sig, DATA_ID_RAW, null), SECRET, now).ok).toBe(true);
  });

  it('segredo de outra conta ⇒ signature; fora da janela de 15 dias ⇒ replay_window; sem data.id ⇒ malformed', () => {
    const sig = `ts=${TS},v1=${hash(DATA_ID_RAW, REQUEST_ID, TS, 'outro-segredo')}`;
    expect(mp.verifyWebhook(req(sig), SECRET, now)).toEqual({ ok: false, reason: 'signature' });
    const good = `ts=${TS},v1=${hash(DATA_ID_RAW, REQUEST_ID, TS)}`;
    expect(mp.verifyWebhook(req(good), SECRET, new Date(Number(TS) + 15 * 86_400_000 + 1))).toEqual({ ok: false, reason: 'replay_window' });
    expect(mp.verifyWebhook(req(good), SECRET, new Date(Number(TS) + 15 * 86_400_000)).ok).toBe(true);
    expect(mp.verifyWebhook({ headers: { 'x-signature': good }, query: {} }, SECRET, now)).toEqual({ ok: false, reason: 'malformed' });
  });
});

describe('mapMercadoPagoStatus (P2-7, M6)', () => {
  it.each([
    ['processed', 'accredited', 'PAID', true],
    ['processed', 'partially_refunded', 'PARTIALLY_REFUNDED', true],
    ['expired', 'expired', 'EXPIRED', true],
    ['canceled', 'canceled', 'CANCELLED', true],
    ['failed', 'failed', 'FAILED', true],
    ['refunded', 'refunded', 'REFUNDED', true],
    ['charged_back', 'settled', 'CHARGED_BACK', true],
    ['action_required', 'waiting_transfer', 'PENDING', true],
    ['created', 'created', 'PENDING', true],
    ['processing', 'in_process', 'PENDING', true],
    ['qualquer', 'coisa', 'PENDING', false],
  ])('%s/%s ⇒ %s', (status, detail, expected, known) => {
    expect(mapMercadoPagoStatus(status, detail)).toEqual({ status: expected, known });
  });
});

describe('prazo explícito (F4 a)', () => {
  // 2026-10-09 é sexta-feira; 2026-10-12 é segunda.
  it('boleto: 3 dias úteis contados em Brasília (sexta ⇒ quarta = 5 dias; segunda ⇒ 3 dias)', () => {
    expect(calendarDaysToBusinessDay(new Date('2026-10-09T15:00:00Z'), 3)).toBe(5);
    expect(calendarDaysToBusinessDay(new Date('2026-10-12T15:00:00Z'), 3)).toBe(3);
    // 02:00Z de sábado ainda é sexta em Brasília (23:00 −03:00).
    expect(calendarDaysToBusinessDay(new Date('2026-10-10T02:00:00Z'), 3)).toBe(5);
  });

  it('boleto omitido ⇒ P{n}D; Pix omitido ⇒ PT1440M (24 h); informado ⇒ usa o informado', () => {
    const now = new Date('2026-10-12T15:00:00Z');
    expect(computeExpiry({ kind: 'BOLETO' }, now)).toEqual({ expiresIn: 'P3D', expiresAt: new Date('2026-10-15T15:00:00Z') });
    expect(computeExpiry({ kind: 'PIX' }, now)).toEqual({ expiresIn: 'PT1440M', expiresAt: new Date('2026-10-13T15:00:00Z') });
    expect(computeExpiry({ kind: 'BOLETO', expiresInDays: 10 }, now).expiresIn).toBe('P10D');
    expect(computeExpiry({ kind: 'PIX', expiresInMinutes: 30 }, now).expiresIn).toBe('PT30M');
  });
});

describe('NullCollectionProvider (invariante 12)', () => {
  const original = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = original;
  });
  it('recusa NODE_ENV=production no construtor; fora dela responde sem rede e recusa webhook', async () => {
    process.env.NODE_ENV = 'production';
    expect(() => new NullCollectionProvider()).toThrow(/production/);
    process.env.NODE_ENV = 'test';
    const p = new NullCollectionProvider();
    expect((await p.getCharge(account, 'X')).providerStatus).toBe('action_required');
    expect(p.verifyWebhook().ok).toBe(false);
  });
});

describe('MercadoPagoCollectionProvider — relatório de liberações (PR-3, P3-5; M10)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('requestReleaseReport: POST /v1/account/release_report com begin_date/end_date ISO UTC e Bearer', async () => {
    const spy = jest.spyOn(global, 'fetch').mockImplementation(async () => new Response('', { status: 202 }));
    await new MercadoPagoCollectionProvider('https://mp.test').requestReleaseReport(account, { fromUtc: '2026-10-07T03:00:00.000Z', toUtc: '2026-10-10T03:00:00.000Z' });
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://mp.test/v1/account/release_report');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
    expect(JSON.parse(String(init.body))).toEqual({ begin_date: '2026-10-07T03:00:00.000Z', end_date: '2026-10-10T03:00:00.000Z' });
  });

  it('listReleaseReports mapeia file_name/begin_date/end_date; downloadReleaseReport devolve o corpo bruto', async () => {
    mockFetch(200, [{ file_name: 'r1.csv', begin_date: '2026-10-07T03:00:00Z', end_date: '2026-10-10T03:00:00Z', id: 1 }, { foo: 1 }]);
    const p = new MercadoPagoCollectionProvider('https://mp.test');
    expect(await p.listReleaseReports(account)).toEqual([{ fileName: 'r1.csv', beginDate: '2026-10-07T03:00:00Z', endDate: '2026-10-10T03:00:00Z' }]);
    jest.restoreAllMocks();
    const spy = jest.spyOn(global, 'fetch').mockImplementation(async () => new Response('DATE,SOURCE_ID\n', { status: 200 }));
    expect((await p.downloadReleaseReport(account, 'r 1.csv')).toString('utf8')).toBe('DATE,SOURCE_ID\n');
    expect(spy.mock.calls[0][0]).toBe('https://mp.test/v1/account/release_report/r%201.csv');
  });

  it('401 no relatório ⇒ CollectionProviderError com httpStatus 401 (P2-4 vale para o job)', async () => {
    mockFetch(401, { message: 'unauthorized' });
    const err = await new MercadoPagoCollectionProvider('https://mp.test').listReleaseReports(account).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(CollectionProviderError);
    expect((err as CollectionProviderError).httpStatus).toBe(401);
  });
});
