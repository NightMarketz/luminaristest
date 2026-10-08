/**
 * BE-INCR-LEGAL-PARAMS PR-4 (nó LEGAL-PARAMS; BRIEF §3 itens 7 e 10; emenda §9 L-3 e L-17..L-24, dono 07/10) — o
 * recálculo automático ponta a ponta sobre SQLite real: publicar uma linha retroativa grava o job na mesma tx; o job
 * reconfirma a apuração afetada (autor PLATFORM, snapshot novo) e os períodos que a cascata derruba; período fechado ⇒
 * a confirmação fica e a provisão fica pendente; 2ª execução ⇒ nada novo; apuração sem entrada gravada ⇒ só aviso;
 * substituída que entrou no MIT ⇒ aviso "valor mudou depois da entrega".
 *
 * Números (Presumido, serviço, CSLL 9%): receita T01 R$ 100.000,00 ⇒ base 32% = 32.000,00; IRPJ 15% = 4.800,00 (sem
 * adicional). Com IRPJ 17% publicado retroativo ⇒ 5.440,00; CSLL fica 2.880,00. T02 sem receita ⇒ 0.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { ApplicationFactory } from '@/lib/factory';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { ATOR_PLATAFORMA, AVISO_VALOR_MUDOU_APOS_ENTREGA } from '@/features/accounting/services/TaxAssessmentRecalcService';

const app = makeApp();
const BASE = '/api/accounting/tax-assessments';
const PROVISION = 'tax.assessment.provision';
const factory = () => ApplicationFactory.getInstance();
const recalc = () => factory().getTaxAssessmentRecalcService().processarPendentes();

let admin: { userId: string; role: string };
let seq = 0;

const CONTAS = [
  { code: '1.1.1', name: 'Banco', nature: 'Asset' },
  { code: '3.1', name: 'Receita de Serviços', nature: 'Revenue' },
  { code: '4.9.1', name: 'IRPJ', nature: 'Expense' },
  { code: '4.9.2', name: 'CSLL', nature: 'Expense' },
  { code: '2.1.9.1', name: 'IRPJ a recolher', nature: 'Liability' },
  { code: '2.1.9.2', name: 'CSLL a recolher', nature: 'Liability' },
];

/** Uma PJ nova (a apuração é da PJ inteira): plano, 12 períodos abertos, perfis e receita de serviço no T01. */
async function cenario(ano: number) {
  seq += 1;
  const dono = await prisma.user.create({ data: { name: `lp4-${seq}`, username: `lp4-${seq}`, email: `lp4-${seq}@test.local`, password: 'x', role: 'USER' } });
  const unitId = `u-lp4-${seq}`;
  const ids: Record<string, string> = {};
  for (const c of CONTAS) ids[c.code] = (await prisma.account.create({ data: { userId: dono.id, unitId, ...c, acceptsEntries: true } })).id;
  for (let month = 1; month <= 12; month++) {
    await prisma.accountingPeriod.create({ data: { userId: dono.id, unitId, year: ano, month, status: 'OPEN', openedAt: new Date() } });
  }
  await prisma.companyFiscalProfile.create({ data: { userId: dono.id, anoCalendario: ano, regime: 'PRESUMIDO', ecfIndAliqCsll: '1', ecfIndRecReceita: '2' } });
  await prisma.fiscalProfile.create({
    data: {
      userId: dono.id, unitId, regimeTributario: 'PRESUMIDO', pisCofinsRegime: 'CUMULATIVO',
      irpjDespesaAccountId: ids['4.9.1'], csllDespesaAccountId: ids['4.9.2'], irpjRecolherAccountId: ids['2.1.9.1'], csllRecolherAccountId: ids['2.1.9.2'],
    },
  });
  await factory().getPostingService().postEntry(resolveAccountingScope({ userId: dono.id }, unitId), {
    unitId, date: `${ano}-02-10`, sourceType: 'manual', description: 'Serviço',
    lines: [{ accountCode: '1.1.1', debitCents: 10_000_000, creditCents: 0 }, { accountCode: '3.1', debitCents: 0, creditCents: 10_000_000 }],
  });
  return { dono: { id: dono.id, username: dono.username }, unitId, ano };
}

type Cenario = Awaited<ReturnType<typeof cenario>>;

async function confirmar(c: Cenario, periodo: string) {
  const p = await request(app).post(`${BASE}/preview`).set(authHeader(c.dono)).send({ unitId: c.unitId, anoCalendario: c.ano, periodo });
  expect(p.status).toBe(200);
  const r = await request(app)
    .post(BASE)
    .set(authHeader(c.dono))
    .send({ unitId: c.unitId, anoCalendario: c.ano, periodo, expectedAPagarCents: { IRPJ: p.body.data.irpj.aPagarCents, CSLL: p.body.data.csll.aPagarCents } });
  expect(r.status).toBe(201);
  return r.body.data as { irpj: { id: string }; csll: { id: string } };
}

/** Publica IRPJ_ALIQ retroativo, só para o ano (PLATFORM_ADMIN) — vigência fechada para não vazar entre os cenários. */
async function publicarIrpj(ano: number, bp: number): Promise<string> {
  const svc = factory().getLegalParameterService();
  const draft = await svc.propose(admin, {
    tabela: 'TAX_ASSESSMENT', chave: 'IRPJ_ALIQ', valorInt: bp, fonte: 'teste PR-4 (alíquota hipotética)', vigenteDesde: `${ano}-01-01`, vigenteAte: `${ano}-12-31`, motivo: 'teste do recálculo',
  });
  await svc.publish(admin, draft.id);
  return draft.id;
}

const vivas = (c: Cenario) => prisma.taxAssessment.findMany({ where: { userId: c.dono.id, status: 'CONFIRMED' }, orderBy: [{ periodo: 'asc' }, { tributo: 'asc' }] });

describe('LEGAL-PARAMS PR-4 — snapshot por apuração + recálculo automático (itens 7 e 10)', () => {
  beforeAll(async () => {
    pushTestSchema();
    const u = await prisma.user.create({ data: { name: 'lp4-admin', username: 'lp4-admin', email: 'lp4-admin@test.local', password: 'x', role: 'PLATFORM_ADMIN' } });
    admin = { userId: u.id, role: 'PLATFORM_ADMIN' };
  }, 120000);

  afterAll(async () => {
    // As linhas publicadas aqui não podem vazar para outras suítes (o cache é do processo).
    await prisma.legalParameter.deleteMany({ where: { fonte: 'teste PR-4 (alíquota hipotética)' } });
    await prisma.legalParameterRecalcJob.deleteMany();
    await factory().getLegalParameterService().aquecer();
    await prisma.$disconnect();
  });

  it('item 7: a confirmação grava o snapshot (ids + sha256) e a entrada informada; o sha256 entra na trilha', async () => {
    const c = await cenario(2032);
    const { irpj } = await confirmar(c, 'T01');
    const row = await prisma.taxAssessment.findUniqueOrThrow({ where: { id: irpj.id } });
    expect(row.parametrosSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(row.parametrosIds).toEqual(expect.arrayContaining(['lp1-ta-irpj_aliq']));
    expect(row.entradaInformada).toEqual({ deducoes: [] });
    const ev = await prisma.auditEvent.findFirstOrThrow({ where: { scopeUserId: c.dono.id, eventType: 'tax.assessment.confirmed', targetId: irpj.id } });
    expect(JSON.parse(ev.payload).parametrosSha256).toBe(row.parametrosSha256);
  });

  it('item 10: linha retroativa ⇒ job PENDING na tx; o job reconfirma T01 (PLATFORM, snapshot novo) e o T02 da cascata; 2ª execução ⇒ nada novo', async () => {
    const c = await cenario(2033);
    const t1 = await confirmar(c, 'T01');
    await confirmar(c, 'T02');
    const antes = await prisma.taxAssessment.findUniqueOrThrow({ where: { id: t1.irpj.id } });

    const linhaId = await publicarIrpj(2033, 1700);
    expect(await prisma.legalParameterRecalcJob.findMany({ where: { legalParameterId: linhaId } })).toMatchObject([{ status: 'PENDING', evento: 'PUBLISHED' }]);
    // A publicação não reconfirmou nada sozinha (o job roda fora da requisição).
    expect((await vivas(c)).every((r) => r.confirmedById === c.dono.id)).toBe(true);

    const r = await recalc();
    expect(r).toMatchObject({ jobs: 1, falhas: 0 });
    const depois = await vivas(c);
    expect(depois.map((x) => [x.periodo, x.tributo, x.confirmedById])).toEqual([
      ['T01', 'CSLL', ATOR_PLATAFORMA], ['T01', 'IRPJ', ATOR_PLATAFORMA], ['T02', 'CSLL', ATOR_PLATAFORMA], ['T02', 'IRPJ', ATOR_PLATAFORMA],
    ]);
    const irpjT1 = depois.find((x) => x.periodo === 'T01' && x.tributo === 'IRPJ')!;
    expect([irpjT1.devidoCents, irpjT1.supersedesId]).toEqual([544_000n, antes.id]);
    expect(irpjT1.parametrosSha256).not.toBe(antes.parametrosSha256);
    expect(irpjT1.parametrosIds).toEqual(expect.arrayContaining([linhaId]));
    expect(irpjT1.provisaoEntryId).not.toBeNull(); // período aberto: provisão nova postada
    expect((await prisma.taxAssessment.findUniqueOrThrow({ where: { id: antes.id } })).status).toBe('SUPERSEDED');
    expect(await prisma.legalParameterRecalcJob.findFirstOrThrow({ where: { legalParameterId: linhaId } })).toMatchObject({ status: 'DONE' });
    const vivasProvisao = await prisma.journalEntry.count({ where: { unitId: c.unitId, sourceType: PROVISION, status: 'Posted', reversedById: null } });

    // 2ª execução: nenhum PENDING ⇒ nada. Mesmo um job repetido da mesma linha não cria versão nova (valores iguais).
    expect(await recalc()).toMatchObject({ jobs: 0 });
    await prisma.legalParameterRecalcJob.create({ data: { legalParameterId: linhaId, evento: 'PUBLISHED', status: 'PENDING' } });
    const total = await prisma.taxAssessment.count({ where: { userId: c.dono.id } });
    expect(await recalc()).toMatchObject({ jobs: 1, reconfirmadas: 0 });
    expect(await prisma.taxAssessment.count({ where: { userId: c.dono.id } })).toBe(total);
    expect(await prisma.journalEntry.count({ where: { unitId: c.unitId, sourceType: PROVISION, status: 'Posted', reversedById: null } })).toBe(vivasProvisao);
  });

  it('item 10: período fechado ⇒ a reconfirmação fica e a provisão fica pendente', async () => {
    const c = await cenario(2034);
    await confirmar(c, 'T01');
    await prisma.accountingPeriod.updateMany({ where: { userId: c.dono.id, unitId: c.unitId, year: 2034, month: 3 }, data: { status: 'HARD_CLOSED' } });
    await publicarIrpj(2034, 1700);
    await recalc();
    const irpj = (await vivas(c)).find((x) => x.tributo === 'IRPJ')!;
    expect([irpj.confirmedById, irpj.devidoCents, irpj.provisaoEntryId]).toEqual([ATOR_PLATAFORMA, 544_000n, null]);
    const view = await request(app).get(`${BASE}/${irpj.id}`).set(authHeader(c.dono)).query({ unitId: c.unitId });
    expect(view.body.data.provisaoPendente).toBe(true);
  });

  it('item 10: apuração sem entrada gravada (anterior ao PR-4) ⇒ não reconfirma, ganha o aviso "reconfirme"', async () => {
    const c = await cenario(2035);
    const t1 = await confirmar(c, 'T01');
    await prisma.$executeRawUnsafe(`UPDATE tax_assessments SET entradaInformada = NULL WHERE userId = '${c.dono.id}'`);
    await publicarIrpj(2035, 1700);
    expect(await recalc()).toMatchObject({ reconfirmadas: 0 });
    const linhas = await vivas(c);
    expect(linhas.map((x) => x.id).sort()).toEqual([t1.irpj.id, t1.csll.id].sort());
    expect(linhas.every((x) => x.avisoParametroLegal?.startsWith('Parâmetro legal mudou — reconfirme'))).toBe(true);
    const view = await request(app).get(`${BASE}/${t1.irpj.id}`).set(authHeader(c.dono)).query({ unitId: c.unitId });
    expect(view.body.data.avisoParametroLegal).toContain('reconfirme');
  });

  it('item 10: a substituída já estava num arquivo MIT ⇒ a nova versão traz o aviso "valor mudou depois da entrega"', async () => {
    const c = await cenario(2036);
    const t1 = await confirmar(c, 'T01');
    await prisma.mitExport.create({ data: { userId: c.dono.id, anoCalendario: 2036, mes: 4, sha256: 'a'.repeat(64), apuracaoIds: [t1.irpj.id, t1.csll.id], geradoPorId: c.dono.id } });
    await publicarIrpj(2036, 1700);
    await recalc();
    const nova = (await vivas(c)).find((x) => x.tributo === 'IRPJ')!;
    expect(nova.id).not.toBe(t1.irpj.id);
    expect(nova.avisoParametroLegal).toBe(AVISO_VALOR_MUDOU_APOS_ENTREGA);
  });

  it('revogar também enfileira (dono 07/10) e o job volta a apuração ao valor da linha anterior', async () => {
    const c = await cenario(2037);
    const linhaId = await publicarIrpj(2037, 1700);
    await recalc();
    await confirmar(c, 'T01'); // confirmada já com 17%
    expect((await vivas(c)).find((x) => x.tributo === 'IRPJ')!.devidoCents).toBe(544_000n);
    await factory().getLegalParameterService().revoke(admin, linhaId);
    expect(await prisma.legalParameterRecalcJob.count({ where: { legalParameterId: linhaId, evento: 'REVOKED', status: 'PENDING' } })).toBe(1);
    await recalc();
    const irpj = (await vivas(c)).find((x) => x.tributo === 'IRPJ')!;
    expect([irpj.confirmedById, irpj.devidoCents]).toEqual([ATOR_PLATAFORMA, 480_000n]);
  });
});
