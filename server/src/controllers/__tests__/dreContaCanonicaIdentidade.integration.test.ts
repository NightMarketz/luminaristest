/**
 * BE-INCR-CONTA-CANONICA-PAPEL, PR-3 (parte "DRE" da lacuna L-20261121-040921-13dd). A regra `dre.cogs_services` (4.7 →
 * custo, #1296) casava pelo prefixo do código, então a conta do usuário que ocupa a 4.7 num escopo legado (caso real:
 * dev.db, escopo C7, "Perda na Baixa de Imobilizado C7") subia para o custo dos serviços. Pela identidade (dono, 21/11:
 * "pelo papel/natureza, não só pelo código"), só a folha do plano padrão é custo; a do usuário cai em `expenses`.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';

const app = makeApp();
let dono: { id: string; username: string };

const porConta = (accounts: Array<{ code: string; amountCents: string }>) =>
  Object.fromEntries(accounts.map((a) => [a.code, a.amountCents]));

/** Lança D <código> / C Banco (1.1.1.01) direto no razão, num período aberto de julho/2025. */
const lancar = async (unitId: string, code: string, cents: bigint) => {
  const [conta, banco] = await Promise.all(
    [code, '1.1.1.01'].map((c) => prisma.account.findFirstOrThrow({ where: { userId: dono.id, unitId, code: c, deletedAt: null } })),
  );
  const entry = await prisma.journalEntry.create({
    data: { userId: dono.id, unitId, date: new Date('2025-07-15'), description: 'lançamento', status: 'Posted' },
  });
  await prisma.posting.createMany({
    data: [
      { userId: dono.id, unitId, entryId: entry.id, accountId: conta.id, debitCents: cents },
      { userId: dono.id, unitId, entryId: entry.id, accountId: banco.id, creditCents: cents },
    ],
  });
};

const dre = async (unitId: string) => {
  const res = await request(app).get('/api/accounting/income-statement').set(authHeader(dono)).query({ unitId, asOf: '2025-07-31' });
  expect(res.status).toBe(200);
  const d = res.body.data;
  return { custo: porConta(d.costOfGoodsSold.accounts), despesas: porConta(d.expenses.accounts), net: d.netResult.amountCents };
};

const preparar = async (unitId: string, contaDoUsuario: boolean) => {
  await seedUnit({ userId: dono.id, id: unitId });
  await prisma.accountingPeriod.create({
    data: { userId: dono.id, unitId, year: 2025, month: 7, status: 'OPEN', openedAt: new Date(), openedById: dono.id },
  });
  if (contaDoUsuario) {
    // Escopo legado: a 4.7 do usuário nasceu antes de o código entrar no plano padrão (o `create` direto pula a recusa do #1300).
    await prisma.account.create({
      data: { userId: dono.id, unitId, code: '4.7', name: 'Perda na Baixa de Imobilizado C7', nature: 'Expense', acceptsEntries: true },
    });
  }
  expect((await request(app).get('/api/accounting/accounts').set(authHeader(dono)).query({ unitId })).status).toBe(200);
};

describe('DRE pela identidade da folha (lacuna 13dd)', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({
      data: { name: 'dre-ident', username: 'dre-ident-dono', email: 'dre-ident@test.local', password: 'x', role: 'USER' },
    });
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('conta do usuário na 4.7 ("Perda na Baixa") sai em expenses, não no custo dos serviços', async () => {
    const unitId = 'unit-dre-ident-alheia';
    await preparar(unitId, true);
    await lancar(unitId, '4.7', 500n);
    const r = await dre(unitId);
    expect({ custoTemA47: Object.keys(r.custo).includes('4.7'), despesa: r.despesas['4.7'], net: r.net })
      .toEqual({ custoTemA47: false, despesa: '-500', net: '-500' });
  });

  it('a 4.7 do plano padrão continua no custo dos serviços (#1296)', async () => {
    const unitId = 'unit-dre-ident-padrao';
    await preparar(unitId, false);
    await lancar(unitId, '4.7', 300n);
    const r = await dre(unitId);
    expect({ custo: r.custo['4.7'], despesasTemA47: Object.keys(r.despesas).includes('4.7'), net: r.net })
      .toEqual({ custo: '-300', despesasTemA47: false, net: '-300' });
  });
});
