/**
 * BE-INCR-EFD-REINF PR-1 (BRIEF itens 7, 10, 11, 13; invariantes 4, 6, 7, 8, 9) — ponta a ponta com retenções gravadas pelo
 * serviço REAL do RETENCOES-FONTE (memória "sintético ≠ formato real"): IRRF no reconhecimento e CSRF na baixa, o mesmo
 * fornecedor em DUAS unidades (lacuna A: a Reinf é da PJ), lote validado no XSD oficial, `defasado` depois do estorno.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { getFactory } from '@/lib/factory';
import { WithholdingLineForReinfSchema } from '@/features/accounting/dtos/WithholdingDto';
import { ReinfBatchCreatedSchema, ReinfBatchViewSchema } from '@/features/accounting/dtos/ReinfDto';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';
import { signReinfEventoForTest } from '@test/helpers/nfeSignature';
import { validarNoXsdReinf } from '@test/helpers/reinfXsd';

const app = makeApp();
const U1 = 'unit-reinf-1';
const U2 = 'unit-reinf-2';
const CNPJ_PJ = '12345678000195';
const CNPJ_FISIO = '11222333000181';

let dono: { id: string; username: string };
const despesa: Record<string, string> = {};
const fornecedor: Record<string, string> = {};

const criarConta = async (unitId: string, code: string, nature: string) =>
  (await prisma.account.findFirst({ where: { userId: dono.id, unitId, code } })) ??
  prisma.account.create({ data: { userId: dono.id, unitId, code, name: `Conta ${code}`, nature, acceptsEntries: true } });
const criarTitulo = (unitId: string, documentNumber: string, amountCents: number, issueDate: string) =>
  request(app)
    .post('/api/payables')
    .set(authHeader(dono))
    .send({ unitId, supplierName: 'Fisio Ltda', counterpartyId: fornecedor[unitId], documentNumber, description: 'fisioterapia', issueDate, dueDate: issueDate, amountCents, expenseAccountId: despesa[unitId] });
const pagar = (unitId: string, payableId: string, amountCents: number, paidAt: string) =>
  request(app).post(`/api/payables/${payableId}/settlements`).set(authHeader(dono)).send({ unitId, method: 'Pix', paidAt, amountCents });
const gerar = (competencia: string, unitId = U1) => request(app).post('/api/accounting/reinf/batches').set(authHeader(dono)).send({ unitId, competencia });
const eventosDoLote = (xml: string) => [...xml.matchAll(/<evento Id="[^"]+">(<Reinf xmlns="[^"]+evt(\w+)\/v2_01_02">[\s\S]*?<\/Reinf>)<\/evento>/g)].map((m) => m[1]);
const prefixoXsd = (evento: string) => (evento.includes('evtInfoContribuinte') ? 'R-1000' : evento.includes('evt4020') ? 'R-4020' : 'R-4099');
const reais = (xml: string, tag: string) => [...xml.matchAll(new RegExp(`<${tag}>([0-9]+),([0-9]{2})</${tag}>`, 'g'))].reduce((s, m) => s + Number(m[1]) * 100 + Number(m[2]), 0);

async function prepararUnidade(unitId: string) {
  await seedUnit({ userId: dono.id, id: unitId });
  for (const month of [2, 3, 4]) {
    await prisma.accountingPeriod.create({ data: { userId: dono.id, unitId, year: 2026, month, status: 'OPEN', openedAt: new Date(), openedById: dono.id } });
  }
  await request(app).get('/api/accounting/accounts').set(authHeader(dono)).query({ unitId }); // plano padrão (2.1.7.03)
  despesa[unitId] = (await criarConta(unitId, '4.1', 'Expense')).id;
  const irrf = (await prisma.account.findFirstOrThrow({ where: { userId: dono.id, unitId, code: '2.1.7.03' } })).id;
  const csrf = (await criarConta(unitId, '2.1.99.01', 'Liability')).id;
  const inss = (await criarConta(unitId, '2.1.99.02', 'Liability')).id;
  const iss = (await criarConta(unitId, '2.1.99.03', 'Liability')).id;
  const fp = await request(app).put('/api/accounting/fiscal-profile').set(authHeader(dono)).send({
    unitId, regimeTributario: 'REAL', icmsContribuinte: false, pisCofinsRegime: 'NAO_CUMULATIVO',
    retencaoIrrfRecolherAccountId: irrf, retencaoCsrfRecolherAccountId: csrf, retencaoInssRecolherAccountId: inss, retencaoIssRecolherAccountId: iss,
  });
  expect(fp.status).toBe(200);
  const cp = await request(app).post('/api/counterparties').set(authHeader(dono)).send({ unitId, type: 'SUPPLIER', name: 'Fisio Ltda', taxId: CNPJ_FISIO, regimeTributario: 'PRESUMIDO' });
  expect(cp.status).toBe(201);
  fornecedor[unitId] = cp.body.data.id;
  const wp = await request(app).post('/api/accounting/withholding-profiles').set(authHeader(dono)).send({
    unitId, counterpartyId: fornecedor[unitId], naturezaServico: 'SERVICO_PROFISSIONAL', natRend: '15022', irrf: true, csrf: true, inss: false, issRetido: false,
    fonte: 'RIR/2018 art. 714 § 1º', vigenteDesde: '2026-01-01',
  });
  expect(wp.status).toBe(201);
}

describe('EFD-REINF PR-1 — lote da Reinf a partir das retenções reais', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'reinf', username: 'reinf-dono', email: 'reinf@test.local', password: 'x', role: 'USER' } });
    await prepararUnidade(U1);
    await prepararUnidade(U2);
    const ct = await request(app).post('/api/accounting/contacts').set(authHeader(dono)).send({ unitId: U1, name: 'Ana Contadora', email: 'ana@contab.test', cpf: '529.982.247-25', crcNumber: 'SP-000777/O-1', crcUf: 'SP' });
    expect(ct.status).toBe(201);
    const p = await request(app)
      .put('/api/accounting/company-fiscal-profile/2026')
      .set(authHeader(dono))
      .send({ unitId: U1, regime: 'REAL', ecf: { indAliqCsll: '1', indRecReceita: '2' }, declarante: { cnpj: CNPJ_PJ }, contadorContactId: ct.body.data.id });
    expect(p.status).toBe(200);
    // U1: nota de R$ 1.000 em 02/03 (IRRF 1,5% no reconhecimento) paga em 10/03 (CSRF na baixa); U2: nota de R$ 2.000 em 05/03.
    const t1 = await criarTitulo(U1, 'NF-R1', 100_000, '2026-03-02');
    expect(t1.status).toBe(201);
    expect((await pagar(U1, t1.body.data.id, 50_000, '2026-03-10')).status).toBe(201);
    expect((await criarTitulo(U2, 'NF-R2', 200_000, '2026-03-05')).status).toBe(201);
  }, 180000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('contrato de entrada (§5.1): a porta da PJ lê as duas unidades na forma do WithholdingLineForReinfSchema', async () => {
    const linhas = await getFactory().getTaxWithholdingReadPort().findMadeForReinfDaPj(dono.id, '2026-03');
    for (const l of linhas) expect(() => WithholdingLineForReinfSchema.parse(l)).not.toThrow();
    expect(new Set(linhas.map((l) => l.unitId))).toEqual(new Set([U1, U2]));
    expect(linhas.map((l) => l.tributo).sort()).toEqual(['COFINS', 'CSLL', 'IRRF', 'IRRF', 'PIS']);
  });

  let lote1: { batchId: string; xml: string; sha256: string };

  it('itens 7, 10, 11: POST ⇒ 201; um R-4020 para o fornecedor das duas unidades; cada evento assinado valida no XSD (invariante 7)', async () => {
    const r = await gerar('2026-03');
    expect(r.status).toBe(201);
    const data = ReinfBatchCreatedSchema.parse(r.body.data);
    lote1 = data;
    expect(await validarNoXsdReinf(data.xml, 'envioLoteEventosAssincrono')).toEqual({ valid: true, errors: [] });
    const eventos = eventosDoLote(data.xml);
    expect(eventos.map(prefixoXsd)).toEqual(['R-1000', 'R-4020', 'R-4099']);
    for (const e of eventos) expect([prefixoXsd(e), await validarNoXsdReinf(signReinfEventoForTest(e), prefixoXsd(e))]).toEqual([prefixoXsd(e), { valid: true, errors: [] }]);
    const r4020 = eventos[1];
    expect(r4020).toContain(`<cnpjBenef>${CNPJ_FISIO}</cnpjBenef>`);
    expect(r4020.match(/<idePgto>/g)).toHaveLength(1);
    expect([...r4020.matchAll(/<dtFG>([^<]+)<\/dtFG>/g)].map((m) => m[1])).toEqual(['2026-03-02', '2026-03-05', '2026-03-10']); // L7
    expect(r4020).toContain(`<nrInscEstab>${CNPJ_PJ}</nrInscEstab>`);
  });

  it('invariante 4: Σ retido no R-4020 = Σ amountCents das linhas IRRF/CSRF de CNPJ da porta; relatório soma igual por código', async () => {
    const linhas = await getFactory().getTaxWithholdingReadPort().findMadeForReinfDaPj(dono.id, '2026-03');
    const esperado = linhas.filter((l) => ['IRRF', 'CSLL', 'COFINS', 'PIS'].includes(l.tributo)).reduce((s, l) => s + Number(l.amountCents), 0);
    const r4020 = eventosDoLote(lote1.xml)[1];
    expect(reais(r4020, 'vlrIR') + reais(r4020, 'vlrAgreg') + reais(r4020, 'vlrCSLL') + reais(r4020, 'vlrCofins') + reais(r4020, 'vlrPP')).toBe(esperado);
    const rel = ReinfBatchCreatedSchema.parse((await gerar('2026-03')).body.data).relatorio;
    expect(rel.totaisPorCodigo.reduce((s, t) => s + Number(t.totalCents), 0)).toBe(esperado);
    expect(rel.totaisPorCodigo.map((t) => t.codigoReceita).sort()).toEqual(['170806', '595207']);
    expect(rel.linhas.every((l) => l.beneficiario === '**.***.***/0001-**' && l.vencimentoDarf === '2026-04-20')).toBe(true);
  });

  it('invariante 8: ReinfBatch sem XML e sem CNPJ; auditoria tax.reinf_batch.generated sem CNPJ', async () => {
    const row = await prisma.reinfBatch.findUniqueOrThrow({ where: { id: lote1.batchId } });
    expect([row.userId, row.competencia, row.status, row.sha256]).toEqual([dono.id, '2026-03', 'GERADO', lote1.sha256]);
    expect(JSON.stringify(row)).not.toMatch(new RegExp(`${CNPJ_FISIO}|${CNPJ_PJ}|<Reinf`));
    const ev = await prisma.auditEvent.findFirstOrThrow({ where: { eventType: 'tax.reinf_batch.generated', targetId: lote1.batchId } });
    expect(Object.keys(JSON.parse(ev.payload)).sort()).toEqual(['batchId', 'competencia', 'contagemPorTipo', 'sha256']);
    expect(ev.payload).not.toContain(CNPJ_FISIO);
  });

  it('itens 11 e 13: GET lista com defasado; estorno do título depois do lote ⇒ defasado; o próximo relatório pede RETIFICAR', async () => {
    const lista = async () => (await request(app).get('/api/accounting/reinf/batches').set(authHeader(dono)).query({ unitId: U2, competencia: '2026-03' })).body.data.map((v: unknown) => ReinfBatchViewSchema.parse(v));
    expect((await lista()).every((v: { defasado: boolean }) => !v.defasado)).toBe(true);
    const t2 = await prisma.payable.findFirstOrThrow({ where: { userId: dono.id, unitId: U2, documentNumber: 'NF-R2' } });
    expect((await request(app).post(`/api/payables/${t2.id}/cancel`).set(authHeader(dono)).send({ unitId: U2, reversalDate: '2026-03-20' })).status).toBe(200);
    expect((await lista()).every((v: { defasado: boolean }) => v.defasado)).toBe(true);
    const um = await request(app).get(`/api/accounting/reinf/batches/${lote1.batchId}`).set(authHeader(dono)).query({ unitId: U1 });
    expect([um.status, um.body.data.defasado, um.body.data.xml]).toEqual([200, true, undefined]);
    const r = ReinfBatchCreatedSchema.parse((await gerar('2026-03')).body.data);
    expect(r.relatorio.marcacoes).toEqual(expect.arrayContaining([{ batchId: lote1.batchId, idEvento: expect.any(String), tipo: 'R-4020', acao: 'RETIFICAR' }]));
  });

  it('item 8 e item 11: competência sem retenção ⇒ 422 REINF_SEM_FATO; competência futura ⇒ 400; sem unitId ⇒ 400; sem token ⇒ 401', async () => {
    const semFato = await gerar('2026-02');
    expect([semFato.status, semFato.body.error?.code ?? semFato.body.code ?? JSON.stringify(semFato.body)]).toEqual([422, expect.stringContaining('REINF_SEM_FATO')]);
    const d = new Date();
    const proximo = `${d.getUTCMonth() === 11 ? d.getUTCFullYear() + 1 : d.getUTCFullYear()}-${String(((d.getUTCMonth() + 1) % 12) + 1).padStart(2, '0')}`;
    expect((await gerar(proximo)).status).toBe(400);
    expect((await request(app).post('/api/accounting/reinf/batches').set(authHeader(dono)).send({ competencia: '2026-03' })).status).toBe(400);
    expect((await request(app).post('/api/accounting/reinf/batches').send({ unitId: U1, competencia: '2026-03' })).status).toBe(401);
  });
});
