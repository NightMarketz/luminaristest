/**
 * IBS-CBS-2027 PR-3 (BRIEF itens 14, 16–18; dono 21/10: razão completo, item 18 literal) — de ponta a ponta pelo HTTP e
 * pelos repositórios reais: a nota de entrada debita IBS/CBS a recuperar (PENDENTE), a apropriação vira APROPRIADO com
 * comprovante e CAS, a apuração do mês soma só o APROPRIADO e o lançamento da apuração compensa D a recolher / C a
 * recuperar; a venda de pacote paga no mês gera ANTECIPACAO_ART10 sem mudar o razão.
 *
 * Números (março/2027): nota de entrada com IBS 0,05 e CBS 4,40 sobre insumo de 100,00; NFS-e com IBS 0,10.
 *   ⇒ IBS: débitos 10, créditos 5, saldo 5; lançamento D 3.1 10 / C 2.1.8.01 5 / C 1.1.9.01 5.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { getFactory } from '@/lib/factory';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';

const app = makeApp();
const IBS_BASE = '/api/accounting/ibs-cbs-assessments';
type Dono = { id: string; username: string; unitId: string; contas: Record<string, string> };

const CONTAS = [
  { code: '3.1', name: 'Receita de Serviços', nature: 'Revenue' },
  { code: '3.3', name: 'Receita de Revenda de Mercadorias', nature: 'Revenue' },
  { code: '2.1.8.01', name: 'IBS a Recolher', nature: 'Liability' },
  { code: '2.1.8.02', name: 'CBS a Recolher', nature: 'Liability' },
  { code: '1.1.9.01', name: 'IBS a Recuperar', nature: 'Asset' },
  { code: '1.1.9.02', name: 'CBS a Recuperar', nature: 'Asset' },
  { code: '2.1.2.01', name: 'Fornecedores a Pagar', nature: 'Liability' },
  { code: '4.1.9', name: 'Insumos do Serviço', nature: 'Expense' },
  { code: '1.1.1.01', name: 'Caixa', nature: 'Asset' },
  { code: '1.1.2.01', name: 'A Receber', nature: 'Asset' },
  { code: '2.1.1.01', name: 'Pacotes Pré-pagos', nature: 'Liability' },
];

let seq = 0;
async function cenario(): Promise<Dono> {
  seq += 1;
  const u = await prisma.user.create({ data: { name: `ibsc-${seq}`, username: `ibsc-${seq}`, email: `ibsc-${seq}@test.local`, password: 'x', role: 'USER' } });
  const unitId = `unit-ibs-cred-${seq}`;
  await seedUnit({ userId: u.id, id: unitId });
  const contas: Record<string, string> = {};
  for (const c of CONTAS) contas[c.code] = (await prisma.account.create({ data: { userId: u.id, unitId, ...c, acceptsEntries: true } })).id;
  for (let month = 1; month <= 12; month++) {
    await prisma.accountingPeriod.create({ data: { userId: u.id, unitId, year: 2027, month, status: 'OPEN', openedAt: new Date() } });
  }
  await prisma.companyFiscalProfile.create({ data: { userId: u.id, anoCalendario: 2027, regime: 'PRESUMIDO', ecfIndAliqCsll: '1', ecfIndRecReceita: '2' } });
  await prisma.fiscalProfile.create({
    data: {
      userId: u.id, unitId, regimeTributario: 'PRESUMIDO', pisCofinsRegime: 'CUMULATIVO',
      ibsRecolherAccountId: contas['2.1.8.01'], cbsRecolherAccountId: contas['2.1.8.02'],
      ibsRecuperarAccountId: contas['1.1.9.01'], cbsRecuperarAccountId: contas['1.1.9.02'],
    },
  });
  return { ...u, unitId, contas };
}

/** Nota de entrada de insumo (modo 3) com IBS 5 e CBS 440 PENDENTES — o que o NfeImportService monta (item 14). */
async function notaDeEntrada(dono: Dono, numero: string): Promise<string> {
  const r = await request(app).post('/api/payables').set(authHeader(dono)).send({
    unitId: dono.unitId, supplierName: 'Fornecedor', documentNumber: numero, description: `NF-e ${numero}`,
    issueDate: '2027-03-05', dueDate: '2027-04-05', amountCents: 10_000 + 5 + 440, inventoryMultiItem: true,
    insumoItems: [{ accountId: dono.contas['4.1.9'], productRef: 'luva', cProd: 'LUVA', nItem: 1, costCents: 10_000 }],
    recoverableTaxLines: [
      { tributo: 'IBS', accountId: dono.contas['1.1.9.01'], amountCents: 5, status: 'PENDENTE', sourceDocumentId: null },
      { tributo: 'CBS', accountId: dono.contas['1.1.9.02'], amountCents: 440, status: 'PENDENTE', sourceDocumentId: null },
    ],
  });
  expect(r.status).toBe(201);
  return r.body.data.id as string;
}

let nfs = 0;
async function nfse(dono: Dono, ibs: bigint, dCompet = '2027-03-10'): Promise<void> {
  nfs += 1;
  await prisma.fiscalDocument.create({
    data: {
      userId: dono.id, unitId: dono.unitId, kind: 'NFSE', status: 'AUTHORIZED', saleId: `sc-${nfs}`, saleKey: `sc-${nfs}`, anchorEntryId: `ec-${nfs}`,
      ambiente: 'producao', partner: 'manual', serie: 1, dCompet, vServCents: 1_000_00n, vIbsCents: ibs, vCbsCents: 0n,
    },
  });
}

const comprovante = (dono: Dono) =>
  prisma.sourceDocument.create({ data: { userId: dono.id, unitId: dono.unitId, sourceType: 'ibs_cbs.extincao', externalRef: 'split 03/2027', description: 'comprovante da extinção' } });

const apropriar = (dono: Dono, payableId: string, body: Record<string, unknown>) =>
  request(app).post(`/api/accounting/payables/${payableId}/ibs-cbs-credits/apropriar`).set(authHeader(dono)).send({ unitId: dono.unitId, expectedStatus: 'PENDENTE', ...body });

/** O relógio da apropriação (apropriadoEm = hoje no fuso do escopo) — só o Date é falso; timers reais. */
function hoje(iso: string): void {
  jest.useFakeTimers({ now: new Date(iso), doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask', 'hrtime', 'performance'] });
}

describe('IBS-CBS-2027 PR-3 — crédito de IBS/CBS (itens 14, 16) e antecipação do pacote (17–18)', () => {
  beforeAll(async () => {
    pushTestSchema();
  }, 120000);

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('item 14: a nota de entrada debita IBS e CBS a recuperar no MESMO lançamento; as linhas nascem PENDENTE', async () => {
    const dono = await cenario();
    const id = await notaDeEntrada(dono, 'NF-14');
    const e = await prisma.journalEntry.findFirstOrThrow({ where: { userId: dono.id, sourceType: 'ap.payable', sourceId: id }, include: { postings: { include: { account: true } } } });
    expect(e.postings.map((p) => `${p.account.code}:${p.debitCents}:${p.creditCents}`).sort()).toEqual(['1.1.9.01:5:0', '1.1.9.02:440:0', '2.1.2.01:0:10445', '4.1.9:10000:0']);
    const row = await prisma.payable.findUniqueOrThrow({ where: { id } });
    expect(JSON.parse(row.recoverableTaxLines!)).toEqual([
      { tributo: 'IBS', accountId: dono.contas['1.1.9.01'], accountCode: '1.1.9.01', amountCents: 5, status: 'PENDENTE', sourceDocumentId: null },
      { tributo: 'CBS', accountId: dono.contas['1.1.9.02'], accountCode: '1.1.9.02', amountCents: 440, status: 'PENDENTE', sourceDocumentId: null },
    ]);
  });

  it('item 16 (apropriação): comprovante obrigatório, CAS no status (2ª chamada ⇒ 409), payableId divergente ⇒ 400', async () => {
    hoje('2027-03-20T15:00:00.000Z');
    const dono = await cenario();
    const id = await notaDeEntrada(dono, 'NF-16');
    const doc = await comprovante(dono);

    const semDoc = await apropriar(dono, id, { tributo: 'IBS', sourceDocumentId: 'nao-existe' });
    expect(semDoc.status).toBe(400);
    expect((await apropriar(dono, id, { tributo: 'IBS', sourceDocumentId: doc.id, payableId: 'outro' })).status).toBe(400);

    const ok = await apropriar(dono, id, { tributo: 'IBS', sourceDocumentId: doc.id });
    expect(ok.status).toBe(200);
    expect(ok.body.data).toMatchObject({ tributo: 'IBS', status: 'APROPRIADO', sourceDocumentId: doc.id, apropriadoEm: '2027-03-20', amountCents: 5 });

    const de_novo = await apropriar(dono, id, { tributo: 'IBS', sourceDocumentId: doc.id });
    expect(de_novo.status).toBe(409);
    expect(de_novo.body.code).toBe('IBS_CBS_CREDITO_CAS');

    // a CBS da mesma nota segue PENDENTE; nenhum lançamento novo (o crédito já estava a recuperar)
    const linhas = JSON.parse((await prisma.payable.findUniqueOrThrow({ where: { id } })).recoverableTaxLines!);
    expect(linhas.map((l: { tributo: string; status: string }) => `${l.tributo}:${l.status}`)).toEqual(['IBS:APROPRIADO', 'CBS:PENDENTE']);
    expect(await prisma.journalEntry.count({ where: { userId: dono.id } })).toBe(1);
    const audit = await prisma.auditEvent.findFirst({ where: { eventType: 'payable.ibs_cbs_credit.appropriated', targetId: id } });
    expect(audit).not.toBeNull();
  });

  it('item 16 (compensação): crédito APROPRIADO no mês ⇒ D a recolher / C a recuperar no lançamento da apuração; saldo = débitos − créditos', async () => {
    hoje('2027-03-20T15:00:00.000Z');
    const dono = await cenario();
    const id = await notaDeEntrada(dono, 'NF-COMP');
    expect((await apropriar(dono, id, { tributo: 'IBS', sourceDocumentId: (await comprovante(dono)).id })).status).toBe(200);
    await nfse(dono, 10n);
    jest.useRealTimers();

    const ibs = await request(app).post(IBS_BASE).set(authHeader(dono)).send({ unitId: dono.unitId, anoCalendario: 2027, mes: 3, tributo: 'IBS', expectedSupersedesId: null });
    expect(ibs.status).toBe(201);
    const a = ibs.body.data.assessment;
    expect([a.debitosCents, a.creditosCents, a.saldoCents]).toEqual(['10', '5', '5']);
    expect(a.memoria.find((l: { codigo: string }) => l.codigo === 'CREDITO_ENTRADA_1')?.valorCents).toBe('5');
    const e = await prisma.journalEntry.findUniqueOrThrow({ where: { id: a.provisaoEntryId }, include: { postings: { include: { account: true } } } });
    expect(e.postings.map((p) => `${p.account.code}:${p.debitCents}:${p.creditCents}`).sort()).toEqual(['1.1.9.01:0:5', '2.1.8.01:0:5', '3.1:10:0']);

    // CBS: o crédito segue PENDENTE ⇒ CREDITO_NAO_APROPRIADO_1, créditos 0 (invariante §10.3)
    const cbs = await request(app).post(`${IBS_BASE}/preview`).set(authHeader(dono)).send({ unitId: dono.unitId, anoCalendario: 2027, mes: 3, tributo: 'CBS' });
    expect(cbs.status).toBe(200);
    expect(cbs.body.data.creditosCents).toBe('0');
    expect(cbs.body.data.memoria.find((l: { codigo: string }) => l.codigo === 'CREDITO_NAO_APROPRIADO_1')?.valorCents).toBe('440');
  });

  it('itens 17–18 (repositório real): pacote pago no mês ⇒ ANTECIPACAO_ART10 no débito, razão intocado; CBS DRAFT ⇒ 400 nomeado; consumo em M+1 ⇒ ACERTO_ART10', async () => {
    const dono = await cenario();
    const scope = resolveAccountingScopeInternal({ userId: dono.id }, dono.unitId);
    const posting = getFactory().getPostingService();
    await posting.postEntry(scope, {
      unitId: dono.unitId, date: '2027-03-10', description: 'pacote', sourceType: 'sale.package.sold', sourceId: 'venda-pacote-1',
      lines: [{ accountCode: '1.1.2.01', debitCents: 100_000, creditCents: 0 }, { accountCode: '2.1.1.01', debitCents: 0, creditCents: 100_000 }],
    });
    await posting.postEntry(scope, {
      unitId: dono.unitId, date: '2027-03-12', description: 'liquidação', sourceType: 'sale.settled', sourceId: 'venda-pacote-1',
      lines: [{ accountCode: '1.1.1.01', debitCents: 100_000, creditCents: 0 }, { accountCode: '1.1.2.01', debitCents: 0, creditCents: 100_000 }],
    });
    const mov = { userId: dono.id, unitId: dono.unitId, customerId: 'cli-1', packageId: 'pk-1' };
    await prisma.packageBalanceMovement.create({ data: { ...mov, saleId: 'venda-pacote-1', kind: 'credit', deltaCents: 100_000n, createdAt: new Date('2027-03-10T15:00:00.000Z') } });
    await prisma.packageBalanceMovement.create({ data: { ...mov, saleId: 'venda-consumo-1', kind: 'debit', deltaCents: 40_000n, createdAt: new Date('2027-04-15T15:00:00.000Z') } });
    const lancamentosAntes = await prisma.journalEntry.count({ where: { userId: dono.id } });

    const preview = (mes: number, tributo: 'IBS' | 'CBS') =>
      request(app).post(`${IBS_BASE}/preview`).set(authHeader(dono)).send({ unitId: dono.unitId, anoCalendario: 2027, mes, tributo });

    const marco = await preview(3, 'IBS');
    expect(marco.status).toBe(200);
    expect(marco.body.data.debitosCents).toBe('100'); // 1.000,00 × (5 + 5) bp
    const codigos = marco.body.data.memoria.map((l: { codigo: string }) => l.codigo);
    expect(codigos).toEqual(expect.arrayContaining(['ANTECIPACAO_ART10_1', 'ANTECIPACAO_SEM_REDUCAO']));

    const cbs = await preview(3, 'CBS');
    expect(cbs.status).toBe(400);
    expect(cbs.body.code).toBe('IBS_CBS_ANTECIPACAO_SEM_ALIQUOTA');

    const abril = await preview(4, 'IBS');
    expect(abril.status).toBe(200);
    expect(abril.body.data.memoria.find((l: { codigo: string }) => l.codigo === 'ACERTO_ART10_1')?.valorCents).toBe('0');

    // V7: a apuração (prévia) não lança nada
    expect(await prisma.journalEntry.count({ where: { userId: dono.id } })).toBe(lancamentosAntes);
  });
});
