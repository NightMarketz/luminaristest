/**
 * SIMPLES-PISO-ANEXO-XI bloco 1 (BRIEF §3 itens 1, 4-6; §5.0 F-PI-2) — cadastro do benefício municipal de ISS e o efeito
 * na sugestão de alíquota (retenção) e na apuração do DAS. Leis municipais FICTÍCIAS (BRIEF §7: sem lei real do
 * Município-piloto). Valores = aritmética sobre Res. CGSN 140 arts. 31 p.ú. e 32 § 1º, não oráculo (PGDAS-D = gate humano).
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { ApplicationFactory } from '@/lib/factory';
import { resolveAccountingScope, type AccountingScope } from '@/features/accounting/scope/AccountingScope';
import { IssBeneficioMunicipalService } from '../IssBeneficioMunicipalService';
import type { IAccountingPolicy } from '../../policies/IAccountingPolicy';
import type { IIssBeneficioMunicipalRepository } from '../../repositories/IIssBeneficioMunicipalRepository';
import type { AuditService } from '../AuditService';

const app = makeApp();
const B = '/api/accounting/iss-beneficios-municipais';
const S = '/api/accounting/simples';
const SP = '3550308';
const f = () => ApplicationFactory.getInstance();

interface Cenario {
  user: { id: string; username: string };
  unit: string;
  scope: () => AccountingScope;
}
let n = 0;
async function cenario(nome: string, codMun: string | null = SP): Promise<Cenario> {
  const u = await prisma.user.create({ data: { name: nome, username: nome, email: `${nome}@test.local`, password: 'x', role: 'USER' } });
  const c: Cenario = { user: { id: u.id, username: u.username }, unit: `unit-${nome}`, scope: () => resolveAccountingScope({ userId: u.id }, `unit-${nome}`) };
  await f().getPostingService().ensureChartOfAccounts(c.scope());
  await prisma.fiscalProfile.create({ data: { userId: u.id, unitId: c.unit, regimeTributario: 'SIMPLES_NACIONAL', pisCofinsRegime: 'CUMULATIVO', codMun } });
  return c;
}
const corpo = (c: Cenario, over: Record<string, unknown> = {}) => ({
  unitId: c.unit,
  codMun: SP,
  tipo: 'REDUCAO_PERCENTUAL',
  reducaoBpPorFaixa: [2000],
  legislacao: 'Lei Municipal FICTÍCIA 1/2026 art. 2º',
  vigenteDesde: '2026-01-01',
  ...over,
});
const criar = (c: Cenario, over: Record<string, unknown> = {}) => request(app).post(B).set(authHeader(c.user)).send(corpo(c, over));
const perfil = (c: Cenario, ano: number, body: Record<string, unknown>) =>
  request(app).put(`/api/accounting/company-fiscal-profile/${ano}`).set(authHeader(c.user)).send({ unitId: c.unit, ...body });
const historico = (c: Cenario, competencia: string, cents: number) =>
  f().getSimplesEntradasService().upsertHistorico(c.scope(), competencia, { unitId: c.unit, receitaBrutaCents: cents });
const servico = (c: Cenario, cTribNac = '060101') => prisma.serviceFiscalProfile.create({ data: { userId: c.user.id, unitId: c.unit, serviceRef: `srv-${cTribNac}`, cTribNac } });
const venda = (c: Cenario, competencia: string, cents: number) =>
  prisma.receitaFiscalLinha.create({
    data: { userId: c.user.id, unitId: c.unit, competencia, dia: `${competencia}-10`, saleId: `sale-${++n}`, itemRef: `item-${n}`, natureza: 'SERVICO', cTribNac: '060101', receitaCents: BigInt(cents), excluir: [] },
  });
const aliquotas = (c: Cenario, m: string) => request(app).get(`${S}/aliquotas/${m}`).query({ unitId: c.unit }).set(authHeader(c.user));
const calcular = (c: Cenario, m: string) => request(app).post(`${S}/apuracoes/${m}/calcular`).set(authHeader(c.user)).send({ unitId: c.unit });
type Atividade = { natureza: string; cTribNac: string | null; issRetencao: string | null; beneficioMunicipal: unknown; tributos?: Record<string, number> };
const doServico = (body: { data: { atividades: Atividade[] } }) => body.data.atividades.find((a) => a.natureza === 'SERVICO' && a.cTribNac === '060101');
const alerta = (body: { data: { alertas: Array<{ codigo: string; severity: string; detalhe: string }> } }, codigo: string) => body.data.alertas.find((a) => a.codigo === codigo);
/** RBT12 R$ 600.000 em 2026-07 (3ª faixa do Anexo III: ISS 10,56% × 32,5% = 3,4320%). */
async function simples600k(c: Cenario) {
  expect((await perfil(c, 2026, { regime: 'SIMPLES' })).status).toBe(200);
  await servico(c);
  for (let i = 0; i < 12; i++) await historico(c, new Date(Date.UTC(2025, 5 + i, 1)).toISOString().slice(0, 7), 5_000_000);
}

beforeAll(() => pushTestSchema());
afterAll(() => prisma.$disconnect());

describe('item 1 — cadastro (Route→Controller→Service→Repository; soft-delete; auditoria)', () => {
  let c: Cenario;
  beforeAll(async () => {
    c = await cenario('issbcrud');
  });

  it('POST 201 → GET lista/um → PUT substitui → DELETE soft (some da lista, linha fica com deletedAt) + 3 eventos de auditoria sem a legislação', async () => {
    const r = await criar(c, { cTribNacPrefixos: ['0601'] });
    expect(r.status).toBe(201);
    const id = r.body.data.id as string;
    expect(r.body.data).toMatchObject({ codMun: SP, cTribNacPrefixos: ['0601'], tipo: 'REDUCAO_PERCENTUAL', reducaoBpPorFaixa: [2000], vigenteAte: null });
    expect((await request(app).get(B).query({ unitId: c.unit }).set(authHeader(c.user))).body.data).toHaveLength(1);
    const put = await request(app).put(`${B}/${id}`).set(authHeader(c.user)).send(corpo(c, { tipo: 'ISENCAO', reducaoBpPorFaixa: null }));
    expect(put.status).toBe(200);
    expect(put.body.data).toMatchObject({ tipo: 'ISENCAO', reducaoBpPorFaixa: null, cTribNacPrefixos: [] });
    expect((await request(app).delete(`${B}/${id}`).query({ unitId: c.unit }).set(authHeader(c.user))).status).toBe(200);
    expect((await request(app).get(B).query({ unitId: c.unit }).set(authHeader(c.user))).body.data).toHaveLength(0);
    expect((await request(app).get(`${B}/${id}`).query({ unitId: c.unit }).set(authHeader(c.user))).status).toBe(404);
    expect((await prisma.issBeneficioMunicipal.findUniqueOrThrow({ where: { id } })).deletedAt).not.toBeNull();
    const eventos = await prisma.auditEvent.findMany({ where: { targetId: id }, orderBy: { createdAt: 'asc' } });
    expect(eventos.map((e) => e.eventType)).toEqual(['iss_beneficio_municipal.created', 'iss_beneficio_municipal.updated', 'iss_beneficio_municipal.deleted']);
    expect(JSON.stringify(eventos.map((e) => e.payload))).not.toContain('FICTÍCIA');
  });

  it('409 para benefício do mesmo Município com vigência e serviço em comum; outro ramo passa', async () => {
    const d = await cenario('issbsobrepoe');
    expect((await criar(d, { cTribNacPrefixos: ['0601'] })).status).toBe(201);
    expect((await criar(d, { cTribNacPrefixos: ['060101'], vigenteDesde: '2026-05-01' })).status).toBe(409);
    expect((await criar(d, { cTribNacPrefixos: ['0602'] })).status).toBe(201);
  });

  it('400 no DTO (.strict; REDUCAO sem redução); 401 sem token; outro usuário não enxerga (404)', async () => {
    expect((await criar(c, { extra: true })).status).toBe(400);
    expect((await criar(c, { reducaoBpPorFaixa: null })).status).toBe(400);
    expect((await request(app).get(B).query({ unitId: c.unit })).status).toBe(401);
    const id = (await criar(c, { codMun: '3304557' })).body.data.id as string;
    const outro = await cenario('issboutro');
    expect((await request(app).get(`${B}/${id}`).query({ unitId: c.unit }).set(authHeader(outro.user))).status).toBe(404);
  });
});

describe('item 1 — policy (canManageIssBeneficioMunicipal / canReadFiscalProfile)', () => {
  const repo = { listByScope: jest.fn(async () => []), findById: jest.fn(), runTransaction: jest.fn() } as unknown as IIssBeneficioMunicipalRepository;
  const nega = { canReadFiscalProfile: () => false, canManageIssBeneficioMunicipal: () => false } as unknown as IAccountingPolicy;
  const svc = new IssBeneficioMunicipalService(repo, nega, {} as AuditService);
  const scope = resolveAccountingScope({ userId: 'u' }, 'unit');
  it('sem permissão: 403 em ler, criar, alterar e remover — antes de tocar o repositório', async () => {
    await expect(svc.list(scope)).rejects.toMatchObject({ statusCode: 403 });
    await expect(svc.create(scope, { unitId: 'unit' } as never)).rejects.toMatchObject({ statusCode: 403 });
    await expect(svc.update(scope, 'x', { unitId: 'unit' } as never)).rejects.toMatchObject({ statusCode: 403 });
    await expect(svc.delete(scope, 'x')).rejects.toMatchObject({ statusCode: 403 });
    expect(repo.runTransaction).not.toHaveBeenCalled();
  });
});

describe('item 4 — retenção: aliquotas() com o benefício vigente (art. 27 § 1º; art. 32 § 1º; piso do art. 31 p.ú.)', () => {
  it('redução de 20% sobre 3,4320% ⇒ 2,7456%, com a legislação concessiva na saída', async () => {
    const c = await cenario('issbret20');
    await simples600k(c);
    expect((await criar(c)).status).toBe(201);
    const r = await aliquotas(c, '2026-07');
    expect(r.status).toBe(200);
    expect(doServico(r.body)).toMatchObject({
      issRetencao: '2.7456',
      beneficioMunicipal: { legislacao: 'Lei Municipal FICTÍCIA 1/2026 art. 2º', tipo: 'REDUCAO_PERCENTUAL', pisoAplicado: false, excecaoPiso: false },
    });
    expect(r.body.data.avisos.join(' ')).toContain('art. 31 p.ú.');
  });

  it('isenção ⇒ piso de 2,0000%', async () => {
    const c = await cenario('issbretisento');
    await simples600k(c);
    await criar(c, { tipo: 'ISENCAO', reducaoBpPorFaixa: null });
    expect(doServico((await aliquotas(c, '2026-07')).body)).toMatchObject({ issRetencao: '2.0000', beneficioMunicipal: { tipo: 'ISENCAO', pisoAplicado: true } });
  });

  it('F-PI-2: tabela 1,92% + isenção ⇒ 2,0000% e alerta BENEFICIO_MUNICIPAL_INAPLICAVEL_DESVANTAJOSO (WARNING)', async () => {
    const c = await cenario('issbdesvant');
    expect((await perfil(c, 2026, { regime: 'SIMPLES' })).status).toBe(200);
    await servico(c);
    await historico(c, '2025-06', 18_000_001);
    await criar(c, { tipo: 'ISENCAO', reducaoBpPorFaixa: null });
    const r = await aliquotas(c, '2026-07');
    expect(doServico(r.body)?.issRetencao).toBe('2.0000');
    expect(alerta(r.body, 'BENEFICIO_MUNICIPAL_INAPLICAVEL_DESVANTAJOSO')).toMatchObject({ severity: 'WARNING' });
    expect(alerta(r.body, 'BENEFICIO_MUNICIPAL_INAPLICAVEL_DESVANTAJOSO')?.detalhe).toContain('1.9200%');
  });

  it('benefício de outro Município, fora da vigência ou de outro ramo não entra (issRetencao da tabela, beneficioMunicipal null)', async () => {
    const c = await cenario('issbnaoalcanca');
    await simples600k(c);
    await criar(c, { codMun: '3304557' });
    await criar(c, { vigenteDesde: '2026-07-01' }); // PA = 2026-06
    await criar(c, { cTribNacPrefixos: ['0602'], vigenteDesde: '2025-01-01', vigenteAte: '2025-12-31' });
    expect(doServico((await aliquotas(c, '2026-07')).body)).toMatchObject({ issRetencao: '3.4320', beneficioMunicipal: null });
  });

  it('F-PI-4: mês de início de atividade continua 2% fixo (art. 27 II), sem benefício', async () => {
    const c = await cenario('issbinicio');
    expect((await perfil(c, 2026, { regime: 'SIMPLES', inicioAtividadeEm: '2026-08-05' })).status).toBe(200);
    await servico(c);
    await criar(c, { tipo: 'ISENCAO', reducaoBpPorFaixa: null });
    const r = await aliquotas(c, '2026-08');
    expect(r.body.data.regra).toBe('INICIO_ATIVIDADE');
    expect(doServico(r.body)).toMatchObject({ issRetencao: '2.0000', beneficioMunicipal: null });
  });

  it('F-PI-5: valor fixo municipal fica fora do cálculo — só o alerta ISS_VALOR_FIXO_MUNICIPAL (INFO)', async () => {
    const c = await cenario('issbfixo');
    await simples600k(c);
    await criar(c, { tipo: 'VALOR_FIXO', reducaoBpPorFaixa: null });
    const r = await aliquotas(c, '2026-07');
    expect(doServico(r.body)).toMatchObject({ issRetencao: '3.4320', beneficioMunicipal: { tipo: 'VALOR_FIXO', pisoAplicado: false } });
    expect(alerta(r.body, 'ISS_VALOR_FIXO_MUNICIPAL')).toMatchObject({ severity: 'INFO' });
  });
});

describe('item 5 — F-PI-3 (b): a parcela ISS do DAS sai reduzida (art. 32 § 1º)', () => {
  it('venda de R$ 50.000 em 2026-06, RBT12 R$ 600.000: ISS R$ 1.716,00 → R$ 1.372,80 com redução de 20%', async () => {
    const sem = await cenario('issbdassem');
    const com = await cenario('issbdascom');
    for (const c of [sem, com]) {
      await simples600k(c);
      await venda(c, '2026-06', 5_000_000);
    }
    await criar(com);
    const a = await calcular(sem, '2026-06');
    const b = await calcular(com, '2026-06');
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(doServico(a.body)?.tributos?.ISS).toBe(171_600);
    expect(doServico(b.body)?.tributos?.ISS).toBe(137_280);
    expect(b.body.data.totalCalculadoCents).toBe(a.body.data.totalCalculadoCents - 34_320);
  });
});
