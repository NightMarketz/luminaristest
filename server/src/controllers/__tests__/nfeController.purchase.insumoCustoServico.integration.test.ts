/**
 * Lacuna L-20261120-223329-35d3 (nó ITEM-DESTINATION) — o insumo do serviço é CUSTO dos serviços prestados, acima do
 * lucro bruto (NBC TG 1002 item 5.1 (d); dossiê insumos-salao-sp [D12]). Conta do plano padrão `4.7` "Custo dos
 * Serviços Prestados" (dono, AskUserQuestion, 2026-11-21). Mesma NF-e sintética e mesmos números do
 * `nfeController.purchase.itemDestination.integration.test.ts`: itens 2 e 3 INSUMO_SERVICO ⇒ insumo = 5272 + 3516 = 8788.
 * O insumo lançado pela NF-e na 4.7 tem de sair na seção `costOfGoodsSold` da DRE, e não em `expenses`.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import request from 'supertest';
import prisma from '@/lib/prisma';
import { getFactory } from '@/lib/factory';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';

const app = makeApp();
const XML = readFileSync(join(__dirname, '../../lib/__tests__/fixtures/nfe/purchase-pis-cofins.SYNTHETIC.xml'));
const UNIT = 'unit-insumo-csp';

let dono: { id: string; username: string };
const accounts: Record<string, string> = {};
const criarConta = async (code: string, name: string, nature: string) => {
  accounts[code] = (await prisma.account.create({ data: { userId: dono.id, unitId: UNIT, code, name, nature, acceptsEntries: true } })).id;
};
const porConta = (accs: Array<{ code: string; amountCents: string }>) => Object.fromEntries(accs.map((a) => [a.code, a.amountCents]));

describe('Lacuna 35d3 — insumo do serviço importado pela NF-e vai ao custo (costOfGoodsSold) da DRE', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'csp', username: 'insumo-csp-dono', email: 'insumo-csp@test.local', password: 'x', role: 'USER' } });
    await seedUnit({ userId: dono.id, id: UNIT });
    await prisma.accountingPeriod.create({ data: { userId: dono.id, unitId: UNIT, year: 2025, month: 7, status: 'OPEN', openedAt: new Date(), openedById: dono.id } });
    await criarConta('1.1.3.01', 'Mercadorias para Revenda', 'Asset');
    await criarConta('2.1.2.01', 'Fornecedores a Pagar', 'Liability');
    await criarConta('1.1.8', 'ICMS a Recuperar', 'Asset');
    await criarConta('1.1.9', 'PIS/COFINS a Recuperar', 'Asset');
    await criarConta('4.7', 'Custo dos Serviços Prestados', 'Expense');
    const products = await prisma.dynamicTable.create({
      data: { userId: dono.id, name: 'Products', internalName: 'products', category: 'products', schema: { fields: [{ name: 'name', label: 'Name', type: 'string', required: true }] } },
    });
    const refs: string[] = [];
    for (const name of ['Shampoo', 'Condicionador', 'Máscara']) {
      refs.push((await prisma.dynamicTableData.create({ data: { dynamicTableId: products.id, data: { name } } })).id);
    }
    const mappings = JSON.stringify([
      { cProd: 'SHAMP-500', productRef: refs[0], destination: 'REVENDA' },
      { cProd: 'COND-500', productRef: refs[1], destination: 'INSUMO_SERVICO' },
      { cProd: 'MASC-300', productRef: refs[2], destination: 'INSUMO_SERVICO' },
    ]);
    const perfil = await request(app).put('/api/accounting/fiscal-profile').set(authHeader(dono)).send({
      unitId: UNIT, regimeTributario: 'REAL', icmsContribuinte: true, pisCofinsRegime: 'NAO_CUMULATIVO',
      icmsRecuperavelAccountId: accounts['1.1.8'], pisCofinsRecuperavelAccountId: accounts['1.1.9'], insumoExpenseAccountId: accounts['4.7'],
    });
    expect(perfil.status).toBe(200);
    const imp = await request(app).post('/api/nfe/purchase').set(authHeader(dono)).field('unitId', UNIT).field('itemMappings', mappings)
      .attach('file', XML, { filename: 'nfe.xml', contentType: 'text/xml' });
    expect(imp.status).toBe(201);
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('DRE de 31/07/2025: o insumo (8788) da conta 4.7 sai em costOfGoodsSold, e não em expenses', async () => {
    const res = await request(app).get('/api/accounting/income-statement').set(authHeader(dono)).query({ unitId: UNIT, asOf: '2025-07-31' });
    expect(res.status).toBe(200);
    const d = res.body.data;
    // Object.keys: `toHaveProperty('4.7')` leria o ponto como caminho ("4" → "7") e passaria sempre.
    expect({ custo: porConta(d.costOfGoodsSold.accounts), despesasTemA47: Object.keys(porConta(d.expenses.accounts)).includes('4.7') })
      .toEqual({ custo: { '4.7': '-8788' }, despesasTemA47: false });
  });
});

describe('Lacuna 35d3 — padrão do insumoExpenseAccountId pelo plano padrão (só campo vazio; dono 21/11)', () => {
  const VAZIO = 'unit-insumo-csp-vazio';
  const CONFIG = 'unit-insumo-csp-config';
  const scope = (unitId: string): AccountingScope => ({
    ownerUserId: dono.id, actorUserId: dono.id, unitId, ledgerCode: 'DEFAULT', baseCurrencyCode: 'BRL', timeZone: 'America/Sao_Paulo',
  });
  const perfil = (unitId: string, extra: Record<string, unknown> = {}) =>
    request(app).put('/api/accounting/fiscal-profile').set(authHeader(dono)).send({ unitId, regimeTributario: 'PRESUMIDO', icmsContribuinte: false, pisCofinsRegime: 'CUMULATIVO', ...extra });

  it('o plano padrão cria a 4.7 no escopo; perfil sem conta de insumo recebe a 4.7; perfil legado na 4.1 não é sobrescrito e reprova o plano padrão (lacuna 051e)', async () => {
    for (const u of [VAZIO, CONFIG]) await seedUnit({ userId: dono.id, id: u });
    expect((await perfil(VAZIO)).status).toBe(200);
    for (const u of [VAZIO, CONFIG]) await request(app).get('/api/accounting/accounts').set(authHeader(dono)).query({ unitId: u }); // ensureChartOfAccounts
    const conta = (unitId: string, code: string) => prisma.account.findFirstOrThrow({ where: { userId: dono.id, unitId, code, deletedAt: null } });
    const csp = await conta(VAZIO, '4.7');
    expect([csp.name, csp.nature, csp.acceptsEntries]).toEqual(['Custo dos Serviços Prestados', 'Expense', true]);
    const op = await conta(CONFIG, '4.1');
    // Perfil legado: gravado antes da lacuna 051e, que recusa a 4.1 (não é custo na DRE) em toda escrita: PUT, kit e plano padrão
    // (dono, 21/11: "Checar em todo PUT"; "aplica a regra também no kit e no plano padrão"). O padrão não o sobrescreve.
    expect((await perfil(CONFIG)).status).toBe(200);
    expect((await perfil(CONFIG, { insumoExpenseAccountId: op.id })).status).toBe(400);
    await prisma.fiscalProfile.updateMany({ where: { userId: dono.id, unitId: CONFIG }, data: { insumoExpenseAccountId: op.id } });

    const svc = getFactory().getFiscalProfileService();
    await svc.ensureCanonicalAccounts(scope(VAZIO));
    await expect(svc.ensureCanonicalAccounts(scope(CONFIG))).rejects.toThrow(/Conta de insumo do serviço '4.1' não é custo na DRE/);
    const row = (unitId: string) => prisma.fiscalProfile.findFirstOrThrow({ where: { userId: dono.id, unitId } });
    expect({ vazio: (await row(VAZIO)).insumoExpenseAccountId, config: (await row(CONFIG)).insumoExpenseAccountId }).toEqual({ vazio: csp.id, config: op.id });
    // a tx voltou: o campo que o plano padrão grava na unidade VAZIO não foi gravado na CONFIG
    expect({ vazio: (await row(VAZIO)).ibsRecolherAccountId === null, config: (await row(CONFIG)).ibsRecolherAccountId }).toEqual({ vazio: false, config: null });
  });
});
