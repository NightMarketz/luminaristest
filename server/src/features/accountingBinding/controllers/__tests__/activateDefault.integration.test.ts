/**
 * LAC-B — CONTRATO HTTP de `POST /api/accounting-binding/activate-default` (FE-INCR-BINDING-ACTIVATION
 * item 1: "integração feliz + sem chart + idempotência") — app Express REAL sobre supertest + SQLite
 * REAL, sem mock de service: o chart canônico é instalado pelo `PostingService.ensureChartOfAccounts`,
 * o período pelo `PeriodService`, e o binding pelo MESMO `BindingCompileService.compile()` do CLI.
 *
 * Todo caso bloqueado confere a BASE, não só a resposta: "recusar e gravar assim mesmo" é o modo de
 * falha que um teste de status não vê.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { SALE_BINDING_V2 } from '@/features/accountingBinding/fixtures/saleBinding';

const app = makeApp();
const URL = '/api/accounting-binding/activate-default';
const UNIT = 'unit-lacb';

let dono: { id: string; username: string };

const criarUsuario = (username: string) =>
  prisma.user.create({
    data: { name: username, username, email: `${username}@test.local`, password: 'x', role: 'USER' },
  });

/** Mesmo relógio do dry-run do validador (UTC) — é o mês que a rota abre. */
const hoje = () => {
  const [y, m] = new Date().toISOString().slice(0, 10).split('-').map(Number);
  return { year: y, month: m };
};

const foto = async (userId: string) => ({
  bindings: await prisma.accountingBinding.count({ where: { userId, unitId: UNIT } }),
  contas: await prisma.account.count({ where: { userId, unitId: UNIT, deletedAt: null } }),
  periodos: await prisma.accountingPeriod.count({ where: { userId, unitId: UNIT } }),
});

describe('POST /api/accounting-binding/activate-default (LAC-B)', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await criarUsuario('lacb-dono');
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('401 sem token', async () => {
    const res = await request(app).post(URL).send({ unitId: UNIT });
    expect(res.status).toBe(401);
  });

  it('400 para setor sem binding padrão — nada gravado', async () => {
    const res = await request(app).post(URL).set(authHeader(dono)).send({ unitId: UNIT, sectorKey: 'padaria' });
    expect(res.status).toBe(400);
    expect(await foto(dono.id)).toEqual({ bindings: 0, contas: 0, periodos: 0 });
  });

  it('sem chart, sem período e sem perfil fiscal, SEM flags ⇒ 200 Draft com os 3 bloqueantes e NADA gravado', async () => {
    const res = await request(app).post(URL).set(authHeader(dono)).send({ unitId: UNIT });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Draft');
    expect(res.body.data.bindingVersion).toBeUndefined();
    expect(res.body.data.blocking.map((i: { code: string }) => i.code)).toEqual([
      'CHART_OF_ACCOUNTS_EMPTY',
      'ACCOUNTING_PERIOD_NOT_OPEN',
      'KIT_FISCAL_PROFILE_REQUIRED', // E-5: o kit vigente (v4) traz contas do perfil fiscal
    ]);
    const { year, month } = hoje();
    expect(res.body.data.blocking[1].period).toBe(`${year}-${String(month).padStart(2, '0')}`);
    expect(await foto(dono.id)).toEqual({ bindings: 0, contas: 0, periodos: 0 });
  });

  it('E-5 (mantida pelo dono, 13/10): com as 2 flags mas SEM perfil fiscal ⇒ 200 Draft KIT_FISCAL_PROFILE_REQUIRED, nada gravado', async () => {
    const res = await request(app)
      .post(URL)
      .set(authHeader(dono))
      .send({ unitId: UNIT, installChartIfEmpty: true, openCurrentPeriodIfMissing: true });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Draft');
    expect(res.body.data.blocking.map((i: { code: string }) => i.code)).toEqual(['KIT_FISCAL_PROFILE_REQUIRED']);
    expect(await foto(dono.id)).toEqual({ bindings: 0, contas: 0, periodos: 0 });
  });

  it('feliz: com as 2 flags instala o chart canônico, abre o mês corrente e ativa o binding do salão', async () => {
    // E-5: o kit vigente (v4) preenche contas do perfil fiscal — o perfil vem antes (PUT /accounting/fiscal-profile).
    await prisma.fiscalProfile.create({
      data: { userId: dono.id, unitId: UNIT, regimeTributario: 'PRESUMIDO', pisCofinsRegime: 'CUMULATIVO', d1fConfirmado: false },
    });
    const res = await request(app)
      .post(URL)
      .set(authHeader(dono))
      .send({ unitId: UNIT, installChartIfEmpty: true, openCurrentPeriodIfMissing: true });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ status: 'Active', bindingVersion: 1, kit: { kitKey: 'beautySalon', kitVersion: 6, status: 'INSTALLED' } });

    const { year, month } = hoje();
    const periodo = await prisma.accountingPeriod.findFirst({ where: { userId: dono.id, unitId: UNIT, year, month } });
    expect(periodo?.status).toBe('OPEN');
    // Chart instalado: toda conta que o binding do salão referencia existe como folha. (Sem importar
    // o fixture de `features/accounting` — a fronteira do importBoundary.test.ts vale para testes.)
    const codigos = [...new Set(SALE_BINDING_V2.eventBindings.flatMap((e) => e.roleSlots.map((r) => r.accountCode)))];
    const folhas = await prisma.account.findMany({
      where: { userId: dono.id, unitId: UNIT, deletedAt: null, code: { in: codigos }, acceptsEntries: true },
    });
    expect(folhas.map((a) => a.code).sort()).toEqual(codigos.sort());
    const ativo = await prisma.accountingBinding.findMany({ where: { userId: dono.id, unitId: UNIT, status: 'Active' } });
    expect(ativo).toHaveLength(1);
    expect(ativo[0].sectorKey).toBe('beautySalon');

    // Auditoria pela cadeia EXISTENTE (item 5: nenhum eventType novo).
    const eventos = (await prisma.auditEvent.findMany({ where: { scopeUserId: dono.id, unitId: UNIT } })).map(
      (e) => e.eventType,
    );
    expect(eventos).toEqual(expect.arrayContaining(['period.opened', 'binding.compiled', 'binding.activated']));

    // Kit v3+ (PR-K2): PIS/COFINS do perfil apontam para as deduções 3.6.1/3.6.2 da extensão.
    const perfil = await prisma.fiscalProfile.findFirstOrThrow({ where: { userId: dono.id, unitId: UNIT } });
    const codigoDe = async (id: string | null) => (id ? (await prisma.account.findUniqueOrThrow({ where: { id } })).code : null);
    expect([await codigoDe(perfil.pisDespesaAccountId), await codigoDe(perfil.cofinsDespesaAccountId)]).toEqual(['3.6.1', '3.6.2']);
  });

  it('idempotência: 2ª chamada ⇒ already-active com a MESMA versão, nenhuma versão nova', async () => {
    const res = await request(app)
      .post(URL)
      .set(authHeader(dono))
      .send({ unitId: UNIT, installChartIfEmpty: true, openCurrentPeriodIfMissing: true });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ status: 'already-active', bindingVersion: 1, kit: { kitKey: 'beautySalon', kitVersion: 6, status: 'INSTALLED' } });
    expect(await prisma.accountingBinding.count({ where: { userId: dono.id, unitId: UNIT } })).toBe(1);
  });

  it('LAC-B PR-0 (F-BA-5 a): salão Active + pedido da clínica na MESMA unidade ⇒ 409 BINDING_SECTOR_CONFLICT, nada gravado', async () => {
    const antes = { ...(await foto(dono.id)), kits: await prisma.kitInstallation.count({ where: { userId: dono.id, unitId: UNIT } }) };
    const res = await request(app)
      .post(URL)
      .set(authHeader(dono))
      .send({ unitId: UNIT, sectorKey: 'aestheticClinic', installChartIfEmpty: true, openCurrentPeriodIfMissing: true });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('BINDING_SECTOR_CONFLICT');
    expect(res.body.message).toContain('beautySalon');
    expect({ ...(await foto(dono.id)), kits: await prisma.kitInstallation.count({ where: { userId: dono.id, unitId: UNIT } }) }).toEqual(antes);
    const ativos = await prisma.accountingBinding.findMany({ where: { userId: dono.id, unitId: UNIT, status: 'Active' } });
    expect(ativos.map((b) => b.sectorKey)).toEqual(['beautySalon']);
  });

  it('LAC-B PR-0: unidade LEGADA (binding Active do salão, sem KitInstallation) + clínica ⇒ 409, nenhuma KitInstallation criada', async () => {
    const LEGADA = 'unit-lacb-legada';
    await prisma.accountingBinding.create({
      data: {
        userId: dono.id,
        unitId: LEGADA,
        sectorKey: 'beautySalon',
        bindingVersion: 1,
        compiledAt: new Date(),
        compiledFromHash: 'sha256:legada',
        payload: JSON.stringify(SALE_BINDING_V2),
        status: 'Active',
        createdById: dono.id,
      },
    });
    const res = await request(app).post(URL).set(authHeader(dono)).send({ unitId: LEGADA, sectorKey: 'aestheticClinic' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('BINDING_SECTOR_CONFLICT');
    expect(await prisma.kitInstallation.count({ where: { userId: dono.id, unitId: LEGADA } })).toBe(0);
    expect(await prisma.accountingBinding.count({ where: { userId: dono.id, unitId: LEGADA } })).toBe(1);
  });
});
