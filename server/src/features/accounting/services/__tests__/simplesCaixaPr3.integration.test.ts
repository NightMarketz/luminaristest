/**
 * BE-INCR-SIMPLES-CAIXA PR-3 (nó X14-CAIXA, BRIEF itens 19–21) — registro de valores a receber no modelo do Anexo IX da
 * Res. CGSN 140 (arts. 20 III e 77) e créditos incobráveis (art. 77 VI e §§ 5º–6º; F-CX-5 a).
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { ApplicationFactory } from '@/lib/factory';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';

const app = makeApp();
const S = '/api/accounting/simples';
const PERFIL = '/api/accounting/company-fiscal-profile';
const CAIXA = { regime: 'SIMPLES', simplesRegimeApuracao: 'CAIXA', simplesCaixaPrazoCartaoDebitoDias: 1, simplesCaixaPrazoCartaoCreditoDias: 30 };
const f = () => ApplicationFactory.getInstance();

interface Cenario {
  user: { id: string; username: string };
  unit: string;
}
async function cenario(nome: string, perfis: Record<number, Record<string, unknown>>): Promise<Cenario> {
  const u = await prisma.user.create({ data: { name: nome, username: nome, email: `${nome}@test.local`, password: 'x', role: 'USER' } });
  const c: Cenario = { user: { id: u.id, username: u.username }, unit: `unit-${nome}` };
  await f().getPostingService().ensureChartOfAccounts(resolveAccountingScopeInternal({ userId: u.id }, c.unit));
  for (const [ano, body] of Object.entries(perfis)) {
    expect((await request(app).put(`${PERFIL}/${ano}`).set(authHeader(c.user)).send({ unitId: c.unit, ...body })).status).toBe(200);
  }
  return c;
}
let n = 0;
const linha = (c: Cenario, saleId: string, dia: string, cents: number, extra: Record<string, unknown> = {}) =>
  prisma.receitaFiscalLinha.create({
    data: { userId: c.user.id, unitId: c.unit, competencia: dia.slice(0, 7), dia, saleId, itemRef: `item-${++n}`, natureza: 'SERVICO', cTribNac: '060101', receitaCents: BigInt(cents), excluir: [], ...extra },
  });
const recebimento = (c: Cenario, saleId: string, dia: string, cents: number, meio = 'Pix') =>
  prisma.receitaFiscalRecebimento.create({ data: { userId: c.user.id, unitId: c.unit, saleId, dia, competenciaCaixa: dia.slice(0, 7), valorCents: BigInt(cents), meio, origem: 'SALE_SETTLED' } });
const registro = (c: Cenario, ano: number | string) => request(app).get(`${S}/registro-valores-a-receber`).set(authHeader(c.user)).query({ unitId: c.unit, ano });
const incobravel = (c: Cenario, body: Record<string, unknown>) =>
  request(app).post(`${S}/creditos-incobraveis`).set(authHeader(c.user)).send({ unitId: c.unit, meioCobranca: 'PROTESTO', data: '2026-10-01', evidencia: 'Protesto 2º Tabelionato nº 123', ...body });

beforeAll(() => pushTestSchema());
afterAll(() => prisma.$disconnect());

type Linha = { saleId: string; dataOperacao: string; documentosFiscais: string[]; valorTotalCents: number; quantidadeParcelas: number; dispensadaCartao: boolean; parcelas: Array<Record<string, unknown>> };

describe('item 19 — registro de valores a receber (Anexo IX)', () => {
  let c: Cenario;
  beforeAll(async () => {
    c = await cenario('cx19', { 2026: CAIXA });
    await linha(c, 'a-prazo', '2026-03-01', 50_000);
    await recebimento(c, 'a-prazo', '2026-04-10', 50_000);
    await linha(c, 'aberta', '2026-05-01', 30_000);
    await linha(c, 'a-vista', '2026-05-02', 10_000);
    await recebimento(c, 'a-vista', '2026-05-02', 10_000);
    await linha(c, 'cartao', '2026-06-01', 20_000);
    await recebimento(c, 'cartao', '2026-07-01', 20_000, 'Credit Card');
    await linha(c, 'cancelada', '2026-06-05', 9_000);
    await linha(c, 'cancelada', '2026-06-06', -9_000, { tipo: 'CANCELAMENTO' });
    await linha(c, 'de-2025', '2025-12-10', 7_000);
    await prisma.fiscalDocument.create({
      data: { userId: c.user.id, unitId: c.unit, kind: 'NFSE', status: 'AUTHORIZED', saleId: 'aberta', saleKey: 'aberta', cTribNac: '060101', anchorEntryId: 'x', ambiente: 'producao', partner: 'manual', serie: 1, nNFSe: '4321', dCompet: '2026-05-01', vServCents: 30_000n },
    });
  });

  it('uma linha por venda do ano com saldo em algum momento; à vista, cancelada e de outro ano ficam fora', async () => {
    const r = await registro(c, 2026);
    expect(r.status).toBe(200);
    const linhas = r.body.data.linhas as Linha[];
    expect(linhas.map((l) => l.saleId).sort()).toEqual(['a-prazo', 'aberta', 'cartao']);
    expect(linhas.find((l) => l.saleId === 'a-prazo')).toMatchObject({
      dataOperacao: '2026-03-01',
      valorTotalCents: 50_000,
      quantidadeParcelas: 1,
      dispensadaCartao: false,
      parcelas: [{ numero: 1, valorCents: 50_000, vencimento: '2026-03-01', dataRecebimento: '2026-04-10', valorPagoCents: 50_000, saldoAReceberCents: 0, incobravelCents: 0 }],
    });
    expect(linhas.find((l) => l.saleId === 'aberta')).toMatchObject({ documentosFiscais: ['NFSE 4321'], parcelas: [{ dataRecebimento: null, valorPagoCents: 0, saldoAReceberCents: 30_000 }] });
    expect(linhas.find((l) => l.saleId === 'cartao')?.dispensadaCartao).toBe(true);
  });

  it('ano 2027 em diante = 400 (o caixa acaba em 01/01/2027)', async () => {
    expect((await registro(c, 2027)).status).toBe(400);
  });
});

describe('item 20 — créditos incobráveis (F-CX-5 a)', () => {
  it('valor maior que o saldo = 400; registra, aparece na coluna, audita; DELETE é soft-delete auditado; 2º DELETE = 404', async () => {
    const c = await cenario('cx20', { 2026: CAIXA });
    await linha(c, 'v20', '2026-05-01', 30_000);
    expect((await incobravel(c, { saleId: 'v20', valorCents: 30_001 })).status).toBe(400);
    expect((await incobravel(c, { saleId: 'sem-venda', valorCents: 1 })).status).toBe(404);
    expect((await incobravel(c, { saleId: 'v20', valorCents: 1, meioCobranca: 'TELEFONEMA' })).status).toBe(400);

    const r = await incobravel(c, { saleId: 'v20', valorCents: 20_000 });
    expect(r.status).toBe(201);
    const id = r.body.data.id as string;
    expect((await incobravel(c, { saleId: 'v20', valorCents: 10_001 })).status).toBe(400);
    const parcela = ((await registro(c, 2026)).body.data.linhas as Linha[])[0].parcelas[0];
    expect(parcela).toMatchObject({ incobravelCents: 20_000, saldoAReceberCents: 30_000 });
    const ev = await prisma.auditEvent.findFirst({ where: { eventType: 'tax.simples_incobravel.registrado', scopeUserId: c.user.id } });
    const payload = JSON.parse(ev?.payload ?? '{}');
    expect(payload).toMatchObject({ incobravelId: id, saleId: 'v20', valorCents: '20000', meioCobranca: 'PROTESTO', data: '2026-10-01' });
    expect(payload).not.toHaveProperty('evidencia');

    const del = await request(app).delete(`${S}/creditos-incobraveis/${id}`).set(authHeader(c.user)).query({ unitId: c.unit });
    expect(del.status).toBe(204);
    expect(await prisma.simplesCreditoIncobravel.findUnique({ where: { id } })).toMatchObject({ deletedAt: expect.any(Date) });
    expect(await prisma.auditEvent.count({ where: { eventType: 'tax.simples_incobravel.removido', scopeUserId: c.user.id } })).toBe(1);
    expect(((await registro(c, 2026)).body.data.linhas as Linha[])[0].parcelas[0]).toMatchObject({ incobravelCents: 0 });
    expect((await request(app).delete(`${S}/creditos-incobraveis/${id}`).set(authHeader(c.user)).query({ unitId: c.unit })).status).toBe(404);
  });

  it('venda incobrável de 2025 ainda entra na base de dez/2026 (art. 20 I)', async () => {
    const c = await cenario('cx20b', { 2025: CAIXA, 2026: CAIXA });
    await linha(c, 'v20b', '2025-03-10', 25_000);
    expect((await incobravel(c, { saleId: 'v20b', valorCents: 25_000 })).status).toBe(201);
    const d = await request(app).post(`${S}/apuracoes/2026-12/calcular`).set(authHeader(c.user)).send({ unitId: c.unit });
    expect(d.status).toBe(200);
    expect(d.body.data.baseCaixa.art20Cents.parcelaVencida).toBe(25_000);
  });

  it('outro dono não enxerga nem remove o incobrável (404)', async () => {
    const c = await cenario('cx20c', { 2026: CAIXA });
    const outro = await cenario('cx20d', { 2026: CAIXA });
    await linha(c, 'v20c', '2026-05-01', 1_000);
    const id = (await incobravel(c, { saleId: 'v20c', valorCents: 500 })).body.data.id as string;
    expect((await request(app).delete(`${S}/creditos-incobraveis/${id}`).set(authHeader(outro.user)).query({ unitId: c.unit })).status).toBe(404);
    expect((await incobravel(outro, { saleId: 'v20c', valorCents: 1 })).status).toBe(404);
  });
});
