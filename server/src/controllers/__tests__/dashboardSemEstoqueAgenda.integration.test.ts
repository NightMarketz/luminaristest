/**
 * BE-INCR-MODULOS-BASE-SUBMODULOS — PR-3, itens 17, 18 e 20 (docs/accounting/BE-INCR-MODULOS-BASE-SUBMODULOS-brief.md §2).
 *
 * Caminho real (o mesmo do browser): `POST /api/dashboard/create` em Controle Total removendo a categoria inteira →
 * linhas pelas rotas de `dynamic-tables`.
 *  - item 17: salão sem ESTOQUE (`removedTables: ['productUnits','stockMovements']`) instala sem as duas, `saleItems`
 *    segue com `productId` (variante pelos catálogos, item 12 — o Controle Total leva `meta` ao instalador desde o
 *    PR-2, `bbcf2e25`) e a venda de produto finaliza.
 *  - item 18 (F-MS-4): instalar VEN-PROD sem EST-0 (PES-0 + VEN-0 + VEN-PROD pelo `installPresetAsSystem`, que lê a
 *    `meta` dos catálogos); `products.deleteConstraints` aponta para `productUnits`/`stockMovements` ausentes. Pela
 *    leitura (E8) a constraint só é consultada se alguma tabela tem relação para `products`; apagar produto sem venda
 *    passa e com venda é recusado pela RESTRICT de `saleItems`. Verde aqui = F-MS-4 (a) não se aplica.
 *  - item 20: a guarda `assertNoOpenStock` (subrazão Prisma, `dynamicTablesController`) vale sem a tabela DT.
 * Cada create precisa de um usuário novo (a guarda one-shot responde 403 a quem já tem tabelas).
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { getFactory } from '@/lib/factory';
import { CoreSystemPreset } from '@/features/dynamicTables/presets';
import { composeModuleTables } from '@/features/dynamicTables/presets/modules/registry';
import { resolveModuleSelection } from '@/features/dynamicTables/presets/modules/moduleSelection';

const app = makeApp();
type Actor = { id: string; username: string };
let n = 0;
const novoUsuario = async (): Promise<Actor> => {
  n += 1;
  const u = await prisma.user.create({
    data: { name: `pr3-${n}`, username: `pr3-user-${n}`, email: `pr3-${n}@test.local`, password: 'x', role: 'USER' },
  });
  return { id: u.id, username: u.username };
};
const criar = (who: Actor, body: Record<string, unknown>) =>
  request(app).post('/api/dashboard/create').set(authHeader(who as never)).send(body);
const tabelasDe = async (userId: string) =>
  (await prisma.dynamicTable.findMany({ where: { userId }, select: { internalName: true } })).map((t) => t.internalName);
const idDe = async (userId: string, internalName: string) =>
  (await prisma.dynamicTable.findFirstOrThrow({ where: { userId, internalName } })).id;
const campos = async (userId: string, internalName: string) => {
  const t = await prisma.dynamicTable.findFirstOrThrow({ where: { userId, internalName } });
  return ((t.schema as { fields: { name: string }[] }).fields ?? []).map((f) => f.name);
};

const SEM_ESTOQUE = { mode: 'custom', presetKey: 'beautySalon', removedTables: ['productUnits', 'stockMovements'], unit: { name: 'Matriz' } };

/** Tenant do salão sem ESTOQUE, com os ids das tabelas usadas. */
async function salaoSemEstoque() {
  const user = await novoUsuario();
  const r = await criar(user, SEM_ESTOQUE);
  expect({ status: r.status, body: r.status === 201 ? undefined : r.body }).toEqual({ status: 201, body: undefined });
  const ids = { products: await idDe(user.id, 'products'), sales: await idDe(user.id, 'sales'), saleItems: await idDe(user.id, 'saleItems') };
  const post = (tableId: string, data: Record<string, unknown>) =>
    request(app).post(`/api/dynamic-tables/${tableId}/data`).set(authHeader(user)).send({ data });
  const put = (tableId: string, dataId: string, data: Record<string, unknown>) =>
    request(app).put(`/api/dynamic-tables/${tableId}/data/${dataId}`).set(authHeader(user)).send({ data });
  const del = (tableId: string, dataId: string) =>
    request(app).delete(`/api/dynamic-tables/${tableId}/data/${dataId}`).set(authHeader(user));
  return { user, unitId: r.body.data.unitId as string, modules: r.body.data.modules, ids, post, put, del };
}

describe('PR-3 — salão sem ESTOQUE / sem AGENDA', () => {
  beforeAll(() => {
    pushTestSchema();
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('item 17: salão sem ESTOQUE instala sem productUnits/stockMovements e vende produto', async () => {
    const t = await salaoSemEstoque();
    const instaladas = await tabelasDe(t.user.id);
    expect(instaladas).not.toContain('productUnits');
    expect(instaladas).not.toContain('stockMovements');
    expect(instaladas).toEqual(expect.arrayContaining(['products', 'sales', 'saleItems', 'appointments']));
    expect(t.modules.installed).not.toContain('EST-0');
    expect(t.modules.installed).toEqual(expect.arrayContaining(['VEN-PROD', 'AGE-0']));
    // item 12: com Produtos, Serviços e Pacotes a variante é a mista — o item aponta produto mesmo sem ESTOQUE.
    expect(await campos(t.user.id, 'saleItems')).toEqual(expect.arrayContaining(['productId', 'serviceId', 'packageId']));

    const produto = await t.post(t.ids.products, { name: 'Shampoo 300ml', usageType: 'Sale' });
    expect(produto.status).toBe(201);
    const venda = await t.post(t.ids.sales, { unitId: t.unitId, date: '2026-10-31', status: 'Draft', simpleCustomer: true, simpleCustomerName: 'Ana Souza' });
    expect(venda.status).toBe(201);
    const item = await t.post(t.ids.saleItems, {
      saleId: venda.body.data.id, type: 'Product', productId: produto.body.data.id, description: 'Shampoo', quantity: 2, unitPrice: 50,
    });
    expect({ status: item.status, body: item.status === 201 ? undefined : item.body }).toEqual({ status: 201, body: undefined });
    const fin = await t.put(t.ids.sales, venda.body.data.id, { status: 'Finalized' });
    expect({ status: fin.status, body: fin.status === 200 ? undefined : fin.body }).toEqual({ status: 200, body: undefined });
    expect(fin.body.data.data.status).toBe('Finalized');
  });

  it('item 18 (F-MS-4): VEN-PROD sem EST-0 — vende produto; apagar produto sem venda passa; com venda é recusado', async () => {
    const user = await novoUsuario();
    const dts = getFactory().getDynamicTableService();
    const modulos = resolveModuleSelection(['VEN-PROD']);
    expect(modulos).toEqual(['PES-0', 'VEN-0', 'VEN-PROD']);
    await dts.installPresetAsSystem(user.id, { tables: { ...CoreSystemPreset.tables, ...composeModuleTables(modulos) } });
    const instaladas = await tabelasDe(user.id);
    expect(instaladas).not.toContain('productUnits');
    expect(instaladas).not.toContain('stockMovements');
    // item 12: só Produtos → variante só-produtos, com `productId`.
    expect(await campos(user.id, 'saleItems')).toContain('productId');

    const ids = { units: await idDe(user.id, 'units'), products: await idDe(user.id, 'products'), sales: await idDe(user.id, 'sales'), saleItems: await idDe(user.id, 'saleItems') };
    const post = (tableId: string, data: Record<string, unknown>) =>
      request(app).post(`/api/dynamic-tables/${tableId}/data`).set(authHeader(user)).send({ data });
    const del = (tableId: string, dataId: string) =>
      request(app).delete(`/api/dynamic-tables/${tableId}/data/${dataId}`).set(authHeader(user));
    const unidade = await post(ids.units, { name: 'Matriz' });
    expect(unidade.status).toBe(201);

    const livre = await post(ids.products, { name: 'Condicionador', usageType: 'Sale' });
    expect(livre.status).toBe(201);
    expect((await del(ids.products, livre.body.data.id)).status).toBe(204);

    const vendido = await post(ids.products, { name: 'Máscara', usageType: 'Sale' });
    const venda = await post(ids.sales, { unitId: unidade.body.data.id, date: '2026-10-31', status: 'Draft', simpleCustomer: true, simpleCustomerName: 'Bia' });
    expect(venda.status).toBe(201);
    const item = await post(ids.saleItems, {
      saleId: venda.body.data.id, type: 'Product', productId: vendido.body.data.id, description: 'Máscara', quantity: 1, unitPrice: 30,
    });
    expect({ status: item.status, body: item.status === 201 ? undefined : item.body }).toEqual({ status: 201, body: undefined });
    const fin = await request(app).put(`/api/dynamic-tables/${ids.sales}/data/${venda.body.data.id}`).set(authHeader(user)).send({ data: { status: 'Finalized' } });
    expect({ status: fin.status, body: fin.status === 200 ? undefined : fin.body }).toEqual({ status: 200, body: undefined });

    const recusa = await del(ids.products, vendido.body.data.id);
    expect(recusa.status).toBe(400);
    expect(JSON.stringify(recusa.body)).toContain('linked to active sales transactions');
    const linha = await prisma.dynamicTableData.findUniqueOrThrow({ where: { id: vendido.body.data.id } });
    expect(linha.deletedAt).toBeNull();
  });

  it('item 20: sem ESTOQUE, produto com saldo no subrazão Prisma (InventoryItem) segue sem poder ser apagado', async () => {
    const t = await salaoSemEstoque();
    const produto = await t.post(t.ids.products, { name: 'Esmalte', usageType: 'Sale' });
    await prisma.inventoryItem.create({
      data: { userId: t.user.id, unitId: t.unitId, productRef: produto.body.data.id, qtyOnHand: 3, totalValueCents: 3000n },
    });
    const r = await t.del(t.ids.products, produto.body.data.id);
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.body)).toContain('estoque em aberto no subrazão');
    const linha = await prisma.dynamicTableData.findUniqueOrThrow({ where: { id: produto.body.data.id } });
    expect(linha.deletedAt).toBeNull();
  });

  it('F-MB-4: ESTOQUE é um bloco — remover só stockMovements → 400 FIXED_MODULE_PARTIAL, nada instalado', async () => {
    const u = await novoUsuario();
    const r = await criar(u, { ...SEM_ESTOQUE, removedTables: ['stockMovements'] });
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.body)).toContain('FIXED_MODULE_PARTIAL');
    expect(await tabelasDe(u.id)).toEqual([]);
  });

  it('sem AGENDA: remover appointments instala sem a tabela e sem saleItems.appointmentId (relação opcional, E5)', async () => {
    const u = await novoUsuario();
    const r = await criar(u, { ...SEM_ESTOQUE, removedTables: ['appointments'] });
    expect(r.status).toBe(201);
    expect(r.body.data.modules.installed).not.toContain('AGE-0');
    expect(await tabelasDe(u.id)).not.toContain('appointments');
    expect(await campos(u.id, 'saleItems')).not.toContain('appointmentId');
  });
});
