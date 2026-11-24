/**
 * Onda 4 / 4.2 — timeout e retry do `outboundFetch`. Servidor HTTP local REAL (sem mock de `fetch`):
 * o que se prova é o que o servidor viu (nº de hits) e o que o chamador recebeu.
 *
 * Regra: só chamada idempotente (GET/HEAD, ou com chave de idempotência) é re-tentada, e só em falha transitória
 * (rede/timeout/5xx/429). POST sem chave nunca é re-tentado — reenviar às cegas duplicaria o efeito.
 */
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { outboundFetch } from '../outboundHttp';

type Handler = (req: http.IncomingMessage, res: http.ServerResponse, hit: number) => void;

describe('outboundFetch — timeout e retry (servidor HTTP real)', () => {
  let server: http.Server;
  let base: string;
  let hits: number;
  let handler: Handler;
  let out: jest.SpyInstance;
  const sockets = new Set<import('node:net').Socket>();
  const FAST = { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 5 };

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      hits += 1;
      handler(req, res, hits);
    });
    server.on('connection', (s) => {
      sockets.add(s);
      s.on('close', () => sockets.delete(s));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(async () => {
    for (const s of sockets) s.destroy();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  beforeEach(() => {
    hits = 0;
    out = jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => out.mockRestore());

  const status = (code: number): Handler => (_req, res) => {
    res.statusCode = code;
    res.end('x');
  };
  const eventLines = () => out.mock.calls.map((c) => JSON.parse(c[0] as string) as Record<string, unknown>);

  it('GET: 503, 503, 200 → devolve o 200 e o servidor viu 3 chamadas', async () => {
    handler = (_req, res, hit) => status(hit < 3 ? 503 : 200)(_req, res, hit);
    const res = await outboundFetch('bcb_ptax', `${base}/x`, undefined, { retry: FAST });
    expect(res.status).toBe(200);
    expect(hits).toBe(3);
    // o log de cada tentativa continua saindo (integration.call), warn nas falhas e info na que passou
    expect(eventLines().map((l) => [l.event, l.status])).toEqual([
      ['integration.call', 503], ['integration.call', 503], ['integration.call', 200],
    ]);
  });

  it('GET: 5xx persistente → para no teto e devolve a ÚLTIMA resposta (o chamador decide)', async () => {
    handler = status(502);
    const res = await outboundFetch('bcb_ptax', `${base}/x`, undefined, { retry: FAST });
    expect(res.status).toBe(502);
    expect(hits).toBe(3);
  });

  it('GET: 429 é transitório e é re-tentado', async () => {
    handler = (_req, res, hit) => status(hit < 2 ? 429 : 200)(_req, res, hit);
    const res = await outboundFetch('bcb_ptax', `${base}/x`, undefined, { retry: FAST });
    expect(res.status).toBe(200);
    expect(hits).toBe(2);
  });

  it('GET: 404 é permanente → 1 chamada só', async () => {
    handler = status(404);
    const res = await outboundFetch('bcb_ptax', `${base}/x`, undefined, { retry: FAST });
    expect(res.status).toBe(404);
    expect(hits).toBe(1);
  });

  it('POST sem chave de idempotência NUNCA é re-tentado, mesmo com 503', async () => {
    handler = status(503);
    const res = await outboundFetch('mercado_pago', `${base}/orders`, { method: 'POST', body: '{}' }, { retry: FAST });
    expect(res.status).toBe(503);
    expect(hits).toBe(1);
  });

  it('POST COM X-Idempotency-Key é re-tentado em 5xx e a chave segue igual', async () => {
    const keys: Array<string | undefined> = [];
    handler = (req, res, hit) => {
      keys.push(req.headers['x-idempotency-key'] as string | undefined);
      status(hit < 2 ? 500 : 201)(req, res, hit);
    };
    const res = await outboundFetch(
      'mercado_pago',
      `${base}/orders`,
      { method: 'POST', body: '{}', headers: { 'X-Idempotency-Key': 'k-1' } },
      { retry: FAST },
    );
    expect(res.status).toBe(201);
    expect(hits).toBe(2);
    expect(keys).toEqual(['k-1', 'k-1']);
  });

  it('timeout padrão: servidor que não responde → rejeita com TimeoutError (sem signal do chamador)', async () => {
    handler = () => {
      /* nunca responde */
    };
    await expect(outboundFetch('bcb_ptax', `${base}/x`, undefined, { timeoutMs: 80, retry: false })).rejects.toMatchObject({
      name: 'TimeoutError',
    });
    expect(hits).toBe(1);
    expect(eventLines()).toEqual([expect.objectContaining({ event: 'integration.failed', level: 'warn' })]);
  });

  it('timeout em GET é transitório: cada tentativa ganha um timeout novo (3 chamadas, depois rejeita)', async () => {
    handler = () => {
      /* nunca responde */
    };
    await expect(outboundFetch('bcb_ptax', `${base}/x`, undefined, { timeoutMs: 60, retry: FAST })).rejects.toMatchObject({
      name: 'TimeoutError',
    });
    expect(hits).toBe(3);
  });

  it('POST sem chave que estoura timeout NÃO é re-tentado', async () => {
    handler = () => {
      /* nunca responde */
    };
    await expect(
      outboundFetch('mercado_pago', `${base}/orders`, { method: 'POST', body: '{}' }, { timeoutMs: 60, retry: FAST }),
    ).rejects.toMatchObject({ name: 'TimeoutError' });
    expect(hits).toBe(1);
  });

  it('respeita o init.signal do chamador: abortado por ele → rejeita e não re-tenta', async () => {
    handler = () => {
      /* nunca responde */
    };
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 50);
    await expect(
      outboundFetch('bcb_ptax', `${base}/x`, { signal: controller.signal }, { timeoutMs: 10_000, retry: FAST }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(hits).toBe(1);
  });

  it('falha de rede em GET (porta fechada) é re-tentada até o teto e rejeita com o erro de rede', async () => {
    const closed = http.createServer();
    await new Promise<void>((resolve) => closed.listen(0, '127.0.0.1', resolve));
    const port = (closed.address() as AddressInfo).port;
    await new Promise<void>((resolve) => closed.close(() => resolve()));
    await expect(outboundFetch('bcb_ptax', `http://127.0.0.1:${port}/x`, undefined, { retry: FAST })).rejects.toThrow();
    expect(eventLines().filter((l) => l.event === 'integration.failed')).toHaveLength(3);
  });

  it('o log nunca carrega URL, cabeçalho ou corpo, nem com retry', async () => {
    handler = (_req, res, hit) => status(hit < 2 ? 503 : 200)(_req, res, hit);
    await outboundFetch('bcb_ptax', `${base}/segredo?token=abc`, { headers: { Authorization: 'Bearer tok-9' } }, { retry: FAST });
    const raw = out.mock.calls.map((c) => String(c[0])).join('\n');
    for (const leak of ['segredo', 'token=abc', 'tok-9', '127.0.0.1']) expect(raw).not.toContain(leak);
  });
});
