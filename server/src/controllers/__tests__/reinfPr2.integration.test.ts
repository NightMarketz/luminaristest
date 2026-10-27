/**
 * BE-INCR-EFD-REINF PR-2 (BRIEF itens 15–18; invariantes 3, 6, 7, 8, 13) — ponta a ponta com dado gravado pelos serviços REAIS
 * (memória "sintético ≠ formato real"): INSS 11% pelo título com perfil de cessão de mão de obra (RETENCOES-FONTE), dividendos
 * pela rota do IRRF-DISTRIBUICAO (30k + 30k do mesmo CPF, transição, sócio PJ) e um JCP lido pelo repositório real. Cada evento,
 * assinado com a chave de teste, valida no XSD oficial.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { getFactory } from '@/lib/factory';
import { ReinfBatchCreatedSchema, ReinfBatchViewSchema } from '@/features/accounting/dtos/ReinfDto';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';
import { signReinfEventoForTest } from '@test/helpers/nfeSignature';
import { validarNoXsdReinf } from '@test/helpers/reinfXsd';

const app = makeApp();
const U1 = 'unit-reinf2-1';
const CNPJ_PJ = '12345678000195';
const CNPJ_LIMPA = '11222333000181';
const CNPJ_SOCIO_PJ = '45997418000153';
const CPF_A = '11144477735'; // ≠ do CPF da contadora (52998224725), que vai no R-1000
const CPF_C = '39053344705';

let dono: { id: string; username: string };
const conta: Record<string, string> = {};
const socio: Record<string, string> = {};

const criarConta = async (code: string, nature: string) =>
  (await prisma.account.findFirst({ where: { userId: dono.id, unitId: U1, code } })) ??
  prisma.account.create({ data: { userId: dono.id, unitId: U1, code, name: `Conta ${code}`, nature, acceptsEntries: true } });
const gerar = (competencia: string) => request(app).post('/api/accounting/reinf/batches').set(authHeader(dono)).send({ unitId: U1, competencia });
const dividendo = (partnerId: string, dataEvento: string, brutoCents: number, extra: Record<string, unknown> = {}) =>
  request(app)
    .post('/api/accounting/profit-distributions')
    .set(authHeader(dono))
    .send({ unitId: U1, partnerId, evento: 'PAGAMENTO', dataEvento, brutoCents, debitoAccountId: conta['2.3.1.01'], contraAccountId: conta['1.1.1.01'], origemLucro: 'CORRENTE', ...extra });
const eventosDoLote = (xml: string) => [...xml.matchAll(/<evento Id="[^"]+">(<Reinf xmlns="[^"]+">[\s\S]*?<\/Reinf>)<\/evento>/g)].map((m) => m[1]);
const PREFIXO: [string, string][] = [['evtInfoContribuinte', 'R-1000'], ['evtTomadorServicos', 'R-2010'], ['evt4010', 'R-4010'], ['evt4020', 'R-4020'], ['evtFechamento', 'R-2099'], ['evt4099', 'R-4099']];
const prefixoXsd = (e: string) => PREFIXO.find(([ns]) => e.includes(ns))![1];
const reais = (xml: string, tag: string) => [...xml.matchAll(new RegExp(`<${tag}>([0-9]+),([0-9]{2})</${tag}>`, 'g'))].reduce((s, m) => s + Number(m[1]) * 100 + Number(m[2]), 0);

describe('EFD-REINF PR-2 — R-2010, R-4010 e R-2099 a partir de dado real', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'reinf2', username: 'reinf2-dono', email: 'reinf2@test.local', password: 'x', role: 'USER' } });
    await seedUnit({ userId: dono.id, id: U1 });
    for (const month of [1, 2, 3, 4]) {
      await prisma.accountingPeriod.create({ data: { userId: dono.id, unitId: U1, year: 2026, month, status: 'OPEN', openedAt: new Date(), openedById: dono.id } });
    }
    await request(app).get('/api/accounting/accounts').set(authHeader(dono)).query({ unitId: U1 }); // plano padrão (2.1.7.03)
    for (const [code, nature] of [['4.1', 'Expense'], ['1.1.1.01', 'Asset'], ['2.3.1.01', 'Equity'], ['2.1.99.01', 'Liability'], ['2.1.99.02', 'Liability'], ['2.1.99.03', 'Liability'], ['2.1.99.04', 'Liability']]) {
      conta[code] = (await criarConta(code, nature)).id;
    }
    const irrf = (await prisma.account.findFirstOrThrow({ where: { userId: dono.id, unitId: U1, code: '2.1.7.03' } })).id;
    const fp = await request(app).put('/api/accounting/fiscal-profile').set(authHeader(dono)).send({
      unitId: U1, regimeTributario: 'REAL', icmsContribuinte: false, pisCofinsRegime: 'NAO_CUMULATIVO',
      retencaoIrrfRecolherAccountId: irrf, retencaoCsrfRecolherAccountId: conta['2.1.99.01'], retencaoInssRecolherAccountId: conta['2.1.99.02'], retencaoIssRecolherAccountId: conta['2.1.99.03'],
    });
    expect(fp.status).toBe(200);
    await prisma.fiscalProfile.updateMany({ where: { userId: dono.id, unitId: U1 }, data: { dividendosPagarAccountId: conta['2.1.99.04'], irrfRecolherAccountId: irrf } });

    const ct = await request(app).post('/api/accounting/contacts').set(authHeader(dono)).send({ unitId: U1, name: 'Ana Contadora', email: 'ana@contab.test', cpf: '529.982.247-25', crcNumber: 'SP-000777/O-1', crcUf: 'SP' });
    expect(ct.status).toBe(201);
    const p = await request(app)
      .put('/api/accounting/company-fiscal-profile/2026')
      .set(authHeader(dono))
      .send({ unitId: U1, regime: 'REAL', ecf: { indAliqCsll: '1', indRecReceita: '2' }, declarante: { cnpj: CNPJ_PJ }, contadorContactId: ct.body.data.id });
    expect(p.status).toBe(200);

    // INSS 11% de cessão de mão de obra (limpeza): NF série 1 nº 55 de R$ 10.000 em 05/03.
    const cp = await request(app).post('/api/counterparties').set(authHeader(dono)).send({ unitId: U1, type: 'SUPPLIER', name: 'Limpa Ltda', taxId: CNPJ_LIMPA, regimeTributario: 'PRESUMIDO' });
    expect(cp.status).toBe(201);
    const wp = await request(app).post('/api/accounting/withholding-profiles').set(authHeader(dono)).send({
      unitId: U1, counterpartyId: cp.body.data.id, naturezaServico: 'CESSAO_MAO_DE_OBRA', irrf: false, csrf: false, inss: true, inssTpServico: '100000001', inssCprb: false,
      issRetido: false, fonte: 'Lei 8.212 art. 31', vigenteDesde: '2026-01-01',
    });
    expect([wp.status, JSON.stringify(wp.body.error ?? '')]).toEqual([201, '""']);
    const t = await request(app).post('/api/payables').set(authHeader(dono)).send({
      unitId: U1, supplierName: 'Limpa Ltda', counterpartyId: cp.body.data.id, documentNumber: '55', documentoSerie: '1', description: 'limpeza', issueDate: '2026-03-05', dueDate: '2026-03-05',
      amountCents: 1_000_000, expenseAccountId: conta['4.1'],
    });
    expect(t.status).toBe(201);

    // Sócios e dividendos pela rota real: A 30k + 30k (o 2º retém 6k); C 30k da transição (isenção 12); PJ 60k (fora, aviso).
    const novoSocio = async (taxId: string) =>
      (await prisma.partner.create({ data: { userId: dono.id, nome: 'Sócio', taxId, tipoPessoa: taxId.length === 11 ? 'PF' : 'PJ', residenteBrasil: true, participacaoBp: 3000, entradaEm: '2026-01-01' } })).id;
    socio.A = await novoSocio(CPF_A);
    socio.C = await novoSocio(CPF_C);
    socio.PJ = await novoSocio(CNPJ_SOCIO_PJ);
    const ato = await prisma.sourceDocument.create({ data: { userId: dono.id, unitId: U1, sourceType: 'ato.aprovacao.lucros', description: 'ata' } });
    for (const r of [
      await dividendo(socio.A, '2026-03-10', 3_000_000),
      await dividendo(socio.A, '2026-03-20', 3_000_000),
      await dividendo(socio.C, '2026-03-12', 3_000_000, { origemLucro: 'TRANSICAO', anoResultado: 2025, aprovadoEm: '2026-01-20', atoSourceDocumentId: ato.id }),
      await dividendo(socio.PJ, '2026-03-15', 6_000_000),
    ]) {
      expect([r.status, r.body.data?.status]).toEqual([201, 'POSTED']);
    }

    // JCP POSTED do 1º trimestre com uma alocação ao sócio A (o cálculo do JCP é do IRRF-DISTRIBUICAO; aqui só a leitura).
    await prisma.interestOnEquityCalculation.create({
      data: {
        userId: dono.id, unitId: U1, anoCalendario: 2026, periodo: 'T01', dataCredito: '2026-03-31', forma: 'DESPESA', debitoAccountId: conta['4.1'], memoria: {},
        jurosMaxTjlpCents: 200_000n, limite50LucroCents: 900_000n, limite50ReservasCents: 900_000n, limiteDedutivelCents: 200_000n, totalCents: 200_000n,
        irrfCents: 35_000n, liquidoCents: 165_000n, excessoCents: 0n, parametrosIds: [], parametrosSha256: 'x', previaSha256: 'y', status: 'POSTED', vivoKey: 'VIVO',
        alocacoes: { create: [{ partnerId: socio.A, participacaoBp: 10000, brutoCents: 200_000n, irrfCents: 35_000n, liquidoCents: 165_000n }] },
      },
    });
  }, 180000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  let lote: { batchId: string; xml: string; sha256: string; relatorio: { linhas: { evento: string; beneficiario: string }[]; avisos: string[] } };

  it('itens 15–18: lote R-1000 → R-2010 → R-4010 (2 CPFs) → R-2099 → R-4099; cada evento assinado valida no XSD (invariante 7)', async () => {
    const r = await gerar('2026-03');
    expect([r.status, r.body.error]).toEqual([201, undefined]);
    lote = ReinfBatchCreatedSchema.parse(r.body.data);
    expect(await validarNoXsdReinf(lote.xml, 'envioLoteEventosAssincrono')).toEqual({ valid: true, errors: [] });
    const eventos = eventosDoLote(lote.xml);
    expect(eventos.map(prefixoXsd)).toEqual(['R-1000', 'R-2010', 'R-4010', 'R-4010', 'R-2099', 'R-4099']);
    for (const e of eventos) expect([prefixoXsd(e), await validarNoXsdReinf(signReinfEventoForTest(e), prefixoXsd(e))]).toEqual([prefixoXsd(e), { valid: true, errors: [] }]);

    const r2010 = eventos[1];
    expect(r2010).toContain(`<cnpjPrestador>${CNPJ_LIMPA}</cnpjPrestador><vlrTotalBruto>10000,00</vlrTotalBruto>`);
    expect(r2010).toContain('<nfs><serie>1</serie><numDocto>55</numDocto><dtEmissaoNF>2026-03-05</dtEmissaoNF><vlrBruto>10000,00</vlrBruto><infoTpServ><tpServico>100000001</tpServico>');

    const [rA, rC] = [eventos.find((e) => e.includes(CPF_A))!, eventos.find((e) => e.includes(CPF_C))!];
    // A: mês cruzou o limite ⇒ as duas infoPgto tributáveis, IR só na 2ª (lacuna B); JCP 12016 com IR de 350,00.
    expect(rA).toContain('<infoPgto><dtFG>2026-03-10</dtFG><vlrRendBruto>30000,00</vlrRendBruto><vlrRendTrib>30000,00</vlrRendTrib></infoPgto>');
    expect(rA).toContain('<infoPgto><dtFG>2026-03-20</dtFG><vlrRendBruto>30000,00</vlrRendBruto><vlrRendTrib>30000,00</vlrRendTrib><vlrIR>6000,00</vlrIR></infoPgto>');
    expect(rA).toContain('<idePgto><natRend>12016</natRend><infoPgto><dtFG>2026-03-31</dtFG><vlrRendBruto>2000,00</vlrRendBruto><vlrRendTrib>2000,00</vlrRendTrib><vlrIR>350,00</vlrIR></infoPgto></idePgto>');
    // C: transição ⇒ rendIsento tipo 12 (NT 02/2026).
    expect(rC).toContain('<rendIsento><tpIsencao>12</tpIsencao><vlrIsento>30000,00</vlrIsento></rendIsento>');
    // Sócio PJ: dividendo fora, com aviso (lacuna A); nenhum R-4020.
    expect(lote.xml).not.toContain(CNPJ_SOCIO_PJ);
    expect(lote.relatorio.avisos).toEqual([expect.stringContaining('DIVIDENDO_PJ_FORA_DA_REINF')]);
  });

  it('invariante 13: Σ vlrTotalRetPrinc do R-2010 = Σ amountCents das linhas INSS da porta; o relatório traz o R-2010 e o R-4010 mascarados', async () => {
    const linhas = await getFactory().getTaxWithholdingReadPort().findMadeForReinfDaPj(dono.id, '2026-03');
    const inss = linhas.filter((l) => l.tributo === 'INSS').reduce((s, l) => s + Number(l.amountCents), 0);
    expect(inss).toBe(110_000);
    expect(reais(lote.xml, 'vlrTotalRetPrinc')).toBe(inss);
    expect(lote.relatorio.linhas.map((l) => [l.evento, l.beneficiario])).toEqual([
      ['R-2010', '**.***.***/0001-**'],
      ['R-4010', '***.444.777-**'], // dividendos na ordem de dataEvento: A 10/03, C 12/03, A 20/03; depois o JCP de A
      ['R-4010', '***.533.447-**'],
      ['R-4010', '***.444.777-**'],
      ['R-4010', '***.444.777-**'],
    ]);
  });

  it('invariante 8: ReinfBatch e auditoria sem CPF/CNPJ; origemIds do R-4010 = ids dos dividendos e da alocação', async () => {
    const row = await prisma.reinfBatch.findUniqueOrThrow({ where: { id: lote.batchId } });
    expect(JSON.stringify(row)).not.toMatch(new RegExp(`${CPF_A}|${CPF_C}|${CNPJ_LIMPA}|${CNPJ_PJ}|<Reinf`));
    const eventos = row.eventos as { tipo: string; origemIds: string[]; beneficiarioRef?: string }[];
    const dA = await prisma.profitDistributionEvent.findMany({ where: { userId: dono.id, partnerId: socio.A } });
    const aloc = await prisma.interestOnEquityAllocation.findFirstOrThrow({ where: { partnerId: socio.A } });
    expect(eventos.find((e) => e.beneficiarioRef === socio.A)?.origemIds.sort()).toEqual([...dA.map((d) => d.id), aloc.id].sort());
    const ev = await prisma.auditEvent.findFirstOrThrow({ where: { eventType: 'tax.reinf_batch.generated', targetId: lote.batchId } });
    expect(JSON.parse(JSON.parse(ev.payload).contagemPorTipo)).toEqual({ 'R-1000': 1, 'R-2010': 1, 'R-4010': 2, 'R-2099': 1, 'R-4099': 1 });
    expect(ev.payload).not.toMatch(new RegExp(`${CPF_A}|${CPF_C}`));
  });

  it('item 13: JCP cancelado depois do lote ⇒ defasado', async () => {
    const lista = async () => (await request(app).get('/api/accounting/reinf/batches').set(authHeader(dono)).query({ unitId: U1, competencia: '2026-03' })).body.data.map((v: unknown) => ReinfBatchViewSchema.parse(v));
    expect((await lista()).map((v: { defasado: boolean }) => v.defasado)).toEqual([false]);
    await prisma.interestOnEquityCalculation.updateMany({ where: { userId: dono.id }, data: { status: 'CANCELLED' } });
    expect((await lista()).map((v: { defasado: boolean }) => v.defasado)).toEqual([true]);
  });
});
