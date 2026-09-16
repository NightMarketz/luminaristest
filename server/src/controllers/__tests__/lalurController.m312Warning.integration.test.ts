/**
 * X4-14 (BRIEF 3C item 14 — follow-up ratificado 2026-09-13; EMENDA §2.4 2026-09-15): o diagnóstico
 * `GET /api/lalur/parte-b/balances` AVISA (nunca 400) o ajuste da Parte A com relação contábil cujo
 * `valorCents` não iguala o agregado que a `REGRA_REGISTRO_M312_OBRIGATORIO` (Manual ECF L12 p.253) manda
 * comparar e que não cita M312/M362. A regra tem DOIS ramos por J050.COD_NAT: patrimonial (1/2/3) → qualquer
 * dos 4 agregados do K155; conta de RESULTADO (4) → SÓ K355.VL_SLD_FIN (review independente #329, S1).
 * Os agregados vêm dos postings reais.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();
const UNIT = 'unit-m312';
let dono: { id: string; username: string };
let conta: { id: string; code: string };
let entryIds: string[] = [];

const postEntry = (date: string, cents: number) =>
  request(app)
    .post('/api/accounting/post')
    .set(authHeader(dono))
    .send({
      unitId: UNIT, date, description: `multa ${cents}`,
      lines: [
        { accountCode: '4.1.9', debitCents: cents, creditCents: 0 },
        { accountCode: '1.1.1', debitCents: 0, creditCents: cents },
      ],
    });

const lalurEntry = (over: Record<string, unknown>) =>
  request(app).post('/api/lalur/entries').set(authHeader(dono)).send({
    unitId: UNIT, year: 2025, quarter: 'T01', livro: 'lalur', codigo: '7', indRelacao: '2', accountId: conta.id,
    histLancamento: 'Multas indedutíveis', ...over,
  });

describe('X4-14 — aviso M312 para ajuste parcial sem lançamentos', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'm312', username: 'm312-dono', email: 'm312@test.local', password: 'x', role: 'USER' } });
    for (const month of [1, 2, 3]) {
      await prisma.accountingPeriod.create({ data: { userId: dono.id, unitId: UNIT, year: 2025, month, status: 'OPEN', openedAt: new Date(), openedById: dono.id } });
    }
    await prisma.account.create({ data: { userId: dono.id, unitId: UNIT, code: '1.1.1', name: 'Banco', nature: 'Asset', acceptsEntries: true } });
    const c = await prisma.account.create({ data: { userId: dono.id, unitId: UNIT, code: '4.1.9', name: 'Multas indedutíveis', nature: 'Expense', acceptsEntries: true } });
    conta = { id: c.id, code: c.code };
    // T01/2025: dois lançamentos → Σ débitos 4.1.9 = 7000, Σ créditos 0, saldo do período 7000, saldo final 7000
    for (const [date, cents] of [['2025-01-15', 5000], ['2025-02-20', 2000]] as const) {
      const r = await postEntry(date, cents);
      expect(r.status).toBe(201);
      entryIds.push(r.body.data.id);
    }
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('ajuste = Σ débitos do trimestre (7000) → sem aviso; ajuste PARCIAL (3000) sem M312 → 1 aviso com os 4 agregados; parcial COM journalEntryIds → sem aviso', async () => {
    const total = await lalurEntry({ valorCents: 7000 });
    expect(total.status).toBe(201);
    const parcial = await lalurEntry({ valorCents: 3000, quarter: 'T01', codigo: '6', histLancamento: 'parte das multas' }); // outra linha: (livro, codigo, trimestre) é chave
    expect(parcial.status).toBe(201); // criar NÃO recusa — a igualdade só o PVA fecha (item 14: aviso)
    const citado = await lalurEntry({ valorCents: 3000, codigo: '8', journalEntryIds: [entryIds[1]], histLancamento: 'parte citada' });
    expect(citado.status).toBe(201);

    const d = await request(app).get('/api/lalur/parte-b/balances').set(authHeader(dono)).query({ unitId: UNIT, year: 2025 });
    expect(d.status).toBe(200);
    expect(d.body.data.warnings).toHaveLength(1);
    const w = d.body.data.warnings[0];
    expect(w).toEqual(
      expect.objectContaining({
        code: 'M312_MISSING_FOR_PARTIAL_ADJUSTMENT',
        quarter: 'T01',
        livro: 'lalur',
        entryId: parcial.body.data.id,
        accountCode: '4.1.9',
        valorCents: '3000',
        aggregates: { sumDebitCents: '7000', sumCreditCents: '0', saldoPeriodoCents: '7000', saldoFinalCents: '7000' },
      }),
    );
    expect(w.message).toMatch(/M312\/M362 é obrigatório/);
  });

  it('ajuste = saldo FINAL acumulado (T02 sem movimento: saldo final 7000, período 0) → sem aviso; ajuste 1 centavo diferente → aviso', async () => {
    await prisma.accountingPeriod.createMany({ data: [4, 5, 6].map((month) => ({ userId: dono.id, unitId: UNIT, year: 2025, month, status: 'OPEN', openedAt: new Date(), openedById: dono.id })) });
    expect((await lalurEntry({ valorCents: 7000, quarter: 'T02', codigo: '7', histLancamento: 'T02 saldo final' })).status).toBe(201);
    const off = await lalurEntry({ valorCents: 7001, quarter: 'T02', codigo: '8', histLancamento: 'T02 fora' });
    expect(off.status).toBe(201);
    const d = await request(app).get('/api/lalur/parte-b/balances').set(authHeader(dono)).query({ unitId: UNIT, year: 2025 });
    const ids = d.body.data.warnings.map((w: { entryId: string }) => w.entryId);
    expect(ids).toContain(off.body.data.id);
    expect(d.body.data.warnings.find((w: { entryId: string }) => w.entryId === off.body.data.id).aggregates).toEqual({ sumDebitCents: '0', sumCreditCents: '0', saldoPeriodoCents: '0', saldoFinalCents: '7000' });
    expect(d.body.data.warnings).toHaveLength(2); // o parcial do T01 + este
  });

  it('S1 (#329): conta de RESULTADO com D e C no trimestre — ajuste = Σ débitos (≠ saldo final) → AVISO; ajuste = saldo final → sem aviso', async () => {
    await prisma.accountingPeriod.createMany({ data: [7, 8, 9].map((month) => ({ userId: dono.id, unitId: UNIT, year: 2025, month, status: 'OPEN', openedAt: new Date(), openedById: dono.id })) });
    // T03: D 9000 e C 4000 na 4.1.9 → Σ débitos 9000, Σ créditos 4000, saldo do período 5000, saldo final 7000+5000 = 12000
    expect((await postEntry('2025-07-10', 9000)).status).toBe(201);
    const estorno = await request(app).post('/api/accounting/post').set(authHeader(dono)).send({
      unitId: UNIT, date: '2025-08-05', description: 'estorno parcial de multa',
      lines: [
        { accountCode: '1.1.1', debitCents: 4000, creditCents: 0 },
        { accountCode: '4.1.9', debitCents: 0, creditCents: 4000 },
      ],
    });
    expect(estorno.status).toBe(201);
    const somaDeb = await lalurEntry({ valorCents: 9000, quarter: 'T03', codigo: '7', histLancamento: 'T03 = Σ débitos' });
    expect(somaDeb.status).toBe(201);
    const saldoFinal = await lalurEntry({ valorCents: 12000, quarter: 'T03', codigo: '8', histLancamento: 'T03 = saldo final' });
    expect(saldoFinal.status).toBe(201);

    const d = await request(app).get('/api/lalur/parte-b/balances').set(authHeader(dono)).query({ unitId: UNIT, year: 2025 });
    expect(d.status).toBe(200);
    const ids = d.body.data.warnings.map((w: { entryId: string }) => w.entryId);
    // Régua uniforme (4 agregados) deixaria 9000 passar porque iguala Σ débitos — o Manual manda comparar só com K355.VL_SLD_FIN.
    expect(ids).toContain(somaDeb.body.data.id);
    expect(ids).not.toContain(saldoFinal.body.data.id);
    const w = d.body.data.warnings.find((x: { entryId: string }) => x.entryId === somaDeb.body.data.id);
    expect(w.aggregates).toEqual({ sumDebitCents: '9000', sumCreditCents: '4000', saldoPeriodoCents: '5000', saldoFinalCents: '12000' });
    expect(w.message).toMatch(/conta de resultado .* saldo final do trimestre \(K355\.VL_SLD_FIN\)/);
    expect(d.body.data.warnings).toHaveLength(3); // T01 parcial + T02 fora + este
  });
});
