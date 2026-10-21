/**
 * IBS-CBS-2027 PR-2, item 12 (F-IBS-8 c, F-IBS-14 a; Contrato §2.3) — reclassificação mensal receita → IBS/CBS a recolher
 * em 2 commits + reconcile. Os nomes dos casos são os que o cabeçalho `atomicUntil` do IbsCbsAssessmentService cita.
 *
 * Números (fevereiro/2027): NFS-e IBS 10,00 (serviço) + NF-e IBS 4,00 (mercadoria) ⇒ D 3.1 10,00 / D 3.3 4,00 / C 2.1.8.01 14,00.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { ConsumptionTaxAssessmentRepository } from '@/features/accounting/repositories/ConsumptionTaxAssessmentRepository';
import { SALE_BINDING_V2 } from '@/features/accountingBinding/fixtures/saleBinding';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';

const app = makeApp();
const BASE = '/api/accounting/ibs-cbs-assessments';
const FONTE = 'ibs_cbs_assessment';
type Dono = { id: string; username: string; unitId: string };

const CONTAS = [
  { code: '3.1', name: 'Receita de Serviços', nature: 'Revenue' },
  { code: '3.3', name: 'Receita de Revenda de Mercadorias', nature: 'Revenue' },
  { code: '2.1.8.01', name: 'IBS a Recolher', nature: 'Liability' },
  { code: '2.1.8.02', name: 'CBS a Recolher', nature: 'Liability' },
];

let seq = 0;
async function cenario(opts: { fevereiroFechado?: boolean } = {}): Promise<Dono> {
  seq += 1;
  const u = await prisma.user.create({ data: { name: `ibsp-${seq}`, username: `ibsp-${seq}`, email: `ibsp-${seq}@test.local`, password: 'x', role: 'USER' } });
  const unitId = `unit-ibs-prov-${seq}`;
  await seedUnit({ userId: u.id, id: unitId });
  const ids: Record<string, string> = {};
  for (const c of CONTAS) ids[c.code] = (await prisma.account.create({ data: { userId: u.id, unitId, ...c, acceptsEntries: true } })).id;
  for (let month = 1; month <= 12; month++) {
    const fechado = opts.fevereiroFechado && month === 2;
    await prisma.accountingPeriod.create({ data: { userId: u.id, unitId, year: 2027, month, status: fechado ? 'HARD_CLOSED' : 'OPEN', openedAt: new Date() } });
  }
  await prisma.companyFiscalProfile.create({ data: { userId: u.id, anoCalendario: 2027, regime: 'PRESUMIDO', ecfIndAliqCsll: '1', ecfIndRecReceita: '2' } });
  await prisma.fiscalProfile.create({
    data: { userId: u.id, unitId, regimeTributario: 'PRESUMIDO', pisCofinsRegime: 'CUMULATIVO', ibsRecolherAccountId: ids['2.1.8.01'], cbsRecolherAccountId: ids['2.1.8.02'] },
  });
  return { ...u, unitId };
}

let nfs = 0;
async function documento(dono: Dono, kind: 'NFSE' | 'NFE', ibs: bigint): Promise<void> {
  nfs += 1;
  await prisma.fiscalDocument.create({
    data: {
      userId: dono.id, unitId: dono.unitId, kind, status: 'AUTHORIZED', saleId: `sp-${nfs}`, saleKey: `sp-${nfs}`, anchorEntryId: `e-${nfs}`,
      ambiente: 'producao', partner: 'manual', serie: 1, dCompet: '2027-02-10', vServCents: 1_000_00n, vIbsCents: ibs, vCbsCents: 0n,
    },
  });
}

const confirm = (dono: Dono, expectedSupersedesId: string | null) =>
  request(app).post(BASE).set(authHeader(dono)).send({ unitId: dono.unitId, anoCalendario: 2027, mes: 2, tributo: 'IBS', expectedSupersedesId });
const reconcile = (dono: Dono, id: string) => request(app).post(`${BASE}/${id}/provisao`).set(authHeader(dono)).query({ unitId: dono.unitId });
const lancamentos = (dono: Dono) => prisma.journalEntry.findMany({ where: { userId: dono.id, sourceType: FONTE }, include: { postings: { include: { account: true } } }, orderBy: { createdAt: 'asc' } });

describe('IBS-CBS-2027 PR-2 item 12 — reclassificação receita → IBS/CBS a recolher', () => {
  beforeAll(async () => {
    pushTestSchema();
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('item 12 (commit 1 — razão): D receita de serviços + D receita de revenda / C a recolher = débitos; período fechado ⇒ a confirmação fica, pendente, nenhum lançamento', async () => {
    const dono = await cenario();
    await documento(dono, 'NFSE', 10_00n);
    await documento(dono, 'NFE', 4_00n);
    const r = await confirm(dono, null);
    expect(r.status).toBe(201);
    const a = r.body.data.assessment;
    const [e] = await lancamentos(dono);
    expect(a.provisaoEntryId).toBe(e.id);
    expect(e.date.toISOString().slice(0, 10)).toBe('2027-02-28');
    const pernas = e.postings.map((p) => `${p.account.code}:${p.debitCents}:${p.creditCents}`).sort();
    expect(pernas).toEqual(['2.1.8.01:0:1400', '3.1:1000:0', '3.3:400:0']);
    const debitos = e.postings.reduce((s, p) => s + Number(p.debitCents), 0);
    expect(String(debitos)).toBe(a.debitosCents);

    // Gate de período dentro da tx do postEntry: fevereiro fechado ⇒ a confirmação grava, a reclassificação fica pendente.
    const fechado = await cenario({ fevereiroFechado: true });
    await documento(fechado, 'NFSE', 10_00n);
    const f = await confirm(fechado, null);
    expect(f.status).toBe(201);
    expect(f.body.data.assessment.provisaoEntryId).toBeNull();
    expect(await lancamentos(fechado)).toHaveLength(0);
  });

  it('item 12 (substituição): estorna a reclassificação da substituída e posta a da nova — 1 viva por tributo', async () => {
    const dono = await cenario();
    await documento(dono, 'NFSE', 10_00n);
    const a1 = (await confirm(dono, null)).body.data.assessment;
    await documento(dono, 'NFSE', 5_00n);
    const a2 = (await confirm(dono, a1.id)).body.data.assessment;
    expect(a2.saldoCents).toBe('1500');
    const antiga = await prisma.journalEntry.findUniqueOrThrow({ where: { id: a1.provisaoEntryId } });
    expect(antiga.status).toBe('Reversed');
    const vivas = (await lancamentos(dono)).filter((e) => e.status === 'Posted');
    expect(vivas.map((e) => e.id)).toEqual([a2.provisaoEntryId]);
  });

  it('item 12 (commit 2 — CAS): crash entre o postEntry e o CAS ⇒ pendente; reconcile reaproveita o lançamento (sem 2º)', async () => {
    const dono = await cenario();
    await documento(dono, 'NFSE', 10_00n);
    const spy = jest.spyOn(ConsumptionTaxAssessmentRepository.prototype, 'setProvisaoEntryId').mockRejectedValue(new Error('crash entre commits'));
    const a = (await confirm(dono, null)).body.data.assessment;
    spy.mockRestore();
    expect(a.provisaoEntryId).toBeNull();
    expect(await lancamentos(dono)).toHaveLength(1);
    const r = await reconcile(dono, a.id);
    expect(r.status).toBe(200);
    const entries = await lancamentos(dono);
    expect(entries).toHaveLength(1);
    expect(r.body.data.provisaoEntryId).toBe(entries[0].id);
  });

  it('item 12 (reconcile): completa e é idempotente — 2ª chamada sem lançamento novo, mesmo provisaoEntryId', async () => {
    const dono = await cenario();
    await documento(dono, 'NFSE', 10_00n);
    // Conta não configurada ⇒ a confirmação fica, pendente; o reconcile devolve 400 até configurar (dono 21/10).
    await prisma.fiscalProfile.updateMany({ where: { userId: dono.id }, data: { ibsRecolherAccountId: null } });
    const a = (await confirm(dono, null)).body.data.assessment;
    expect(a.provisaoEntryId).toBeNull();
    expect((await reconcile(dono, a.id)).status).toBe(400);
    const conta = await prisma.account.findFirstOrThrow({ where: { userId: dono.id, code: '2.1.8.01' } });
    await prisma.fiscalProfile.updateMany({ where: { userId: dono.id }, data: { ibsRecolherAccountId: conta.id } });

    const r1 = await reconcile(dono, a.id);
    expect(r1.status).toBe(200);
    const r2 = await reconcile(dono, a.id);
    expect(r2.status).toBe(200);
    expect(r2.body.data.provisaoEntryId).toBe(r1.body.data.provisaoEntryId);
    expect(await lancamentos(dono)).toHaveLength(1);
  });

  it('lacuna #826-2: unidade com receita em outra conta (binding ativo) ⇒ debita as contas dos papéis receita-serviço / receita-revenda, não 3.1/3.3', async () => {
    const dono = await cenario();
    for (const c of [{ code: '3.1.9', name: 'Receita de Serviços (própria)' }, { code: '3.3.9', name: 'Receita de Revenda (própria)' }]) {
      await prisma.account.create({ data: { userId: dono.id, unitId: dono.unitId, ...c, nature: 'Revenue', acceptsEntries: true } });
    }
    const payload = {
      ...SALE_BINDING_V2,
      eventBindings: SALE_BINDING_V2.eventBindings.map((b) => ({
        ...b,
        roleSlots: b.roleSlots.map((r) => (r.role === 'receita-serviço' ? { ...r, accountCode: '3.1.9' } : r.role === 'receita-revenda' ? { ...r, accountCode: '3.3.9' } : r)),
      })),
    };
    await prisma.accountingBinding.create({
      data: { userId: dono.id, unitId: dono.unitId, sectorKey: payload.sectorKey, bindingVersion: 1, compiledAt: new Date(), compiledFromHash: 'h', payload: JSON.stringify(payload), status: 'Active' },
    });
    await documento(dono, 'NFSE', 10_00n);
    await documento(dono, 'NFE', 4_00n);
    expect((await confirm(dono, null)).status).toBe(201);
    const [e] = await lancamentos(dono);
    const pernas = e.postings.map((p) => `${p.account.code}:${p.debitCents}:${p.creditCents}`).sort();
    expect(pernas).toEqual(['2.1.8.01:0:1400', '3.1.9:1000:0', '3.3.9:400:0']);
  });
});
