/**
 * BE-INCR-SIMPLES-CAIXA PR-2 (nó X14-CAIXA, BRIEF itens 8–18) — base caixa na apuração ME/EPP, gatilhos do art. 20 da Res.
 * CGSN 140, impedimento com o caixa mantido (art. 20 IV), alertas e a conferência NFS-e. Lacunas decididas pelo dono
 * (questionário, 2026-10-16): L1 (a) "Deduz no mês do estorno"; L2 (a) "Só vendas de ano no caixa" (A3).
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';
import { ApplicationFactory } from '@/lib/factory';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';

const app = makeApp();
const S = '/api/accounting/simples';
const PERFIL = '/api/accounting/company-fiscal-profile';
const PRAZOS = { simplesCaixaPrazoCartaoDebitoDias: 1, simplesCaixaPrazoCartaoCreditoDias: 30 };
const CAIXA = { regime: 'SIMPLES', simplesRegimeApuracao: 'CAIXA', ...PRAZOS };
const f = () => ApplicationFactory.getInstance();

interface Cenario {
  user: { id: string; username: string };
  unit: string;
}
async function cenario(nome: string, perfis: Record<number, Record<string, unknown>>): Promise<Cenario> {
  const u = await prisma.user.create({ data: { name: nome, username: nome, email: `${nome}@test.local`, password: 'x', role: 'USER' } });
  const c: Cenario = { user: { id: u.id, username: u.username }, unit: `unit-${nome}` };
  await seedUnit({ userId: u.id, id: c.unit }); // I6: o unitId das rotas é validado contra `units` do dono
  await f().getPostingService().ensureChartOfAccounts(resolveAccountingScopeInternal({ userId: u.id }, c.unit));
  for (const [ano, body] of Object.entries(perfis)) {
    const r = await request(app).put(`${PERFIL}/${ano}`).set(authHeader(c.user)).send({ unitId: c.unit, ...body });
    expect(r.status).toBe(200);
  }
  return c;
}

let n = 0;
/** Venda auferida no subrazão (linha VENDA), com tipo opcional (CANCELAMENTO/DEVOLUCAO em negativo). */
const linha = (c: Cenario, saleId: string, dia: string, cents: number, extra: Record<string, unknown> = {}) =>
  prisma.receitaFiscalLinha.create({
    data: { userId: c.user.id, unitId: c.unit, competencia: dia.slice(0, 7), dia, saleId, itemRef: `item-${++n}`, natureza: 'SERVICO', cTribNac: '060101', receitaCents: BigInt(cents), excluir: [], ...extra },
  });
const recebimento = (c: Cenario, saleId: string, dia: string, cents: number, extra: Record<string, unknown> = {}) =>
  prisma.receitaFiscalRecebimento.create({
    data: { userId: c.user.id, unitId: c.unit, saleId, dia, competenciaCaixa: dia.slice(0, 7), valorCents: BigInt(cents), meio: 'Pix', origem: 'SALE_SETTLED', ...extra },
  });
type Alerta = { codigo: string; severity: string; detalhe: string; motivoInformativo?: string };
const calcular = async (c: Cenario, m: string) => {
  const r = await request(app).post(`${S}/apuracoes/${m}/calcular`).set(authHeader(c.user)).send({ unitId: c.unit });
  expect(r.status).toBe(200);
  return r.body.data as {
    regimeApuracao: string;
    baseCaixa: { recebidoPaCents: number; receitaAuferidaPaCents: number; art20Cents: Record<string, number> } | null;
    impedimentoCaixa: { mesBase: string; receitaNaoRecebidaCents: number; icmsCents: number; issCents: number } | null;
    rbt12Cents: number;
    totalCalculadoCents: number;
    atividades: Array<{ receitaCents: number }>;
    alertas: Alerta[];
    divergenciaCents: number | null;
  };
};
const receitaDasAtividades = (d: Awaited<ReturnType<typeof calcular>>) => d.atividades.reduce((s, a) => s + a.receitaCents, 0);

beforeAll(() => pushTestSchema());
afterAll(() => prisma.$disconnect());

describe('item 8 — base pela receita recebida; RBT12 por competência', () => {
  it('venda de R$ 1.000 em out, paga em nov ⇒ base out = 0, base nov = 1.000; o RBT12 de dez conta a venda em out', async () => {
    const c = await cenario('cx8', { 2026: CAIXA });
    await linha(c, 'v8', '2026-10-10', 100_000);
    await recebimento(c, 'v8', '2026-11-05', 100_000);
    const out = await calcular(c, '2026-10');
    expect(out.regimeApuracao).toBe('CAIXA');
    expect(out.baseCaixa).toMatchObject({ recebidoPaCents: 0, receitaAuferidaPaCents: 100_000 });
    expect(receitaDasAtividades(out)).toBe(0);
    const nov = await calcular(c, '2026-11');
    expect(nov.baseCaixa).toMatchObject({ recebidoPaCents: 100_000, receitaAuferidaPaCents: 0, art20Cents: { parcelaVencida: 0, encerramento: 0, retornoCompetencia: 0, exclusao: 0 } });
    expect(receitaDasAtividades(nov)).toBe(100_000);
    expect(nov.totalCalculadoCents).toBeGreaterThan(0);
    // dez precisa de receita no PA (sem atividade o cálculo zera por ATIVIDADE_SEM_ANEXO, comportamento anterior)
    await linha(c, 'v8dez', '2026-12-02', 1_000);
    await recebimento(c, 'v8dez', '2026-12-02', 1_000);
    expect((await calcular(c, '2026-12')).rbt12Cents).toBe(100_000);
  });

  it('cota do parceiro sai na mesma proporção da linha', async () => {
    const c = await cenario('cx8cota', { 2026: CAIXA });
    const contrato = await prisma.salaoParceriaContrato.create({
      data: { userId: c.user.id, unitId: c.unit, profissionalContactId: 'prof-1', cotaSalaoBp: 4_000, naturezaCota: 'PARCERIA_GESTAO', homologadoEm: '2026-01-02', sindicato: 'MTE', vigenteDesde: '2026-01-01', createdById: c.user.id, updatedById: c.user.id },
    });
    await linha(c, 'v8c', '2026-10-10', 100_000, { parceriaContratoId: contrato.id, cotaProfissionalCents: 60_000n });
    await recebimento(c, 'v8c', '2026-10-10', 100_000);
    expect((await calcular(c, '2026-10')).baseCaixa?.recebidoPaCents).toBe(40_000);
  });

  it('perfil por competência: regimeApuracao COMPETENCIA e baseCaixa null', async () => {
    const c = await cenario('cx8comp', { 2026: { regime: 'SIMPLES' } });
    await linha(c, 'v8x', '2026-10-10', 10_000);
    const d = await calcular(c, '2026-10');
    expect([d.regimeApuracao, d.baseCaixa, d.impedimentoCaixa]).toEqual(['COMPETENCIA', null, null]);
    expect(receitaDasAtividades(d)).toBe(10_000);
  });
});

describe('item 14 + L1 (a) — devolução e cancelamento no caixa', () => {
  it('venda paga em out e estornada em nov ⇒ out conta o recebido; nov deduz o valor (o PA de origem não muda)', async () => {
    const c = await cenario('cx14est', { 2026: CAIXA });
    await linha(c, 'v14', '2026-10-01', 50_000);
    await linha(c, 'v14', '2026-11-03', -50_000, { tipo: 'CANCELAMENTO' });
    await recebimento(c, 'v14', '2026-10-01', 50_000, { status: 'REVERTED', diaEstorno: '2026-11-03' });
    expect((await calcular(c, '2026-10')).baseCaixa?.recebidoPaCents).toBe(50_000);
    expect((await calcular(c, '2026-11')).baseCaixa?.recebidoPaCents).toBe(-50_000);
  });

  it('paga e estornada no mesmo mês ⇒ zero; venda não paga e cancelada ⇒ nada a deduzir', async () => {
    const c = await cenario('cx14zero', { 2026: CAIXA });
    await linha(c, 'v14a', '2026-10-01', 30_000);
    await linha(c, 'v14a', '2026-10-20', -30_000, { tipo: 'CANCELAMENTO' });
    await recebimento(c, 'v14a', '2026-10-02', 30_000, { status: 'REVERTED', diaEstorno: '2026-10-20' });
    await linha(c, 'v14b', '2026-10-05', 20_000);
    await linha(c, 'v14b', '2026-10-06', -20_000, { tipo: 'CANCELAMENTO' });
    const d = await calcular(c, '2026-10');
    expect(d.baseCaixa?.recebidoPaCents).toBe(0);
  });

  it('devolução de venda paga ⇒ deduz o valor devolvido no mês da devolução (F-CX-4 a); as negativas da competência não entram', async () => {
    const c = await cenario('cx14dev', { 2026: CAIXA });
    await linha(c, 'v14d', '2026-10-01', 40_000);
    await recebimento(c, 'v14d', '2026-10-01', 40_000);
    await linha(c, 'v14d', '2026-11-10', -40_000, { tipo: 'DEVOLUCAO' });
    await linha(c, 'v14e', '2026-11-01', 70_000);
    await recebimento(c, 'v14e', '2026-11-01', 70_000);
    expect((await calcular(c, '2026-11')).baseCaixa?.recebidoPaCents).toBe(30_000);
  });
});

describe('item 9 — art. 20 I: venda a prazo não recebida até dez do ano seguinte', () => {
  it('venda de mar/2025 não paga (2025 e 2026 no caixa) ⇒ base de dez/2026; recebida depois, não volta à base', async () => {
    const c = await cenario('cx9', { 2025: CAIXA, 2026: CAIXA });
    await linha(c, 'v9', '2025-03-10', 25_000);
    const nov = await calcular(c, '2026-11');
    expect(nov.baseCaixa?.art20Cents.parcelaVencida).toBe(0);
    const dez = await calcular(c, '2026-12');
    expect(dez.baseCaixa?.art20Cents.parcelaVencida).toBe(25_000);
    expect(receitaDasAtividades(dez)).toBe(25_000);
  });

  it('venda de mar/2025 recebida em jan/2026 não tem gatilho', async () => {
    const c = await cenario('cx9rec', { 2025: CAIXA, 2026: CAIXA });
    await linha(c, 'v9r', '2025-03-10', 25_000);
    await recebimento(c, 'v9r', '2026-01-15', 25_000);
    expect((await calcular(c, '2026-12')).baseCaixa?.art20Cents.parcelaVencida).toBe(0);
    expect((await calcular(c, '2026-01')).baseCaixa?.recebidoPaCents).toBe(25_000);
  });
});

describe('item 10 — art. 20 II a: encerramento de atividade', () => {
  it('encerramento em nov/2026 ⇒ toda receita auferida e não recebida entra na base de nov', async () => {
    const c = await cenario('cx10', { 2026: { ...CAIXA, encerramentoAtividadeEm: '2026-11-20' } });
    await linha(c, 'v10a', '2026-09-10', 15_000);
    await linha(c, 'v10b', '2026-11-05', 5_000);
    await linha(c, 'v10c', '2026-10-01', 9_000);
    await recebimento(c, 'v10c', '2026-10-01', 9_000);
    const d = await calcular(c, '2026-11');
    expect(d.baseCaixa?.art20Cents.encerramento).toBe(20_000);
    expect(d.baseCaixa?.recebidoPaCents).toBe(0);
  });
});

describe('item 11 — art. 20 II b: volta à competência', () => {
  it('2025 CAIXA → 2026 COMPETENCIA ⇒ o não recebido entra em dez/2025', async () => {
    const c = await cenario('cx11', { 2025: CAIXA, 2026: { regime: 'SIMPLES' } });
    await linha(c, 'v11', '2025-08-10', 12_000);
    expect((await calcular(c, '2025-12')).baseCaixa?.art20Cents.retornoCompetencia).toBe(12_000);
  });

  it('A1 — 2026 CAIXA → 2027 COMPETENCIA: sem comportamento decidido, dez/2026 não antecipa nada', async () => {
    const c = await cenario('cx11a1', { 2026: CAIXA, 2027: { regime: 'SIMPLES' } });
    await linha(c, 'v11a', '2026-08-10', 12_000);
    const d = await calcular(c, '2026-12');
    expect(d.baseCaixa?.art20Cents).toEqual({ parcelaVencida: 0, encerramento: 0, retornoCompetencia: 0, exclusao: 0 });
  });
});

describe('item 12 — art. 20 II c: exclusão do Simples (F-CX-3 a)', () => {
  it('efeitos da exclusão em 01/12/2026 ⇒ o não recebido entra em nov/2026', async () => {
    const c = await cenario('cx12', { 2026: { ...CAIXA, simplesExclusaoEfeitosEm: '2026-12-01' } });
    await linha(c, 'v12', '2026-10-10', 8_000);
    expect((await calcular(c, '2026-10')).baseCaixa?.art20Cents.exclusao).toBe(0);
    expect((await calcular(c, '2026-11')).baseCaixa?.art20Cents.exclusao).toBe(8_000);
  });
});

describe('item 13 — art. 20 IV: impedimento do art. 12 com o caixa mantido (F-CX-7 a)', () => {
  it('EPP no caixa, sublimite excedido em > 20% em out ⇒ bloco no PA de out com ICMS/ISS da faixa; o total do DAS não muda', async () => {
    const c = await cenario('cx13', { 2026: CAIXA });
    for (let m = 1; m <= 9; m++) {
      await prisma.simplesHistoricoMensal.create({
        data: { userId: c.user.id, unitId: c.unit, competencia: `2026-${String(m).padStart(2, '0')}`, receitaBrutaCents: 30_000_000n, createdById: c.user.id, updatedById: c.user.id },
      });
    }
    await linha(c, 'v13', '2026-10-10', 200_000_000);
    const d = await calcular(c, '2026-10');
    expect(d.impedimentoCaixa).toMatchObject({ mesBase: '2026-10', receitaNaoRecebidaCents: 200_000_000 });
    expect(d.impedimentoCaixa!.issCents).toBeGreaterThan(0);
    expect(d.totalCalculadoCents).toBe(0);
    expect(d.alertas.find((a) => a.codigo === 'IMPEDIMENTO_CAIXA_ICMS_ISS')).toMatchObject({ severity: 'WARNING' });
    expect(d.alertas.find((a) => a.codigo === 'IMPEDIMENTO_CAIXA_ICMS_ISS')?.detalhe).toContain('art. 20 IV');
    expect((await calcular(c, '2026-09')).impedimentoCaixa).toBeNull();
  });
});

describe('item 16 — DAS oficial registrado antes do PR-2', () => {
  it('memória sem o regime ⇒ REGIME_CAIXA_RECALCULO (WARNING); divergência contra a base caixa', async () => {
    const c = await cenario('cx16', { 2026: CAIXA });
    await linha(c, 'v16', '2026-10-10', 100_000);
    await prisma.simplesApuracao.create({
      data: {
        userId: c.user.id, unitId: c.unit, competencia: '2026-10', regime: 'SIMPLES', valorOficialCents: 6_000n, numeroDocumento: '07.20.26300.1234567-8', vencimento: '2026-11-20',
        totalCalculadoCents: 6_000n, divergenciaCents: 0n, memoria: { regime: 'SIMPLES' }, tabelaVersao: [], status: 'CONFIRMED', createdById: c.user.id,
      },
    });
    const r = await request(app).get(`${S}/apuracoes/2026-10`).set(authHeader(c.user)).query({ unitId: c.unit });
    expect(r.status).toBe(200);
    expect((r.body.data.alertas as Alerta[]).find((a) => a.codigo === 'REGIME_CAIXA_RECALCULO')).toMatchObject({ severity: 'WARNING' });
    expect(r.body.data.divergenciaCents).toBe(6_000 - r.body.data.totalCalculadoCents);
    expect(r.body.data.totalCalculadoCents).toBe(0);
  });
});

describe('item 17 — conferência NFS-e no caixa (F-CX-6 a)', () => {
  it('compara com a receita auferida do PA; a divergência real é WARNING, sem REGIME_CAIXA', async () => {
    const c = await cenario('cx17', { 2026: CAIXA });
    await linha(c, 'v17', '2026-11-10', 10_000);
    const a = (await calcular(c, '2026-11')).alertas.find((x) => x.codigo === 'NFSE_DIVERGE_RECEITA');
    expect(a?.severity).toBe('WARNING');
    expect(a).not.toHaveProperty('motivoInformativo');
    expect(a?.detalhe).toContain('R$ 100.00');
  });
});

describe('item 18 — cartão (F-CX-2 c; A2 pendente)', () => {
  it('apuração CAIXA com recebimento de cartão no PA ⇒ INFO CARTAO_RECEBIMENTO_ESTIMADO; sem cartão, não', async () => {
    const c = await cenario('cx18', { 2026: CAIXA });
    await linha(c, 'v18', '2026-10-10', 10_000);
    await recebimento(c, 'v18', '2026-11-09', 10_000, { meio: 'Credit Card' });
    await linha(c, 'v18b', '2026-10-11', 10_000);
    await recebimento(c, 'v18b', '2026-10-11', 10_000);
    const nov = (await calcular(c, '2026-11')).alertas.find((x) => x.codigo === 'CARTAO_RECEBIMENTO_ESTIMADO');
    expect(nov).toMatchObject({ severity: 'INFO', motivoInformativo: 'CARTAO_RECEBIMENTO_ESTIMADO' });
    expect(nov?.detalhe).toContain('art. 77 § 3º');
    expect((await calcular(c, '2026-10')).alertas.some((x) => x.codigo === 'CARTAO_RECEBIMENTO_ESTIMADO')).toBe(false);
  });
});

describe('A3 (L2 a) — venda de ano por competência recebida no ano do caixa', () => {
  it('2025 COMPETENCIA → 2026 CAIXA: venda de dez/2025 recebida em jan/2026 fica fora da base, com INFO do valor', async () => {
    const c = await cenario('cxa3', { 2025: { regime: 'SIMPLES' }, 2026: CAIXA });
    await linha(c, 'va3', '2025-12-20', 33_000);
    await recebimento(c, 'va3', '2026-01-10', 33_000);
    const d = await calcular(c, '2026-01');
    expect(d.baseCaixa?.recebidoPaCents).toBe(0);
    const a = d.alertas.find((x) => x.codigo === 'RECEBIMENTO_DE_VENDA_TRIBUTADA_POR_COMPETENCIA');
    expect(a).toMatchObject({ severity: 'INFO' });
    expect(a?.detalhe).toContain('R$ 330.00');
    // e o art. 20 I também não alcança a venda de ano por competência
    await linha(c, 'va3b', '2025-06-01', 7_000);
    expect((await calcular(c, '2026-12')).baseCaixa?.art20Cents.parcelaVencida).toBe(0);
  });
});
