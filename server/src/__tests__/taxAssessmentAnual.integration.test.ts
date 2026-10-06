/**
 * X7 Fase B PR-3 (BRIEF B itens 5, 6, 11, 13–17; testes 26 b, c, m) — Lucro Real ANUAL sobre o app Express REAL +
 * SQLite REAL: estimativa por receita bruta, balancete de suspensão/redução, ajuste anual, ordem dos meses, cascata,
 * gate de meses fechados e provisão mensal + diferença do A00.
 *
 * O `ANUAL` ainda não é selecionável pelo DTO do perfil (F-TB-8.1: só no PR-4): o perfil é semeado pelo Prisma.
 * Cada cenário tem ano e unidade próprios, com início de atividade em 01/11 — só A11 e A12 estão em atividade, e o
 * ajuste anual precisa só deles (F-TA-4 b).
 *
 * Contas de mão (serviço, sem LC 224 na estimativa — P-B3; CSLL 9%):
 *  - A11 por receita bruta, receita 100.000,00: base IRPJ 32% = 32.000,00 → 15% 4.800,00 + 10% × (32.000 − 20.000)
 *    1.200,00 = 6.000,00; CSLL 32% × 9% = 2.880,00.
 *  - 2040, A12 por balancete (Nov–Dez, receita 150.000,00, sem despesa): IRPJ do período = 15% × 150.000 = 22.500,00 +
 *    10% × (150.000 − 20.000 × 2) = 11.000,00 → 33.500,00 − 6.000,00 do A11 = 27.500,00 (redução); CSLL 13.500,00 −
 *    2.880,00 = 10.620,00. Ajuste A00 (2 meses em atividade) = os mesmos 33.500,00 / 13.500,00 ⇒ diferença 0.
 *  - 2041, despesa de 90.000,00 em dezembro: LAIR do período e do ano = 10.000,00 → IRPJ 1.500,00 ≤ 6.000,00 ⇒ A12
 *    suspenso; CSLL 900,00 ≤ 2.880,00 ⇒ suspenso. A00: 1.500,00 − 6.000,00 = −4.500,00 (IRPJ) e 900,00 − 2.880,00 =
 *    −1.980,00 (CSLL) ⇒ D saldo negativo / C despesa (26 m).
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { ApplicationFactory } from '@/lib/factory';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();
const BASE = '/api/accounting/tax-assessments';
const PROVISION = 'tax.assessment.provision';

let dono: { id: string; username: string };
const scopeOf = (unitId: string) => resolveAccountingScope({ userId: dono.id }, unitId);

const CONTAS = [
  { code: '1.1.1', name: 'Banco', nature: 'Asset' },
  { code: '1.2.9.1', name: 'IRPJ saldo negativo a compensar', nature: 'Asset' },
  { code: '1.2.9.2', name: 'CSLL saldo negativo a compensar', nature: 'Asset' },
  { code: '2.3.1', name: 'Lucros ou Prejuízos Acumulados', nature: 'Equity' },
  { code: '3.1', name: 'Receita de Serviços', nature: 'Revenue' },
  { code: '4.1', name: 'Despesas gerais', nature: 'Expense' },
  { code: '4.9.1', name: 'IRPJ', nature: 'Expense' },
  { code: '4.9.2', name: 'CSLL', nature: 'Expense' },
  { code: '2.1.9.1', name: 'IRPJ a recolher', nature: 'Liability' },
  { code: '2.1.9.2', name: 'CSLL a recolher', nature: 'Liability' },
];

async function cenario(unitId: string, ano: number) {
  const ids: Record<string, string> = {};
  for (const c of CONTAS) ids[c.code] = (await prisma.account.create({ data: { userId: dono.id, unitId, ...c, acceptsEntries: true } })).id;
  for (let month = 1; month <= 12; month++) {
    await prisma.accountingPeriod.create({ data: { userId: dono.id, unitId, year: ano, month, status: 'OPEN', openedAt: new Date() } });
  }
  await prisma.companyFiscalProfile.create({
    data: {
      userId: dono.id, anoCalendario: ano, regime: 'REAL', formaApuracaoIrpjCsll: 'ANUAL', lucroRealObrigatorio: false,
      inicioAtividadeEm: `${ano}-11-01`, ecfIndAliqCsll: '1', ecfIndRecReceita: '2',
    },
  });
  await prisma.fiscalProfile.create({
    data: {
      userId: dono.id, unitId, regimeTributario: 'REAL', pisCofinsRegime: 'NAO_CUMULATIVO',
      irpjDespesaAccountId: ids['4.9.1'], csllDespesaAccountId: ids['4.9.2'], irpjRecolherAccountId: ids['2.1.9.1'], csllRecolherAccountId: ids['2.1.9.2'],
      irpjSaldoNegativoAccountId: ids['1.2.9.1'], csllSaldoNegativoAccountId: ids['1.2.9.2'],
    },
  });
  return ids;
}

const lancar = (unitId: string, date: string, debito: string, credito: string, cents: number) =>
  ApplicationFactory.getInstance().getPostingService().postEntry(scopeOf(unitId), {
    unitId, date, sourceType: 'manual', description: `${debito}/${credito}`,
    lines: [{ accountCode: debito, debitCents: cents, creditCents: 0 }, { accountCode: credito, debitCents: 0, creditCents: cents }],
  });

const preview = (unitId: string, ano: number, periodo: string, extra: Record<string, unknown> = {}) =>
  request(app).post(`${BASE}/preview`).set(authHeader(dono)).send({ unitId, anoCalendario: ano, periodo, ...extra });

async function confirmar(unitId: string, ano: number, periodo: string, extra: Record<string, unknown> = {}) {
  const { supersedesIds: _s, ...doPreview } = extra; // a prévia não substitui nada (.strict())
  const p = await preview(unitId, ano, periodo, doPreview);
  expect(p.status).toBe(200);
  return request(app)
    .post(BASE)
    .set(authHeader(dono))
    .send({ unitId, anoCalendario: ano, periodo, expectedAPagarCents: { IRPJ: p.body.data.irpj.aPagarCents, CSLL: p.body.data.csll.aPagarCents }, ...extra });
}

const linha = (memoria: Array<{ codigo: string; valorCents: string }>, codigo: string) => memoria.find((l) => l.codigo === codigo)?.valorCents;
const provisoes = (unitId: string) =>
  prisma.journalEntry.findMany({ where: { unitId, sourceType: PROVISION }, include: { postings: { include: { account: true } } }, orderBy: { createdAt: 'asc' } });
const lancamentoDe = async (unitId: string, assessmentId: string) => (await provisoes(unitId)).find((e) => e.sourceId === assessmentId);
const partidas = (e: { postings: Array<{ account: { code: string }; debitCents: bigint | number; creditCents: bigint | number }> }) =>
  e.postings.map((p) => [p.account.code, Number(p.debitCents), Number(p.creditCents)]).sort();
const fechar = (unitId: string, ano: number, month: number) =>
  prisma.accountingPeriod.updateMany({ where: { userId: dono.id, unitId, year: ano, month }, data: { status: 'SOFT_CLOSED' } });

describe('X7 Fase B PR-3 — Lucro Real anual (estimativa, balancete, ajuste, provisão)', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'x7b3', username: 'x7-b-pr3', email: 'x7-b-pr3@test.local', password: 'x', role: 'USER' } });
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('2040 — receita bruta, balancete com redução, ajuste igual aos meses, cascata', () => {
    const U = 'u-x7b-2040';
    const ANO = 2040;

    beforeAll(async () => {
      await cenario(U, ANO);
      await lancar(U, `${ANO}-11-10`, '1.1.1', '3.1', 10_000_000);
    });

    it('item 11: período × forma e modoMensal — T04 e modo ausente ⇒ 400; A12 antes do A11 ⇒ 409 de ordem', async () => {
      const t04 = await preview(U, ANO, 'T04');
      expect(t04.status).toBe(400);
      expect(JSON.stringify(t04.body)).toContain('o período trimestral exige a forma TRIMESTRAL');
      expect((await preview(U, ANO, 'A11')).status).toBe(400); // modoMensal obrigatório
      expect((await preview(U, ANO, 'A00', { modoMensal: 'RECEITA_BRUTA' })).status).toBe(400); // proibido fora do mês
      const ordem = await confirmar(U, ANO, 'A12', { modoMensal: 'RECEITA_BRUTA' });
      expect(ordem.status).toBe(409);
      expect(JSON.stringify(ordem.body)).toContain('confirme A11/2040');
    });

    it('itens 7 e 16 + 26 (c): A11 por receita bruta — IRPJ 6.000,00 / CSLL 2.880,00, mesmo modo, provisão no último dia do mês; auditoria com modo', async () => {
      const r = await confirmar(U, ANO, 'A11', { modoMensal: 'RECEITA_BRUTA' });
      expect(r.status).toBe(201);
      const { irpj, csll } = r.body.data;
      expect([irpj.modo, csll.modo]).toEqual(['ESTIMATIVA_RECEITA', 'ESTIMATIVA_RECEITA']);
      expect([irpj.devidoCents, csll.devidoCents]).toEqual(['600000', '288000']);
      expect([irpj.diferencaPostergadaCents, irpj.provisaoPendente, csll.provisaoPendente]).toEqual(['0', false, false]);
      const e = (await lancamentoDe(U, irpj.id))!;
      expect(e.date.toISOString().slice(0, 10)).toBe('2040-11-30');
      expect(partidas(e)).toEqual([['2.1.9.1', 0, 600_000], ['4.9.1', 600_000, 0]]);
      const ev = await prisma.auditEvent.findFirstOrThrow({ where: { eventType: 'tax.assessment.confirmed', targetId: irpj.id } });
      expect(JSON.parse(ev.payload)).toMatchObject({ periodo: 'A11', modo: 'ESTIMATIVA_RECEITA', diferencaPostergadaCents: '0' });
    });

    it('26 (b): receita lançada depois no mês confirmado não muda a estimativa; o balancete de A12 lê o devido CONFIRMADO do A11', async () => {
      await lancar(U, `${ANO}-11-20`, '1.1.1', '3.1', 5_000_000); // novembro ainda aberto
      const a11 = await prisma.taxAssessment.findFirstOrThrow({ where: { unitId: U, periodo: 'A11', tributo: 'IRPJ', status: 'CONFIRMED' } });
      expect(a11.devidoCents).toBe(600_000n); // o confessado não se relê do razão (F-TA-3 a)
      const p = await preview(U, ANO, 'A12', { modoMensal: 'BALANCETE' });
      expect(p.status).toBe(200);
      expect(linha(p.body.data.irpj.memoria, 'DEVIDO_MESES_ANTERIORES')).toBe('600000');
      expect(p.body.data.irpj.memoria.find((l: { codigo: string }) => l.codigo === 'DEVIDO_MESES_ANTERIORES').descricao).toContain(a11.id);
      // item 15: a prévia avisa novembro aberto, sem recusar
      expect(p.body.data.avisos.join(' ')).toContain('meses ainda abertos (A11)');
    });

    it('item 15 (F-TB-4 b): balancete com o mês anterior aberto ⇒ 400 na confirmação; fechado (SOFT_CLOSED) passa — e o lançamento retroativo nele é recusado', async () => {
      const aberto = await confirmar(U, ANO, 'A12', { modoMensal: 'BALANCETE' });
      expect(aberto.status).toBe(400);
      expect(JSON.stringify(aberto.body)).toContain('feche antes os meses A11');
      await fechar(U, ANO, 11);
      await expect(lancar(U, `${ANO}-11-25`, '1.1.1', '3.1', 1_000)).rejects.toThrow(); // 26 (b): mês fechado não recebe lançamento
      const r = await confirmar(U, ANO, 'A12', { modoMensal: 'BALANCETE' });
      expect(r.status).toBe(201);
      const { irpj, csll } = r.body.data;
      expect([irpj.modo, csll.modo]).toEqual(['BALANCETE_SUSPENSAO_REDUCAO', 'BALANCETE_SUSPENSAO_REDUCAO']); // 26 (c)
      expect([linha(irpj.memoria, 'DEVIDO_PERIODO_EM_CURSO'), irpj.devidoCents, csll.devidoCents]).toEqual(['3350000', '2750000', '1062000']);
      expect(linha(irpj.memoria, 'REDUCAO')).toBe('2750000');
      const e = (await lancamentoDe(U, irpj.id))!;
      expect(e.date.toISOString().slice(0, 10)).toBe('2040-12-31');
      expect(partidas(e)).toEqual([['2.1.9.1', 0, 2_750_000], ['4.9.1', 2_750_000, 0]]);
    });

    it('item 10/16: A00 sem a Parte B fechada ⇒ 400; fechada, o ajuste igual aos meses não lança nada e não fica pendente; estimativasPagas repetida ⇒ 400', async () => {
      const semParteB = await preview(U, ANO, 'A00');
      expect(semParteB.status).toBe(400);
      expect(JSON.stringify(semParteB.body)).toContain('Feche a Parte B');
      expect((await request(app).post('/api/lalur/parte-b/close').set(authHeader(dono)).send({ unitId: U, year: ANO, quarter: 'A00' })).status).toBe(200);
      const dup = await preview(U, ANO, 'A00', { estimativasPagas: [{ periodo: 'A11', tributo: 'IRPJ', valorCents: '1' }, { periodo: 'A11', tributo: 'IRPJ', valorCents: '2' }] });
      expect(dup.status).toBe(400);
      expect(JSON.stringify(dup.body)).toContain('A11/IRPJ repetido');
      const r = await confirmar(U, ANO, 'A00');
      expect(r.status).toBe(201);
      const { irpj, csll } = r.body.data;
      expect([irpj.modo, irpj.devidoCents, csll.devidoCents]).toEqual(['AJUSTE_ANUAL', '3350000', '1350000']);
      expect([linha(irpj.memoria, 'PROVISAO_AJUSTE_ANUAL'), linha(csll.memoria, 'PROVISAO_AJUSTE_ANUAL')]).toEqual(['0', '0']);
      expect([irpj.provisaoPendente, csll.provisaoPendente]).toEqual([false, false]);
      expect(await lancamentoDe(U, irpj.id)).toBeUndefined();
    });

    it('item 13 (cascata, decisão do dono 05/10): substituir o A11 derruba A12 e A00, estorna a provisão do A12 e devolve reconfirmar', async () => {
      await prisma.accountingPeriod.updateMany({ where: { userId: dono.id, unitId: U, year: ANO, month: 11 }, data: { status: 'OPEN' } });
      const vivos = await prisma.taxAssessment.findMany({ where: { unitId: U, periodo: 'A11', status: 'CONFIRMED' } });
      const a12Irpj = await prisma.taxAssessment.findFirstOrThrow({ where: { unitId: U, periodo: 'A12', tributo: 'IRPJ', status: 'CONFIRMED' } });
      const r = await confirmar(U, ANO, 'A11', { modoMensal: 'RECEITA_BRUTA', supersedesIds: vivos.map((v) => v.id) });
      expect(r.status).toBe(201);
      expect(r.body.data.reconfirmar).toEqual(['A00', 'A12']);
      expect(await prisma.taxAssessment.count({ where: { unitId: U, periodo: { in: ['A12', 'A00'] }, status: 'CONFIRMED' } })).toBe(0);
      const e = (await lancamentoDe(U, a12Irpj.id))!;
      expect(e.reversedById).not.toBeNull();
    });
  });

  describe('2041 — balancete com suspensão e ajuste anual negativo (26 m)', () => {
    const U = 'u-x7b-2041';
    const ANO = 2041;

    beforeAll(async () => {
      await cenario(U, ANO);
      await lancar(U, `${ANO}-11-10`, '1.1.1', '3.1', 10_000_000);
      await lancar(U, `${ANO}-12-05`, '4.1', '1.1.1', 9_000_000);
    });

    it('itens 8/16: A12 por balancete abaixo do devido de A11 ⇒ SUSPENSAO, devido 0, nenhum lançamento, nada pendente', async () => {
      expect((await confirmar(U, ANO, 'A11', { modoMensal: 'RECEITA_BRUTA' })).status).toBe(201);
      await fechar(U, ANO, 11);
      const r = await confirmar(U, ANO, 'A12', { modoMensal: 'BALANCETE' });
      expect(r.status).toBe(201);
      const { irpj, csll } = r.body.data;
      expect([irpj.devidoCents, csll.devidoCents, irpj.provisaoPendente, csll.provisaoPendente]).toEqual(['0', '0', false, false]);
      expect(linha(irpj.memoria, 'SUSPENSAO')).toBe('0');
      expect(await lancamentoDe(U, irpj.id)).toBeUndefined();
    });

    it('26 (m): A00 abaixo do provisionado ⇒ D saldo negativo a compensar / C despesa em 31/12, e o LAIR do item 6 não muda', async () => {
      expect((await request(app).post('/api/lalur/parte-b/close').set(authHeader(dono)).send({ unitId: U, year: ANO, quarter: 'A00' })).status).toBe(200);
      const antes = await preview(U, ANO, 'A00');
      const lairAntes = linha(antes.body.data.irpj.memoria, 'LAIR');
      expect(lairAntes).toBe('1000000');
      const r = await confirmar(U, ANO, 'A00');
      expect(r.status).toBe(201);
      const { irpj, csll } = r.body.data;
      expect([irpj.devidoCents, linha(irpj.memoria, 'PROVISAO_AJUSTE_ANUAL'), linha(csll.memoria, 'PROVISAO_AJUSTE_ANUAL')]).toEqual(['150000', '-450000', '-198000']);
      expect([irpj.provisaoPendente, csll.provisaoPendente]).toEqual([false, false]);
      const ei = (await lancamentoDe(U, irpj.id))!;
      const ec = (await lancamentoDe(U, csll.id))!;
      expect(ei.date.toISOString().slice(0, 10)).toBe('2041-12-31');
      expect(partidas(ei)).toEqual([['1.2.9.1', 450_000, 0], ['4.9.1', 0, 450_000]]);
      expect(partidas(ec)).toEqual([['1.2.9.2', 198_000, 0], ['4.9.2', 0, 198_000]]);
      // a guarda de circularidade exclui as contas de despesa da provisão: o crédito nelas não muda o LAIR
      const depois = await preview(U, ANO, 'A00');
      expect(linha(depois.body.data.irpj.memoria, 'LAIR')).toBe(lairAntes);
    });
  });
});
