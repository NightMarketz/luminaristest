/**
 * BRD F-02.1 (GAP-MAP, faixa 1 de 2026-11-10; ficha BRD-02 do inventário de estruturas implícitas).
 *
 * O corpo de toda requisição passa pelo `json()` do Express (`app.ts`), e o erro dele vai ao handler
 * global, que delega a `handleApiError`. JSON malformado e corpo acima do limite são erro do CLIENTE
 * (o body-parser os marca 400 e 413), mas `handleApiError` não os reconhecia e respondia 500
 * INTERNAL_SERVER_ERROR, logando como defeito.
 *
 * O teste monta o mesmo par do `app.ts` (`json()` + handler global → `handleApiError`) com o
 * body-parser real, para que o erro seja o que a biblioteca produz, não um duplo.
 */
import express, { json } from 'express';
import request from 'supertest';
import { handleApiError } from '../apiUtils';

function appLikeProduction() {
  const app = express();
  app.use(json());
  app.post('/echo', (req, res) => {
    res.json({ ok: true, body: req.body });
  });
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    handleApiError(error, res);
  });
  return app;
}

describe('BRD F-02.1 — erro do body-parser é erro do cliente, não 500', () => {
  it('BRD F-02.1: JSON malformado responde 400, não 500', async () => {
    const res = await request(appLikeProduction())
      .post('/echo')
      .set('Content-Type', 'application/json')
      .send('{"a": ');
    expect(res.body.code).not.toBe('INTERNAL_SERVER_ERROR');
    expect(res.status).toBe(400);
  });

  it('BRD F-02.1: corpo acima do limite responde 413, não 500', async () => {
    const big = JSON.stringify({ a: 'x'.repeat(200 * 1024) });
    const res = await request(appLikeProduction())
      .post('/echo')
      .set('Content-Type', 'application/json')
      .send(big);
    expect(res.body.code).not.toBe('INTERNAL_SERVER_ERROR');
    expect(res.status).toBe(413);
  });
});
