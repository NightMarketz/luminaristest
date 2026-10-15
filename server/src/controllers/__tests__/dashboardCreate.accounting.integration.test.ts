/**
 * BE-INCR-ONBOARDING-ACTIVATION (nó I4) PR-2 — o onboarding liga a contabilidade (itens 9c, 10, 11, 12, 14; EMENDA
 * 14/10). App Express REAL sobre supertest + SQLite REAL: o `POST /dashboard/create` instala → unidade → perfil fiscal
 * da empresa → perfil fiscal da UNIDADE (3b) → `activateDefault` com as duas flags. Todo caso confere a BASE, não só a
 * resposta. A prova de que a venda lança sem reiniciar (item 13) mora em `dashboardCreate.accountingReload`.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { BindingActivationService } from '@/features/accountingBinding/services/BindingActivationService';
import { FISCAL_PROFILE_UPDATED, FiscalProfileService } from '@/features/accounting/services/FiscalProfileService';
import { ApplicationFactory } from '@/lib/factory';
import logger from '@/lib/logger';

const app = makeApp();
let n = 0;
const novoUsuario = () => {
  n += 1;
  return prisma.user
    .create({ data: { name: `i4a-${n}`, username: `i4-acc-${n}`, email: `i4a-${n}@test.local`, password: 'x', role: 'USER' } })
    .then((u) => ({ id: u.id, username: u.username }));
};
const criar = (who: { id: string; username: string }, body: Record<string, unknown>) =>
  request(app).post('/api/dashboard/create').set(authHeader(who)).send({ unit: { name: 'Matriz' }, ...body });

/** Mesmo relógio do `activateDefault` (UTC) — `activateDefault.integration.test.ts`. */
const mesUtc = () => {
  const [year, month] = new Date().toISOString().slice(0, 10).split('-').map(Number);
  return { year, month };
};
const foto = async (userId: string) => ({
  bindings: await prisma.accountingBinding.count({ where: { userId } }),
  contas: await prisma.account.count({ where: { userId, deletedAt: null } }),
  periodos: await prisma.accountingPeriod.count({ where: { userId } }),
});
const PRESUMIDO = { regime: 'PRESUMIDO', icmsContribuinte: false };

describe('I4 PR-2 — POST /dashboard/create ativa a contabilidade da 1ª unidade', () => {
  beforeAll(() => {
    pushTestSchema();
  }, 120000);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it.each(['beautySalon', 'aestheticClinic'])(
    'item 10: Rápido %s + PRESUMIDO/icms "não" ⇒ 201 Active; binding Active, plano com contas e o mês UTC OPEN',
    async (suiteKey) => {
      const u = await novoUsuario();
      const r = await criar(u, { suiteKey, fiscal: PRESUMIDO });
      expect(r.status).toBe(201);
      expect(r.body.data.accounting).toEqual({ status: 'Active', sectorKey: suiteKey, bindingVersion: 1 });
      const unitId: string = r.body.data.unitId;
      expect(await prisma.accountingBinding.count({ where: { userId: u.id, unitId, status: 'Active' } })).toBe(1);
      expect(await prisma.account.count({ where: { userId: u.id, unitId, deletedAt: null } })).toBeGreaterThan(0);
      const { year, month } = mesUtc();
      const periodo = await prisma.accountingPeriod.findFirst({ where: { userId: u.id, unitId, year, month } });
      expect(periodo?.status).toBe('OPEN');
    },
    120000,
  );

  it('item 9c: PRESUMIDO + icms "não" cria 1 FiscalProfile da unidade CUMULATIVO pelo serviço (auditado)', async () => {
    const u = await novoUsuario();
    const r = await criar(u, { suiteKey: 'beautySalon', fiscal: PRESUMIDO });
    expect(r.status).toBe(201);
    const perfis = await prisma.fiscalProfile.findMany({ where: { userId: u.id } });
    expect(perfis).toHaveLength(1);
    expect(perfis[0]).toMatchObject({ unitId: r.body.data.unitId, regimeTributario: 'PRESUMIDO', icmsContribuinte: false, pisCofinsRegime: 'CUMULATIVO' });
    expect(await prisma.auditEvent.count({ where: { scopeUserId: u.id, unitId: r.body.data.unitId, eventType: FISCAL_PROFILE_UPDATED } })).toBeGreaterThanOrEqual(1); // + o do kit (contas-padrão, E-5)
  }, 120000);

  it('item 10 (caso novo): sem bloco fiscal ou NAO_SEI ⇒ 201 Draft com KIT_FISCAL_PROFILE_REQUIRED; nenhum perfil da unidade, nada contábil gravado', async () => {
    for (const extra of [{}, { fiscal: { regime: 'NAO_SEI' } }]) {
      const u = await novoUsuario();
      const r = await criar(u, { suiteKey: 'beautySalon', ...extra });
      expect(r.status).toBe(201);
      expect(r.body.data.accounting.status).toBe('Draft');
      expect(r.body.data.accounting.sectorKey).toBe('beautySalon');
      expect(r.body.data.accounting.blocking[0].code).toBe('KIT_FISCAL_PROFILE_REQUIRED');
      expect(await prisma.fiscalProfile.count({ where: { userId: u.id } })).toBe(0);
      expect(await foto(u.id)).toEqual({ bindings: 0, contas: 0, periodos: 0 });
      expect(await prisma.dynamicTable.count({ where: { userId: u.id } })).toBeGreaterThan(0);
    }
  }, 120000);

  it('item 9c (F-I4-10 a): falha no upsert do perfil da unidade ⇒ 201, tenant de pé, Draft KIT_FISCAL_PROFILE_REQUIRED', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => undefined as never);
    jest.spyOn(FiscalProfileService.prototype, 'upsert').mockRejectedValueOnce(new Error('falha injetada'));
    const u = await novoUsuario();
    const r = await criar(u, { suiteKey: 'beautySalon', fiscal: PRESUMIDO });
    expect(r.status).toBe(201);
    expect(r.body.errorCode).toBeUndefined();
    expect(r.body.data.fiscal.status).toBe('criado');
    expect(r.body.data.accounting.blocking[0].code).toBe('KIT_FISCAL_PROFILE_REQUIRED');
    expect(await prisma.fiscalProfile.count({ where: { userId: u.id } })).toBe(0);
    expect(await prisma.dynamicTable.count({ where: { userId: u.id } })).toBeGreaterThan(0);
  }, 120000);

  it('item 11: activateDefault devolve Draft ⇒ 201 com os bloqueantes dele, sem compensação', async () => {
    jest.spyOn(BindingActivationService.prototype, 'activateDefault').mockResolvedValueOnce({
      status: 'Draft',
      bindingVersion: 2,
      blocking: [{ code: 'EVENT_COVERAGE_MISSING', message: 'evento sem regra' }],
    });
    const u = await novoUsuario();
    const r = await criar(u, { suiteKey: 'beautySalon', fiscal: PRESUMIDO });
    expect(r.status).toBe(201);
    expect(r.body.data.accounting).toEqual({
      status: 'Draft',
      sectorKey: 'beautySalon',
      bindingVersion: 2,
      blocking: [{ code: 'EVENT_COVERAGE_MISSING', message: 'evento sem regra' }],
    });
    expect((await request(app).get('/api/dynamic-tables').set(authHeader(u))).body.data?.length ?? 0).toBeGreaterThan(0);
  }, 120000);

  it('item 11: activateDefault LANÇA ⇒ logger.error e 201 Draft ACCOUNTING_ACTIVATION_FAILED; tabelas, unidade e perfis ficam', async () => {
    const err = jest.spyOn(logger, 'error').mockImplementation(() => undefined as never);
    jest.spyOn(BindingActivationService.prototype, 'activateDefault').mockRejectedValueOnce(new Error('compile quebrou'));
    const u = await novoUsuario();
    const r = await criar(u, { suiteKey: 'beautySalon', fiscal: PRESUMIDO });
    expect(r.status).toBe(201);
    expect(r.body.errorCode).toBeUndefined();
    expect(r.body.data.accounting).toMatchObject({ status: 'Draft', sectorKey: 'beautySalon' });
    expect(r.body.data.accounting.blocking).toEqual([{ code: 'ACCOUNTING_ACTIVATION_FAILED', message: expect.stringContaining('compile quebrou') }]);
    expect(err).toHaveBeenCalledWith(expect.stringContaining('ativação contábil'), expect.anything());
    expect(await prisma.dynamicTable.count({ where: { userId: u.id } })).toBeGreaterThan(0);
    expect(await prisma.companyFiscalProfile.count({ where: { userId: u.id } })).toBe(1);
    expect(await prisma.fiscalProfile.count({ where: { userId: u.id } })).toBe(1);
  }, 120000);

  it('item 13: a recarga dos mappers falha depois de Active ⇒ 201 Draft ACCOUNTING_SYNC_RELOAD_FAILED, binding gravado', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => undefined as never);
    jest.spyOn(ApplicationFactory.getInstance(), 'initializeAccountingSyncFromBindings').mockRejectedValueOnce(new Error('recarga quebrou'));
    const u = await novoUsuario();
    const r = await criar(u, { suiteKey: 'beautySalon', fiscal: PRESUMIDO });
    expect(r.status).toBe(201);
    expect(r.body.data.accounting).toMatchObject({ status: 'Draft', sectorKey: 'beautySalon', bindingVersion: 1 });
    expect(r.body.data.accounting.blocking.map((b: { code: string }) => b.code)).toEqual(['ACCOUNTING_SYNC_RELOAD_FAILED']);
    expect(await prisma.accountingBinding.count({ where: { userId: u.id, status: 'Active' } })).toBe(1);
  }, 120000);

  it('item 12: Rápido crmModule ⇒ not-applicable; activateDefault não é chamado e nada contábil é gravado', async () => {
    const spy = jest.spyOn(BindingActivationService.prototype, 'activateDefault');
    const u = await novoUsuario();
    const r = await criar(u, { suiteKey: 'crmModule', fiscal: PRESUMIDO });
    expect(r.status).toBe(201);
    expect(r.body.data.accounting).toEqual({ status: 'not-applicable' });
    expect(spy).not.toHaveBeenCalled();
    expect(await foto(u.id)).toEqual({ bindings: 0, contas: 0, periodos: 0 });
  }, 120000);

  it('itens 9 e 10: Controle Total beauty_salon resolve o setor do salão ⇒ Active', async () => {
    const u = await novoUsuario();
    const r = await criar(u, { mode: 'custom', presetKey: 'beauty_salon', fiscal: PRESUMIDO });
    expect(r.status).toBe(201);
    expect(r.body.data.accounting).toEqual({ status: 'Active', sectorKey: 'beautySalon', bindingVersion: 1 });
  }, 120000);
});
