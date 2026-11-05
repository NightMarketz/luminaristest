/**
 * FIX-TESTES item 4, lote 4 (BRIEF `FIX-TESTES-REPO-FALSO-POR-ROTA`, itens 3–4 e A7): 8 leituras/relatórios que não tinham
 * `request(app)` em integração (`docs/operating-manual/COBERTURA-ROTAS-CONTABIL-2026-11-05.md`). Prioridade: as que
 * alimentam demonstrativo ou entrega — razão, BP, DRE, DFC, balancete comparativo, Livro Diário, aging de AP e o detalhe da
 * entrega ao contador.
 *
 * A7: os esperados são FIXOS, calculados à mão a partir do cenário abaixo (nunca lidos do próprio sistema), com data de
 * referência literal. Cada rota tem também uma guarda no estado em que morde (escopo de outro dono, filtro inválido,
 * período vazio). Lançamentos entram pela rota `POST /api/accounting/post`; usuário, unidade, período OPEN, títulos de AP
 * e a linha da entrega vêm por `prisma.*` (a entrega real exige período HARD_CLOSED + revisão assinada; mesmo atalho de
 * `deliveryList.integration.test.ts`).
 *
 * Cenário (unidade `unit-l4-relatorios`, plano de contas padrão):
 *   E1 2026-03-02  D 1.1.1.01 Banco          / C 2.3.2.01 Capital   50.000 (500,00)
 *   E2 2026-03-10  D 1.1.2.01 A Receber      / C 3.1 Receita        20.000
 *   E3 2026-03-20  D 4.1 Despesas            / C 1.1.1.01 Banco      8.000
 *   E4 2026-04-05  D 1.1.1.01 Banco          / C 1.1.2.01 A Receber 15.000
 * Conta à mão:
 *   Banco:      31/03 = 50.000 − 8.000 = 42.000;   30/04 = 42.000 + 15.000 = 57.000
 *   A Receber:  31/03 = 20.000;                    30/04 = 20.000 − 15.000 =  5.000
 *   Ativo 30/04 = 57.000 + 5.000 = 62.000 = Capital 50.000 + resultado (20.000 − 8.000 = 12.000)
 *   DFC 2026 até 30/04: resultado 12.000, ajuste ΔA Receber −5.000 → operacional 7.000; financiamento (capital) 50.000;
 *     caixa 0 → 57.000 (= 7.000 + 50.000)
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';

const app = makeApp();
type U = { id: string; username: string };

const UNIT = 'unit-l4-relatorios';
let dono: U;
let outro: U;

async function criarUsuario(tag: string): Promise<U> {
  return prisma.user.create({
    data: { name: tag, username: tag, email: `${tag}@test.local`, password: 'x', role: 'USER' },
  });
}

async function lancar(date: string, debito: string, credito: string, cents: number) {
  const res = await request(app)
    .post('/api/accounting/post')
    .set(authHeader(dono))
    .send({
      unitId: UNIT,
      date,
      description: `${debito}/${credito}`,
      lines: [
        { accountCode: debito, debitCents: cents, creditCents: 0 },
        { accountCode: credito, debitCents: 0, creditCents: cents },
      ],
    });
  expect(res.status).toBe(201);
  return res.body.data.id as string;
}

const get = (u: U, url: string, query: Record<string, string>) => request(app).get(url).query(query).set(authHeader(u));

/** `{ código: valor }` de uma seção de demonstrativo (BP/DRE/DFC serializam centavos como string). */
const porConta = (accounts: Array<{ code: string; amountCents: string }>) =>
  Object.fromEntries(accounts.map((a) => [a.code, a.amountCents]));

let e1: string;
let e3: string;
let e4: string;

beforeAll(async () => {
  pushTestSchema();
  dono = await criarUsuario('l4-relatorios');
  outro = await criarUsuario('l4-relatorios-outro');
  await seedUnit({ userId: dono.id, id: UNIT });
  for (const month of [3, 4]) {
    await prisma.accountingPeriod.create({
      data: { userId: dono.id, unitId: UNIT, year: 2026, month, status: 'OPEN', openedAt: new Date(), openedById: dono.id },
    });
  }
  e1 = await lancar('2026-03-02', '1.1.1.01', '2.3.2.01', 50000);
  await lancar('2026-03-10', '1.1.2.01', '3.1', 20000);
  e3 = await lancar('2026-03-20', '4.1', '1.1.1.01', 8000);
  e4 = await lancar('2026-04-05', '1.1.1.01', '1.1.2.01', 15000);
}, 120000);

afterAll(async () => {
  await prisma.$disconnect();
});

// ── 1. GET /api/accounting/ledger ────────────────────────────────────────────────────────────────────────────────
describe('GET /api/accounting/ledger', () => {
  it('200: razão do Banco com as 3 pernas em ordem de data e saldo corrente 50.000 → 42.000 → 57.000', async () => {
    const res = await get(dono, '/api/accounting/ledger', { unitId: UNIT, accountCode: '1.1.1.01' });
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.account).toMatchObject({ code: '1.1.1.01', nature: 'Asset' });
    expect(
      d.rows.map((r: { entryId: string; debitCents: number; creditCents: number; runningBalanceCents: number }) => [
        r.entryId,
        r.debitCents,
        r.creditCents,
        r.runningBalanceCents,
      ]),
    ).toEqual([
      [e1, 50000, 0, 50000],
      [e3, 0, 8000, 42000],
      [e4, 15000, 0, 57000],
    ]);
    expect(d.closingBalanceCents).toBe(57000);
  });

  it('guarda: conta que não existe no plano do escopo → 404 (não um razão vazio)', async () => {
    const res = await get(dono, '/api/accounting/ledger', { unitId: UNIT, accountCode: '9.9.9.99' });
    expect(res.status).toBe(404);
    expect(res.body.data).toBeUndefined();
  });
});

// ── 2. GET /api/accounting/balance-sheet ─────────────────────────────────────────────────────────────────────────
describe('GET /api/accounting/balance-sheet', () => {
  it('200 em 30/04/2026: ativo 62.000 (Banco 57.000 + A Receber 5.000) = capital 50.000 + resultado 12.000', async () => {
    const res = await get(dono, '/api/accounting/balance-sheet', { unitId: UNIT, asOf: '2026-04-30' });
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.asOf).toBe('2026-04-30');
    expect(porConta(d.assets.accounts)).toEqual({ '1.1.1.01': '57000', '1.1.2.01': '5000' });
    expect(d.assets.totalCents).toBe('62000');
    expect(d.liabilities.totalCents).toBe('0');
    expect(porConta(d.equity.accounts)).toEqual({ '2.3.2.01': '50000' });
    expect(d.netResultLine).toMatchObject({ amountCents: '12000', fromDate: '2026-01-01', toDate: '2026-04-30' });
    expect(d.balanced).toBe(true);
  });

  it('guarda: 31/03/2026 recorta o snapshot (Banco 42.000, A Receber 20.000, ativo 62.000); `from` na query → 400', async () => {
    const marco = await get(dono, '/api/accounting/balance-sheet', { unitId: UNIT, asOf: '2026-03-31' });
    expect(marco.status).toBe(200);
    expect(porConta(marco.body.data.assets.accounts)).toEqual({ '1.1.1.01': '42000', '1.1.2.01': '20000' });

    const comFrom = await get(dono, '/api/accounting/balance-sheet', { unitId: UNIT, asOf: '2026-04-30', from: '2026-04-01' });
    expect(comFrom.status).toBe(400);
    expect(comFrom.body.error).toBe('FROM_DATE_NOT_SUPPORTED_IN_INCR4');
  });
});

// ── 3. GET /api/accounting/income-statement ──────────────────────────────────────────────────────────────────────
describe('GET /api/accounting/income-statement', () => {
  it('200 em 30/04/2026: receita 20.000, despesa −8.000, resultado 12.000, janela 01/01 → 30/04', async () => {
    const res = await get(dono, '/api/accounting/income-statement', { unitId: UNIT, asOf: '2026-04-30' });
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect([d.fromDate, d.toDate]).toEqual(['2026-01-01', '2026-04-30']);
    expect(porConta(d.grossRevenue.accounts)).toEqual({ '3.1': '20000' });
    expect(porConta(d.expenses.accounts)).toEqual({ '4.1': '-8000' });
    expect(d.netResult.amountCents).toBe('12000');
  });

  it('guarda: outro dono pedindo a DRE desta unidade → 404 e nenhum valor no corpo', async () => {
    const res = await get(outro, '/api/accounting/income-statement', { unitId: UNIT, asOf: '2026-04-30' });
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain('20000');
  });
});

// ── 4. GET /api/accounting/reports/cash-flow ─────────────────────────────────────────────────────────────────────
describe('GET /api/accounting/reports/cash-flow', () => {
  it('200 em 30/04/2026: operacional 12.000 − 5.000 = 7.000, financiamento 50.000, caixa 0 → 57.000 e reconcilia', async () => {
    const res = await get(dono, '/api/accounting/reports/cash-flow', { unitId: UNIT, asOf: '2026-04-30' });
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.method).toBe('indirect');
    expect(d.operating).toMatchObject({ netResultCents: '12000', adjustmentsCents: '-5000', totalCents: '7000' });
    expect(porConta(d.operating.accounts)).toEqual({ '1.1.2.01': '-5000', '3.1': '20000', '4.1': '-8000' });
    expect(d.investing.totalCents).toBe('0');
    expect(porConta(d.financing.accounts)).toEqual({ '2.3.2.01': '50000' });
    expect([d.openingCashCents, d.closingCashCents]).toEqual(['0', '57000']);
    expect(d.reconciliation).toEqual({ sectionsTotalCents: '57000', computedClosingCents: '57000', reconciles: true });
  });

  it('guarda: período vazio (exercício 2025, antes do 1º lançamento) → tudo zero; chave desconhecida → 400', async () => {
    const vazio = await get(dono, '/api/accounting/reports/cash-flow', { unitId: UNIT, asOf: '2025-12-31' });
    expect(vazio.status).toBe(200);
    expect(vazio.body.data).toMatchObject({
      fromDate: '2025-01-01',
      toDate: '2025-12-31',
      operating: { totalCents: '0' },
      financing: { totalCents: '0' },
      openingCashCents: '0',
      closingCashCents: '0',
    });

    const extra = await get(dono, '/api/accounting/reports/cash-flow', { unitId: UNIT, asOf: '2026-04-30', from: '2026-01-01' });
    expect(extra.status).toBe(400);
  });
});

// ── 5. GET /api/accounting/reports/period-comparison ─────────────────────────────────────────────────────────────
describe('GET /api/accounting/reports/period-comparison', () => {
  it('200 30/04 × 31/03: Banco 57.000 × 42.000 (+15.000), A Receber 5.000 × 20.000 (−15.000, −75%), resultado sem variação', async () => {
    const res = await get(dono, '/api/accounting/reports/period-comparison', {
      unitId: UNIT,
      asOfCurrent: '2026-04-30',
      asOfPrevious: '2026-03-31',
    });
    expect(res.status).toBe(200);
    const linhas = Object.fromEntries(
      res.body.data.rows.map((r: { code: string; current: number; previous: number; deltaAbs: number; deltaPct: number }) => [
        r.code,
        r,
      ]),
    );
    expect(Object.keys(linhas).sort()).toEqual(['1.1.1.01', '1.1.2.01', '2.3.2.01', '3.1', '4.1']);
    expect(linhas['1.1.1.01']).toMatchObject({ current: 57000, previous: 42000, deltaAbs: 15000 });
    expect(linhas['1.1.1.01'].deltaPct).toBeCloseTo((15000 / 42000) * 100, 10);
    expect(linhas['1.1.2.01']).toMatchObject({ current: 5000, previous: 20000, deltaAbs: -15000, deltaPct: -75 });
    // Saldo com sinal de natureza devedora: credoras saem negativas; nada mudou em abril.
    expect(linhas['2.3.2.01']).toMatchObject({ current: -50000, previous: -50000, deltaAbs: 0 });
    expect(linhas['3.1']).toMatchObject({ current: -20000, previous: -20000, deltaAbs: 0 });
    expect(linhas['4.1']).toMatchObject({ current: 8000, previous: 8000, deltaAbs: 0 });
  });

  it('guarda: data de calendário inexistente (2026-02-30) → 400; sem unitId → 400', async () => {
    const bad = await get(dono, '/api/accounting/reports/period-comparison', {
      unitId: UNIT,
      asOfCurrent: '2026-04-30',
      asOfPrevious: '2026-02-30',
    });
    expect(bad.status).toBe(400);
    const semUnit = await get(dono, '/api/accounting/reports/period-comparison', { asOfCurrent: '2026-04-30', asOfPrevious: '2026-03-31' });
    expect(semUnit.status).toBe(400);
  });
});

// ── 6. GET /api/accounting/reports/daily-journal ─────────────────────────────────────────────────────────────────
describe('GET /api/accounting/reports/daily-journal', () => {
  it('200 de 01/03 a 31/03/2026: E1, E2, E3 numerados 1..3, partidas iguais; E4 (abril) fica fora', async () => {
    const res = await get(dono, '/api/accounting/reports/daily-journal', { unitId: UNIT, from: '2026-03-01', to: '2026-03-31' });
    expect(res.status).toBe(200);
    const entries = res.body.data.entries as Array<{
      entryNumber: number;
      date: string;
      balanced: boolean;
      lines: Array<{ accountCode: string; debitCents: number; creditCents: number }>;
    }>;
    expect(entries.map((e) => [e.entryNumber, e.date, e.balanced])).toEqual([
      [1, '2026-03-02', true],
      [2, '2026-03-10', true],
      [3, '2026-03-20', true],
    ]);
    expect(entries.map((e) => e.lines.map((l) => `${l.accountCode}:${l.debitCents}/${l.creditCents}`))).toEqual([
      ['1.1.1.01:50000/0', '2.3.2.01:0/50000'],
      ['1.1.2.01:20000/0', '3.1:0/20000'],
      ['4.1:8000/0', '1.1.1.01:0/8000'],
    ]);
  });

  it('guarda: fevereiro (sem lançamento) → lista vazia; from > to → 400', async () => {
    const vazio = await get(dono, '/api/accounting/reports/daily-journal', { unitId: UNIT, from: '2026-02-01', to: '2026-02-28' });
    expect(vazio.status).toBe(200);
    expect(vazio.body.data.entries).toEqual([]);

    const invertido = await get(dono, '/api/accounting/reports/daily-journal', { unitId: UNIT, from: '2026-03-31', to: '2026-03-01' });
    expect(invertido.status).toBe(400);
  });
});

// ── 7. GET /api/accounting/reports/aging ─────────────────────────────────────────────────────────────────────────
describe('GET /api/accounting/reports/aging', () => {
  beforeAll(async () => {
    const despesa = await prisma.account.findFirstOrThrow({ where: { userId: dono.id, unitId: UNIT, code: '4.1' } });
    const forn = await prisma.counterparty.create({
      data: { userId: dono.id, unitId: UNIT, type: 'SUPPLIER', name: 'Fornecedor L4', nameNormalized: 'fornecedor l4', createdById: dono.id },
    });
    const titulo = (documentNumber: string, dueDate: string, amountCents: number, status: string, paidCents = 0) =>
      prisma.payable.create({
        data: {
          userId: dono.id,
          unitId: UNIT,
          supplierName: 'Fornecedor L4',
          documentNumber,
          description: documentNumber,
          issueDate: new Date('2026-03-01'),
          dueDate: new Date(dueDate),
          amountCents,
          paidCents,
          expenseAccountId: despesa.id,
          counterpartyId: forn.id,
          status,
        },
      });
    await titulo('NF-L4-A', '2026-04-10', 30000, 'OPEN'); // 20/05 − 10/04 = 40 dias → 31–60
    await titulo('NF-L4-B', '2026-05-31', 12000, 'OPEN'); // vence depois de 20/05 → a vencer
    await titulo('NF-L4-C', '2026-05-05', 10000, 'PARTIALLY_PAID', 4000); // 15 dias, em aberto 6.000 → 1–30
    await titulo('NF-L4-D', '2026-01-10', 99000, 'PAID', 99000); // quitado: fora do aging
  });

  it('200 AP em 20/05/2026: a vencer 12.000, 1–30 6.000, 31–60 30.000; total 48.000; quitado fora', async () => {
    const res = await get(dono, '/api/accounting/reports/aging', { unitId: UNIT, kind: 'payable', asOf: '2026-05-20' });
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.buckets).toEqual({ a_vencer: '12000', d1_30: '6000', d31_60: '30000', d61_90: '0', d90_plus: '0' });
    expect(d.totalCents).toBe('48000');
    expect(d.groups).toHaveLength(1);
    const docs = Object.fromEntries(
      d.groups[0].documents.map((x: { documentNumber: string; daysOverdue: number; bucket: string; amountCents: string }) => [
        x.documentNumber,
        [x.daysOverdue, x.bucket, x.amountCents],
      ]),
    );
    expect(docs).toEqual({
      'NF-L4-A': [40, 'd31_60', '30000'],
      'NF-L4-B': [-11, 'a_vencer', '12000'],
      'NF-L4-C': [15, 'd1_30', '6000'],
    });
    // asOf ≠ hoje: a prova subrazão↔razão não é emitível e o relatório diz por quê.
    expect([d.tieOut, d.tieOutSkippedReason]).toEqual([null, 'as_of_not_today']);
  });

  it('guarda: outro dono → 404; kind fora do enum → 400', async () => {
    const alheio = await get(outro, '/api/accounting/reports/aging', { unitId: UNIT, kind: 'payable', asOf: '2026-05-20' });
    expect(alheio.status).toBe(404);
    expect(JSON.stringify(alheio.body)).not.toContain('NF-L4');

    const kind = await get(dono, '/api/accounting/reports/aging', { unitId: UNIT, kind: 'tax', asOf: '2026-05-20' });
    expect(kind.status).toBe(400);
  });
});

// ── 8. GET /api/accounting/delivery/:id ──────────────────────────────────────────────────────────────────────────
describe('GET /api/accounting/delivery/:id', () => {
  const criarEntrega = async (userId: string, year: number) => {
    const contact = await prisma.accountingContact.create({
      data: { userId, unitId: UNIT, name: `Contador ${year}`, email: 'c@x.com', cpf: '52998224725', crcNumber: 'SP-000777/O-1', crcUf: 'SP' },
    });
    const job = (kind: string) =>
      prisma.accountingDataExchangeJob.create({
        data: { userId, unitId: UNIT, direction: 'EXPORT', kind, status: 'EXPORTED', requestedById: userId, sha256: `sha-${kind}-${year}` },
      });
    const ecd = await job('EXPORT_SPED_ECD');
    const ecf = await job('EXPORT_SPED_ECF');
    return prisma.accountingDeliveryLog.create({
      data: {
        userId,
        unitId: UNIT,
        contactId: contact.id,
        ecdJobId: ecd.id,
        ecfJobId: ecf.id,
        periodStart: new Date(Date.UTC(year, 0, 1)),
        periodEnd: new Date(Date.UTC(year, 11, 31)),
        manifestSha256Ecd: `manifest-ecd-${year}`,
        manifestSha256Ecf: `manifest-ecf-${year}`,
        status: 'SENT',
        requestedById: userId,
      },
    });
  };

  let minha: { id: string; contactId: string; ecdJobId: string; ecfJobId: string };
  let alheia: { id: string };

  beforeAll(async () => {
    minha = await criarEntrega(dono.id, 2025);
    alheia = await criarEntrega(outro.id, 2024);
  });

  it('200: devolve a entrega do escopo com contador, os dois jobs, o exercício 2025 e os manifestos', async () => {
    const res = await get(dono, `/api/accounting/delivery/${minha.id}`, { unitId: UNIT });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: minha.id,
      contactId: minha.contactId,
      ecdJobId: minha.ecdJobId,
      ecfJobId: minha.ecfJobId,
      status: 'SENT',
      manifestSha256Ecd: 'manifest-ecd-2025',
      manifestSha256Ecf: 'manifest-ecf-2025',
    });
    expect(new Date(res.body.data.periodStart).toISOString()).toBe('2025-01-01T00:00:00.000Z');
    expect(new Date(res.body.data.periodEnd).toISOString()).toBe('2025-12-31T00:00:00.000Z');
  });

  it('guarda: id de entrega de outro dono na mesma unidade → 404 sem vazar o manifesto; sem unitId → 400', async () => {
    const res = await get(dono, `/api/accounting/delivery/${alheia.id}`, { unitId: UNIT });
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain('manifest-ecd-2024');

    // AccountingDeliveryScopeQuerySchema não é `.strict()` (chave extra passa); o que a borda exige é o escopo.
    const semUnit = await get(dono, `/api/accounting/delivery/${minha.id}`, {});
    expect(semUnit.status).toBe(400);
  });
});
