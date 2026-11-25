/**
 * Onda 4 / 4.2b (lacunas 1f43/9f14) — política de rede POR PONTO de chamada do Mercado Pago, ratificada pelo dono em
 * 24/11/2026 (tabela §6 da proposta de `deadlineMs`): o adaptador passa `{timeoutMs, retry, deadlineMs}` certos a cada
 * operação, e o mesmo `getCharge` tem política diferente no webhook e no job. Nenhuma chamada real: `fetch` trocado.
 */
import { MercadoPagoCollectionProvider } from '../MercadoPagoCollectionProvider';
import type { ResolvedAccount } from '../CollectionProviderPort';
import * as outbound from '../../../../lib/outboundHttp';

jest.mock('../../../../lib/outboundHttp', () => {
  const actual = jest.requireActual('../../../../lib/outboundHttp') as typeof import('../../../../lib/outboundHttp');
  return { ...actual, outboundFetch: jest.fn(actual.outboundFetch) };
});

const account: ResolvedAccount = { id: 'pa1', credentialSource: 'OWN', credential: { accessToken: 'tok', webhookSecret: 'x' } };
const ORDER = { id: 'ORD1', status: 'action_required', status_detail: 'waiting_payment' };
const mp = new MercadoPagoCollectionProvider('https://mp.test');
const outboundFetchMock = outbound.outboundFetch as jest.MockedFunction<typeof outbound.outboundFetch>;
const optionsOfLastCall = () => outboundFetchMock.mock.calls[outboundFetchMock.mock.calls.length - 1][3];

const createInput = {
  kind: 'PIX' as const, amountCents: 5000n, externalReference: 'ext1', description: 'd', idempotencyKey: 'ch1:1', expiresIn: 'PT1440M',
  payer: { firstName: 'A', lastName: 'B', email: 'a@b.c', identification: { type: 'CPF' as const, number: '99999999999' } },
};

describe('tabela OUTBOUND_POLICY (valores ratificados 24/11/2026)', () => {
  it('cada ponto com retry é o par {maxAttempts:2, deadlineMs}; webhook e POST de relatório não têm deadline', () => {
    const P = outbound.OUTBOUND_POLICY;
    expect(P.mpOrderCreate).toEqual({ timeoutMs: 15_000, retry: { maxAttempts: 2 }, deadlineMs: 35_000 });
    expect(P.mpOrderCancel).toEqual({ timeoutMs: 15_000, retry: { maxAttempts: 2 }, deadlineMs: 35_000 });
    expect(P.mpGetChargeJob).toEqual({ timeoutMs: 15_000, retry: { maxAttempts: 2 }, deadlineMs: 35_000 });
    expect(P.mpGetChargeWebhook).toEqual({ timeoutMs: 15_000, retry: false });
    expect(P.mpReportGet).toEqual({ timeoutMs: 60_000, retry: { maxAttempts: 2 }, deadlineMs: 125_000 });
    expect(P.mpReportPost).toEqual({ timeoutMs: 60_000 });
    expect(P.bcbPtax).toEqual({ timeoutMs: 10_000, retry: { maxAttempts: 2 }, deadlineMs: 25_000 });
    expect(P.pscDiscovery).toEqual({ timeoutMs: 15_000, retry: { maxAttempts: 2 }, deadlineMs: 15_000 });
  });

  it('o deadline de um ponto com 2 tentativas comporta 2 × timeout + a espera máxima (Retry-After 4 s + 1 s)', () => {
    for (const p of [outbound.OUTBOUND_POLICY.mpOrderCreate, outbound.OUTBOUND_POLICY.mpReportGet, outbound.OUTBOUND_POLICY.bcbPtax]) {
      expect(p.deadlineMs).toBeGreaterThanOrEqual(2 * p.timeoutMs + 5_000);
    }
  });
});

describe('MercadoPagoCollectionProvider — política de rede por operação', () => {
  beforeEach(() => outboundFetchMock.mockClear());
  afterEach(() => jest.restoreAllMocks());

  it('criar e cancelar: 2 tentativas + 35 s; getCharge do job: o mesmo; getCharge do webhook: 1 tentativa, sem deadline', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(async () => new Response(JSON.stringify(ORDER), { status: 200 }));
    await mp.createCharge(account, createInput);
    expect(optionsOfLastCall()).toBe(outbound.OUTBOUND_POLICY.mpOrderCreate);
    await mp.cancelCharge(account, 'ORD1', 'ch1:cancel');
    expect(optionsOfLastCall()).toBe(outbound.OUTBOUND_POLICY.mpOrderCancel);
    await mp.getCharge(account, 'ORD1');
    expect(optionsOfLastCall()).toBe(outbound.OUTBOUND_POLICY.mpGetChargeJob);
    await mp.getCharge(account, 'ORD1', 'job');
    expect(optionsOfLastCall()).toBe(outbound.OUTBOUND_POLICY.mpGetChargeJob);
    await mp.getCharge(account, 'ORD1', 'webhook');
    expect(optionsOfLastCall()).toBe(outbound.OUTBOUND_POLICY.mpGetChargeWebhook);
    expect(optionsOfLastCall()?.deadlineMs).toBeUndefined();
  });

  it('relatório: GET com 2 tentativas + 125 s; POST sem retry nem deadline', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(async () => new Response('[]', { status: 200 }));
    await mp.listReleaseReports(account);
    expect(optionsOfLastCall()).toBe(outbound.OUTBOUND_POLICY.mpReportGet);
    await mp.downloadReleaseReport(account, 'r.csv');
    expect(optionsOfLastCall()).toBe(outbound.OUTBOUND_POLICY.mpReportGet);
    await mp.requestReleaseReport(account, { fromUtc: '2026-10-07T03:00:00.000Z', toUtc: '2026-10-10T03:00:00.000Z' });
    expect(optionsOfLastCall()).toBe(outbound.OUTBOUND_POLICY.mpReportPost);
  });

  it('efeito real: 5xx persistente ⇒ criar faz exatamente 2 tentativas (não 3); getCharge do webhook faz 1; do job faz 2', async () => {
    const spy = jest.spyOn(global, 'fetch').mockImplementation(async () => new Response('{}', { status: 503 }));
    await expect(mp.createCharge(account, createInput)).rejects.toMatchObject({ httpStatus: 503 });
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockClear();
    await expect(mp.getCharge(account, 'ORD1', 'webhook')).rejects.toMatchObject({ httpStatus: 503 });
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockClear();
    await expect(mp.getCharge(account, 'ORD1', 'job')).rejects.toMatchObject({ httpStatus: 503 });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('POST de relatório (sem chave) nunca é re-tentado; GET de relatório é, até 2 vezes', async () => {
    const spy = jest.spyOn(global, 'fetch').mockImplementation(async () => new Response('{}', { status: 503 }));
    await expect(mp.requestReleaseReport(account, { fromUtc: 'a', toUtc: 'b' })).rejects.toMatchObject({ httpStatus: 503 });
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockClear();
    await expect(mp.listReleaseReports(account)).rejects.toMatchObject({ httpStatus: 503 });
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
