/**
 * Onda 4 / 4.2c (lacuna 9f14) — política de rede do PSC ratificada pelo dono em 24/11/2026: o certificate-discovery tem
 * prazo EXPLÍCITO de 15 s (`timeoutMs` + `deadlineMs`, sem `signal` do chamador); o /oauth/token é POST sem chave (1
 * tentativa de 15 s, sem deadline: o `code` é de uso único). Sem rede: o `fetch` do serviço e o global são trocados.
 */
import { PscCredentialService } from '../PscCredentialService';
import { PSC_HTTP_TIMEOUT_MS } from '../../models/PscCredential.model';
import { OUTBOUND_POLICY } from '../../../../lib/outboundHttp';

const provider = { baseUrl: 'https://psc.test', clientId: 'cid' } as never;
const tokenOk = () => new Response(JSON.stringify({ access_token: 'a', expires_in: 60 }), { status: 200 });
const discoveryVazio = () => new Response(JSON.stringify({ certificates: [] }), { status: 200 });

function service(fetchFn: jest.Mock): PscCredentialService {
  return new PscCredentialService({} as never, {} as never, {} as never, {} as never, (async () => '') as never, { fetch: fetchFn });
}

describe('PscCredentialService — política de rede por ponto', () => {
  it('certificate-discovery: GET com a política pscDiscovery (15 s de timeout e de deadline), sem signal', async () => {
    const fetchFn = jest.fn(async () => discoveryVazio());
    await expect(service(fetchFn)['discoverCertificate'](provider, 'tok', '12345678000199')).rejects.toMatchObject({ statusCode: 422 });
    const [url, init, policy] = fetchFn.mock.calls[0] as unknown as [string, RequestInit, unknown];
    expect(url).toBe('https://psc.test/oauth/certificate-discovery');
    expect(init.method).toBe('GET');
    expect(init.signal).toBeUndefined();
    expect(policy).toBe(OUTBOUND_POLICY.pscDiscovery);
    expect(OUTBOUND_POLICY.pscDiscovery).toEqual({ timeoutMs: 15_000, deadlineMs: 15_000 });
  });

  it('/oauth/token: POST de 1 tentativa, timeout de 15 s e sem deadline nem retry', async () => {
    const fetchFn = jest.fn(async () => tokenOk());
    await service(fetchFn)['exchangeCode'](provider, 'secret', 'code', 'https://app/cb', 'verifier');
    const [url, init, policy] = fetchFn.mock.calls[0] as unknown as [string, RequestInit, { deadlineMs?: number; retry?: unknown; timeoutMs?: number }];
    expect(url).toBe('https://psc.test/oauth/token');
    expect(init.method).toBe('POST');
    expect(init.signal).toBeUndefined();
    expect(policy).toEqual({ timeoutMs: PSC_HTTP_TIMEOUT_MS });
  });

  describe('fetch padrão (sem injeção): o wrapper aplica a política', () => {
    afterEach(() => jest.restoreAllMocks());

    it('discovery: GET que dá 503 é re-tentado dentro dos 15 s; token (POST sem chave) dá 503 e NÃO é re-tentado', async () => {
      const spy = jest.spyOn(global, 'fetch').mockImplementation(async () => new Response('{}', { status: 503 }));
      const svc = new PscCredentialService({} as never, {} as never, {} as never, {} as never, (async () => '') as never);
      await expect(svc['discoverCertificate'](provider, 'tok', '12345678000199')).rejects.toMatchObject({ statusCode: 502 });
      expect(spy.mock.calls.length).toBeGreaterThan(1);
      spy.mockClear();
      await expect(svc['exchangeCode'](provider, 'secret', 'code', 'https://app/cb', 'verifier')).rejects.toMatchObject({ statusCode: 502 });
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
