/**
 * EFICIENCIA-FISCAL PR-3 itens 15–18 (BRIEF §3 PR-3, §4.3; ADR D8, I-5, I-10; decisões do dono de 28/10 em
 * D-2026-10-28-EFICIENCIA-FISCAL-PR3-EXECUCAO) contra o banco real e as rotas: GET não grava, POST `…/sugestao` grava a
 * sugestão do SYSTEM, a viva nunca é recalculada, o dono decide sem contador, e os erros nomeados de cada simulador.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';
import { canonicalSha256 } from '../../models/taxOptimization';
import { FatorRSimulacaoSchema, RegimeSimulacaoSchema, RemuneracaoSocioSimulacaoSchema, SimulacaoSugestaoSchema } from '../../dtos/TaxSimulationDto';

const app = makeApp();
const A = '/api/accounting';

let seq = 0;
async function cena(regime: string | null) {
  const tag = `tx-sim-${++seq}-${Date.now()}`;
  const dono = await prisma.user.create({ data: { name: tag, username: tag, email: `${tag}@test.local`, password: 'x', role: 'USER' } });
  const outro = await prisma.user.create({ data: { name: `${tag}-o`, username: `${tag}-o`, email: `${tag}-o@test.local`, password: 'x', role: 'USER' } });
  const unit = `unit-${tag}`;
  await seedUnit({ userId: dono.id, id: unit });
  if (regime) await prisma.companyFiscalProfile.create({ data: { userId: dono.id, anoCalendario: 2026, regime, ecfIndAliqCsll: '1', ecfIndRecReceita: '2', createdById: dono.id, updatedById: dono.id } });
  const socio = await prisma.partner.create({ data: { userId: dono.id, nome: 'Sócia', taxId: '52998224725', tipoPessoa: 'PF', residenteBrasil: true, participacaoBp: 10_000, entradaEm: '2026-01-01' } });
  return { dono: { id: dono.id, username: dono.username }, outro: { id: outro.id, username: outro.username }, unit, socioId: socio.id };
}

beforeAll(() => pushTestSchema());
afterAll(() => prisma.$disconnect());

describe('item 17 + 18 — remuneração do sócio e a sugestão do SYSTEM', () => {
  it('GET calcula os 3 mixes no contrato e não grava; POST grava 1 PROPOSED do SYSTEM com o calc cujo sha é o da resposta', async () => {
    const c = await cena('SIMPLES');
    const q = { unitId: c.unit, ano: 2026, partnerId: c.socioId, valorAnualCents: '24000000' };
    const g = await request(app).get(`${A}/simulacoes/remuneracao-socio`).query(q).set(authHeader(c.dono));
    expect(g.status).toBe(200);
    const sim = RemuneracaoSocioSimulacaoSchema.parse(g.body.data);
    expect(sim.mixes.map((m) => m.mix)).toEqual(['PRO_LABORE_INTEGRAL', 'PRO_LABORE_MINIMO_DIVIDENDOS', 'PRO_LABORE_MINIMO_JCP_DIVIDENDOS']);
    expect(sim.melhor).toBe('PRO_LABORE_MINIMO_DIVIDENDOS');
    expect(await prisma.taxOptimizationSuggestion.count({ where: { unitId: c.unit } })).toBe(0);

    const p = await request(app).post(`${A}/simulacoes/remuneracao-socio/sugestao`).set(authHeader(c.dono)).send(q);
    expect(p.status).toBe(201);
    const s = SimulacaoSugestaoSchema.parse(p.body.data);
    expect([s.reaproveitada, s.avisos]).toEqual([false, []]);
    const row = await prisma.taxOptimizationSuggestion.findUniqueOrThrow({ where: { id: s.suggestionId } });
    expect(row).toMatchObject({ practice: 'REMUNERACAO_SOCIO', subjectType: 'PARTNER', subjectId: c.socioId, status: 'PROPOSED', proposedBy: 'SYSTEM', estimatedSavingCents: BigInt(sim.economiaCents) });
    expect(row.parametrosSha256).toBe(sim.parametrosSha256);
    expect(canonicalSha256(row.calc)).toBe(row.parametrosSha256);

    // I-10: a viva com os mesmos parâmetros é reaproveitada; com outros, fica como está e o POST avisa.
    const igual = await request(app).post(`${A}/simulacoes/remuneracao-socio/sugestao`).set(authHeader(c.dono)).send(q);
    expect(igual.body.data).toEqual({ suggestionId: s.suggestionId, reaproveitada: true, avisos: [] });
    const outra = await request(app).post(`${A}/simulacoes/remuneracao-socio/sugestao`).set(authHeader(c.dono)).send({ ...q, valorAnualCents: '36000000' });
    expect(outra.body.data.suggestionId).toBe(s.suggestionId);
    expect(outra.body.data.avisos[0]).toMatch(/não foi recalculada \(I-10\)/);
    expect((await prisma.taxOptimizationSuggestion.findUniqueOrThrow({ where: { id: s.suggestionId } })).parametrosSha256).toBe(sim.parametrosSha256);

    // F-EF-3 a: sem contador, o dono decide a proposta do SYSTEM.
    const ok = await request(app).post(`${A}/tax-optimization/suggestions/${s.suggestionId}/accept`).set(authHeader(c.dono)).send({ unitId: c.unit });
    expect(ok.status).toBe(200);
    expect(ok.body.data.status).toBe('ACCEPTED');
  });

  it('sócio inexistente ⇒ 404; sócio PJ ⇒ 400 SOCIO_FORA_DO_ESCOPO; sem perfil do ano ⇒ 400; outro usuário ⇒ sem acesso', async () => {
    const c = await cena('SIMPLES');
    const q = { unitId: c.unit, ano: 2026, valorAnualCents: '24000000' };
    expect((await request(app).get(`${A}/simulacoes/remuneracao-socio`).query({ ...q, partnerId: 'nao-existe' }).set(authHeader(c.dono))).status).toBe(404);
    const pj = await prisma.partner.create({ data: { userId: c.dono.id, nome: 'Holding', taxId: '11222333000181', tipoPessoa: 'PJ', residenteBrasil: true, participacaoBp: 0, entradaEm: '2026-01-01' } });
    expect((await request(app).get(`${A}/simulacoes/remuneracao-socio`).query({ ...q, partnerId: pj.id }).set(authHeader(c.dono))).body).toMatchObject({ code: 'SOCIO_FORA_DO_ESCOPO' });
    expect((await request(app).get(`${A}/simulacoes/remuneracao-socio`).query({ ...q, ano: 2027, partnerId: c.socioId }).set(authHeader(c.dono))).status).toBe(400);
    expect((await request(app).get(`${A}/simulacoes/remuneracao-socio`).query({ ...q, partnerId: c.socioId }).set(authHeader(c.outro))).status).toBeGreaterThanOrEqual(403);
  });
});

describe('item 16 — regime', () => {
  it('razão vazio: 3 cenários, projeção 2027, alerta da janela de opção, nada gravado; POST sem economia ⇒ 400 SIMULACAO_SEM_ECONOMIA', async () => {
    const c = await cena('PRESUMIDO');
    const g = await request(app).get(`${A}/simulacoes/regime`).query({ unitId: c.unit, ano: 2026 }).set(authHeader(c.dono));
    expect(g.status).toBe(200);
    const sim = RegimeSimulacaoSchema.parse(g.body.data);
    expect(sim.simulacao.cenarios.map((x) => x.regime)).toEqual(['SIMPLES', 'PRESUMIDO', 'REAL']);
    expect(sim.projecao2027?.ano).toBe(2027);
    expect(sim.alertas.map((a) => a.codigo)).toContain('JANELA_OPCAO');
    expect(sim.avisos.join(' | ')).toMatch(/alíquota máxima/); // o perfil da unidade não tem ISS
    const p = await request(app).post(`${A}/simulacoes/regime/sugestao`).set(authHeader(c.dono)).send({ unitId: c.unit, ano: 2026 });
    expect([p.status, p.body.code]).toEqual([400, 'SIMULACAO_SEM_ECONOMIA']);
    expect(await prisma.taxOptimizationSuggestion.count({ where: { unitId: c.unit } })).toBe(0);
  });

  it('ano inválido ⇒ 400 do DTO', async () => {
    const c = await cena(null);
    expect((await request(app).get(`${A}/simulacoes/regime`).query({ unitId: c.unit, ano: 'x' }).set(authHeader(c.dono))).status).toBe(400);
  });
});

describe('item 15 — fator r (rota sob /simples, atendida pelo router de /accounting)', () => {
  it('a rota existe atrás do router do Simples: sem perfil SIMPLES ⇒ 400 nomeado, não 404; DTO recusa folha negativa', async () => {
    const c = await cena('PRESUMIDO');
    const q = { unitId: c.unit, competencia: '2026-06', folhaAlvoCents: '16800000' };
    const r = await request(app).get(`${A}/simples/simulacoes/fator-r`).query(q).set(authHeader(c.dono));
    expect(r.status).toBe(400);
    expect(r.body.error ?? r.body.message).toMatch(/regime SIMPLES/);
    expect((await request(app).get(`${A}/simples/simulacoes/fator-r`).query({ ...q, folhaAlvoCents: '-1' }).set(authHeader(c.dono))).status).toBe(400);
    expect(FatorRSimulacaoSchema.safeParse({}).success).toBe(false);
  });

  it('Simples sem atividade com anexo no PA ⇒ 400 ATIVIDADE_SEM_ANEXO', async () => {
    const c = await cena('SIMPLES');
    const r = await request(app).get(`${A}/simples/simulacoes/fator-r`).query({ unitId: c.unit, competencia: '2026-06', folhaAlvoCents: '16800000' }).set(authHeader(c.dono));
    expect([r.status, r.body.code]).toEqual([400, 'ATIVIDADE_SEM_ANEXO']);
  });
});
