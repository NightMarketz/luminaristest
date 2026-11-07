/**
 * FIX-AUTH-CONTA §3.4 #20 — teste-guarda (sessao-instrumentacao). Decisão do dono, questionário de 06/11
 * (`docs/plano/decisoes/D-2026-11-06-PARADOS-NO-DONO.md` §2, contra a recomendação): o middleware injeta o
 * `createdAt`/`updatedAt` real do `User`, e o `UserContext` deixa de cair em `new Date()`.
 *
 * Pilha real: usuário no banco de teste com datas antigas, JWT assinado, `authMiddleware` de verdade e
 * `getUserContextFromRequest` no handler. Run via `npm run test:integration`.
 */
import express from 'express';
import request from 'supertest';
import prisma from '@/lib/prisma';
import { authMiddleware } from '@/middleware/auth';
import { getUserContextFromRequest } from '@/lib/authUtils';
import { pushTestSchema, resetDb, disconnectDb, seedUser, authHeader } from '@test/helpers';

const app = express();
app.use(authMiddleware);
app.get('/api/__ctx', (req, res) => {
  const ctx = getUserContextFromRequest(req);
  res.json({ createdAt: ctx?.createdAt.toISOString(), updatedAt: ctx?.updatedAt.toISOString() });
});

beforeAll(() => {
  pushTestSchema();
}, 120000);
afterEach(async () => {
  await resetDb();
});
afterAll(async () => {
  await disconnectDb();
});

describe('§3.4 #20 — UserContext carrega as datas do User no banco', () => {
  it('createdAt e updatedAt do contexto são os do banco, não o instante do request', async () => {
    const user = await seedUser({ username: 'datas' });
    const createdAt = new Date('2025-03-04T05:06:07.000Z');
    const updatedAt = new Date('2025-08-09T10:11:12.000Z');
    // updatedAt é @updatedAt: o update grava o valor dado explicitamente.
    await prisma.user.update({ where: { id: user.id }, data: { createdAt, updatedAt } });

    const res = await request(app).get('/api/__ctx').set(authHeader({ id: user.id, username: user.username }));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ createdAt: createdAt.toISOString(), updatedAt: updatedAt.toISOString() });
  });
});
