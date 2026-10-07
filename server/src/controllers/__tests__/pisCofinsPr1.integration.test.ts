/**
 * BE-INCR-PIS-COFINS PR-1 (nó X8, BRIEF itens 1, 1b, 2, 5, 6; F-PCB-4 a) — sem rota nova: o perfil pelo PUT existente,
 * o crédito separado pela importação de NF-e existente e a leitura do mês pelo repositório (o PR-2 é quem a consome).
 * Nota: `purchase-pis-cofins.SYNTHETIC.xml` (dhEmi 2025-07-10; crédito 784 = PIS 140 + Cofins 644 sobre base 8473 —
 * números do X6 em `nfeController.purchase.regime.integration.test.ts`).
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { RAZAO_CREDITO_SEMENTE } from '@test/helpers/legalParams';
import { PayableRepository } from '@/features/accounting/repositories/PayableRepository';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';

const app = makeApp();
const XML = readFileSync(join(__dirname, '../../lib/__tests__/fixtures/nfe/purchase-pis-cofins.SYNTHETIC.xml'));
const UNIT = 'unit-x8';
let MAPPINGS = '[]';

let dono: { id: string; username: string };
const accounts: Record<string, string> = {};

const criarConta = async (code: string, nature: string) => {
  accounts[code] = (await prisma.account.create({ data: { userId: dono.id, unitId: UNIT, code, name: code, nature, acceptsEntries: true } })).id;
};
const PERFIL_REAL = { unitId: UNIT, regimeTributario: 'REAL', icmsContribuinte: true, pisCofinsRegime: 'NAO_CUMULATIVO' };
const putProfile = (body: Record<string, unknown>) =>
  request(app).put('/api/accounting/fiscal-profile').set(authHeader(dono)).send({ ...PERFIL_REAL, ...body });
const preview = () =>
  request(app).post('/api/nfe/preview').set(authHeader(dono)).field('unitId', UNIT).attach('file', XML, { filename: 'nfe.xml', contentType: 'text/xml' });
const importar = () =>
  request(app).post('/api/nfe/purchase').set(authHeader(dono)).field('unitId', UNIT).field('itemMappings', MAPPINGS).attach('file', XML, { filename: 'nfe.xml', contentType: 'text/xml' });
const scope = (): AccountingScope => ({
  ownerUserId: dono.id, actorUserId: dono.id, unitId: UNIT, ledgerCode: 'DEFAULT', baseCurrencyCode: 'BRL', timeZone: 'America/Sao_Paulo',
});

describe('X8 PR-1 — regime coerente, contas da provisão, crédito PIS × Cofins separado', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'x8', username: 'x8-dono', email: 'x8@test.local', password: 'x', role: 'USER' } });
    await prisma.accountingPeriod.create({ data: { userId: dono.id, unitId: UNIT, year: 2025, month: 7, status: 'OPEN', openedAt: new Date(), openedById: dono.id } });
    await criarConta('1.1.6', 'Asset');
    await criarConta('2.1.2', 'Liability');
    await criarConta('1.1.8', 'Asset');
    await criarConta('1.1.9', 'Asset');
    await criarConta('4.9.3', 'Expense'); // despesa de PIS
    await criarConta('4.9.4', 'Expense'); // despesa de COFINS
    await criarConta('2.1.9.3', 'Liability'); // PIS a recolher
    await criarConta('2.1.9.4', 'Liability'); // COFINS a recolher
    const products = await prisma.dynamicTable.create({
      data: { userId: dono.id, name: 'Products', internalName: 'products', category: 'products', schema: { fields: [{ name: 'name', label: 'Name', type: 'string', required: true }] } },
    });
    const refs: string[] = [];
    for (const name of ['Toalha', 'Condicionador', 'Máscara']) {
      refs.push((await prisma.dynamicTableData.create({ data: { dynamicTableId: products.id, data: { name } } })).id);
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

  it('item 1 (F-X8-3 a): PUT PRESUMIDO + NAO_CUMULATIVO ⇒ 400 citando o art. 122; PRESUMIDO + CUMULATIVO passa', async () => {
    const r = await putProfile({ regimeTributario: 'PRESUMIDO', pisCofinsRegime: 'NAO_CUMULATIVO' });
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.body)).toContain('IN RFB 2.121/2022 art. 122');
    expect(await prisma.fiscalProfile.count({ where: { userId: dono.id, unitId: UNIT } })).toBe(0);
    expect((await putProfile({ regimeTributario: 'PRESUMIDO', pisCofinsRegime: 'CUMULATIVO' })).status).toBe(200);
  });

  it('item 1b (F-PCB-5 a): linha já gravada com o par ilegal ⇒ prévia e importação da NF-e 400 nomeado; nada escrito', async () => {
    await prisma.fiscalProfile.update({
      where: { userId_unitId: { userId: dono.id, unitId: UNIT } },
      data: { regimeTributario: 'PRESUMIDO', pisCofinsRegime: 'NAO_CUMULATIVO' },
    });
    for (const res of [await preview(), await importar()]) {
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toContain('fiscal_profile_regime_incoerente');
    }
    expect(await prisma.payable.count({ where: { userId: dono.id } })).toBe(0);
  });

  it('item 2 (F-PCB-1 b): 4 contas da provisão — despesa Expense, a recolher Liability; natureza trocada ⇒ 400; evento só com ids', async () => {
    const trocadaDespesa = await putProfile({ pisDespesaAccountId: accounts['2.1.9.3'] });
    expect(trocadaDespesa.status).toBe(400);
    expect(JSON.stringify(trocadaDespesa.body)).toMatch(/despesa de PIS.*esperado Expense/);
    const trocadaRecolher = await putProfile({ cofinsRecolherAccountId: accounts['4.9.4'] });
    expect(trocadaRecolher.status).toBe(400);
    expect(JSON.stringify(trocadaRecolher.body)).toMatch(/COFINS a recolher.*esperado Liability/);

    const ok = await putProfile({
      icmsRecuperavelAccountId: accounts['1.1.8'], pisCofinsRecuperavelAccountId: accounts['1.1.9'],
      pisDespesaAccountId: accounts['4.9.3'], cofinsDespesaAccountId: accounts['4.9.4'],
      pisRecolherAccountId: accounts['2.1.9.3'], cofinsRecolherAccountId: accounts['2.1.9.4'],
    });
    expect(ok.status).toBe(200);
    expect(ok.body.data).toMatchObject({
      pisDespesaAccountId: accounts['4.9.3'], cofinsDespesaAccountId: accounts['4.9.4'],
      pisRecolherAccountId: accounts['2.1.9.3'], cofinsRecolherAccountId: accounts['2.1.9.4'],
    });
    const ev = JSON.parse((await prisma.auditEvent.findFirstOrThrow({ where: { unitId: UNIT, eventType: 'fiscal_profile.updated' }, orderBy: { seq: 'desc' } })).payload);
    expect(ev).toMatchObject({
      pisDespesaAccountId: accounts['4.9.3'], cofinsDespesaAccountId: accounts['4.9.4'],
      pisRecolherAccountId: accounts['2.1.9.3'], cofinsRecolherAccountId: accounts['2.1.9.4'],
    });
  });

  it('item 5 (F-X8-7 a): a importação grava base, PIS e Cofins na linha PIS_COFINS (140 + 644 = 784); o entry não muda', async () => {
    const res = await importar();
    expect(res.status).toBe(201);
    const payable = await prisma.payable.findFirstOrThrow({ where: { userId: dono.id, unitId: UNIT } });
    const pc = (JSON.parse(payable.recoverableTaxLines!) as Record<string, unknown>[]).find((l) => l.kind === 'PIS_COFINS')!;
    expect(pc).toMatchObject({ amountCents: 784, baseCents: 8473, pisCents: 140, cofinsCents: 644 });
    expect((pc.pisCents as number) + (pc.cofinsCents as number)).toBe(pc.amountCents);
    const entry = await prisma.journalEntry.findFirstOrThrow({ where: { sourceType: 'ap.payable', sourceId: payable.id }, include: { postings: { include: { account: true } } } });
    const byCode = Object.fromEntries(entry.postings.map((p) => [p.account.code, { d: Number(p.debitCents), c: Number(p.creditCents) }]));
    expect(byCode).toEqual({ '1.1.6': { d: 15249, c: 0 }, '1.1.8': { d: 3300, c: 0 }, '1.1.9': { d: 784, c: 0 }, '2.1.2': { d: 0, c: 19333 } });
  });

  it('item 6: crédito do mês — nota nova usa as parcelas; nota antiga ⇒ DERIVADO 165:760; cancelada, apagada, fora do mês e outra unidade ficam fora', async () => {
    const nova = await prisma.payable.findFirstOrThrow({ where: { userId: dono.id, unitId: UNIT } });
    const base = {
      userId: dono.id, unitId: UNIT, supplierName: 'Fornecedor', counterpartyId: nova.counterpartyId, description: 'nota antiga',
      dueDate: new Date('2025-08-10T00:00:00.000Z'), amountCents: 10_000n, status: 'OPEN',
    };
    const linhaAntiga = (amountCents: number) => JSON.stringify([{ accountId: accounts['1.1.9'], accountCode: '1.1.9', amountCents, kind: 'PIS_COFINS' }]);
    const antiga = await prisma.payable.create({ data: { ...base, documentNumber: 'ANTIGA', issueDate: new Date('2025-07-31T00:00:00.000Z'), recoverableTaxLines: linhaAntiga(784) } });
    await prisma.payable.create({ data: { ...base, documentNumber: 'CANCELADA', issueDate: new Date('2025-07-15T00:00:00.000Z'), status: 'CANCELLED', recoverableTaxLines: linhaAntiga(500) } });
    await prisma.payable.create({ data: { ...base, documentNumber: 'APAGADA', issueDate: new Date('2025-07-15T00:00:00.000Z'), deletedAt: new Date(), recoverableTaxLines: linhaAntiga(500) } });
    await prisma.payable.create({ data: { ...base, documentNumber: 'AGOSTO', issueDate: new Date('2025-08-01T00:00:00.000Z'), recoverableTaxLines: linhaAntiga(500) } });
    await prisma.payable.create({ data: { ...base, documentNumber: 'JUNHO', issueDate: new Date('2025-06-30T00:00:00.000Z'), recoverableTaxLines: linhaAntiga(500) } });
    await prisma.payable.create({ data: { ...base, unitId: 'outra-unidade', documentNumber: 'OUTRA', issueDate: new Date('2025-07-15T00:00:00.000Z'), recoverableTaxLines: linhaAntiga(500) } });
    await prisma.payable.create({ data: { ...base, documentNumber: 'SO-ICMS', issueDate: new Date('2025-07-15T00:00:00.000Z'), recoverableTaxLines: JSON.stringify([{ accountId: 'x', accountCode: '1.1.8', amountCents: 500, kind: 'ICMS' }]) } });

    // review #521 achado 1: duas linhas PIS_COFINS (POST manual, o DTO aceita até 2) ⇒ soma as duas (500 + 300 = 800)
    const duas = await prisma.payable.create({
      data: {
        ...base, documentNumber: 'DUAS', issueDate: new Date('2025-07-20T00:00:00.000Z'),
        recoverableTaxLines: JSON.stringify([
          { accountId: accounts['1.1.9'], accountCode: '1.1.9', amountCents: 500, kind: 'PIS_COFINS' },
          { accountId: accounts['1.1.9'], accountCode: '1.1.9', amountCents: 300, kind: 'PIS_COFINS' },
        ]),
      },
    });

    const creditos = await new PayableRepository().findPisCofinsCredits(scope(), '2025-07-01', '2025-07-31', RAZAO_CREDITO_SEMENTE);
    // 500 × 165/925 = 89,19 → 89; 300 × 165/925 = 53,51 → 54
    expect(creditos.find((c) => c.payableId === duas.id)).toEqual({
      payableId: duas.id, documentNumber: 'DUAS', issueDate: '2025-07-20', amountCents: 800, baseCents: null, pisCents: 89 + 54, cofinsCents: 800 - 143, derivado: true,
    });
    expect(creditos.filter((c) => c.payableId !== duas.id)).toEqual([
      { payableId: nova.id, documentNumber: nova.documentNumber, issueDate: '2025-07-10', amountCents: 784, baseCents: 8473, pisCents: 140, cofinsCents: 644, derivado: false },
      // 784 × 165 / 925 = 139,85… → 140 (half-up); Cofins = 784 − 140
      { payableId: antiga.id, documentNumber: 'ANTIGA', issueDate: '2025-07-31', amountCents: 784, baseCents: null, pisCents: 140, cofinsCents: 644, derivado: true },
    ]);
  });
});
