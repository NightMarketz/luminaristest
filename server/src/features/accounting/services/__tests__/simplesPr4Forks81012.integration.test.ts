/**
 * X14 — forks F-PR4-8 (a), F-PR4-10 (a, só a locação) e F-PR4-12 (b, só o campo), decididos pelo dono em 2026-10-10
 * (docs/plano/decisoes/D-2026-10-10-QUESTIONARIO-DONO.md; forks em docs/accounting/PESQUISA-X14-PR4-LACUNAS-2026-10-09.md).
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { ApplicationFactory } from '@/lib/factory';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';
import { LegalParameterService } from '@/features/legalParameters/services/LegalParameterService';

const app = makeApp();
const S = '/api/accounting/simples';
const PERFIL = '/api/accounting/company-fiscal-profile';
const f = () => ApplicationFactory.getInstance();

interface Cenario {
  user: { id: string; username: string };
  unit: string;
}
let n = 0;
async function cenario(nome: string): Promise<Cenario> {
  const u = await prisma.user.create({ data: { name: nome, username: nome, email: `${nome}@test.local`, password: 'x', role: 'USER' } });
  const c: Cenario = { user: { id: u.id, username: u.username }, unit: `unit-${nome}` };
  await f().getPostingService().ensureChartOfAccounts(resolveAccountingScope({ userId: u.id }, c.unit));
  return c;
}
const perfil = (c: Cenario, ano: number, body: Record<string, unknown>) =>
  request(app).put(`${PERFIL}/${ano}`).set(authHeader(c.user)).send({ unitId: c.unit, ...body });
const linha = (c: Cenario, competencia: string, cents: number, extra: Record<string, unknown> = {}) =>
  prisma.receitaFiscalLinha.create({
    data: { userId: c.user.id, unitId: c.unit, competencia, dia: `${competencia}-10`, saleId: `sale-f8-${++n}`, itemRef: `item-${n}`, natureza: 'SERVICO', cTribNac: '060101', receitaCents: BigInt(cents), excluir: [], ...extra },
  });
const calcular = (c: Cenario, m: string) => request(app).post(`${S}/apuracoes/${m}/calcular`).set(authHeader(c.user)).send({ unitId: c.unit });

beforeAll(() => pushTestSchema());
afterAll(() => prisma.$disconnect());

describe('F-PR4-8 (a) — teto do ISS ausente no Anexo III antes de 2033', () => {
  it('ME/EPP: calcular sem SIMPLES_TETO_ISS ⇒ 400 PARAMETRO_LEGAL_AUSENTE', async () => {
    const c = await cenario('f8teto');
    expect((await perfil(c, 2026, { regime: 'SIMPLES' })).status).toBe(200);
    await linha(c, '2026-06', 1_000_000);
    const original = LegalParameterService.prototype.fotografia;
    const spy = jest.spyOn(LegalParameterService.prototype, 'fotografia').mockImplementation(async function (this: LegalParameterService, tabelas) {
      return (await original.call(this, tabelas)).filter((l) => l.tabela !== 'SIMPLES_TETO_ISS');
    });
    const r = await calcular(c, '2026-06');
    spy.mockRestore();
    expect([r.status, r.body.code]).toEqual([400, 'PARAMETRO_LEGAL_AUSENTE']);
  });
});

describe('F-PR4-10 (a) — locação de bem móvel fora da conferência NFS-e do ME (LC 116, item 3.01 vetado)', () => {
  // A linha de receita só é SERVICO | REVENDA; a locação é a cota ALUGUEL_BEM_MOVEL do salão-parceiro (Lei 12.592
  // art. 1º-A § 4º), que vira LOCACAO_MOVEL no cálculo. Guarda: ela não entra na soma do ME.
  it('serviço R$ 100 + cota de aluguel do salão R$ 400 (sobre R$ 1.000), sem NFS-e: o alerta compara só o serviço', async () => {
    const c = await cenario('f10loc');
    expect((await perfil(c, 2026, { regime: 'SIMPLES' })).status).toBe(200);
    const contrato = await prisma.salaoParceriaContrato.create({
      data: { userId: c.user.id, unitId: c.unit, profissionalContactId: 'prof-1', cotaSalaoBp: 4_000, naturezaCota: 'ALUGUEL_BEM_MOVEL', homologadoEm: '2026-01-02', sindicato: 'MTE', vigenteDesde: '2026-01-01', createdById: c.user.id, updatedById: c.user.id },
    });
    await linha(c, '2026-06', 10_000);
    await linha(c, '2026-06', 100_000, { parceriaContratoId: contrato.id, cotaProfissionalCents: 60_000n });
    const r = await calcular(c, '2026-06');
    expect((r.body.data.atividades as Array<{ natureza: string }>).map((a) => a.natureza)).toContain('LOCACAO_MOVEL');
    expect(r.status).toBe(200);
    const alerta = (r.body.data.alertas as Array<{ codigo: string; detalhe: string }>).find((a) => a.codigo === 'NFSE_DIVERGE_RECEITA');
    expect(alerta?.detalhe).toContain('a receita de serviços do subrazão é R$ 100.00');
  });
});

type Alerta = { codigo: string; detalhe: string; severity: string; motivoInformativo?: string };
const nfseDiverge = async (c: Cenario, m: string) => {
  const r = await calcular(c, m);
  expect(r.status).toBe(200);
  return (r.body.data.alertas as Alerta[]).find((a) => a.codigo === 'NFSE_DIVERGE_RECEITA');
};
let seq = 0;
const nfse = (c: Cenario, dCompet: string, cents: number) =>
  prisma.fiscalDocument.create({
    data: { userId: c.user.id, unitId: c.unit, kind: 'NFSE', status: 'AUTHORIZED', saleId: `nf-f12-${++seq}`, saleKey: `nf-f12-${seq}`, cTribNac: '060101', anchorEntryId: 'x', ambiente: 'producao', partner: 'manual', serie: 1, dCompet, vServCents: BigInt(cents) },
  });

describe('D-2026-10-10-X14-ALERTA-INFORMATIVO — severidade do NFSE_DIVERGE_RECEITA', () => {
  it('ME por competência, competência até 2026-10: INFO / DOCUMENTO_MUNICIPAL_TRANSIÇÃO', async () => {
    const c = await cenario('alinfo10');
    expect((await perfil(c, 2026, { regime: 'SIMPLES' })).status).toBe(200);
    await linha(c, '2026-10', 10_000);
    expect(await nfseDiverge(c, '2026-10')).toMatchObject({ severity: 'INFO', motivoInformativo: 'DOCUMENTO_MUNICIPAL_TRANSIÇÃO' });
  });

  it('ME por competência, competência 2026-11 em diante: WARNING, sem motivo', async () => {
    const c = await cenario('alwarn11');
    expect((await perfil(c, 2026, { regime: 'SIMPLES' })).status).toBe(200);
    await linha(c, '2026-11', 10_000);
    const a = await nfseDiverge(c, '2026-11');
    expect(a?.severity).toBe('WARNING');
    expect(a).not.toHaveProperty('motivoInformativo');
  });

  it('ME optante pelo caixa: com divergência ⇒ INFO / REGIME_CAIXA (também depois de 2026-10); sem divergência ⇒ nenhum alerta', async () => {
    const c = await cenario('alcaixa');
    expect((await perfil(c, 2026, { regime: 'SIMPLES', simplesRegimeApuracao: 'CAIXA' })).status).toBe(200);
    await linha(c, '2026-11', 10_000);
    expect(await nfseDiverge(c, '2026-11')).toMatchObject({ severity: 'INFO', motivoInformativo: 'REGIME_CAIXA' });
    await nfse(c, '2026-11-10', 10_000);
    expect(await nfseDiverge(c, '2026-11')).toBeUndefined();
  });

  it('MEI: WARNING mesmo antes de 2026-11 (a transição do documento municipal é do ME/EPP)', async () => {
    const c = await cenario('almei');
    expect((await perfil(c, 2026, { regime: 'MEI', meiContribuinteIcms: false, meiContribuinteIss: true })).status).toBe(200);
    await linha(c, '2026-03', 10_000, { tomadorTipo: 'CNPJ' });
    const a = await nfseDiverge(c, '2026-03');
    expect(a?.severity).toBe('WARNING');
    expect(a).not.toHaveProperty('motivoInformativo');
  });
});

describe('F-PR4-12 (b) — regime de apuração do Simples no perfil fiscal', () => {
  let c: Cenario;
  beforeAll(async () => {
    c = await cenario('f12regime');
  });
  const get = (ano: number) => request(app).get(`${PERFIL}/${ano}`).set(authHeader(c.user)).query({ unitId: c.unit });

  it('omitido ⇒ COMPETENCIA', async () => {
    expect((await perfil(c, 2026, { regime: 'SIMPLES' })).status).toBe(200);
    expect((await get(2026)).body.data.simplesRegimeApuracao).toBe('COMPETENCIA');
  });

  it('CAIXA grava, aparece no GET e no evento de auditoria', async () => {
    expect((await perfil(c, 2026, { regime: 'SIMPLES', simplesRegimeApuracao: 'CAIXA' })).status).toBe(200);
    expect((await get(2026)).body.data.simplesRegimeApuracao).toBe('CAIXA');
    const ev = await prisma.auditEvent.findFirst({ where: { eventType: 'company_fiscal_profile.updated', scopeUserId: c.user.id }, orderBy: { seq: 'desc' } });
    expect(JSON.parse(ev?.payload ?? '{}')).toMatchObject({ simplesRegimeApuracao: 'CAIXA' });
  });

  it('valor fora do enum ⇒ 400', async () => {
    expect((await perfil(c, 2026, { regime: 'SIMPLES', simplesRegimeApuracao: 'MISTO' })).status).toBe(400);
  });
});
