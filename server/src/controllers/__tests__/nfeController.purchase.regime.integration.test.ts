/**
 * BE-INCR-NFE-COST-REGIME (nó X6) — contrato HTTP ponta a ponta: perfil fiscal (GET/PUT), import de
 * compra sob regime CONTRIBUINTE + NAO_CUMULATIVO (F-X6-2 a, F-X6-3 b, F-X6-8 a) e o lançamento de
 * reconhecimento com as linhas "a recuperar" (item 18): `D estoque (líquido) + D ICMS a recuperar +
 * D PIS/COFINS a recuperar / C fornecedores (bruto)`. Números do oráculo em `lib/__tests__/nfeCost.test.ts`.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();
const XML = readFileSync(join(__dirname, '../../lib/__tests__/fixtures/nfe/purchase-pis-cofins.SYNTHETIC.xml'));
const UNIT = 'unit-x6';
let MAPPINGS = '[]'; // preenchido no beforeAll com os ids das linhas do catálogo `products` (gate D6 do AP)

let dono: { id: string; username: string };
const accounts: Record<string, string> = {};

const criarConta = async (code: string, name: string, nature: string) => {
  const a = await prisma.account.create({ data: { userId: dono.id, unitId: UNIT, code, name, nature, acceptsEntries: true } });
  accounts[code] = a.id;
};
const putProfile = (body: Record<string, unknown>) =>
  request(app).put('/api/accounting/fiscal-profile').set(authHeader(dono)).send({ unitId: UNIT, ...body });
const importar = () =>
  request(app).post('/api/nfe/purchase').set(authHeader(dono)).field('unitId', UNIT).field('itemMappings', MAPPINGS).attach('file', XML, { filename: 'nfe.xml', contentType: 'text/xml' });

describe('X6 — perfil fiscal + import de compra por regime', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'x6', username: 'x6-dono', email: 'x6@test.local', password: 'x', role: 'USER' } });
    // a nota é de 2025-07-10 (dhEmi do fixture)
    await prisma.accountingPeriod.create({ data: { userId: dono.id, unitId: UNIT, year: 2025, month: 7, status: 'OPEN', openedAt: new Date(), openedById: dono.id } });
    await criarConta('1.1.6', 'Estoques', 'Asset');
    await criarConta('2.1.2', 'Fornecedores a Pagar', 'Liability');
    await criarConta('1.1.8', 'ICMS a Recuperar', 'Asset');
    await criarConta('1.1.9', 'PIS/COFINS a Recuperar', 'Asset');
    await criarConta('4.1', 'Despesas', 'Expense');
    // Catálogo `products` (DynamicTable) — o `createPayable` exige que cada productRef exista (ProductRefLookup).
    const products = await prisma.dynamicTable.create({
      data: { userId: dono.id, name: 'Products', internalName: 'products', category: 'products', schema: { fields: [{ name: 'name', label: 'Name', type: 'string', required: true }] } },
    });
    const refs: string[] = [];
    for (const name of ['Toalha', 'Condicionador', 'Máscara']) {
      const row = await prisma.dynamicTableData.create({ data: { dynamicTableId: products.id, data: { name } } });
      refs.push(row.id);
    }
    MAPPINGS = JSON.stringify([
      { cProd: 'SHAMP-500', productRef: refs[0] },
      { cProd: 'COND-500', productRef: refs[1] },
      { cProd: 'MASC-300', productRef: refs[2] },
    ]);
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET sem perfil → 404 fiscal_profile_missing; import sem perfil → 400 (F-X6-6 a), nada escrito', async () => {
    expect((await request(app).get('/api/accounting/fiscal-profile').set(authHeader(dono)).query({ unitId: UNIT })).status).toBe(404);
    const res = await importar();
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toMatch(/fiscal_profile_missing/);
    expect(await prisma.payable.count({ where: { userId: dono.id } })).toBe(0);
  });

  it('PUT rejeita combinação inconsistente (SIMPLES + contribuinte), conta a recuperar de natureza errada e campo extra', async () => {
    expect((await putProfile({ regimeTributario: 'SIMPLES', icmsContribuinte: true, pisCofinsRegime: 'SIMPLES' })).status).toBe(400);
    expect((await putProfile({ regimeTributario: 'REAL', icmsContribuinte: false, pisCofinsRegime: 'SIMPLES' })).status).toBe(400);
    const wrong = await putProfile({ regimeTributario: 'REAL', icmsContribuinte: true, pisCofinsRegime: 'NAO_CUMULATIVO', icmsRecuperavelAccountId: accounts['4.1'] });
    expect(wrong.status).toBe(400);
    expect(JSON.stringify(wrong.body)).toMatch(/Asset/);
    expect((await putProfile({ regimeTributario: 'REAL', icmsContribuinte: true, pisCofinsRegime: 'NAO_CUMULATIVO', foo: 1 })).status).toBe(400);
  });

  it('PUT cria o perfil (idempotente) e GET o devolve com defaults conservadores; evento fiscal_profile.updated na trilha', async () => {
    const res = await putProfile({ regimeTributario: 'REAL', icmsContribuinte: true, pisCofinsRegime: 'NAO_CUMULATIVO' });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(expect.objectContaining({ pisCofinsCreditExcludesIcms: true, pisCofinsCreditIncludesIpi: false, pisCofinsCreditFromSimplesSupplier: false, icmsRecuperavelAccountId: null }));
    const again = await putProfile({ regimeTributario: 'REAL', icmsContribuinte: true, pisCofinsRegime: 'NAO_CUMULATIVO', icmsRecuperavelAccountId: accounts['1.1.8'], pisCofinsRecuperavelAccountId: accounts['1.1.9'] });
    expect(again.status).toBe(200);
    expect(await prisma.fiscalProfile.count({ where: { userId: dono.id, unitId: UNIT } })).toBe(1);
    const get = await request(app).get('/api/accounting/fiscal-profile').set(authHeader(dono)).query({ unitId: UNIT });
    expect(get.status).toBe(200);
    expect(get.body.data.icmsRecuperavelAccountId).toBe(accounts['1.1.8']);
    expect(await prisma.auditEvent.count({ where: { unitId: UNIT, eventType: 'fiscal_profile.updated' } })).toBe(2);
  });

  it('preview ecoa o custo por regime ANTES do import (item 12): bruto 19333, estoque 15249, ICMS 3300, PIS/COFINS 784, warnings vazias', async () => {
    const res = await request(app).post('/api/nfe/preview').set(authHeader(dono)).field('unitId', UNIT).attach('file', XML, { filename: 'nfe.xml', contentType: 'text/xml' });
    expect(res.status).toBe(200);
    expect(res.body.data.custo).toEqual({
      custoBrutoCents: 19333, custoEstoqueCents: 19333 - 3300 - 784, creditoIcmsCents: 3300, creditoPisCofinsCents: 784, baseCreditoPisCofinsCents: 8473,
      regimeAplicado: 'CONTRIBUINTE_ICMS', pisCofinsAplicado: 'NAO_CUMULATIVO', warnings: [],
    });
    expect(res.body.data.emit.crt).toBe('3');
  });

  it('import: passivo = bruto (19333), estoque = líquido (15249), entry com 4 linhas — D 1.1.6 15249 / D 1.1.8 3300 / D 1.1.9 784 / C 2.1.2 19333; audit payable.created com os créditos', async () => {
    const res = await importar();
    expect(res.status).toBe(201);
    const payable = await prisma.payable.findFirstOrThrow({ where: { userId: dono.id, unitId: UNIT } });
    expect(Number(payable.amountCents)).toBe(19333);
    expect(payable.recoverableTaxLines).toBeTruthy();
    const entry = await prisma.journalEntry.findFirstOrThrow({ where: { sourceType: 'ap.payable', sourceId: payable.id }, include: { postings: { include: { account: true } } } });
    const byCode = Object.fromEntries(entry.postings.map((p) => [p.account.code, { d: Number(p.debitCents), c: Number(p.creditCents) }]));
    expect(byCode['1.1.6']).toEqual({ d: 15249, c: 0 });
    expect(byCode['1.1.8']).toEqual({ d: 3300, c: 0 });
    expect(byCode['1.1.9']).toEqual({ d: 784, c: 0 });
    expect(byCode['2.1.2']).toEqual({ d: 0, c: 19333 });
    const movs = await prisma.stockMovement.findMany({ where: { sourceId: payable.id } });
    expect(movs.reduce((a, m) => a + Number(m.valueCentsDelta), 0)).toBe(15249);
    const ev = await prisma.auditEvent.findFirstOrThrow({ where: { unitId: UNIT, eventType: 'payable.created' } });
    expect(ev.payload).toMatch(/"recoverableIcmsCents":"3300"/);
    expect(ev.payload).toMatch(/"recoverablePisCofinsCents":"784"/);
  });
});
