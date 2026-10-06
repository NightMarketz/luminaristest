/**
 * X7 Fase B PR-2 — e-Lalur anual (BRIEF-B item 12; testes 26 a e 26 g) sobre o app Express REAL + SQLite REAL.
 * O `ANUAL` ainda não é selecionável pelo DTO do perfil (F-TB-8.1: só no PR-4), então o perfil da empresa é
 * semeado direto pelo Prisma (custo assumido no BRIEF-B §3.1). O que só a fiação prova: o perfil é lido do banco
 * pelo `LalurService` (factory), período × forma chega como 400, a Parte B só se move/fecha no A00, o teto da
 * compensação no balancete e a janela do M312 em `A0m` = período em curso.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();
const UNIT = 'unit-lalur-anual';
let dono: { id: string; username: string };
let conta: { id: string };
let pf: { id: string };
const lancamentos: Record<string, string> = {};

const entry = (over: Record<string, unknown>) =>
  request(app).post('/api/lalur/entries').set(authHeader(dono)).send({
    unitId: UNIT, year: 2025, quarter: 'A03', livro: 'lalur', codigo: '7', valorCents: 1000, indRelacao: '4', histLancamento: 'nd', ...over,
  });

describe('/api/lalur — forma ANUAL (X7 Fase B PR-2, item 12)', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'anual', username: 'lalur-anual', email: 'lalur-anual@test.local', password: 'x', role: 'USER' } });
    await prisma.companyFiscalProfile.create({
      data: { userId: dono.id, anoCalendario: 2025, regime: 'REAL', formaApuracaoIrpjCsll: 'ANUAL', lucroRealObrigatorio: false, createdById: dono.id, updatedById: dono.id },
    });
    for (const month of [1, 2, 3, 4]) {
      await prisma.accountingPeriod.create({ data: { userId: dono.id, unitId: UNIT, year: 2025, month, status: 'OPEN', openedAt: new Date(), openedById: dono.id } });
    }
    await prisma.account.create({ data: { userId: dono.id, unitId: UNIT, code: '1.1.1', name: 'Banco', nature: 'Asset', acceptsEntries: true } });
    conta = await prisma.account.create({ data: { userId: dono.id, unitId: UNIT, code: '4.1.9', name: 'Multas indedutíveis', nature: 'Expense', acceptsEntries: true } });
    for (const date of ['2025-02-20', '2025-04-10']) {
      const r = await request(app).post('/api/accounting/post').set(authHeader(dono)).send({
        unitId: UNIT, date, description: `multa ${date}`,
        lines: [{ accountCode: '4.1.9', debitCents: 500, creditCents: 0 }, { accountCode: '1.1.1', debitCents: 0, creditCents: 500 }],
      });
      expect(r.status).toBe(201);
      lancamentos[date] = r.body.data.id;
    }
    const r = await request(app).post('/api/lalur/parte-b').set(authHeader(dono)).send({
      unitId: UNIT, codCtaB: 'PF', descricao: 'Prejuízo fiscal', dtCriacao: '2024-12-31', codPbRfb: '1000', codTributo: 'I', saldoIniCents: 50000, indSaldoIni: 'D',
    });
    expect(r.status).toBe(201);
    pf = r.body.data;
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('período × forma: A03 e A00 entram; T01 é 400 na forma anual (perfil lido do banco)', async () => {
    expect((await entry({})).status).toBe(201);
    expect((await entry({ quarter: 'A00' })).status).toBe(201);
    const t01 = await entry({ quarter: 'T01' });
    expect(t01.status).toBe(400);
    expect(String(t01.body.message)).toMatch(/Período T01 não pertence à forma ANUAL de 2025/);
    // ano sem perfil segue trimestral, como antes da Fase B
    expect((await entry({ year: 2026, quarter: 'T01' })).status).toBe(201);
    expect((await entry({ year: 2026, quarter: 'A03' })).status).toBe(400);
  });

  it('26 (a): movimento da Parte B em A05 ⇒ 400 (art. 50 II) e nada gravado; no A00 passa', async () => {
    const mv = (quarter: string) =>
      request(app).post('/api/lalur/parte-b/movements').set(authHeader(dono)).send({ unitId: UNIT, parteBId: pf.id, year: 2025, quarter, indicador: 'DB', valorCents: 10, historico: 'x', indLanAnt: 'N' });
    const a05 = await mv('A05');
    expect(a05.status).toBe(400);
    expect(String(a05.body.message)).toMatch(/Movimento da Parte B em A05 não é permitido/);
    expect(await prisma.lalurParteBMovement.count({ where: { unitId: UNIT, quarter: 'A05' } })).toBe(0);
    expect((await mv('A00')).status).toBe(201);
  });

  it('26 (g): compensação P em A03 acima do saldo inicial da Parte B ⇒ 400 (antes passava em silêncio); igual ao saldo passa', async () => {
    const p = (valorCents: number) => entry({ codigo: '173', valorCents, indRelacao: '1', parteBId: pf.id, histLancamento: undefined });
    const acima = await p(50001);
    expect(acima.status).toBe(400);
    expect(String(acima.body.message)).toMatch(/Compensação excede o saldo da conta da Parte B 'PF' no início de 2025/);
    expect(await prisma.lalurEntry.count({ where: { unitId: UNIT, codigo: '173' } })).toBe(0);
    expect((await p(50000)).status).toBe(201);
  });

  it('M312 em A03: a janela é o período em curso (01/01 → 31/03) — fevereiro entra, abril é 400', async () => {
    const m312 = (id: string) => entry({ codigo: '8', indRelacao: '2', accountId: conta.id, journalEntryIds: [id] });
    expect((await m312(lancamentos['2025-02-20'])).status).toBe(201);
    const abril = await entry({ codigo: '95', indRelacao: '2', accountId: conta.id, journalEntryIds: [lancamentos['2025-04-10']] });
    expect(abril.status).toBe(400);
    expect(String(abril.body.message)).toMatch(/fora do período A03\/2025/);
  });

  it('livros N por período: n630 em A03 e n620 em T0x/A00 ⇒ 400; n620 em A03 resolve contra a aba N620 (catálogo do PR-4)', async () => {
    const n = (livro: string, quarter: string, codigo = '1') => request(app).post('/api/lalur/entries').set(authHeader(dono)).send({ unitId: UNIT, year: 2025, quarter, livro, codigo, valorCents: 1 });
    expect((await n('n630', 'A03')).status).toBe(400);
    expect((await n('n620', 'A00')).status).toBe(400);
    const cna = await n('n620', 'A03');
    expect(cna.status).toBe(400);
    expect(String(cna.body.message)).toMatch(/linha CNA/);
    expect((await n('n620', 'A03', '21')).status).toBe(201); // linha E do N620 (IRRF)
  });

  it('Parte B fecha só no A00: A03 e T04 ⇒ 400; A00 fecha e o diagnóstico lista só o A00, sem divergência', async () => {
    const close = (quarter: string) => request(app).post('/api/lalur/parte-b/close').set(authHeader(dono)).send({ unitId: UNIT, year: 2025, quarter });
    expect((await close('A03')).status).toBe(400);
    expect((await close('T04')).status).toBe(400);
    // o A00 lê o resultado do ANO no razão (2 multas = −1.000): sem conta de base negativa da CSLL é o 400 do C4
    const semBc = await close('A00');
    expect(semBc.status).toBe(400);
    expect(String(semBc.body.message)).toMatch(/Base do CSLL negativa em A00\/2025 \(1000 centavos\)/);
    const bc = await request(app).post('/api/lalur/parte-b').set(authHeader(dono)).send({
      unitId: UNIT, codCtaB: 'BC', descricao: 'Base negativa CSLL', dtCriacao: '2024-12-31', codPbRfb: '1003', codTributo: 'C', saldoIniCents: 0, indSaldoIni: 'D',
    });
    expect(bc.status).toBe(201);
    const a00 = await close('A00');
    expect(a00.status).toBe(200);
    const sys = await prisma.lalurParteBMovement.findMany({ where: { unitId: UNIT, origem: 'system', deletedAt: null } });
    expect(sys.map((m) => [m.quarter, m.indicador, m.valorCents])).toEqual([['A00', 'BC', 1000n]]);
    expect(a00.body.data.quarter).toBe('A00');
    const bal = (a00.body.data.balances as Array<Record<string, string | number>>).find((b) => b.parteBId === pf.id)!;
    // abertura 50.000 D; a P de 50.000 do A03 NÃO move a Parte B (vlParteA 0); só o M410 DB de 10 do A00 (vlParteB)
    expect([Number(bal.sdIniCents), Number(bal.vlParteACents), Number(bal.vlParteBCents), bal.indVlParteB, Number(bal.sdFimCents)]).toEqual([50000, 0, 10, 'D', 50010]);
    const diag = await request(app).get('/api/lalur/parte-b/balances').set(authHeader(dono)).query({ unitId: UNIT, year: 2025 });
    expect(diag.status).toBe(200);
    expect(diag.body.data.periods.map((p: { quarter: string }) => p.quarter)).toEqual(['A00']);
    expect(diag.body.data.divergences).toEqual([]);
  });
});
