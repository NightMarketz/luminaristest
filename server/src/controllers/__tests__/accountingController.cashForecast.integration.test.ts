/**
 * CONTRATO HTTP de `getCashForecast` (accountingController) — app Express REAL sobre supertest +
 * SQLite REAL, sem mock de prisma e sem mock de serviço. Mesmo molde de
 * `accountingController.integration.test.ts` / `accountingController.periods.integration.test.ts`
 * / `reconcilePendingController.integration.test.ts` (dono A × dono B).
 *
 * PÓS-REVIEW (PR #298, achado 1 — ALTO): a tenancy do forecast só tinha prova em
 * `CashForecastReportService.test.ts` (repos MOCKADOS) e `outstandingLines.integration.test.ts`
 * (SQLite real, mas um único dono) — nunca ponta-a-ponta pela rota+auth real
 * (`authMiddleware → rota → DTO → controller → resolveAccountingScope → service →
 * loadOutstandingPayables/Receivables → PayableRepository/ReceivableRepository → Prisma`, produção
 * rodando).
 *
 * A FORMA DA RECUSA (conforme o mecanismo real, lido em `AccountingScope.ts`/`AccountingPolicy.ts`,
 * não assumida): não há NotFoundError/ForbiddenError por `unitId` alheio — `accountingScopeWhere`
 * usa `{ userId: scope.ownerUserId, unitId: scope.unitId }`, e `ownerUserId` vem SEMPRE do JWT
 * autenticado (`resolveAccountingScope`), nunca de input do cliente. Por isso o forecast do dono B
 * sobre a MESMA `unitId` do dono A é 200 com o título de A AUSENTE do drill (não 404) — mesmo
 * padrão do `reconcile-pending` (`reconcilePendingController.integration.test.ts`) e da listagem de
 * balancete em `accountingController.integration.test.ts`.
 *
 * CADA CASO NEGATIVO TEM CONTROLE — dono A enxergando o PRÓPRIO título prova que a ausência acima é
 * a guarda mordendo, não o endpoint quebrado para todo mundo.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { normalizeCounterpartyName } from '@/features/accounting/models/Counterparty.model';

const app = makeApp();

const UNIT = 'unit-cash-forecast-http';
const AS_OF = '2026-07-16';
const DUE_DATE = '2026-07-20'; // dentro do horizonte de 90 dias a partir de AS_OF

let donoA: { id: string; username: string };
let donoB: { id: string; username: string };

const criarUsuario = (username: string) =>
  prisma.user.create({
    data: { name: username, username, email: `${username}@test.local`, password: 'x', role: 'USER' },
  });

describe('accountingController.getCashForecast — contrato HTTP em SQLite real (tenancy, pós-review PR #298 achado 1)', () => {
  beforeAll(async () => {
    pushTestSchema();
    donoA = await criarUsuario('cash-forecast-http-a');
    donoB = await criarUsuario('cash-forecast-http-b');

    // Fixtures do dono A: conta de despesa/receita + contraparte + 1 payable + 1 receivable, ambos
    // com dueDate dentro da janela [AS_OF, AS_OF+90].
    await prisma.account.create({
      data: { id: 'acc-exp-http-a', userId: donoA.id, unitId: UNIT, code: '4.1', name: 'Despesas', nature: 'Expense', acceptsEntries: true },
    });
    await prisma.account.create({
      data: { id: 'acc-rev-http-a', userId: donoA.id, unitId: UNIT, code: '3.1', name: 'Receitas', nature: 'Revenue', acceptsEntries: true },
    });
    await prisma.counterparty.create({
      data: {
        id: 'cp-cf-http-a', userId: donoA.id, unitId: UNIT, type: 'SUPPLIER', name: 'Contraparte A',
        nameNormalized: normalizeCounterpartyName('Contraparte A'), createdById: donoA.id,
      },
    });
    await prisma.payable.create({
      data: {
        id: 'p-cf-http-a', userId: donoA.id, unitId: UNIT, supplierName: 'Fornecedor A', documentNumber: 'NF-cf-http-a',
        description: 'x', issueDate: new Date('2026-06-01'), dueDate: new Date(DUE_DATE),
        amountCents: 30000, expenseAccountId: 'acc-exp-http-a', counterpartyId: 'cp-cf-http-a', status: 'OPEN',
      },
    });
    await prisma.receivable.create({
      data: {
        id: 'r-cf-http-a', userId: donoA.id, unitId: UNIT, customerName: 'Cliente A', documentNumber: 'FT-cf-http-a',
        description: 'x', issueDate: new Date('2026-06-01'), dueDate: new Date(DUE_DATE),
        amountCents: 50000, revenueAccountId: 'acc-rev-http-a', counterpartyId: 'cp-cf-http-a', status: 'OPEN',
      },
    });
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('inquilino: forecast do dono B, mesma unitId, não devolve o payable/receivable do dono A', async () => {
    const doB = await request(app)
      .get('/api/accounting/reports/cash-forecast')
      .set(authHeader(donoB))
      .query({ unitId: UNIT, asOf: AS_OF });

    expect(doB.status).toBe(200);
    const idsB = doB.body.data.lines.flatMap((l: { documents: { id: string }[] }) => l.documents.map((d) => d.id));
    expect(idsB).not.toContain('p-cf-http-a');
    expect(idsB).not.toContain('r-cf-http-a');
    expect(doB.body.data.totalInflowCents).toBe('0');
    expect(doB.body.data.totalOutflowCents).toBe('0');

    // Controle: o PRÓPRIO dono enxerga — a ausência acima é a guarda, não um endpoint quebrado.
    const doA = await request(app)
      .get('/api/accounting/reports/cash-forecast')
      .set(authHeader(donoA))
      .query({ unitId: UNIT, asOf: AS_OF });

    expect(doA.status).toBe(200);
    const idsA = doA.body.data.lines.flatMap((l: { documents: { id: string }[] }) => l.documents.map((d) => d.id));
    expect(idsA).toContain('p-cf-http-a');
    expect(idsA).toContain('r-cf-http-a');
    expect(doA.body.data.totalOutflowCents).toBe('30000');
    expect(doA.body.data.totalInflowCents).toBe('50000');
  });
});
