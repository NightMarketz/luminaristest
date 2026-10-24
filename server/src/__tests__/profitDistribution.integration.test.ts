/**
 * BE-INCR-IRRF-DISTRIBUICAO PR-2 (BRIEF itens 10–21; F-IRD-3..10) — distribuição de lucros com IRRF, ponta a ponta, com o
 * lançamento real (memória "sintético ≠ formato real"). Os nomes dos casos do item 17 são os que o cabeçalho
 * `atomicUntil` do ProfitDistributionService cita.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { getFactory } from '@/lib/factory';
import { ProfitDistributionRepository } from '@/features/accounting/repositories/ProfitDistributionRepository';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';

const app = makeApp();
const BASE = '/api/accounting/profit-distributions';
const FONTE = 'profit.distribution';
const CPF = '52998224725';
const CPF_EXTERIOR = '39053344705';
const CNPJ = '11222333000181';

const CONTAS = [
  { code: '1.1.1.01', name: 'Banco', nature: 'Asset' },
  { code: '2.1.7.01', name: 'Dividendos a Pagar', nature: 'Liability' },
  { code: '2.1.7.03', name: 'IRRF a Recolher', nature: 'Liability' },
  { code: '2.3.1.01', name: 'Lucros Acumulados', nature: 'Equity' },
  { code: '2.3.2.01', name: 'Capital Social Integralizado', nature: 'Equity' },
  { code: '3.1', name: 'Receita de Serviços', nature: 'Revenue' },
];

type Unidade = { unitId: string; ids: Record<string, string> };
type Dono = { id: string; username: string; unitId: string; ids: Record<string, string>; socio: string; socioPj: string; socioExterior: string };

let seq = 0;
async function unidade(userId: string, unitId: string, opts: { marcoFechado?: boolean; regime?: string } = {}): Promise<Unidade> {
  await seedUnit({ userId, id: unitId });
  const ids: Record<string, string> = {};
  for (const c of CONTAS) ids[c.code] = (await prisma.account.create({ data: { userId, unitId, ...c, acceptsEntries: true } })).id;
  for (let month = 1; month <= 12; month++) {
    const fechado = opts.marcoFechado && month === 3;
    await prisma.accountingPeriod.create({ data: { userId, unitId, year: 2026, month, status: fechado ? 'HARD_CLOSED' : 'OPEN', openedAt: new Date() } });
  }
  const regime = opts.regime ?? 'PRESUMIDO';
  await prisma.fiscalProfile.create({
    data: {
      userId,
      unitId,
      regimeTributario: regime,
      pisCofinsRegime: regime === 'SIMPLES' ? 'SIMPLES' : 'CUMULATIVO',
      dividendosPagarAccountId: ids['2.1.7.01'],
      irrfRecolherAccountId: ids['2.1.7.03'],
    },
  });
  return { unitId, ids };
}

async function cenario(opts: { marcoFechado?: boolean; regime?: string } = {}): Promise<Dono> {
  seq += 1;
  const u = await prisma.user.create({ data: { name: `pd-${seq}`, username: `pd-${seq}`, email: `pd-${seq}@test.local`, password: 'x', role: 'USER' } });
  const un = await unidade(u.id, `unit-pd-${seq}`, opts);
  const socio = async (taxId: string, residenteBrasil = true) =>
    (await prisma.partner.create({ data: { userId: u.id, nome: 'Sócio Teste', taxId, tipoPessoa: taxId.length === 11 ? 'PF' : 'PJ', residenteBrasil, participacaoBp: 3000, entradaEm: '2026-01-01' } })).id;
  return { ...u, ...un, socio: await socio(CPF), socioPj: await socio(CNPJ), socioExterior: await socio(CPF_EXTERIOR, false) };
}

const corpo = (d: { unitId: string; ids: Record<string, string> }, partnerId: string, extra: Record<string, unknown> = {}) => ({
  unitId: d.unitId,
  partnerId,
  evento: 'PAGAMENTO',
  dataEvento: '2026-03-10',
  brutoCents: 3_000_000,
  debitoAccountId: d.ids['2.3.1.01'],
  contraAccountId: d.ids['1.1.1.01'],
  origemLucro: 'CORRENTE',
  ...extra,
});
const criar = (dono: Dono, body: Record<string, unknown>) => request(app).post(BASE).set(authHeader(dono)).send(body);
const lancamentos = (dono: Dono) =>
  prisma.journalEntry.findMany({ where: { userId: dono.id, sourceType: FONTE }, include: { postings: { include: { account: true } } }, orderBy: { createdAt: 'asc' } });
const pernas = (e: { postings: Array<{ debitCents: bigint; creditCents: bigint; account: { code: string } }> }) =>
  e.postings.map((p) => [p.account.code, Number(p.debitCents), Number(p.creditCents)]).sort();

describe('IRRF-DISTRIBUICAO PR-2 — distribuição de lucros com IRRF', () => {
  beforeAll(async () => {
    pushTestSchema();
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('itens 12 e 17: 30k + 30k ⇒ o 2º retém 6k; D lucros 30k / C banco 24k / C IRRF 6k; memória e auditoria sem CPF', async () => {
    const dono = await cenario();
    const a = await criar(dono, corpo(dono, dono.socio));
    expect([a.status, a.body.data.status, a.body.data.irrfCents]).toEqual([201, 'POSTED', 0]);
    const b = await criar(dono, corpo(dono, dono.socio, { dataEvento: '2026-03-20' }));
    expect([b.status, b.body.data.status, b.body.data.irrfCents, b.body.data.liquidoCents]).toEqual([201, 'POSTED', 600_000, 2_400_000]);
    expect(b.body.data.memoria).toMatchObject({
      somaMesCents: 6_000_000,
      baseMesCents: 6_000_000,
      devidoMesCents: 600_000,
      jaRetidoCents: 0,
      irrfEventoCents: 600_000,
      eventos: [{ id: a.body.data.id, brutoCents: 3_000_000, irrfCents: 0, origemLucro: 'CORRENTE' }],
    });
    const es = await lancamentos(dono);
    expect(es).toHaveLength(2);
    expect(es[1].id).toBe(b.body.data.entryId);
    expect(pernas(es[0])).toEqual([['1.1.1.01', 0, 3_000_000], ['2.3.1.01', 3_000_000, 0]]); // sem IRRF, sem a perna
    expect(pernas(es[1])).toEqual([['1.1.1.01', 0, 2_400_000], ['2.1.7.03', 0, 600_000], ['2.3.1.01', 3_000_000, 0]]);
    const ev = await prisma.auditEvent.findFirst({ where: { eventType: 'profit_distribution.created', targetId: b.body.data.id } });
    expect(JSON.parse(ev?.payload ?? '{}')).toMatchObject({ distributionId: b.body.data.id, partnerId: dono.socio, irrfCents: '600000' });
    expect(ev?.payload).not.toContain(CPF);
  });

  it('item 12: três unidades da mesma PJ somam no mês do mesmo CPF (20k + 20k + 20k ⇒ o 3º retém 6k)', async () => {
    const dono = await cenario();
    const u2 = await unidade(dono.id, `${dono.unitId}-b`);
    const u3 = await unidade(dono.id, `${dono.unitId}-c`);
    const r: number[] = [];
    for (const u of [dono, u2, u3]) {
      const x = await criar(dono, corpo(u, dono.socio, { brutoCents: 2_000_000 }));
      expect(x.status).toBe(201);
      r.push(x.body.data.irrfCents);
    }
    expect(r).toEqual([0, 0, 600_000]);
  });

  it('itens 12 e 14: 30k de transição + 30k corrente ⇒ retém 3k; aprovação até 31/01/2026 aceita, depois → 400; sem a liminar, 20/01 → 400', async () => {
    const dono = await cenario();
    const ato = await prisma.sourceDocument.create({ data: { userId: dono.id, unitId: dono.unitId, sourceType: 'ato.aprovacao.lucros', description: 'ata' } });
    const transicao = { origemLucro: 'TRANSICAO', anoResultado: 2025, aprovadoEm: '2026-01-20', atoSourceDocumentId: ato.id };
    const t = await criar(dono, corpo(dono, dono.socio, transicao));
    expect([t.status, t.body.data.irrfCents]).toEqual([201, 0]);
    expect(t.body.data.memoria.transicaoAprovacaoAte).toEqual({ linhaId: 'ird-transicao-2026-01-31', valor: '2026-01-31' });
    const c = await criar(dono, corpo(dono, dono.socio, { dataEvento: '2026-03-11' }));
    expect([c.status, c.body.data.irrfCents]).toEqual([201, 300_000]);
    expect(c.body.data.memoria).toMatchObject({ somaMesCents: 6_000_000, baseMesCents: 3_000_000, devidoMesCents: 300_000 });

    const tarde = await criar(dono, corpo(dono, dono.socio, { ...transicao, aprovadoEm: '2026-02-02' }));
    expect([tarde.status, tarde.body.code]).toEqual([400, 'TRANSICAO_FORA_DO_PRAZO']);
    const outroDono = await criar(dono, corpo(dono, dono.socio, { ...transicao, atoSourceDocumentId: 'ato-que-nao-existe' }));
    expect(outroDono.status).toBe(404);

    // Se o plenário cassar a liminar, a linha de 31/01/2026 é revogada e a de 31/12/2025 volta a valer.
    const legal = getFactory().getLegalParameterService();
    await prisma.legalParameter.update({ where: { id: 'ird-transicao-2026-01-31' }, data: { status: 'REVOKED' } });
    try {
      await legal.aquecer();
      const semLiminar = await criar(dono, corpo(dono, dono.socio, { ...transicao, dataEvento: '2026-04-10' }));
      expect([semLiminar.status, semLiminar.body.code]).toEqual([400, 'TRANSICAO_FORA_DO_PRAZO']);
    } finally {
      await prisma.legalParameter.update({ where: { id: 'ird-transicao-2026-01-31' }, data: { status: 'PUBLISHED' } });
      await legal.aquecer();
    }
  });

  it('item 13 (L5): sócio PJ residente ⇒ IRRF 0 em 60k, sem somar com ninguém', async () => {
    const dono = await cenario();
    const r = await criar(dono, corpo(dono, dono.socioPj, { brutoCents: 6_000_000 }));
    expect([r.status, r.body.data.irrfCents, r.body.data.memoria.tipoPessoa]).toEqual([201, 0, 'PJ']);
  });

  it('item 4 (F-IRD-7): sócio não residente ⇒ 400 SOCIO_NAO_RESIDENTE_FORA_DO_ESCOPO, na prévia e na gravação', async () => {
    const dono = await cenario();
    const r = await criar(dono, corpo(dono, dono.socioExterior));
    expect([r.status, r.body.code]).toEqual([400, 'SOCIO_NAO_RESIDENTE_FORA_DO_ESCOPO']);
    const p = await request(app).post(`${BASE}/preview`).set(authHeader(dono)).send(corpo(dono, dono.socioExterior));
    expect([p.status, p.body.code]).toEqual([400, 'SOCIO_NAO_RESIDENTE_FORA_DO_ESCOPO']);
  });

  it('item 11 (F-IRD-9): CREDITO credita dividendos a pagar do perfil; natureza errada → 400; EMPREGO credita o capital', async () => {
    const dono = await cenario();
    const { contraAccountId: _c, ...semContra } = corpo(dono, dono.socio, { evento: 'CREDITO', brutoCents: 6_000_000 });
    const cr = await criar(dono, semContra);
    expect([cr.status, cr.body.data.contraAccountId, cr.body.data.irrfCents]).toEqual([201, dono.ids['2.1.7.01'], 600_000]);
    expect(pernas((await lancamentos(dono))[0])).toEqual([['2.1.7.01', 0, 5_400_000], ['2.1.7.03', 0, 600_000], ['2.3.1.01', 6_000_000, 0]]);

    expect((await criar(dono, corpo(dono, dono.socio, { debitoAccountId: dono.ids['1.1.1.01'] }))).status).toBe(400);
    expect((await criar(dono, corpo(dono, dono.socio, { evento: 'EMPREGO' }))).status).toBe(400); // banco não é capital
    const emp = await criar(dono, corpo(dono, dono.socio, { evento: 'EMPREGO', contraAccountId: dono.ids['2.3.2.01'], dataEvento: '2026-04-10' }));
    expect([emp.status, emp.body.data.contraAccountId]).toEqual([201, dono.ids['2.3.2.01']]);
  });

  it('item 15 (F-IRD-5R): 40k já no mês → teto 10k e sugestão de mover o excedente; a prévia não grava', async () => {
    const dono = await cenario();
    await criar(dono, corpo(dono, dono.socio, { brutoCents: 4_000_000 }));
    const antes = await prisma.profitDistributionEvent.count({ where: { userId: dono.id } });
    const p = await request(app).post(`${BASE}/preview`).set(authHeader(dono)).send(corpo(dono, dono.socio, { brutoCents: 2_000_000 }));
    expect(p.status).toBe(200);
    expect(p.body.data).toMatchObject({ tetoSemRetencaoCents: 1_000_000, irrfEventoCents: 600_000, sugestao: 'MOVER_EXCEDENTE_MES_SEGUINTE', brutoMinimoCents: null });
    expect(await prisma.profitDistributionEvent.count({ where: { userId: dono.id } })).toBe(antes);
  });

  it('item 16: 49k + 2k → 422 RETENCAO_EXCEDE_PAGAMENTO com o bruto mínimo; nada grava', async () => {
    const dono = await cenario();
    await criar(dono, corpo(dono, dono.socio, { brutoCents: 4_900_000 }));
    const r = await criar(dono, corpo(dono, dono.socio, { brutoCents: 200_000 }));
    expect([r.status, r.body.code, r.body.details]).toEqual([422, 'RETENCAO_EXCEDE_PAGAMENTO', { brutoMinimoCents: 544_444, irrfEventoCents: 510_000 }]);
    expect(await prisma.profitDistributionEvent.count({ where: { userId: dono.id } })).toBe(1);
    const p = await request(app).post(`${BASE}/preview`).set(authHeader(dono)).send(corpo(dono, dono.socio, { brutoCents: 200_000 }));
    expect(p.body.data).toMatchObject({ sugestao: 'AUMENTAR_BRUTO', brutoMinimoCents: 544_444 });
  });

  it('item 17: período fechado ⇒ ACCOUNTING_PERIOD_NOT_OPEN e nada grava (nem evento, nem lançamento)', async () => {
    const dono = await cenario({ marcoFechado: true });
    const r = await criar(dono, corpo(dono, dono.socio));
    expect(r.body.code).toBe('ACCOUNTING_PERIOD_NOT_OPEN');
    expect(await prisma.profitDistributionEvent.count({ where: { userId: dono.id } })).toBe(0);
    expect(await lancamentos(dono)).toHaveLength(0);
  });

  it('item 17 (commit 2 — CAS): crash entre o postEntry e o CAS ⇒ pendente; reconcile reaproveita o lançamento (sem 2º)', async () => {
    const dono = await cenario();
    const spy = jest.spyOn(ProfitDistributionRepository.prototype, 'markPosted').mockRejectedValueOnce(new Error('crash entre commits'));
    const r = await criar(dono, corpo(dono, dono.socio, { brutoCents: 6_000_000 }));
    spy.mockRestore();
    expect([r.status, r.body.data.status, r.body.data.entryId]).toEqual([201, 'PENDING_POST', null]);
    expect(await lancamentos(dono)).toHaveLength(1); // o commit 1 do razão aconteceu
    const rec = await request(app).post(`${BASE}/${r.body.data.id}/lancamento`).set(authHeader(dono)).send({ unitId: dono.unitId });
    expect([rec.status, rec.body.data.status]).toEqual([200, 'POSTED']);
    const es = await lancamentos(dono);
    expect(es).toHaveLength(1);
    expect(rec.body.data.entryId).toBe(es[0].id);
  });

  it('item 17 (reconcile): 2ª chamada não lança de novo e devolve o mesmo entryId', async () => {
    const dono = await cenario();
    const spy = jest.spyOn(ProfitDistributionRepository.prototype, 'markPosted').mockRejectedValueOnce(new Error('crash entre commits'));
    const r = await criar(dono, corpo(dono, dono.socio));
    spy.mockRestore();
    const rec = () => request(app).post(`${BASE}/${r.body.data.id}/lancamento`).set(authHeader(dono)).send({ unitId: dono.unitId });
    const um = await rec();
    const dois = await rec();
    expect([um.body.data.status, dois.body.data.status]).toEqual(['POSTED', 'POSTED']);
    expect(dois.body.data.entryId).toBe(um.body.data.entryId);
    expect(await lancamentos(dono)).toHaveLength(1);
  });

  it('item 18 (F-IRD-10): sem lucro no razão ⇒ aviso, sem bloquear; com receita do ano que cobre ⇒ sem aviso', async () => {
    const dono = await cenario();
    const sem = await criar(dono, corpo(dono, dono.socio, { brutoCents: 1_000_000 }));
    expect([sem.status, sem.body.data.status]).toEqual([201, 'POSTED']);
    expect(sem.body.data.avisoSaldoLucro).toContain('IN 1.500 art. 8º § 1º');

    const scope = resolveAccountingScopeInternal({ userId: dono.id }, dono.unitId);
    await getFactory().getPostingService().postEntry(scope, {
      unitId: dono.unitId,
      date: '2026-02-10',
      description: 'receita',
      sourceType: 'manual',
      lines: [{ accountCode: '1.1.1.01', debitCents: 5_000_000, creditCents: 0 }, { accountCode: '3.1', debitCents: 0, creditCents: 5_000_000 }],
    });
    // 10k já distribuídos + 20k novos = 30k ≤ 50k de resultado (o débito do 1º em lucros acumulados não conta duas vezes)
    const com = await criar(dono, corpo(dono, dono.socio, { brutoCents: 2_000_000, dataEvento: '2026-03-11' }));
    expect(com.body.data.avisoSaldoLucro).toBeNull();
    const demais = await criar(dono, corpo(dono, dono.socio, { brutoCents: 2_100_000, dataEvento: '2026-03-12' }));
    expect(demais.body.data.avisoSaldoLucro).not.toBeNull(); // 51k > 50k
  });

  it('item 19 (L6, F-IRD-3): no Simples retém igual — 60k ⇒ 6k', async () => {
    const dono = await cenario({ regime: 'SIMPLES' });
    const r = await criar(dono, corpo(dono, dono.socio, { brutoCents: 6_000_000 }));
    expect([r.status, r.body.data.irrfCents]).toEqual([201, 600_000]);
  });

  it('item 20 (F-IRD-8): cancelar o do meio → 409 com o id do último; o último → estorno e CANCELLED', async () => {
    const dono = await cenario();
    const a = await criar(dono, corpo(dono, dono.socio));
    const b = await criar(dono, corpo(dono, dono.socio, { dataEvento: '2026-03-20' }));
    const cancelar = (id: string) => request(app).post(`${BASE}/${id}/cancel`).set(authHeader(dono)).send({ unitId: dono.unitId, motivo: 'erro de digitação' });
    const meio = await cancelar(a.body.data.id);
    expect([meio.status, meio.body.code]).toEqual([409, 'NAO_E_O_ULTIMO_DO_MES']);
    expect(meio.body.message).toContain(b.body.data.id);
    expect((await prisma.journalEntry.findUnique({ where: { id: a.body.data.entryId } }))?.status).toBe('Posted');

    const ult = await cancelar(b.body.data.id);
    expect([ult.status, ult.body.data.status]).toEqual([200, 'CANCELLED']);
    expect((await prisma.journalEntry.findUnique({ where: { id: b.body.data.entryId } }))?.status).toBe('Reversed');
    // depois de cancelado o último, o anterior vira o último e pode ser cancelado
    expect((await cancelar(a.body.data.id)).status).toBe(200);
    expect((await cancelar(a.body.data.id)).status).toBe(409); // já cancelado
  });

  it('item 21 (L8): resumo do DARF 1841 da competência — total retido, eventos com retenção e vencimento 20/04/2026', async () => {
    const dono = await cenario();
    await criar(dono, corpo(dono, dono.socio));
    const b = await criar(dono, corpo(dono, dono.socio, { dataEvento: '2026-03-20' }));
    const r = await request(app).get(`${BASE}/irrf`).set(authHeader(dono)).query({ unitId: dono.unitId, competencia: '2026-03' });
    expect(r.status).toBe(200);
    expect(r.body.data).toEqual({ competencia: '2026-03', codigoReceita: '1841', totalCents: 600_000, vencimento: '2026-04-20', eventos: [b.body.data.id] });
  });

  it('tenancy: id de outra PJ → 404', async () => {
    const dono = await cenario();
    const outro = await cenario();
    const a = await criar(dono, corpo(dono, dono.socio));
    expect((await request(app).get(`${BASE}/${a.body.data.id}`).set(authHeader(outro)).query({ unitId: outro.unitId })).status).toBe(404);
    expect((await criar(outro, corpo(outro, dono.socio))).status).toBe(404);
  });
});
