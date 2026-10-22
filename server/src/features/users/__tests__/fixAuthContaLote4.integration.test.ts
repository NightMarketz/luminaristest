/**
 * FIX-AUTH-CONTA — testes-guarda (sessao-instrumentacao, lote 4). Achados de
 * `docs/operating-manual/ACHADOS-2026-10-19-DYNAMICTABLE-E-MODULOS-ANTIGOS.md` §3.4, com o
 * comportamento esperado decidido pelo dono em `docs/plano/decisoes/D-2026-10-22-FIX-AUTH-CHAT-DASHBOARD.md`.
 * Cada caso afirma o comportamento decidido e FALHA hoje pelo motivo do achado.
 *
 * Run via `npm run test:integration`.
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { pushTestSchema, resetDb, disconnectDb, seedUser, seedDashboardLayout, makeApp, authHeader } from '@test/helpers';

const app = makeApp();
const DAY = 24 * 60 * 60;

beforeAll(() => {
  pushTestSchema();
}, 120000);

afterEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDb();
});

function lifetimeSeconds(token: string): number {
  const { iat, exp } = jwt.decode(token) as { iat: number; exp: number };
  return exp - iat;
}

describe('§3.4 #16 — "Lembrar-me 30 dias" × JWT de 7 dias', () => {
  async function loginAs(rememberMe?: boolean) {
    await seedUser({ username: 'remember', password: await bcrypt.hash('Passw0rd!', 4) });
    const body = rememberMe === undefined
      ? { identifier: 'remember', password: 'Passw0rd!' }
      : { identifier: 'remember', password: 'Passw0rd!', rememberMe };
    return request(app).post('/api/auth/login').send(body);
  }

  it('login com rememberMe=true emite JWT de 30 dias', async () => {
    const res = await loginAs(true);
    expect(res.status).toBe(200);
    expect(lifetimeSeconds(res.body.data.token)).toBe(30 * DAY);
  });

  it('controle: login sem rememberMe segue com JWT de 7 dias', async () => {
    const res = await loginAs();
    expect(res.status).toBe(200);
    expect(lifetimeSeconds(res.body.data.token)).toBe(7 * DAY);
  });
});

describe('§3.4 #17 — /register e POST /users sem rate limit específico', () => {
  // Corpo inválido (400) para não pagar bcrypt nem depender de unicidade: o limiter conta a tentativa.
  async function burst(path: string, n = 15): Promise<number[]> {
    const statuses: number[] = [];
    for (let i = 0; i < n; i += 1) {
      statuses.push((await request(app).post(path).send({})).status);
    }
    return statuses;
  }

  it('POST /api/auth/register em rajada responde 429', async () => {
    expect(await burst('/api/auth/register')).toContain(429);
  });

  it('POST /api/users em rajada responde 429', async () => {
    expect(await burst('/api/users')).toContain(429);
  });
});

describe('§3.4 #18 — trust proxy nunca definido', () => {
  it("app.get('trust proxy') === 1 (um proxy na frente)", () => {
    expect(app.get('trust proxy')).toBe(1);
  });
});

describe('§3.4 #13 — rota sem consumidor POST /reports/generate-chart-data', () => {
  it('a rota não existe mais (404)', async () => {
    const u = await seedUser({ username: 'rep' });
    const res = await request(app)
      .post('/api/reports/generate-chart-data')
      .set(authHeader({ id: u.id, username: u.username }))
      .send({});
    expect(res.status).toBe(404);
  });
});

describe('§3.4 #14 — rota sem consumidor GET /dashboard-layout/:id', () => {
  it('a rota não existe mais: o próprio layout dá 404', async () => {
    const u = await seedUser({ username: 'lay' });
    const l = await seedDashboardLayout({ userId: u.id });
    const res = await request(app)
      .get(`/api/dashboard-layout/${l.id}`)
      .set(authHeader({ id: u.id, username: u.username }));
    expect(res.status).toBe(404);
  });
});
