/**
 * IBS-CBS-2027 PR-2 (BRIEF `docs/accounting/BE-INCR-IBS-CBS-2027-brief.md` itens 6–11 e 13; invariantes §10.2–10.5,
 * 10.9, 10.10) — prévia, confirmação e leitura da apuração mensal de IBS/CBS pelo HTTP. Cada cenário usa um dono próprio.
 * O item 12 (reclassificação) está em src/__tests__/ibsCbsProvision.integration.test.ts; aqui o perfil da unidade não existe e a
 * reclassificação fica pendente.
 *
 * Números (fevereiro/2027, IBS UF 5 bp + Mun 5 bp, art. 344): nota A IBS 10,00 / CBS 87,00; nota B IBS 5,00 / sem CBS;
 * nota cancelada IBS 99,00 (fora); nota de homologação (fora). Débito IBS = 15,00; CBS = 87,00 (1 sem grupo).
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';
import { PAYLOAD_ALLOWLIST } from '@/features/accounting/audit/auditCanonical';

const app = makeApp();
const BASE = '/api/accounting/ibs-cbs-assessments';
type Dono = { id: string; username: string; unitId: string };
type Linha = { codigo: string; valorCents: string };

let seq = 0;
async function novoDono(regime: string, ano = 2027): Promise<Dono> {
  seq += 1;
  const u = await prisma.user.create({ data: { name: `ibs-${seq}`, username: `ibs-${seq}`, email: `ibs-${seq}@test.local`, password: 'x', role: 'USER' } });
  await prisma.companyFiscalProfile.create({ data: { userId: u.id, anoCalendario: ano, regime, ecfIndAliqCsll: '1', ecfIndRecReceita: '2', createdById: u.id, updatedById: u.id } });
  const unitId = `unit-ibs-pr2-${seq}`;
  await seedUnit({ userId: u.id, id: unitId });
  return { ...u, unitId };
}

let nfs = 0;
async function documento(dono: Dono, dCompet: string, ibs: bigint | null, cbs: bigint | null, over: Record<string, unknown> = {}): Promise<void> {
  nfs += 1;
  const saleId = `sale-${nfs}`;
  await prisma.fiscalDocument.create({
    data: {
      userId: dono.id, unitId: dono.unitId, kind: 'NFSE', status: 'AUTHORIZED', saleId, saleKey: saleId, anchorEntryId: `e-${nfs}`,
      ambiente: 'producao', partner: 'manual', serie: 1, dCompet, vServCents: 10_000_00n, vIbsCents: ibs, vCbsCents: cbs, ...over,
    },
  });
  await venda(dono, saleId, dCompet);
}

async function venda(dono: Dono, saleId: string, dia: string): Promise<void> {
  await prisma.journalEntry.create({ data: { userId: dono.id, unitId: dono.unitId, date: new Date(`${dia}T12:00:00.000Z`), description: 'venda', status: 'Posted', sourceType: 'sale.settled', sourceId: saleId } });
}

const body = (dono: Dono, extra: Record<string, unknown> = {}) => ({ unitId: dono.unitId, anoCalendario: 2027, mes: 2, tributo: 'IBS', ...extra });
const preview = (dono: Dono, extra: Record<string, unknown> = {}) => request(app).post(`${BASE}/preview`).set(authHeader(dono)).send(body(dono, extra));
const confirm = (dono: Dono, expectedSupersedesId: string | null, extra: Record<string, unknown> = {}) =>
  request(app).post(BASE).set(authHeader(dono)).send(body(dono, { expectedSupersedesId, ...extra }));
const list = (dono: Dono, ano: number | string = 2027) => request(app).get(BASE).set(authHeader(dono)).query({ unitId: dono.unitId, anoCalendario: ano });
const mem = (m: Linha[], codigo: string) => m.find((l) => l.codigo === codigo)?.valorCents;
const eventos = async (dono: Dono, eventType: string): Promise<Record<string, string>[]> =>
  (await prisma.auditEvent.findMany({ where: { scopeUserId: dono.id, eventType }, orderBy: { seq: 'asc' } })).map((e) => JSON.parse(e.payload));

describe('IBS-CBS-2027 PR-2 — apuração mensal de IBS/CBS', () => {
  beforeAll(async () => {
    pushTestSchema();
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('itens 6, 7, 9, 11: prévia soma o destacado nos documentos vivos do mês; sem grupo conta; cancelado, homologação e outro mês ficam fora', async () => {
    const dono = await novoDono('PRESUMIDO');
    await documento(dono, '2027-02-03', 10_00n, 87_00n);
    await documento(dono, '2027-02-28', 5_00n, null, { status: 'AUTHORIZED_DIVERGENT' });
    await documento(dono, '2027-02-10', 99_00n, 99_00n, { status: 'CANCELLED' });
    await documento(dono, '2027-02-11', 99_00n, 99_00n, { ambiente: 'homologacao' });
    await documento(dono, '2027-03-01', 99_00n, 99_00n);
    await venda(dono, 'sale-sem-nota', '2027-02-15');

    const ibs = await preview(dono);
    expect(ibs.status).toBe(200);
    expect(ibs.body.data).toMatchObject({ debitosCents: '1500', creditosCents: '0', saldoCents: '1500', documentosSemGrupo: 0 });
    const m: Linha[] = ibs.body.data.memoria;
    expect(m.map((l) => l.codigo)).toEqual(expect.arrayContaining(['DEBITO_DOC_1', 'DEBITO_DOC_2', 'CONFERENCIA_SEM_BASE', 'CREDITOS_NAO_IMPLEMENTADOS_PR3', 'RECLASSIFICACAO_SERVICO', 'SALDO']));
    expect(m.filter((l) => l.codigo === 'VENDA_SEM_DOCUMENTO').map((l) => (l as unknown as { descricao: string }).descricao).join()).toContain('sale-sem-nota');
    // Venda liquidada no mês sem documento autorizado vivo em nenhum mês (dono 21/10) — o aviso não muda o débito.
    // A venda de março tem documento (em março): não é aviso de fevereiro nem de outro mês.
    expect(mem(m, 'SALDO')).toBe('1500');

    const cbs = await preview(dono, { tributo: 'CBS' });
    expect(cbs.body.data).toMatchObject({ debitosCents: '8700', documentosSemGrupo: 1 });
    // CBS 2027 sem linha publicada (DRAFT): a conferência é pulada com aviso, o débito sai do documento (F-IBS-11 a).
    expect(cbs.body.data.memoria.map((l: Linha) => l.codigo)).toContain('CONFERENCIA_SEM_ALIQUOTA');
    expect(await prisma.consumptionTaxAssessment.count({ where: { userId: dono.id } })).toBe(0);
  });

  it('itens 9 e 13: confirmação 201 sem provisão; CAS 409; substituição com cascata; auditoria sem PII; GET por ano', async () => {
    const dono = await novoDono('REAL');
    await documento(dono, '2027-02-03', 10_00n, 87_00n);
    await documento(dono, '2027-03-03', 20_00n, 87_00n);

    const c1 = await confirm(dono, null);
    expect(c1.status).toBe(201);
    const a1 = c1.body.data.assessment;
    expect(a1).toMatchObject({ status: 'CONFIRMED', saldoCents: '1000', regime: 'REAL', provisaoEntryId: null, supersedesId: null });
    // Sem perfil fiscal da unidade ⇒ conta de IBS a recolher não configurada ⇒ a confirmação fica, reclassificação pendente.
    expect(await prisma.journalEntry.count({ where: { userId: dono.id, sourceType: 'ibs_cbs_assessment' } })).toBe(0);

    // 2ª confirmação de fevereiro sem nomear a viva ⇒ 409 (CAS).
    const dup = await confirm(dono, null);
    expect(dup.status).toBe(409);
    expect(JSON.stringify(dup.body)).toContain('IBS_CBS_ASSESSMENT_CAS');

    const marco = await confirm(dono, null, { mes: 3 });
    expect(marco.status).toBe(201);

    // Nova nota em fevereiro; substituir fevereiro derruba março (cascata).
    await documento(dono, '2027-02-20', 1_00n, 0n);
    const errado = await confirm(dono, 'id-que-nao-e-o-vivo');
    expect(errado.status).toBe(409);
    const sub = await confirm(dono, a1.id);
    expect(sub.status).toBe(201);
    expect(sub.body.data.assessment).toMatchObject({ saldoCents: '1100', supersedesId: a1.id });
    expect(sub.body.data.reconfirmar).toEqual(['03/2027']);
    const linhas = await prisma.consumptionTaxAssessment.findMany({ where: { userId: dono.id, tributo: 'IBS' }, orderBy: { createdAt: 'asc' } });
    expect(linhas.map((l) => `${l.mes}:${l.status}`)).toEqual(['2:SUPERSEDED', '3:SUPERSEDED', '2:CONFIRMED']);

    // Março caiu: reconfirma com null (nenhuma viva).
    expect((await confirm(dono, null, { mes: 3 })).status).toBe(201);

    const conf = await eventos(dono, 'tax.ibs_cbs_assessment.confirmed');
    const supd = await eventos(dono, 'tax.ibs_cbs_assessment.superseded');
    expect(conf).toHaveLength(4);
    expect(supd.map((e) => e.mes)).toEqual(['2', '3']);
    for (const e of [...conf, ...supd]) {
      const allow = PAYLOAD_ALLOWLIST[conf.includes(e) ? 'tax.ibs_cbs_assessment.confirmed' : 'tax.ibs_cbs_assessment.superseded'];
      expect(Object.keys(e).every((k) => (allow as readonly string[]).includes(k))).toBe(true);
    }

    const g = await list(dono);
    expect(g.status).toBe(200);
    expect(g.body.data).toHaveLength(4);
  });

  it('item 9: mês NOVO atrás de um posterior confirmado ⇒ 409 de ordem', async () => {
    const dono = await novoDono('PRESUMIDO');
    expect((await confirm(dono, null, { mes: 5 })).status).toBe(201);
    const r = await confirm(dono, null, { mes: 4 });
    expect(r.status).toBe(409);
    expect(JSON.stringify(r.body)).toContain('IBS_CBS_ASSESSMENT_ORDER');
  });

  it('item 10: SIMPLES e MEI ⇒ 400 nomeado em toda rota', async () => {
    for (const regime of ['SIMPLES', 'MEI']) {
      const dono = await novoDono(regime);
      for (const r of [await preview(dono), await confirm(dono, null), await list(dono)]) {
        expect(r.status).toBe(400);
        expect(JSON.stringify(r.body)).toContain('Simples Nacional/MEI');
      }
    }
  });

  it('item 10: anoCalendario < 2027 ⇒ 400 nomeado em toda rota (F-IBS-7 b)', async () => {
    const dono = await novoDono('PRESUMIDO', 2026);
    for (const r of [await preview(dono, { anoCalendario: 2026 }), await confirm(dono, null, { anoCalendario: 2026 }), await list(dono, 2026)]) {
      expect(r.status).toBe(400);
      expect(JSON.stringify(r.body)).toContain('apuração de IBS/CBS começa em 01/2027');
    }
  });

  it('item 9: sem perfil da empresa no ano ⇒ 400', async () => {
    const dono = await novoDono('PRESUMIDO', 2028);
    expect((await preview(dono)).status).toBe(400);
  });
});
