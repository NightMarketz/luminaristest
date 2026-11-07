/**
 * BE-INCR-DP-F2 PR-1 itens 13–17, 20–22 e 77 — pela pilha real (rota → controller → serviço → repositório → SQLite):
 * dependentes do trabalhador, lançamentos informados e remuneração em outra empresa. 401 em todas as rotas, 400 do DTO e
 * do `reason`, Tier-0 (404 de unidade e de dono alheios), envelope, 201/204, 409 da outra remuneração duplicada, CPF
 * mascarado, auditoria sem PII e sem valores (só HMAC) e 503 sem o chaveiro.
 */
import { randomBytes } from 'crypto';
import request from 'supertest';
import prisma from '@/lib/prisma';
import { authHeader, makeApp, pushTestSchema, seedUnit } from '@test/helpers';

const app = makeApp();
const UNIT = 'unit-dp-lanc';
const UNIT_OUTRO = 'unit-dp-lanc-outro';
const CUID = 'ckq1x2y3z0000abcd1234efgh';
const CPF = '52998224725';
const CPF_DEP = '11144477735';
const CNPJ = '11222333000181';

let dono: { id: string; username: string };
let outro: { id: string; username: string };
let trabalhadorId: string;
let vinculoId: string;
let aprendizId: string;
let aprendizTrabId: string;

describe('/api/dp dependentes, lançamentos e outras remunerações (F2 PR-1)', () => {
  beforeAll(async () => {
    process.env.DP_AUDIT_KEYS = `1:${randomBytes(32).toString('base64')}`;
    process.env.DP_AUDIT_KEY_ACTIVE = '1';
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'dpla', username: 'dpla-dono', email: 'dpla@test.local', password: 'x', role: 'USER' } });
    await seedUnit({ userId: dono.id, id: UNIT });
    outro = await prisma.user.create({ data: { name: 'dpla2', username: 'dpla-outro', email: 'dpla2@test.local', password: 'x', role: 'USER' } });
    await seedUnit({ userId: outro.id, id: UNIT_OUTRO });
    const auth = authHeader(dono);
    const post = async (path: string, body: object) => (await request(app).post(`/api/dp/${path}`).set(auth).send({ unitId: UNIT, ...body })).body.data.id as string;
    const lotacaoId = await post('lotacoes', { codigo: 'L1', descricao: 'Loja' });
    const cargoId = await post('cargos', { nome: 'Manicure', cbo: '516120' });
    const jornadaId = await post('jornadas', { nome: '44h', minutosSemanais: 2640, diasTrabalho: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'], minutosPorDia: 440, tipoJornada: '9' });
    trabalhadorId = await post('trabalhadores', { cpf: CPF, nome: 'Ana', nascimento: '1990-03-10' });
    vinculoId = await post('vinculos', {
      trabalhadorId,
      matricula: 'M1',
      categoria: '101',
      dataInicio: '2026-02-10',
      versao: { lotacaoId, cargoId, jornadaId, salarioCents: '300000', unidadeSalario: '5' },
    });
    const aprendiz = (aprendizTrabId = await post('trabalhadores', { cpf: '39053344705', nome: 'Bia', nascimento: '2008-01-15' }));
    aprendizId = await post('vinculos', {
      trabalhadorId: aprendiz,
      matricula: 'A1',
      categoria: '103',
      dataInicio: '2026-02-10',
      dataTermino: '2027-02-09',
      versao: { lotacaoId, cargoId, jornadaId, salarioCents: '162100', unidadeSalario: '5' },
    });
  }, 120000);
  afterAll(async () => {
    delete process.env.DP_AUDIT_KEYS;
    delete process.env.DP_AUDIT_KEY_ACTIVE;
    await prisma.$disconnect();
  });

  it('401 sem token em todas as rotas', async () => {
    const t = `/api/dp/trabalhadores/${CUID}/dependentes`;
    const v = `/api/dp/vinculos/${CUID}`;
    const rotas: [string, string][] = [
      ['get', t], ['post', t], ['patch', `${t}/${CUID}`], ['delete', `${t}/${CUID}`],
      ['get', `${v}/lancamentos`], ['post', `${v}/lancamentos`], ['patch', `${v}/lancamentos/${CUID}`], ['delete', `${v}/lancamentos/${CUID}`],
      ['get', `${v}/outras-remuneracoes`], ['post', `${v}/outras-remuneracoes`],
      ['patch', `${v}/outras-remuneracoes/${CUID}`], ['delete', `${v}/outras-remuneracoes/${CUID}`],
    ];
    for (const [m, p] of rotas) {
      const r = request(app) as unknown as Record<string, (u: string) => request.Test>;
      expect((await r[m](p).query({ unitId: UNIT }).send({})).status).toBe(401);
    }
  });

  it('dependente (itens 13–15): tipo da Tabela 07, salário-família, CPF mascarado, Tier-0, PATCH e DELETE', async () => {
    const auth = authHeader(dono);
    const base = `/api/dp/trabalhadores/${trabalhadorId}/dependentes`;
    const corpo = { unitId: UNIT, nome: 'Caio', cpf: CPF_DEP, nascimento: '2015-05-20', tipo: '03', deduzIrrf: true, salarioFamilia: true, vigenteDesde: '2026-03-01' };
    expect((await request(app).post(base).set(auth).send({ ...corpo, cid: 'x' })).status).toBe(400); // strict
    expect((await request(app).post(base).set(auth).send({ ...corpo, tipo: '05' })).status).toBe(400); // fora da Tabela 07
    expect((await request(app).post(base).set(auth).send({ ...corpo, tipo: '04' })).status).toBe(400); // encerrado em 2023
    const conjuge = await request(app).post(base).set(auth).send({ ...corpo, tipo: '01' }); // cônjuge não dá salário-família
    expect([conjuge.status, conjuge.body.details?.campo]).toEqual([400, 'tipo']);
    expect((await request(app).post(base).set(auth).send({ ...corpo, nascimento: '2011-01-01' })).status).toBe(400); // 15 anos
    expect((await request(app).post(base).set(auth).send({ ...corpo, unitId: UNIT_OUTRO })).status).toBe(404);
    expect((await request(app).post(base).set(authHeader(outro)).send({ ...corpo, unitId: UNIT_OUTRO })).status).toBe(404);
    const criado = await request(app).post(base).set(auth).send(corpo);
    expect([criado.status, criado.body.success, criado.body.data.cpfMascarado, criado.body.data.cpf, criado.body.data.invalido]).toEqual([
      201, true, '***.***.777-35', undefined, false,
    ]);
    const id = criado.body.data.id;
    const conj = await request(app).post(base).set(auth).send({ ...corpo, nome: 'Dora', cpf: undefined, tipo: '01', salarioFamilia: false });
    expect([conj.status, conj.body.data.cpfMascarado]).toEqual([201, null]);
    expect((await request(app).patch(`${base}/${id}`).set(auth).send({ unitId: UNIT, vigenteAte: '2026-12-31', deduzIrrf: false })).body.data).toMatchObject({
      vigenteAte: '2026-12-31',
      deduzIrrf: false,
    });
    expect((await request(app).patch(`${base}/${id}`).set(auth).send({ unitId: UNIT, nascimento: '2010-01-01' })).status).toBe(400); // salário-família revalida
    expect((await request(app).get(base).set(auth).query({ unitId: UNIT })).body.data.map((d: { nome: string }) => d.nome)).toEqual(['Caio', 'Dora']);
    expect((await request(app).get(base).set(authHeader(outro)).query({ unitId: UNIT_OUTRO })).status).toBe(404);
    expect((await request(app).delete(`${base}/${id}`).set(auth).query({ unitId: UNIT })).status).toBe(204);
    expect((await request(app).get(base).set(auth).query({ unitId: UNIT })).body.data.map((d: { nome: string }) => d.nome)).toEqual(['Dora']);
  });

  it('lançamento (itens 16–17): 400 DP_LANCAMENTO_INVALIDO com o campo; filtro por competência; PATCH e DELETE', async () => {
    const auth = authHeader(dono);
    const base = `/api/dp/vinculos/${vinculoId}/lancamentos`;
    const corpo = { unitId: UNIT, competencia: '2026-03', rubrica: 'HORA_EXTRA_50', quantidadeMin: 120 };
    const casos: [object, string][] = [
      [{ rubrica: 'SALARIO_BASE' }, 'rubrica'],
      [{ competencia: '2026-01' }, 'competencia'],
      [{ quantidadeMin: undefined, valorCents: '1000' }, 'valorCents'],
      [{ quantidadeMin: 0 }, 'quantidadeMin'], // recusado já no schema
      [{ origem: 'MODULO' }, 'origem'], // origem não entra pela HTTP
    ];
    for (const [patch, campo] of casos) {
      const r = await request(app).post(base).set(auth).send({ ...corpo, ...patch });
      expect([r.status, r.body.code, r.body.details?.campo]).toEqual([400, 'DP_LANCAMENTO_INVALIDO', campo]);
    }
    const he = await request(app).post(`/api/dp/vinculos/${aprendizId}/lancamentos`).set(auth).send(corpo); // HE no 103
    expect([he.status, he.body.details?.campo]).toEqual([400, 'rubrica']);
    expect((await request(app).post(base).set(authHeader(outro)).send({ ...corpo, unitId: UNIT_OUTRO })).status).toBe(404);
    const criado = await request(app).post(base).set(auth).send(corpo);
    expect([criado.status, criado.body.data.origem, criado.body.data.quantidadeMin, criado.body.data.valorCents, criado.body.data.informadoPorId]).toEqual([
      201, 'MANUAL', 120, null, dono.id,
    ]);
    const com = await request(app).post(base).set(auth).send({ unitId: UNIT, competencia: '2026-04', rubrica: 'COMISSAO', valorCents: '150000' });
    expect([com.status, com.body.data.valorCents]).toEqual([201, '150000']);
    expect((await request(app).get(base).set(auth).query({ unitId: UNIT, competencia: '2026-03' })).body.data.map((l: { id: string }) => l.id)).toEqual([criado.body.data.id]);
    expect((await request(app).get(base).set(auth).query({ unitId: UNIT })).body.data).toHaveLength(2);
    const id = criado.body.data.id;
    // Trocar de unidade junto com a rubrica: zera a quantidade e informa o valor.
    const troca = await request(app).patch(`${base}/${id}`).set(auth).send({ unitId: UNIT, rubrica: 'COMISSAO', quantidadeMin: null, valorCents: '5000' });
    expect([troca.status, troca.body.data.rubrica, troca.body.data.quantidadeMin, troca.body.data.valorCents]).toEqual([200, 'COMISSAO', null, '5000']);
    const ruim = await request(app).patch(`${base}/${id}`).set(auth).send({ unitId: UNIT, rubrica: 'FALTAS' }); // FALTAS em minutos, sem minutos
    expect([ruim.status, ruim.body.details?.campo]).toEqual([400, 'valorCents']);
    expect((await request(app).delete(`${base}/${id}`).set(authHeader(outro)).query({ unitId: UNIT_OUTRO })).status).toBe(404);
    expect((await request(app).delete(`${base}/${id}`).set(auth).query({ unitId: UNIT })).status).toBe(204);
    expect((await request(app).get(base).set(auth).query({ unitId: UNIT })).body.data).toHaveLength(1);
  });

  it('outra remuneração (item 77): documento obrigatório, CNPJ com DV, viva única por competência (409), PATCH e DELETE', async () => {
    const auth = authHeader(dono);
    const base = `/api/dp/vinculos/${vinculoId}/outras-remuneracoes`;
    const corpo = {
      unitId: UNIT,
      competencia: '2026-03',
      remuneracaoCents: '300000',
      contribuicaoCents: '24858',
      ordem: 'ANTES',
      categoriaOutraFonte: 'EMPREGADO',
      cnpjOutroEmpregador: CNPJ,
      documento: 'Declaração do Anexo VIII (IN RFB 2.110), arquivada em 03/2026',
    };
    for (const [patch, campo] of [[{ documento: undefined }, 'documento'], [{ documento: '  ' }, 'documento'], [{ cnpjOutroEmpregador: '11222333000180' }, 'cnpjOutroEmpregador'], [{ ordem: 'DURANTE' }, 'ordem']] as const) {
      const r = await request(app).post(base).set(auth).send({ ...corpo, ...patch });
      expect([r.status, r.body.code, r.body.details?.campo]).toEqual([400, 'DP_LANCAMENTO_INVALIDO', campo]);
    }
    const criado = await request(app).post(base).set(auth).send(corpo);
    expect([criado.status, criado.body.data.remuneracaoCents, criado.body.data.ordem]).toEqual([201, '300000', 'ANTES']);
    expect((await request(app).post(base).set(auth).send(corpo)).status).toBe(409);
    const abril = await request(app).post(base).set(auth).send({ ...corpo, competencia: '2026-04' });
    expect(abril.status).toBe(201);
    expect((await request(app).patch(`${base}/${abril.body.data.id}`).set(auth).send({ unitId: UNIT, competencia: '2026-03' })).status).toBe(409);
    expect((await request(app).patch(`${base}/${criado.body.data.id}`).set(auth).send({ unitId: UNIT, ordem: 'DEPOIS' })).body.data.ordem).toBe('DEPOIS');
    expect((await request(app).get(base).set(authHeader(outro)).query({ unitId: UNIT_OUTRO })).status).toBe(404);
    expect((await request(app).delete(`${base}/${criado.body.data.id}`).set(auth).query({ unitId: UNIT })).status).toBe(204);
    expect((await request(app).get(base).set(auth).query({ unitId: UNIT })).body.data.map((o: { competencia: string }) => o.competencia)).toEqual(['2026-04']);
  });

  it('Tier-0 do sub-recurso: id de outro pai pela rota do próprio pai ⇒ 404 (revisor do #1128, sabotagem 6)', async () => {
    const auth = authHeader(dono);
    const q = { unitId: UNIT };
    const lanc = await request(app).post(`/api/dp/vinculos/${aprendizId}/lancamentos`).set(auth).send({ ...q, competencia: '2026-03', rubrica: 'FALTAS', quantidadeMin: 60 });
    expect(lanc.status).toBe(201);
    expect((await request(app).patch(`/api/dp/vinculos/${vinculoId}/lancamentos/${lanc.body.data.id}`).set(auth).send({ ...q, quantidadeMin: 30 })).status).toBe(404);
    expect((await request(app).delete(`/api/dp/vinculos/${vinculoId}/lancamentos/${lanc.body.data.id}`).set(auth).query(q)).status).toBe(404);
    const outra = await request(app)
      .post(`/api/dp/vinculos/${aprendizId}/outras-remuneracoes`)
      .set(auth)
      .send({ ...q, competencia: '2026-03', remuneracaoCents: '100000', contribuicaoCents: '0', ordem: 'DEPOIS', categoriaOutraFonte: 'EMPREGADO', cnpjOutroEmpregador: CNPJ, documento: 'holerite' });
    expect(outra.status).toBe(201);
    expect((await request(app).patch(`/api/dp/vinculos/${vinculoId}/outras-remuneracoes/${outra.body.data.id}`).set(auth).send({ ...q, ordem: 'ANTES' })).status).toBe(404);
    const dep = await request(app)
      .post(`/api/dp/trabalhadores/${aprendizTrabId}/dependentes`)
      .set(auth)
      .send({ ...q, nome: 'Fil', nascimento: '1970-01-01', tipo: '09', deduzIrrf: true, salarioFamilia: false, vigenteDesde: '2026-03-01' });
    expect(dep.status).toBe(201);
    expect((await request(app).patch(`/api/dp/trabalhadores/${trabalhadorId}/dependentes/${dep.body.data.id}`).set(auth).send({ ...q, deduzIrrf: false })).status).toBe(404);
    expect((await request(app).delete(`/api/dp/trabalhadores/${trabalhadorId}/dependentes/${dep.body.data.id}`).set(auth).query(q)).status).toBe(404);
  });

  it('auditoria (itens 21 e 77): sem nome, CPF nem nascimento; valores só por HMAC com a versão da chave', async () => {
    const ev = await prisma.auditEvent.findMany({
      where: { eventType: { in: ['dp.dependente.created', 'dp.dependente.updated', 'dp.lancamento.created', 'dp.outra_remuneracao.created'] } },
      orderBy: { seq: 'asc' },
    });
    expect(new Set(ev.map((e) => e.eventType))).toEqual(new Set(['dp.dependente.created', 'dp.dependente.updated', 'dp.lancamento.created', 'dp.outra_remuneracao.created']));
    const tudo = ev.map((e) => String(e.payload)).join('\n');
    expect(tudo).not.toMatch(/Caio|Dora|11144477735|2015-05-20|150000|300000|24858|11222333000181|Anexo VIII/);
    const upd = JSON.parse(String(ev.find((e) => e.eventType === 'dp.dependente.updated')!.payload));
    expect(Object.keys(upd).sort()).toEqual(['antesSha256', 'campos', 'chaveVersao', 'dependenteId', 'depoisSha256', 'tipo', 'trabalhadorId']);
    expect([upd.campos, upd.chaveVersao]).toEqual(['deduzIrrf,vigenteAte', '1']);
    const lanc = JSON.parse(String(ev.find((e) => e.eventType === 'dp.lancamento.created')!.payload));
    expect(Object.keys(lanc).sort()).toEqual(['chaveVersao', 'competencia', 'lancamentoId', 'origem', 'rubrica', 'valoresSha256', 'vinculoId']);
    expect(lanc.valoresSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('sem o chaveiro do DP: lançamento e alteração de dependente recusam com 503 antes de gravar; criar dependente segue', async () => {
    const keys = process.env.DP_AUDIT_KEYS;
    delete process.env.DP_AUDIT_KEYS;
    try {
      const auth = authHeader(dono);
      const antes = await prisma.dpLancamento.count();
      const r = await request(app).post(`/api/dp/vinculos/${vinculoId}/lancamentos`).set(auth).send({ unitId: UNIT, competencia: '2026-05', rubrica: 'FALTAS', quantidadeMin: 440 });
      expect(r.status).toBe(503);
      expect(await prisma.dpLancamento.count()).toBe(antes);
      const dep = await request(app)
        .post(`/api/dp/trabalhadores/${trabalhadorId}/dependentes`)
        .set(auth)
        .send({ unitId: UNIT, nome: 'Eva', nascimento: '1960-01-01', tipo: '09', deduzIrrf: true, salarioFamilia: false, vigenteDesde: '2026-03-01' });
      expect(dep.status).toBe(201);
      expect((await request(app).patch(`/api/dp/trabalhadores/${trabalhadorId}/dependentes/${dep.body.data.id}`).set(auth).send({ unitId: UNIT, deduzIrrf: false })).status).toBe(503);
    } finally {
      process.env.DP_AUDIT_KEYS = keys;
    }
  });
});
