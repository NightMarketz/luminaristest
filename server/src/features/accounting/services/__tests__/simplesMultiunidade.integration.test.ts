/**
 * Teste-guarda da lacuna L-20261121-200757-976c (P0, fiscal G1, gatilho norma) — sessão de instrumentação.
 *
 * A apuração do Simples soma só a receita da unidade do escopo (`ReceitaFiscalRepository.somaPorCompetencia`, where
 * `accountingScopeWhere` = userId+unitId; `SimplesApuracaoService.montar` → RBT12, faixa, `limites`). A Res. CGSN 140
 * art. 16 § 2º manda somar a receita de TODOS os estabelecimentos da ME/EPP: PJ com 2+ unidades sai com o DAS na faixa
 * errada e o limite subavaliado, sem aviso.
 *
 * Destino decidido pelo dreno (26/11): CONTENÇÃO — o Simples recusa a PJ multiunidade com 400 que nomeia a outra
 * unidade, como o IRPJ/CSLL já faz (`TaxAssessmentService.ts:750-755`, `taxAssessment.integration.test.ts` "23 g").
 * A soma dos estabelecimentos (a estrutural) segue no montador único (EFICIENCIA-FISCAL) e no grupo CGSN 196 (#1436).
 *
 * Cenário: duas unidades do MESMO dono, as duas com receita real (venda finalizada pela ponte → subrazão + razão) no
 * mesmo mês (2026-06); a apuração de 2026-07 da Matriz (que vende também no PA) tem 2026-06 dentro da janela do RBT12
 * (2025-07..2026-06).
 * Hoje: 200 com RBT12 = só a Matriz (R$ 590.000); o somado seria R$ 620.000. O guarda passa quando calcular e registrar
 * o DAS recusarem com 400 nomeando a Filial. Código/mensagem do erro ficam livres para a correção (só o 400 e a unidade
 * nomeada são o contrato, como no precedente do IRPJ).
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { ApplicationFactory } from '@/lib/factory';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';
import { maybeSyncSaleFinalized } from '@/features/accounting/sync/bridges/SaleSalesAccountingBridge';

const app = makeApp();
let user: { id: string; username: string };
let tables: Record<'sales' | 'saleItems' | 'units', string>;
let MATRIZ: string;
let FILIAL: string;
const scope = (unitId: string): AccountingScope => resolveAccountingScopeInternal({ userId: user.id }, unitId);
const f = () => ApplicationFactory.getInstance();
const S = '/api/accounting/simples';

async function row(table: keyof typeof tables, data: Record<string, unknown>) {
  const stored = typeof data.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.date) ? { ...data, date: `${data.date}T00:00:00.000Z` } : data;
  return prisma.dynamicTableData.create({ data: { dynamicTableId: tables[table], data: stored as never } });
}
async function venda(unitId: string, date: string, reais: number) {
  const sale = await row('sales', { status: 'Finalized', unitId, totalAmount: reais, currency: 'BRL', date, paymentStatus: 'Pending' });
  await row('saleItems', { saleId: sale.id, type: 'Service', serviceId: 'srv-corte', description: 'Corte', quantity: 1, unitPrice: reais });
  await maybeSyncSaleFinalized({ userId: user.id }, tables.sales, { id: sale.id, data: sale.data });
  return sale;
}
/** Unidade do Simples pronta para vender: plano de contas, 2026-06 e 2026-07 abertos, serviço com cTribNac e perfil SIMPLES de 2026. */
async function prepararUnidade(unitId: string) {
  await f().getPostingService().ensureChartOfAccounts(scope(unitId));
  for (const month of [6, 7]) await prisma.accountingPeriod.create({ data: { userId: user.id, unitId, year: 2026, month, status: 'OPEN', openedAt: new Date() } });
  await prisma.serviceFiscalProfile.create({ data: { userId: user.id, unitId, serviceRef: 'srv-corte', cTribNac: '060101' } });
  const perfil = await request(app).put('/api/accounting/company-fiscal-profile/2026').set(authHeader(user)).send({ unitId, regime: 'SIMPLES' });
  expect(perfil.status).toBe(200);
}

// Síncrono à parte: o build a frio do banco-modelo passa de 5 s e estouraria o timeout de um hook async.
beforeAll(() => pushTestSchema());
beforeAll(async () => {
  const u = await prisma.user.create({ data: { name: 'l976c', username: 'l976c', email: 'l976c@test.local', password: 'x', role: 'USER' } });
  user = { id: u.id, username: u.username };
  const created = await request(app).post('/api/dashboard/create').set(authHeader(user)).send({ suiteKey: 'beautySalon', unit: { name: 'Matriz' } });
  expect(created.status).toBe(201);
  const byName = async (n: string) => (await prisma.dynamicTable.findFirstOrThrow({ where: { userId: user.id, internalName: n } })).id;
  tables = { sales: await byName('sales'), saleItems: await byName('saleItems'), units: await byName('units') };
  // Mesma PJ (raiz 11.222.333), dois estabelecimentos: 0001-81 e 0002-62.
  MATRIZ = (await row('units', { name: 'Matriz', cnpj: '11222333000181' })).id;
  FILIAL = (await row('units', { name: 'Filial', cnpj: '11222333000262' })).id;
  await prepararUnidade(MATRIZ);
  await prepararUnidade(FILIAL);
  // Pré-adoção da Matriz: R$ 50.000/mês de 2025-07 a 2026-05 (11 meses).
  for (let i = 0; i < 11; i++) {
    const m = new Date(Date.UTC(2025, 6 + i, 1)).toISOString().slice(0, 7);
    await f().getSimplesEntradasService().upsertHistorico(scope(MATRIZ), m, { unitId: MATRIZ, receitaBrutaCents: 5_000_000 });
  }
  // O mesmo mês, nas duas unidades, valores distintos para "só a Matriz" e "a soma" não se confundirem.
  await venda(MATRIZ, '2026-06-10', 40_000);
  await venda(FILIAL, '2026-06-12', 30_000);
  // O PA (2026-07) da Matriz precisa de atividade: sem ela a montagem cai em ATIVIDADE_SEM_ANEXO (rbt12Cents = 0, DAS
  // bloqueado) e o vermelho deixaria de mostrar o RBT12 de uma unidade só.
  await venda(MATRIZ, '2026-07-05', 20_000);
});
afterAll(() => prisma.$disconnect());

describe('L-20261121-200757-976c — Simples com PJ multiunidade (Res. CGSN 140 art. 16 § 2º)', () => {
  it('Matriz e Filial com receita em 2026-06 ⇒ calcular e registrar o DAS de 2026-07 da Matriz recusam com 400 nomeando a Filial', async () => {
    // Pré-condição (não é a lacuna): a Filial tem receita real em 2026-06 — no subrazão E no razão —, seja qual for o
    // detector que a correção usar (`receitaFiscalLinha` ou `postingRepo.unitIdsWithMovement`, o do IRPJ).
    expect(await prisma.receitaFiscalLinha.count({ where: { userId: user.id, unitId: FILIAL, competencia: '2026-06' } })).toBeGreaterThan(0);
    expect(
      await prisma.posting.count({ where: { userId: user.id, unitId: FILIAL, entry: { status: 'Posted', date: { gte: new Date('2026-06-01T00:00:00.000Z'), lt: new Date('2026-07-01T00:00:00.000Z') } } } }),
    ).toBeGreaterThan(0);

    const calc = await request(app).post(`${S}/apuracoes/2026-07/calcular`).set(authHeader(user)).send({ unitId: MATRIZ });
    const das = await request(app)
      .put(`${S}/apuracoes/2026-07/das`)
      .set(authHeader(user))
      .send({ unitId: MATRIZ, vencimento: '2026-08-20', numeroDocumento: '07202617000000976', valorCents: 1 });

    // Hoje: calcular = 200 com rbt12Cents = 59_000_000 (só a Matriz: 11 × R$ 50.000 + R$ 40.000; a Filial, R$ 30.000,
    // fica de fora) e a apuração não nomeia a Filial; o DAS registra (200) e persiste a apuração errada.
    expect({
      calcular: { status: calc.status, rbt12Cents: calc.body?.data?.rbt12Cents ?? null, nomeiaFilial: JSON.stringify(calc.body).includes(FILIAL) },
      das: { status: das.status, nomeiaFilial: JSON.stringify(das.body).includes(FILIAL) },
    }).toEqual({
      calcular: { status: 400, rbt12Cents: null, nomeiaFilial: true },
      das: { status: 400, nomeiaFilial: true },
    });
    expect(await prisma.simplesApuracao.count({ where: { userId: user.id } })).toBe(0);
  });
});
