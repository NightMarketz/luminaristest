/**
 * BE-INCR-ITEM-DESTINATION PR-1 — contrato HTTP ponta a ponta com Prisma real (BRIEF itens 10, 11, 12, 14, 15, 20).
 * Regime REAL contribuinte + NAO_CUMULATIVO sobre `purchase-pis-cofins.SYNTHETIC.xml` (oráculo em
 * `lib/__tests__/nfeCost.test.ts`): item 1 SHAMP-500 TRIBUTADO (bruto 10545, vICMS 1800, PIS/COFINS 784),
 * item 2 COND-500 monofásico pelo NCM (bruto 5272, vICMS 900), item 3 MASC-300 CST 04 (bruto 3516, vICMS 600).
 * Mapeamento: item 1 REVENDA, itens 2 e 3 INSUMO_SERVICO ⇒ 1.1.6 = 10545 − 1800 − 784 = 7961; ICMS a recuperar
 * = 1800 (o dos insumos fica no custo, item 5); PIS/COFINS 784; insumo = 5272 + 3516 = 8788; Σ = 19333.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();
const XML = readFileSync(join(__dirname, '../../lib/__tests__/fixtures/nfe/purchase-pis-cofins.SYNTHETIC.xml'));
const UNIT = 'unit-item-dest';
let MAPPINGS = '[]';

let dono: { id: string; username: string };
const accounts: Record<string, string> = {};

const criarConta = async (code: string, name: string, nature: string, unitId = UNIT) => {
  const a = await prisma.account.create({ data: { userId: dono.id, unitId, code, name, nature, acceptsEntries: true } });
  accounts[`${unitId}:${code}`] = a.id;
  return a.id;
};
const acc = (code: string) => accounts[`${UNIT}:${code}`];
const putProfile = (body: Record<string, unknown>) =>
  request(app).put('/api/accounting/fiscal-profile').set(authHeader(dono)).send({
    unitId: UNIT, regimeTributario: 'REAL', icmsContribuinte: true, pisCofinsRegime: 'NAO_CUMULATIVO',
    icmsRecuperavelAccountId: acc('1.1.8'), pisCofinsRecuperavelAccountId: acc('1.1.9'), ...body,
  });
const post = (path: string) =>
  request(app).post(path).set(authHeader(dono)).field('unitId', UNIT).field('itemMappings', MAPPINGS).attach('file', XML, { filename: 'nfe.xml', contentType: 'text/xml' });
const counts = async () => ({
  payables: await prisma.payable.count({ where: { userId: dono.id, unitId: UNIT } }),
  entries: await prisma.journalEntry.count({ where: { userId: dono.id, unitId: UNIT } }),
  movs: await prisma.stockMovement.count({ where: { inventoryItem: { userId: dono.id, unitId: UNIT } } }),
});

describe('ITEM-DESTINATION PR-1 — import/preview/cancel com destinação por item (Prisma real)', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'id', username: 'item-dest-dono', email: 'item-dest@test.local', password: 'x', role: 'USER' } });
    await prisma.accountingPeriod.create({ data: { userId: dono.id, unitId: UNIT, year: 2025, month: 7, status: 'OPEN', openedAt: new Date(), openedById: dono.id } });
    await criarConta('1.1.6', 'Estoques', 'Asset');
    await criarConta('2.1.2', 'Fornecedores a Pagar', 'Liability');
    await criarConta('1.1.8', 'ICMS a Recuperar', 'Asset');
    await criarConta('1.1.9', 'PIS/COFINS a Recuperar', 'Asset');
    await criarConta('4.1.9', 'Insumos do serviço', 'Expense');
    await criarConta('4.1.9', 'Insumos (outra unidade)', 'Expense', 'unit-outra');
    const products = await prisma.dynamicTable.create({
      data: { userId: dono.id, name: 'Products', internalName: 'products', category: 'products', schema: { fields: [{ name: 'name', label: 'Name', type: 'string', required: true }] } },
    });
    const refs: string[] = [];
    for (const name of ['Shampoo', 'Condicionador', 'Máscara']) {
      refs.push((await prisma.dynamicTableData.create({ data: { dynamicTableId: products.id, data: { name } } })).id);
    }
    MAPPINGS = JSON.stringify([
      { cProd: 'SHAMP-500', productRef: refs[0], destination: 'REVENDA' },
      { cProd: 'COND-500', productRef: refs[1], destination: 'INSUMO_SERVICO' },
      { cProd: 'MASC-300', productRef: refs[2], destination: 'INSUMO_SERVICO' },
    ]);
    expect((await putProfile({})).status).toBe(200);
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('item 11 — insumo sem conta no perfil → 400 insumo_account_not_configured; zero payable, entry e movimento', async () => {
    const res = await post('/api/nfe/purchase');
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toMatch(/insumo_account_not_configured/);
    expect(await counts()).toEqual({ payables: 0, entries: 0, movs: 0 });
  });

  it('item 20 — PUT recusa conta de ATIVO e conta de despesa de OUTRA unidade; aceita a folha Expense do escopo (coluna nova no SQLite real)', async () => {
    const ativo = await putProfile({ insumoExpenseAccountId: acc('1.1.6') });
    expect(ativo.status).toBe(400);
    expect(JSON.stringify(ativo.body)).toMatch(/esperado Expense/);
    expect((await putProfile({ insumoExpenseAccountId: accounts['unit-outra:4.1.9'] })).status).toBe(400);
    const ok = await putProfile({ insumoExpenseAccountId: acc('4.1.9') });
    expect(ok.status).toBe(200);
    const get = await request(app).get('/api/accounting/fiscal-profile').set(authHeader(dono)).query({ unitId: UNIT });
    expect(get.body.data.insumoExpenseAccountId).toBe(acc('4.1.9'));
    expect((await prisma.fiscalProfile.findFirstOrThrow({ where: { userId: dono.id, unitId: UNIT } })).insumoExpenseAccountId).toBe(acc('4.1.9'));
    const ev = await prisma.auditEvent.findFirstOrThrow({ where: { unitId: UNIT, eventType: 'fiscal_profile.updated' }, orderBy: { seq: 'desc' } });
    expect(ev.payload).toContain(`"insumoExpenseAccountId":"${acc('4.1.9')}"`);
  });

  let previewCusto: Record<string, unknown>;
  it('item 14 — preview com o mesmo itemMappings (multipart JSON): créditos, insumo e destinações do import', async () => {
    const res = await post('/api/nfe/preview');
    expect(res.status).toBe(200);
    previewCusto = res.body.data.custo;
    expect(previewCusto).toMatchObject({
      custoBrutoCents: 19333, creditoIcmsCents: 1800, creditoPisCofinsCents: 784, custoInsumoCents: 8788,
      custoEstoqueCents: 19333 - 1800 - 784,
    });
    expect((previewCusto.destinacoes as { destination: string; origem: string }[]).map((d) => `${d.destination}/${d.origem}`)).toEqual([
      'REVENDA/OVERRIDE', 'INSUMO_SERVICO/OVERRIDE', 'INSUMO_SERVICO/OVERRIDE',
    ]);
    expect(await counts()).toEqual({ payables: 0, entries: 0, movs: 0 }); // preview não escreve
  });

  let payableId = '';
  it('item 10/13/15 — import: D 1.1.6 7961 + D 1.1.8 1800 + D 1.1.9 784 + D 4.1.9 8788 / C 2.1.2 19333; 1 INBOUND (só a revenda); resposta = preview', async () => {
    const res = await post('/api/nfe/purchase');
    expect(res.status).toBe(201);
    expect(res.body.data.destinacoes).toEqual(previewCusto.destinacoes);
    expect(res.body.data.warnings).toEqual(previewCusto.warnings);
    const payable = await prisma.payable.findFirstOrThrow({ where: { userId: dono.id, unitId: UNIT } });
    payableId = payable.id;
    const entry = await prisma.journalEntry.findFirstOrThrow({ where: { sourceType: 'ap.payable', sourceId: payable.id }, include: { postings: { include: { account: true } } } });
    const byCode = Object.fromEntries(entry.postings.map((p) => [p.account.code, { d: Number(p.debitCents), c: Number(p.creditCents) }]));
    expect(byCode).toEqual({
      '1.1.6': { d: 7961, c: 0 },
      '1.1.8': { d: 1800, c: 0 },
      '1.1.9': { d: 784, c: 0 },
      '4.1.9': { d: 8788, c: 0 },
      '2.1.2': { d: 0, c: 19333 },
    });
    const movs = await prisma.stockMovement.findMany({ where: { sourceId: payable.id } });
    expect(movs.map((m) => [m.kind, Number(m.valueCentsDelta)])).toEqual([['INBOUND', 7961]]);
    const ev = await prisma.auditEvent.findFirstOrThrow({ where: { unitId: UNIT, eventType: 'payable.created' } });
    expect(ev.payload).toMatch(/"insumoCents":"8788"/);
  });

  it('item 12 — cancelar: saldo 0 na conta de insumo e no 1.1.6; o estoque da revenda volta (1 REVERSAL)', async () => {
    const res = await request(app).post(`/api/payables/${payableId}/cancel`).set(authHeader(dono)).send({ unitId: UNIT, reversalDate: '2025-07-20', reason: 'teste' });
    expect(res.status).toBe(200);
    const saldo = async (code: string) => {
      const ps = await prisma.posting.findMany({ where: { accountId: acc(code) } });
      return ps.reduce((a, p) => a + Number(p.debitCents) - Number(p.creditCents), 0);
    };
    expect(await saldo('4.1.9')).toBe(0);
    expect(await saldo('1.1.6')).toBe(0);
    const movs = await prisma.stockMovement.findMany({ where: { inventoryItem: { userId: dono.id, unitId: UNIT } }, orderBy: { createdAt: 'asc' } });
    expect(movs.map((m) => m.kind)).toEqual(['INBOUND', 'REVERSAL']);
  });
});
