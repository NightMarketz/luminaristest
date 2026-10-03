/**
 * BE-INCR-ITEM-DESTINATION PR-2 — default de destinação por produto com Prisma real (BRIEF itens 16, 17, 18, 9 origem
 * PRODUTO e 19). Mesma nota do PR-1 (`purchase-pis-cofins.SYNTHETIC.xml`, regime REAL contribuinte + NAO_CUMULATIVO):
 * os itens 2 e 3 vêm como INSUMO_SERVICO pelo DEFAULT do produto (mapeamento sem `destination`), o item 1 por
 * override REVENDA — o lançamento tem de ser o MESMO do PR-1 (1.1.6 7961 · insumo 8788 · C 2.1.2 19333).
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { ProductDestinationDefaultRepository } from '../../features/accounting/repositories/ProductDestinationDefaultRepository';
import type { AccountingScope } from '../../features/accounting/scope/AccountingScope';

const app = makeApp();
const XML = readFileSync(join(__dirname, '../../lib/__tests__/fixtures/nfe/purchase-pis-cofins.SYNTHETIC.xml'));
const UNIT = 'unit-prod-dest';
const BASE = '/api/accounting/product-destinations';

let dono: { id: string; username: string };
let outro: { id: string; username: string };
let refs: string[] = [];
let refOutroTenant = '';
const accounts: Record<string, string> = {};

const criarConta = async (code: string, name: string, nature: string) => {
  accounts[code] = (await prisma.account.create({ data: { userId: dono.id, unitId: UNIT, code, name, nature, acceptsEntries: true } })).id;
};
const put = (body: Record<string, unknown>) => request(app).put(BASE).set(authHeader(dono)).send({ unitId: UNIT, ...body });
const list = () => request(app).get(BASE).set(authHeader(dono)).query({ unitId: UNIT });
const del = (productRef: string) => request(app).delete(`${BASE}/${productRef}`).set(authHeader(dono)).query({ unitId: UNIT });
const events = (eventType: string) => prisma.auditEvent.findMany({ where: { unitId: UNIT, eventType }, orderBy: { seq: 'asc' } });

const criarProdutos = async (userId: string, names: string[]) => {
  const t = await prisma.dynamicTable.create({
    data: { userId, name: 'Products', internalName: 'products', category: 'products', schema: { fields: [{ name: 'name', label: 'Name', type: 'string', required: true }] } },
  });
  const ids: string[] = [];
  for (const name of names) ids.push((await prisma.dynamicTableData.create({ data: { dynamicTableId: t.id, data: { name } } })).id);
  return ids;
};

describe('ITEM-DESTINATION PR-2 — default por produto (Prisma real)', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'pd', username: 'prod-dest-dono', email: 'prod-dest@test.local', password: 'x', role: 'USER' } });
    outro = await prisma.user.create({ data: { name: 'pd2', username: 'prod-dest-outro', email: 'prod-dest2@test.local', password: 'x', role: 'USER' } });
    refs = await criarProdutos(dono.id, ['Shampoo', 'Condicionador', 'Máscara']);
    [refOutroTenant] = await criarProdutos(outro.id, ['Alheio']);
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('item 16 — repositório: upsert, delete, upsert de novo = 1 linha viva (o upsert revive, sem P2002)', async () => {
    const repo = new ProductDestinationDefaultRepository();
    const scope = { ownerUserId: dono.id, unitId: 'unit-repo', actorUserId: dono.id } as unknown as AccountingScope;
    await repo.upsert(scope, 'p-repo', 'REVENDA');
    expect(await repo.softDelete(scope, 'p-repo')).toBe(1);
    expect(await repo.findManyByProductRefs(scope, ['p-repo'])).toEqual([]);
    expect(await repo.softDelete(scope, 'p-repo')).toBe(0);
    const revived = await repo.upsert(scope, 'p-repo', 'INSUMO_SERVICO');
    const rows = await prisma.productDestinationDefault.findMany({ where: { userId: dono.id, unitId: 'unit-repo' } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: revived.id, destination: 'INSUMO_SERVICO', deletedAt: null });
    expect((await repo.list(scope)).map((r) => r.productRef)).toEqual(['p-repo']);
  });

  it('item 18 — PUT: 400 para IMOBILIZADO (EMENDA item 25), produto inexistente e produto de OUTRO tenant; nada gravado', async () => {
    expect((await put({ productRef: refs[1], destination: 'IMOBILIZADO' })).status).toBe(400);
    expect((await put({ productRef: 'nao-existe', destination: 'REVENDA' })).status).toBe(400);
    expect((await put({ productRef: refOutroTenant, destination: 'REVENDA' })).status).toBe(400);
    expect(await prisma.productDestinationDefault.count({ where: { unitId: UNIT } })).toBe(0);
    expect(await events('product_destination.set')).toHaveLength(0);
  });

  it('item 17/18 — PUT grava e emite product_destination.set; GET lista; o PUT é idempotente por produto', async () => {
    const r1 = await put({ productRef: refs[1], destination: 'REVENDA' });
    expect(r1.status).toBe(200);
    expect(r1.body.data).toMatchObject({ productRef: refs[1], destination: 'REVENDA' });
    expect((await put({ productRef: refs[1], destination: 'INSUMO_SERVICO' })).status).toBe(200);
    expect((await put({ productRef: refs[2], destination: 'INSUMO_SERVICO' })).status).toBe(200);
    const res = await list();
    expect(res.status).toBe(200);
    expect(res.body.data.map((d: { productRef: string; destination: string }) => [d.productRef, d.destination]).sort()).toEqual(
      [[refs[1], 'INSUMO_SERVICO'], [refs[2], 'INSUMO_SERVICO']].sort(),
    );
    expect(await prisma.productDestinationDefault.count({ where: { unitId: UNIT } })).toBe(2);
    const evs = await events('product_destination.set');
    expect(evs).toHaveLength(3);
    expect(evs[2].payload).toContain(`"productRef":"${refs[2]}"`);
    expect(evs[2].payload).toContain('"destination":"INSUMO_SERVICO"');
  });

  it('item 9/19 — import com mapeamento SEM destination: itens 2 e 3 = INSUMO_SERVICO/PRODUTO; lançamento igual ao do PR-1; o override não vira default (F-ID-9)', async () => {
    await prisma.accountingPeriod.create({ data: { userId: dono.id, unitId: UNIT, year: 2025, month: 7, status: 'OPEN', openedAt: new Date(), openedById: dono.id } });
    await criarConta('1.1.6', 'Estoques', 'Asset');
    await criarConta('2.1.2', 'Fornecedores a Pagar', 'Liability');
    await criarConta('1.1.8', 'ICMS a Recuperar', 'Asset');
    await criarConta('1.1.9', 'PIS/COFINS a Recuperar', 'Asset');
    await criarConta('4.1.9', 'Insumos do serviço', 'Expense');
    const profile = await request(app).put('/api/accounting/fiscal-profile').set(authHeader(dono)).send({
      unitId: UNIT, regimeTributario: 'REAL', icmsContribuinte: true, pisCofinsRegime: 'NAO_CUMULATIVO',
      icmsRecuperavelAccountId: accounts['1.1.8'], pisCofinsRecuperavelAccountId: accounts['1.1.9'], insumoExpenseAccountId: accounts['4.1.9'],
    });
    expect(profile.status).toBe(200);
    const mappings = JSON.stringify([
      { cProd: 'SHAMP-500', productRef: refs[0], destination: 'REVENDA' },
      { cProd: 'COND-500', productRef: refs[1] },
      { cProd: 'MASC-300', productRef: refs[2] },
    ]);
    const post = (path: string) =>
      request(app).post(path).set(authHeader(dono)).field('unitId', UNIT).field('itemMappings', mappings).attach('file', XML, { filename: 'nfe.xml', contentType: 'text/xml' });

    const preview = await post('/api/nfe/preview');
    expect(preview.status).toBe(200);
    expect(preview.body.data.custo.destinacoes.map((d: { destination: string; origem: string }) => `${d.destination}/${d.origem}`)).toEqual([
      'REVENDA/OVERRIDE', 'INSUMO_SERVICO/PRODUTO', 'INSUMO_SERVICO/PRODUTO',
    ]);
    expect(preview.body.data.custo.custoInsumoCents).toBe(8788);

    const res = await post('/api/nfe/purchase');
    expect(res.status).toBe(201);
    expect(res.body.data.destinacoes).toEqual(preview.body.data.custo.destinacoes);
    const payable = await prisma.payable.findFirstOrThrow({ where: { userId: dono.id, unitId: UNIT } });
    const entry = await prisma.journalEntry.findFirstOrThrow({ where: { sourceType: 'ap.payable', sourceId: payable.id }, include: { postings: { include: { account: true } } } });
    const byCode = Object.fromEntries(entry.postings.map((p) => [p.account.code, { d: Number(p.debitCents), c: Number(p.creditCents) }]));
    expect(byCode).toEqual({
      '1.1.6': { d: 7961, c: 0 },
      '1.1.8': { d: 1800, c: 0 },
      '1.1.9': { d: 784, c: 0 },
      '4.1.9': { d: 8788, c: 0 },
      '2.1.2': { d: 0, c: 19333 },
    });
    // F-ID-9 (a): o override REVENDA do item 1 não virou default de refs[0].
    expect(await prisma.productDestinationDefault.count({ where: { unitId: UNIT, productRef: refs[0] } })).toBe(0);
  });

  it('item 17/18 — DELETE: soft-delete + product_destination.cleared; 2º DELETE → 404; some do GET', async () => {
    const res = await del(refs[2]);
    expect(res.status).toBe(200);
    expect((await del(refs[2])).status).toBe(404);
    const evs = await events('product_destination.cleared');
    expect(evs).toHaveLength(1);
    expect(evs[0].payload).toContain(`"productRef":"${refs[2]}"`);
    expect((await list()).body.data.map((d: { productRef: string }) => d.productRef)).toEqual([refs[1]]);
    expect(await prisma.productDestinationDefault.count({ where: { unitId: UNIT, productRef: refs[2], deletedAt: { not: null } } })).toBe(1);
  });
});
