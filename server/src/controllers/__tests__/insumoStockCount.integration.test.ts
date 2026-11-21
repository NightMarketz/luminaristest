/**
 * BE-INCR-INSUMO-INVENTARIO-PERIODICO (BRIEF item 6, lacuna L-20261120-223332-f79c) — teste-guarda do cenário de 30/12.
 * NBC TG 1002 itens 13.2 e 13.6: o insumo comprado é estoque e vira custo quando a receita do serviço é reconhecida.
 * Na (c) ratificada (D-2026-11-21-INSUMO-INVENTARIO-PERIODICO), a compra debita a conta de estoque de insumo e a
 * contagem do fechamento lança a diferença.
 *
 * Mesmo XML do teste do ITEM-DESTINATION (`purchase-pis-cofins.SYNTHETIC.xml`, emitido em 10/07/2025; o XML é assinado,
 * então a data não muda): itens 2 e 3 = INSUMO_SERVICO, custo 5272 + 3516 = 8788. O cenário "R$ 3.000 de tinta em 30/12,
 * consumidos em janeiro" vira "8788 em 10/07, consumidos em agosto": a mesma virada de mês que o defeito distorce.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';

const app = makeApp();
const XML = readFileSync(join(__dirname, '../../lib/__tests__/fixtures/nfe/purchase-pis-cofins.SYNTHETIC.xml'));
const UNIT = 'unit-insumo-count';
const INSUMO = 5272 + 3516;
let MAPPINGS = '[]';

let dono: { id: string; username: string };
const accounts: Record<string, string> = {};

const criarConta = async (code: string, name: string, nature: string) => {
  const a = await prisma.account.create({ data: { userId: dono.id, unitId: UNIT, code, name, nature, acceptsEntries: true } });
  accounts[code] = a.id;
  return a.id;
};
const putProfile = (body: Record<string, unknown>) =>
  request(app).put('/api/accounting/fiscal-profile').set(authHeader(dono)).send({
    unitId: UNIT, regimeTributario: 'REAL', icmsContribuinte: true, pisCofinsRegime: 'NAO_CUMULATIVO',
    icmsRecuperavelAccountId: accounts['1.1.8'], pisCofinsRecuperavelAccountId: accounts['1.1.9'],
    insumoExpenseAccountId: accounts['4.1.9'], ...body,
  });
const count = (countDate: string, countedValueCents: number) =>
  request(app).post('/api/accounting/insumo-stock-counts').set(authHeader(dono)).send({ unitId: UNIT, countDate, countedValueCents });
/** Saldo (D − C) da conta com lançamentos de `from` a `to` (inclusive), datas YYYY-MM-DD. */
const saldo = async (code: string, from: string, to: string) => {
  const ps = await prisma.posting.findMany({
    where: { accountId: accounts[code], entry: { date: { gte: new Date(`${from}T00:00:00.000Z`), lte: new Date(`${to}T23:59:59.999Z`) } } },
  });
  return ps.reduce((a, p) => a + Number(p.debitCents) - Number(p.creditCents), 0);
};

describe('Insumo do serviço — estoque com inventário periódico (cenário 30/12, NBC TG 1002 13.6)', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'ic', username: 'insumo-count-dono', email: 'insumo-count@test.local', password: 'x', role: 'USER' } });
    await seedUnit({ userId: dono.id, id: UNIT });
    for (const [year, month] of [[2025, 7], [2025, 8], [2025, 9]] as const) {
      await prisma.accountingPeriod.create({ data: { userId: dono.id, unitId: UNIT, year, month, status: 'OPEN', openedAt: new Date(), openedById: dono.id } });
    }
    await criarConta('1.1.3.01', 'Estoques', 'Asset');
    await criarConta('1.1.3.02', 'Estoque de insumos do serviço', 'Asset');
    await criarConta('2.1.2.01', 'Fornecedores a Pagar', 'Liability');
    await criarConta('1.1.8', 'ICMS a Recuperar', 'Asset');
    await criarConta('1.1.9', 'PIS/COFINS a Recuperar', 'Asset');
    await criarConta('4.1.9', 'Insumos do serviço', 'Expense');
    const products = await prisma.dynamicTable.create({
      data: { userId: dono.id, name: 'Products', internalName: 'products', category: 'products', schema: { fields: [{ name: 'name', label: 'Name', type: 'string', required: true }] } },
    });
    const refs: string[] = [];
    for (const name of ['Shampoo', 'Tinta', 'Oxidante']) {
      refs.push((await prisma.dynamicTableData.create({ data: { dynamicTableId: products.id, data: { name } } })).id);
    }
    MAPPINGS = JSON.stringify([
      { cProd: 'SHAMP-500', productRef: refs[0], destination: 'REVENDA' },
      { cProd: 'COND-500', productRef: refs[1], destination: 'INSUMO_SERVICO' },
      { cProd: 'MASC-300', productRef: refs[2], destination: 'INSUMO_SERVICO' },
    ]);
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('item 4 — contagem sem conta de estoque de insumo no perfil → 400 nomeado, sem lançamento', async () => {
    expect((await putProfile({})).status).toBe(200);
    const res = await count('2025-07-31', 0);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toMatch(/insumo_stock_account_not_configured/);
  });

  it('item 1 — PUT recusa a conta de estoque da revenda (tie-out LAC-E) e conta de despesa; aceita folha de ativo', async () => {
    const revenda = await putProfile({ insumoStockAccountId: accounts['1.1.3.01'] });
    expect(revenda.status).toBe(400);
    expect(JSON.stringify(revenda.body)).toMatch(/estoque de revenda/);
    expect((await putProfile({ insumoStockAccountId: accounts['4.1.9'] })).status).toBe(400);
    const ok = await putProfile({ insumoStockAccountId: accounts['1.1.3.02'] });
    expect(ok.status).toBe(200);
    const get = await request(app).get('/api/accounting/fiscal-profile').set(authHeader(dono)).query({ unitId: UNIT });
    expect(get.body.data.insumoStockAccountId).toBe(accounts['1.1.3.02']);
  });

  it('itens 2/3/6 — compra de 10/07: o insumo vai ao estoque; a despesa de julho fica 0 e o balanço mostra o estoque', async () => {
    const res = await request(app).post('/api/nfe/purchase').set(authHeader(dono)).field('unitId', UNIT).field('itemMappings', MAPPINGS)
      .attach('file', XML, { filename: 'nfe.xml', contentType: 'text/xml' });
    expect(res.status).toBe(201);
    expect(await saldo('4.1.9', '2025-07-01', '2025-07-31')).toBe(0);
    expect(await saldo('1.1.3.02', '2025-01-01', '2025-07-31')).toBe(INSUMO);
    // a revenda não muda: só ela gera movimento de estoque
    const movs = await prisma.stockMovement.findMany({ where: { inventoryItem: { userId: dono.id, unitId: UNIT } } });
    expect(movs.map((m) => m.kind)).toEqual(['INBOUND']);
  });

  it('item 4 — contagem de 31/07 igual ao saldo: nenhum lançamento', async () => {
    const res = await count('2025-07-31', INSUMO);
    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({ countDate: '2025-07-31', bookValueCents: INSUMO, countedValueCents: INSUMO, adjustmentCents: 0, entryId: null });
    expect(await prisma.journalEntry.count({ where: { unitId: UNIT, sourceType: 'insumo_stock_count' } })).toBe(0);
  });

  it('item 4 — contagem de 31/08 com zero: o custo vai para agosto (D 4.1.9 / C estoque de insumo)', async () => {
    const res = await count('2025-08-31', 0);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ bookValueCents: INSUMO, countedValueCents: 0, adjustmentCents: INSUMO });
    expect(res.body.data.entryId).toEqual(expect.any(String));
    expect(await saldo('4.1.9', '2025-08-01', '2025-08-31')).toBe(INSUMO);
    expect(await saldo('4.1.9', '2025-07-01', '2025-07-31')).toBe(0);
    expect(await saldo('1.1.3.02', '2025-01-01', '2025-08-31')).toBe(0);
  });

  it('item 4 — 2ª contagem na mesma data → 409, sem segundo lançamento', async () => {
    const res = await count('2025-08-31', 0);
    expect(res.status).toBe(409);
    expect(JSON.stringify(res.body)).toMatch(/INSUMO_COUNT_ALREADY_POSTED/);
    expect(await prisma.journalEntry.count({ where: { unitId: UNIT, sourceType: 'insumo_stock_count' } })).toBe(1);
  });

  it('item 4 — sobra na contagem (contado > saldo): D estoque de insumo / C 4.1.9', async () => {
    // O saldo até 30/08 ainda é INSUMO (a baixa é de 31/08). Contado INSUMO + 100 ⇒ ajuste −100.
    const res = await count('2025-08-30', INSUMO + 100);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ bookValueCents: INSUMO, adjustmentCents: -100 });
    const entry = await prisma.journalEntry.findUniqueOrThrow({ where: { id: res.body.data.entryId }, include: { postings: { include: { account: true } } } });
    const byCode = Object.fromEntries(entry.postings.map((p) => [p.account.code, { d: Number(p.debitCents), c: Number(p.creditCents) }]));
    expect(byCode).toEqual({ '1.1.3.02': { d: 100, c: 0 }, '4.1.9': { d: 0, c: 100 } });
  });

  const reverse = (lancamentoId: string, reversalPostingDate: string) =>
    request(app).post('/api/accounting/reverse').set(authHeader(dono)).send({ unitId: UNIT, lancamentoId, reversalPostingDate, reason: 'recontagem' });
  const countEntry = (sourceId: string) => prisma.journalEntry.findFirstOrThrow({ where: { unitId: UNIT, sourceType: 'insumo_stock_count', sourceId } });

  it('item 4 — estornar e contar de novo (estorno datado DEPOIS da contagem): 201 com o saldo sem a contagem estornada', async () => {
    // review #1297, achado 1: antes, a recontagem dava 409 e o saldo até 31/08 ainda somava a contagem estornada.
    const original = await countEntry(`${UNIT}:2025-08-31`);
    expect((await reverse(original.id, '2025-09-15')).status).toBe(200);
    const res = await count('2025-08-31', 500);
    expect(res.status).toBe(201);
    // saldo até 31/08 = compra (INSUMO) + sobra de 30/08 (100); a baixa de 31/08 estornada fica fora
    expect(res.body.data).toMatchObject({ bookValueCents: INSUMO + 100, countedValueCents: 500, adjustmentCents: INSUMO + 100 - 500 });
    expect((await countEntry(`${UNIT}:2025-08-31#2`)).id).toBe(res.body.data.entryId);
    expect(await saldo('1.1.3.02', '2025-01-01', '2025-08-31')).toBe(500 - INSUMO); // a baixa original só sai em 15/09
    expect(await saldo('1.1.3.02', '2025-01-01', '2025-09-30')).toBe(500);
    // a recontagem ativa bloqueia uma 3ª
    expect((await count('2025-08-31', 0)).status).toBe(409);
  });

  it('item 4 — estorno no mesmo dia e nova recontagem: usa a sourceId seguinte e o mesmo saldo', async () => {
    const segunda = await countEntry(`${UNIT}:2025-08-31#2`);
    expect((await reverse(segunda.id, '2025-08-31')).status).toBe(200);
    const res = await count('2025-08-31', 0);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ bookValueCents: INSUMO + 100, adjustmentCents: INSUMO + 100 });
    expect((await countEntry(`${UNIT}:2025-08-31#3`)).id).toBe(res.body.data.entryId);
    expect(await saldo('1.1.3.02', '2025-01-01', '2025-09-30')).toBe(0);
  });
});
