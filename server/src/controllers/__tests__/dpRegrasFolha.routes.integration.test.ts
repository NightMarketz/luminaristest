/**
 * BE-INCR-DP-F2 PR-0R (itens 68, 71, 74 e 75) pela pilha real: escala na jornada pela HTTP (derivado, conferido, 12×36
 * recusado, trava D-5 nos campos novos), aviso contra a lei vigente, os serviços do F1 lendo a FOLHA_REGRA (sem linha ⇒
 * 400 PARAMETRO_LEGAL_AUSENTE, nunca 500) e linha nova pelo fluxo DRAFT → PUBLISHED do LegalParameter, sem rota nova.
 */
import { randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import prisma from '@/lib/prisma';
import { getFactory } from '@/lib/factory';
import { authHeader, makeApp, pushTestSchema, seedUnit } from '@test/helpers';
import { regraInt, regrasFolha, TABELAS_REGRAS_FOLHA } from '@/features/dp/models/regrasFolha';
import { hojeDateOnly } from '@/features/legalParameters/models/hoje';
import { escalaDaJornada } from '@/features/dp/models/escala';

const app = makeApp();
const UNIT = 'unit-dp-regras';
const SEIS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
const FONTE_TESTE = 'teste DP-F2 PR-0R (linha hipotética)';

let dono: { id: string; username: string };
let admin: { userId: string; role: string };

const post = (p: string, body: Record<string, unknown>) => request(app).post(`/api/dp/${p}`).set(authHeader(dono)).send({ unitId: UNIT, ...body });

describe('/api/dp — regras da folha como dado (PR-0R)', () => {
  beforeAll(async () => {
    process.env.DP_AUDIT_KEYS = `1:${randomBytes(32).toString('base64')}`;
    process.env.DP_AUDIT_KEY_ACTIVE = '1';
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'dprf', username: 'dprf-dono', email: 'dprf@test.local', password: 'x', role: 'USER' } });
    await seedUnit({ userId: dono.id, id: UNIT });
    const a = await prisma.user.create({ data: { name: 'dprf-adm', username: 'dprf-adm', email: 'dprf-adm@test.local', password: 'x', role: 'PLATFORM_ADMIN' } });
    admin = { userId: a.id, role: 'PLATFORM_ADMIN' };
  }, 120000);
  afterAll(async () => {
    // As linhas de teste não vazam para outras suítes (o cache da fotografia é do processo).
    await prisma.legalParameter.deleteMany({ where: { fonte: FONTE_TESTE } });
    await prisma.legalParameter.updateMany({ where: { id: 'dp-regra-empregado-idade-1998' }, data: { status: 'PUBLISHED', revokedAt: null, revokedById: null } });
    await prisma.legalParameterRecalcJob.deleteMany();
    await getFactory().getLegalParameterService().aquecer();
    delete process.env.DP_AUDIT_KEYS;
    delete process.env.DP_AUDIT_KEY_ACTIVE;
    await prisma.$disconnect();
  });

  it('item 68 — escala: minutosSemanais derivado; informado diferente ⇒ 400 DP_ESCALA_IRREGULAR; 12×36 recusado; diasTrabalho em lista', async () => {
    const j = await post('jornadas', { nome: '44h', diasTrabalho: ['SAB', 'SEG', 'TER', 'QUA', 'QUI', 'SEX'], minutosPorDia: 440, tipoJornada: '4' });
    expect([j.status, j.body.data.minutosSemanais, j.body.data.diasTrabalho, j.body.data.minutosPorDia]).toEqual([201, 2640, SEIS, 440]);
    const torta = await post('jornadas', { nome: 'x', diasTrabalho: SEIS, minutosPorDia: 440, minutosSemanais: 2600, tipoJornada: '4' });
    expect([torta.status, torta.body.code]).toEqual([400, 'DP_ESCALA_IRREGULAR']);
    const doze = await post('jornadas', { nome: '12x36', diasTrabalho: ['SEG', 'QUA', 'SEX'], minutosPorDia: 720, tipoJornada: '2' });
    expect([doze.status, doze.body.code]).toEqual([400, 'DP_ESCALA_IRREGULAR']);
    expect((await post('jornadas', { nome: 'sem escala', minutosSemanais: 2640, tipoJornada: '4' })).status).toBe(400);
    // PATCH da escala recalcula o derivado.
    const p = await request(app).patch(`/api/dp/jornadas/${j.body.data.id}`).set(authHeader(dono)).send({ unitId: UNIT, diasTrabalho: ['SEG', 'TER', 'QUA', 'QUI', 'SEX'], minutosPorDia: 480 });
    expect([p.status, p.body.data.minutosSemanais]).toEqual([200, 2400]);
  });

  it('item 68 — migração das jornadas do F1: segunda a sábado; minutosPorDia = ÷ 6 só quando divide; senão fica nulo e o PATCH pede a escala', async () => {
    const sql = fs.readFileSync(path.resolve(__dirname, '../../../prisma/migrations/20261107130000_dp_jornada_escala/migration.sql'), 'utf8');
    const update = sql.split(/\r?\n/).find((l) => l.startsWith('UPDATE "dp_jornadas"'));
    expect(update).toBeDefined();
    const [exata, torta] = await Promise.all([
      prisma.dpJornada.create({ data: { userId: dono.id, nome: 'F1 44h', minutosSemanais: 2640, tipoJornada: '9', minutosPorDia: null } }),
      prisma.dpJornada.create({ data: { userId: dono.id, nome: 'F1 torta', minutosSemanais: 2645, tipoJornada: '9', minutosPorDia: null } }),
    ]);
    await prisma.$executeRawUnsafe(update!);
    const [a, b] = await Promise.all([prisma.dpJornada.findUnique({ where: { id: exata.id } }), prisma.dpJornada.findUnique({ where: { id: torta.id } })]);
    expect([a?.diasTrabalho, a?.minutosPorDia, b?.diasTrabalho, b?.minutosPorDia]).toEqual(['SEG,TER,QUA,QUI,SEX,SAB', 440, 'SEG,TER,QUA,QUI,SEX,SAB', null]);
    const r = await request(app).patch(`/api/dp/jornadas/${torta.id}`).set(authHeader(dono)).send({ unitId: UNIT, minutosSemanais: 2640 });
    expect([r.status, r.body.code]).toEqual([400, 'DP_ESCALA_IRREGULAR']);
    expect((await request(app).patch(`/api/dp/jornadas/${torta.id}`).set(authHeader(dono)).send({ unitId: UNIT, minutosPorDia: 440 })).body.data.minutosSemanais).toBe(2640);
  });

  it('item 68 — jornada 12×36 do F1 segue renomeável; mudar o cálculo dela dá DP_ESCALA_IRREGULAR (achado do revisor do #1125)', async () => {
    const j = await prisma.dpJornada.create({ data: { userId: dono.id, nome: 'F1 12x36', minutosSemanais: 2520, tipoJornada: '2', minutosPorDia: 420 } });
    const ren = await request(app).patch(`/api/dp/jornadas/${j.id}`).set(authHeader(dono)).send({ unitId: UNIT, nome: 'renomeada' });
    expect([ren.status, ren.body.data?.nome, ren.body.data?.minutosSemanais]).toEqual([200, 'renomeada', 2520]);
    const calc = await request(app).patch(`/api/dp/jornadas/${j.id}`).set(authHeader(dono)).send({ unitId: UNIT, minutosPorDia: 400 });
    expect([calc.status, calc.body.code]).toEqual([400, 'DP_ESCALA_IRREGULAR']);
  });

  it('item 68 + decisão do dono 07/11 — 12×36 legada perde a escala inventada: motor sem escala (JORNADA_AUSENTE), sem aviso, reaplicar não falha', async () => {
    const sql = fs.readFileSync(path.resolve(__dirname, '../../../prisma/migrations/20261107160000_dp_jornada_12x36_sem_escala/migration.sql'), 'utf8');
    const stmts = sql.split(/\r?\n/).filter((l) => l.trim() !== '' && !l.startsWith('--'));
    expect(stmts).toHaveLength(1);
    // Dado legado como a 20261107130000 deixou: segunda a sábado em toda jornada do F1, inclusive a 12×36.
    const [doze, seis] = await Promise.all([
      prisma.dpJornada.create({ data: { userId: dono.id, nome: 'F1 12x36 legada', minutosSemanais: 2520, tipoJornada: '2', minutosPorDia: 420 } }),
      prisma.dpJornada.create({ data: { userId: dono.id, nome: 'F1 6x1 legada', minutosSemanais: 2640, tipoJornada: '9', minutosPorDia: 440 } }),
    ]);
    expect(doze.diasTrabalho).toBe('SEG,TER,QUA,QUI,SEX,SAB');
    expect(escalaDaJornada(doze)).not.toBeNull(); // sem a migração, o motor calcularia 12×36 como 6×1
    const ler = () => Promise.all([prisma.dpJornada.findUniqueOrThrow({ where: { id: doze.id } }), prisma.dpJornada.findUniqueOrThrow({ where: { id: seis.id } })]);
    await prisma.$executeRawUnsafe(stmts[0]);
    const [d1, s1] = await ler();
    expect([d1.diasTrabalho, d1.minutosPorDia, d1.minutosSemanais]).toEqual(['', null, 2520]);
    expect([s1.diasTrabalho, s1.minutosPorDia]).toEqual(['SEG,TER,QUA,QUI,SEX,SAB', 440]); // só a 12×36 muda
    // Motor (item 68/61 c): a entrada do cálculo é `escalaDaJornada`; null ⇒ JORNADA_AUSENTE até o usuário informar.
    expect(escalaDaJornada(d1)).toBeNull();
    expect(escalaDaJornada(s1)).toEqual({ diasTrabalho: SEIS, minutosPorDia: 440 });
    // Reaplicar: 0 linhas, sem erro, mesmo estado.
    expect(await prisma.$executeRawUnsafe(stmts[0])).toBe(0);
    expect(await ler()).toEqual([d1, s1]);
    // Aviso (item 71): sem escala não há conta contra a lei; a jornada segue lida e renomeável, com escala vazia.
    const g = await request(app).get(`/api/dp/jornadas/${doze.id}`).set(authHeader(dono)).query({ unitId: UNIT });
    expect([g.status, g.body.data.diasTrabalho, g.body.data.minutosPorDia]).toEqual([200, [], null]);
    const ren = await request(app).patch(`/api/dp/jornadas/${doze.id}`).set(authHeader(dono)).send({ unitId: UNIT, nome: '12x36 renomeada' });
    expect([ren.status, ren.body.data.avisos, ren.body.data.diasTrabalho]).toEqual([200, [], []]);
    // Informar escala por dias fixos numa 12×36 segue recusado (F6, DP-PONTO): nada recria o 6×1 por trás.
    const esc = await request(app).patch(`/api/dp/jornadas/${doze.id}`).set(authHeader(dono)).send({ unitId: UNIT, diasTrabalho: SEIS, minutosPorDia: 420 });
    expect([esc.status, esc.body.code]).toEqual([400, 'DP_ESCALA_IRREGULAR']);
  });

  it('item 68 — D-5 cobre os campos novos: jornada em uso não troca diasTrabalho nem minutosPorDia (409)', async () => {
    const j = await post('jornadas', { nome: '44h uso', diasTrabalho: SEIS, minutosPorDia: 440, tipoJornada: '9' });
    const lot = await post('lotacoes', { codigo: 'RF1', descricao: 'Loja' });
    const car = await post('cargos', { nome: 'Manicure', cbo: '516120' });
    const t = await post('trabalhadores', { cpf: '52998224725', nome: 'Ana', nascimento: '1990-03-10' });
    const v = await post('vinculos', {
      trabalhadorId: t.body.data.id, matricula: 'RF-1', categoria: '101', dataInicio: '2026-01-01',
      versao: { lotacaoId: lot.body.data.id, cargoId: car.body.data.id, jornadaId: j.body.data.id, salarioCents: '300000', unidadeSalario: '5' },
    });
    expect(v.status).toBe(201);
    for (const corpo of [{ diasTrabalho: ['SEG', 'TER', 'QUA', 'QUI', 'SEX'] }, { minutosPorDia: 400 }]) {
      const r = await request(app).patch(`/api/dp/jornadas/${j.body.data.id}`).set(authHeader(dono)).send({ unitId: UNIT, ...corpo });
      expect([r.status, r.body.code]).toEqual([409, 'DP_JORNADA_EM_USO']);
    }
    expect((await request(app).patch(`/api/dp/jornadas/${j.body.data.id}`).set(authHeader(dono)).send({ unitId: UNIT, nome: 'só o nome' })).status).toBe(200);
  });

  it('item 71 — jornada acima do limite vigente hoje volta 201 com aviso; dentro do limite, sem aviso', async () => {
    const hoje = hojeDateOnly(); // dia civil em America/Sao_Paulo, o fuso do escopo (scopeToday)
    const f = await getFactory().getLegalParameterService().fotografia(['FOLHA_REGRA']);
    const limite = regraInt(f, 'JORNADA_LIMITE_SEMANAL_MIN', hoje).valor;
    const acima = await post('jornadas', { nome: 'acima', diasTrabalho: SEIS, minutosPorDia: Math.ceil((limite + 1) / 6), tipoJornada: '9' });
    expect([acima.status, acima.body.data.avisos.map((a: { codigo: string }) => a.codigo)]).toEqual([201, expect.arrayContaining(['JORNADA_ACIMA_DO_LIMITE'])]);
    const dentro = await post('jornadas', { nome: 'dentro', diasTrabalho: ['SEG', 'TER', 'QUA', 'QUI', 'SEX'], minutosPorDia: 360, tipoJornada: '9' });
    expect([dentro.status, dentro.body.data.avisos]).toEqual([201, []]);
  });

  it('item 74 — sem linha de FOLHA_REGRA vigente, o vínculo do F1 dá 400 PARAMETRO_LEGAL_AUSENTE nomeando a chave, não 500', async () => {
    const svc = getFactory().getLegalParameterService();
    await svc.revoke(admin, 'dp-regra-empregado-idade-1998');
    try {
      const j = await post('jornadas', { nome: '44h 74', diasTrabalho: SEIS, minutosPorDia: 440, tipoJornada: '9' });
      const lot = await post('lotacoes', { codigo: 'RF74', descricao: 'Loja' });
      const t = await post('trabalhadores', { cpf: '11144477735', nome: 'Bia', nascimento: '1995-01-01' });
      const r = await post('vinculos', {
        trabalhadorId: t.body.data.id, matricula: 'RF-74', categoria: '101', dataInicio: '2026-02-01',
        versao: { lotacaoId: lot.body.data.id, jornadaId: j.body.data.id, salarioCents: '300000', unidadeSalario: '5' },
      });
      expect([r.status, r.body.code]).toEqual([400, 'PARAMETRO_LEGAL_AUSENTE']);
      expect(r.body.message).toContain('FOLHA_REGRA/EMPREGADO_IDADE_MIN');
    } finally {
      await prisma.legalParameter.update({ where: { id: 'dp-regra-empregado-idade-1998' }, data: { status: 'PUBLISHED', revokedAt: null, revokedById: null } });
      await svc.aquecer();
    }
  });

  it('item 75 — HE_ADICIONAL_BP nova publicada com vigência futura não muda antes dela e muda depois, sem rota nova', async () => {
    const svc = getFactory().getLegalParameterService();
    const draft = await svc.propose(admin, {
      tabela: 'FOLHA_REGRA', chave: 'HE_ADICIONAL_BP', valorInt: 6000, fonte: FONTE_TESTE, vigenteDesde: '2027-01-01', motivo: 'teste do item 75',
    });
    const antes = regrasFolha(await svc.fotografia(TABELAS_REGRAS_FOLHA), '2027-01-01').heAdicionalBp.valor;
    expect(antes).toBe(5000); // rascunho não vale
    await svc.publish(admin, draft.id);
    const f = await svc.fotografia(TABELAS_REGRAS_FOLHA);
    expect([regrasFolha(f, '2026-12-31').heAdicionalBp.valor, regrasFolha(f, '2027-01-01').heAdicionalBp.valor]).toEqual([5000, 6000]);
    expect(regrasFolha(f, '2027-01-01').heAdicionalBp.linhaId).toBe(draft.id);
  });
});
