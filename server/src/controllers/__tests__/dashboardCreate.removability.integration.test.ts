/**
 * BE-INCR-WIZARD-REMOVABILITY (nó W2) — contrato HTTP dos itens 7, 8 e 9 do BRIEF
 * (`docs/accounting/BE-INCR-WIZARD-REMOVABILITY-brief.md`; F-W2-1 dinâmica, F-W2-2 travar, F-W2-3 no create).
 * Cada create precisa de um usuário novo (a guarda one-shot responde 403 a quem já tem tabelas).
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();
let n = 0;
const novoUsuario = () => {
  n += 1;
  return prisma.user
    .create({ data: { name: `w2-${n}`, username: `w2-user-${n}`, email: `w2-${n}@test.local`, password: 'x', role: 'USER' } })
    .then((u) => ({ id: u.id, username: u.username, role: u.role }));
};
const criarSalao = (who: { id: string; username: string; role?: string }, removedTables: string[]) =>
  request(app)
    .post('/api/dashboard/create')
    .set(authHeader(who as never))
    .send({ mode: 'custom', presetKey: 'beautySalon', removedTables, unit: { name: 'Matriz' } });
const tabelasDe = async (userId: string) =>
  (await prisma.dynamicTable.findMany({ where: { userId }, select: { internalName: true } })).map((t) => t.internalName);

describe('W2 — o create custom aplica a regra de trava', () => {
  beforeAll(() => {
    pushTestSchema();
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Item 9: antes do W2 o create descartava `meta` (E6), então `sales.meta.requiresTables` nunca rodava e este
  // payload dava 201 com uma `sales` sem itens (E7).
  it('item 9: salão − saleItems mantendo sales → 400 TABLE_LOCKED, nada instalado', async () => {
    const u = await novoUsuario();
    const r = await criarSalao(u, ['saleItems']);
    expect({ status: r.status, details: r.body.details }).toMatchObject({
      status: 400,
      details: { reason: 'TABLE_LOCKED', table: 'saleItems' },
    });
    expect(await prisma.dynamicTable.count({ where: { userId: u.id } })).toBe(0);
  });

  it('item 7: salão − products sozinho → 400 REQUIRED_RELATION nomeando productUnits e stockMovements', async () => {
    const u = await novoUsuario();
    const r = await criarSalao(u, ['products']);
    expect({ status: r.status, details: r.body.details }).toMatchObject({
      status: 400,
      details: {
        reason: 'TABLE_LOCKED',
        table: 'products',
        lock: { reason: 'REQUIRED_RELATION', by: ['productUnits', 'stockMovements'] },
      },
    });
    expect(await prisma.dynamicTable.count({ where: { userId: u.id } })).toBe(0);
  });

  it('item 7: salão − tabela lida pela contabilidade (sales) → 400 ACCOUNTING', async () => {
    const u = await novoUsuario();
    const r = await criarSalao(u, ['sales']);
    expect({ status: r.status, details: r.body.details }).toMatchObject({
      status: 400,
      details: { reason: 'TABLE_LOCKED', table: 'sales', lock: { reason: 'ACCOUNTING' } },
    });
  });

  it('item 7: dependentes e alvo juntos (stockMovements, productUnits, products) → 201 sem as três', async () => {
    const u = await novoUsuario();
    const r = await criarSalao(u, ['stockMovements', 'productUnits', 'products']);
    expect(r.status).toBe(201);
    const t = await tabelasDe(u.id);
    for (const x of ['stockMovements', 'productUnits', 'products']) expect(t).not.toContain(x);
    expect(t).toContain('sales');
  });

  it('item 8 (não-regressão): tabela do Core em removedTables segue ignorada → 201 com units instalada', async () => {
    const u = await novoUsuario();
    const r = await criarSalao(u, ['units']);
    expect(r.status).toBe(201);
    expect(await tabelasDe(u.id)).toContain('units');
  });
});
