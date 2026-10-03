/**
 * BE-INCR-SEED-UNIDADE-E-ENV item 5 (resposta do dono ao fork de ordem, 2026-10-03: `assertCanProvision` no serviço) —
 * a guarda one-shot (403) continua vindo ANTES de qualquer montagem de preset: quem já tem tabelas e manda um corpo que
 * falharia na montagem (suíte/preset desconhecido) recebe 403, não 404/400 — e o HTTP segue o de antes da extração.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();
const criar = (who: { id: string; username: string }, body: Record<string, unknown>) =>
  request(app).post('/api/dashboard/create').set(authHeader(who)).send(body);

describe('POST /dashboard/create — o 403 one-shot vence a montagem do preset', () => {
  beforeAll(() => {
    pushTestSchema();
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('usuário que já tem tabelas + suíte desconhecida (Rápido) ou presetKey desconhecido (Controle Total) → 403 com o corpo de sempre', async () => {
    const u = await prisma.user
      .create({ data: { name: 'guard-order', username: 'guard-order-user', email: 'guard-order@test.local', password: 'x', role: 'USER' } })
      .then((x) => ({ id: x.id, username: x.username }));
    expect((await criar(u, { suiteKey: 'beautySalon', unit: { name: 'A' } })).status).toBe(201);

    const rapido = await criar(u, { suiteKey: 'nao-existe', unit: { name: 'B' } });
    expect(rapido.status).toBe(403);
    expect(rapido.body).toEqual({ success: false, error: 'Forbidden', message: 'Setup já foi concluído. Este usuário já possui tabelas.' });

    const custom = await criar(u, { mode: 'custom', presetKey: 'nao-existe', unit: { name: 'C' } });
    expect(custom.status).toBe(403);
    expect(custom.body).toEqual(rapido.body);
  });

  it('usuário SEM tabelas + suíte desconhecida → 404 com o corpo de sempre (`{ error }`)', async () => {
    const u = await prisma.user
      .create({ data: { name: 'guard-order-2', username: 'guard-order-user-2', email: 'guard-order-2@test.local', password: 'x', role: 'USER' } })
      .then((x) => ({ id: x.id, username: x.username }));
    const r = await criar(u, { suiteKey: 'nao-existe', unit: { name: 'B' } });
    expect(r.status).toBe(404);
    expect(r.body).toEqual({ error: "Preset com chave 'nao-existe' não encontrado." });
    expect(await prisma.dynamicTable.count({ where: { userId: u.id } })).toBe(0);
  });
});
