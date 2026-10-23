/**
 * BE-INCR-IRRF-DISTRIBUICAO PR-3 (BRIEF itens 22–26; F-IRD-12, F-IRD-14..18; lacunas L-IRD-2/3 de 23/10) — prévia do
 * JCP ponta a ponta, com lançamentos reais no razão (memória "sintético ≠ formato real"). Nada grava.
 *
 * Números: capital 1.000.000,00 e lucros acumulados 100.000,00 em 31/12/2025 ⇒ base 1.100.000,00; TJLP T01 0,7658% a.m.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { getFactory } from '@/lib/factory';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';

const app = makeApp();
const URL = '/api/accounting/jcp/preview';
const CONTAS = [
  { code: '1.1.1.01', name: 'Banco', nature: 'Asset' },
  { code: '2.3.1.01', name: 'Lucros Acumulados', nature: 'Equity' },
  { code: '2.3.2.01', name: 'Capital Social Integralizado', nature: 'Equity' },
  { code: '2.3.3.01', name: 'Reserva Legal', nature: 'Equity' },
  { code: '2.3.9.01', name: 'Ajuste fora do art. 75', nature: 'Equity' },
  { code: '3.1', name: 'Receita de Serviços', nature: 'Revenue' },
  { code: '4.3.4', name: 'Juros sobre o Capital Próprio', nature: 'Expense' },
];
type Dono = { id: string; username: string; unitId: string; ids: Record<string, string>; socios: string[] };

let seq = 0;
async function cenario(opts: { regime?: string; forma?: string; capital?: number; lucros?: number; participacoes?: number[]; residente?: boolean; ano?: number } = {}): Promise<Dono> {
  seq += 1;
  const u = await prisma.user.create({ data: { name: `jcp-${seq}`, username: `jcp-${seq}`, email: `jcp-${seq}@test.local`, password: 'x', role: 'USER' } });
  const unitId = `unit-jcp-${seq}`;
  await seedUnit({ userId: u.id, id: unitId });
  const ids: Record<string, string> = {};
  for (const c of CONTAS) ids[c.code] = (await prisma.account.create({ data: { userId: u.id, unitId, ...c, acceptsEntries: true } })).id;
  for (const year of [2025, 2026, 2027]) {
    for (let month = 1; month <= 12; month++) await prisma.accountingPeriod.create({ data: { userId: u.id, unitId, year, month, status: 'OPEN', openedAt: new Date() } });
  }
  const ano = opts.ano ?? 2026;
  await prisma.companyFiscalProfile.create({
    data: {
      userId: u.id,
      anoCalendario: ano,
      regime: opts.regime ?? 'REAL',
      formaApuracaoIrpjCsll: opts.forma ?? null,
      ecfIndAliqCsll: '1',
      ecfIndRecReceita: '2',
      jcpBaseContas: {
        CAPITAL_INTEGRALIZADO: [ids['2.3.2.01']],
        RESERVAS_CAPITAL: [],
        RESERVAS_LUCROS: [ids['2.3.3.01']],
        ACOES_TESOURARIA: [],
        LUCROS_ACUMULADOS: [ids['2.3.1.01']],
      },
    },
  });
  await prisma.fiscalProfile.create({ data: { userId: u.id, unitId, regimeTributario: 'REAL', pisCofinsRegime: 'NAO_CUMULATIVO', jcpDespesaAccountId: ids['4.3.4'] } });
  const socios: string[] = [];
  const cpfs = ['52998224725', '39053344705'];
  for (const [i, bp] of (opts.participacoes ?? [6000, 4000]).entries()) {
    socios.push((await prisma.partner.create({
      data: { userId: u.id, nome: `S${i}`, taxId: cpfs[i], tipoPessoa: 'PF', residenteBrasil: i === 0 ? true : (opts.residente ?? true), participacaoBp: bp, entradaEm: '2025-01-01' },
    })).id);
  }
  const dono = { ...u, unitId, ids, socios };
  await lancar(dono, '2025-12-31', '1.1.1.01', '2.3.2.01', (opts.capital ?? 1_000_000) * 100);
  await lancar(dono, '2025-12-31', '1.1.1.01', '2.3.1.01', (opts.lucros ?? 100_000) * 100);
  return dono;
}

async function lancar(dono: Dono, date: string, debito: string, credito: string, cents: number): Promise<void> {
  seq += 1;
  await getFactory().getPostingService().postEntry(resolveAccountingScopeInternal({ userId: dono.id }, dono.unitId), {
    unitId: dono.unitId,
    date,
    description: `teste ${seq}`,
    sourceType: 'manual',
    lines: [{ accountCode: debito, debitCents: cents, creditCents: 0 }, { accountCode: credito, debitCents: 0, creditCents: cents }],
  });
}

const previa = (dono: Dono, extra: Record<string, unknown> = {}) =>
  request(app).post(URL).set(authHeader(dono)).send({ unitId: dono.unitId, anoCalendario: 2026, periodo: 'T01', dataCredito: '2026-03-31', forma: 'DESPESA', totalCents: 1_000_000, ...extra });

describe('IRRF-DISTRIBUICAO PR-3 — prévia do JCP', () => {
  beforeAll(async () => {
    pushTestSchema();
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('item 24: mês cheio com saldo constante = saldo × taxa mensal; crédito no dia 15 conta só até 15; nada grava', async () => {
    const dono = await cenario();
    const antes = await prisma.journalEntry.count({ where: { userId: dono.id } });
    const jan = await previa(dono, { dataCredito: '2026-01-31' });
    expect(jan.status).toBe(200);
    expect(jan.body.data.faixas).toEqual([{ de: '2026-01-01', ate: '2026-01-31', baseCents: 110_000_000, taxaDiaria: '0,7658% / 31', jurosCents: 842_380 }]);
    expect(jan.body.data.jurosMaxTjlpCents).toBe(842_380);
    expect((await previa(dono, { dataCredito: '2026-01-15' })).body.data.jurosMaxTjlpCents).toBe(407_603);
    expect(await prisma.journalEntry.count({ where: { userId: dono.id } })).toBe(antes);
  });

  it('item 24: aumento de capital no dia 45 do trimestre muda a base a partir do dia 46; lucro de 2026 em lucros acumulados não entra (§ 1º VI)', async () => {
    const dono = await cenario();
    await lancar(dono, '2026-02-14', '1.1.1.01', '2.3.2.01', 10_000_000);
    await lancar(dono, '2026-01-10', '1.1.1.01', '2.3.1.01', 5_000_000); // lucros acumulados acima do saldo de 2025: fora
    const r = await previa(dono);
    expect(r.body.data.faixas.map((f: { de: string; baseCents: number }) => [f.de, f.baseCents])).toEqual([
      ['2026-01-01', 110_000_000],
      ['2026-02-01', 110_000_000],
      ['2026-02-15', 120_000_000],
      ['2026-03-01', 120_000_000],
    ]);
  });

  it('item 25: ramo do lucro — 50% do lucro do período antes do JCP (a despesa de JCP já lançada não reduz)', async () => {
    const dono = await cenario({ capital: 20_000_000 });
    await lancar(dono, '2026-02-10', '1.1.1.01', '3.1', 30_000_000); // receita 300k
    await lancar(dono, '2026-02-11', '4.3.4', '1.1.1.01', 1_000_000); // despesa de JCP: fora do lucro
    const r = await previa(dono);
    expect(r.body.data).toMatchObject({ limite50LucroCents: 15_000_000, limite50ReservasCents: 5_000_000, limiteDedutivelCents: 15_000_000 });
  });

  it('item 25: ramo das reservas — 50% de lucros acumulados + reservas no início do período (L-IRD-2)', async () => {
    const dono = await cenario({ capital: 20_000_000, lucros: 400_000 });
    await lancar(dono, '2026-02-10', '1.1.1.01', '2.3.3.01', 9_900_000); // reserva no meio do período: fora do limite
    const r = await previa(dono);
    expect(r.body.data).toMatchObject({ limite50LucroCents: 0, limite50ReservasCents: 20_000_000, limiteDedutivelCents: 20_000_000 });
  });

  it('item 25: os juros pela TJLP limitam quando são menores', async () => {
    const dono = await cenario({ capital: 1_000_000, lucros: 400_000 });
    const r = await previa(dono, { dataCredito: '2026-01-31' });
    expect(r.body.data.limiteDedutivelCents).toBe(r.body.data.jurosMaxTjlpCents);
  });

  it('item 26: rateio 60/40 com IRRF de 17,5%; total acima do limite aceito com excesso e adição prevista; aviso de PL fora do mapa', async () => {
    const dono = await cenario();
    await lancar(dono, '2026-01-05', '1.1.1.01', '2.3.9.01', 100_000);
    const r = await previa(dono, { totalCents: 5_000_000 });
    expect(r.status).toBe(200);
    expect(r.body.data.alocacoes).toEqual([
      { partnerId: dono.socios[0], participacaoBp: 6000, brutoCents: 3_000_000, irrfCents: 525_000, liquidoCents: 2_475_000 },
      { partnerId: dono.socios[1], participacaoBp: 4000, brutoCents: 2_000_000, irrfCents: 350_000, liquidoCents: 1_650_000 },
    ]);
    const { limiteDedutivelCents: lim, excessoIndedutivelCents: exc } = r.body.data;
    expect(exc).toBe(5_000_000 - lim);
    expect(r.body.data.lalurPrevisto).toEqual([{ livro: 'lalur', codigo: '20', valorCents: exc }, { livro: 'lacs', codigo: '20', valorCents: exc }]);
    expect(r.body.data.avisos).toEqual([expect.stringContaining('2.3.9.01')]);

    const pl = await previa(dono, { totalCents: 5_000_000, forma: 'PL', debitoPlAccountId: dono.ids['2.3.1.01'] });
    expect(pl.body.data.lalurPrevisto).toEqual([{ livro: 'lalur', codigo: '166.03', valorCents: lim }, { livro: 'lacs', codigo: '166.03', valorCents: lim }]);
  });

  it('item 26: rateio do corpo — soma tem de bater com o total e só sócio vigente', async () => {
    const dono = await cenario();
    const ok = await previa(dono, { rateio: [{ partnerId: dono.socios[0], brutoCents: 1_000_000 }] });
    expect(ok.body.data.alocacoes).toEqual([expect.objectContaining({ partnerId: dono.socios[0], brutoCents: 1_000_000, irrfCents: 175_000 })]);
    const r = await previa(dono, { rateio: [{ partnerId: dono.socios[0], brutoCents: 600_000 }] });
    expect([r.status, r.body.code]).toEqual([400, 'RATEIO_INVALIDO']);
    const x = await previa(dono, { rateio: [{ partnerId: 'outro', brutoCents: 1_000_000 }] });
    expect([x.status, x.body.code]).toEqual([400, 'RATEIO_INVALIDO']);
  });

  it('item 22: fora do Real → JCP_SO_NO_LUCRO_REAL; soma ≠ 100% → 400; sócio no exterior → 400; sem TJLP → PARAMETRO_LEGAL_AUSENTE', async () => {
    expect((await previa(await cenario({ regime: 'PRESUMIDO' }))).body.code).toBe('JCP_SO_NO_LUCRO_REAL');
    expect((await previa(await cenario({ participacoes: [6000, 3000] }))).body.code).toBe('SOMA_PARTICIPACOES_INVALIDA');
    expect((await previa(await cenario({ residente: false }))).body.code).toBe('SOCIO_NAO_RESIDENTE_FORA_DO_ESCOPO');
    const d2027 = await cenario({ ano: 2027 });
    const r = await previa(d2027, { anoCalendario: 2027, dataCredito: '2027-03-31' });
    expect([r.status, r.body.code]).toEqual([400, 'PARAMETRO_LEGAL_AUSENTE']);
  });

  it('item 23 (F-IRD-17, L-IRD-3): trimestral pedindo A00 → 400; anual pedindo T01 → 400; crédito fora do período → 400', async () => {
    const tri = await cenario();
    expect((await previa(tri, { periodo: 'A00', dataCredito: '2026-12-31' })).body.code).toBe('PERIODO_INCOMPATIVEL_COM_A_FORMA');
    expect((await previa(tri, { dataCredito: '2026-04-01' })).body.code).toBe('DATA_CREDITO_FORA_DO_PERIODO');
    const anual = await cenario({ forma: 'ANUAL' });
    expect((await previa(anual)).body.code).toBe('PERIODO_INCOMPATIVEL_COM_A_FORMA');
    const a00 = await previa(anual, { periodo: 'A00', dataCredito: '2026-06-30' }); // TJLP só até o crédito
    expect(a00.status).toBe(200);
    expect(a00.body.data.faixas).toHaveLength(6);
  });
});
