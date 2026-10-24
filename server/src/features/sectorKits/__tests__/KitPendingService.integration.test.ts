/**
 * BE-INCR-KIT-SETOR PR-4, item 37 (emenda E-12.3) — decidir as pendências da atualização contra SQLite REAL: aceitar
 * aplica o valor do kit por motivo; recusar mantém o do tenant; decidir de novo dá 409. Os casos que dependem do
 * registro publicado (v1 → v4) passam pela API real (supertest); os que precisam de um kit derivado usam o serviço
 * com o kit injetado.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { resetDb } from '@test/helpers/db';
import { ApplicationFactory } from '@/lib/factory';
import type { BindingScope } from '@/features/accountingBinding/repositories/IAccountingBindingRepository';
import type { SectorKitV1 } from '@/features/sectorKits/dtos/SectorKitDto';
import { BEAUTY_SALON_KIT_V1 } from '@/features/sectorKits/kits/beautySalon/kit.v1';
import { BEAUTY_SALON_KIT_V4 } from '@/features/sectorKits/kits/beautySalon/kit.v4';
import { CANONICAL_ACCOUNTS_PRE_L8 } from '@/features/accounting/fixtures/ChartOfAccountsFixture';
import { KIT_REGISTRY, latestKit } from '@/features/sectorKits/registry';
import type { KitVersionsLookup } from '@/features/sectorKits/services/KitInstallService';
import { LogEntrySchema } from '@/lib/logEvents';

const app = makeApp();
const UNIT = 'unit-pend';
const TODAY = new Date().toISOString().slice(0, 10);
const T = 60000;
const MOTIVO = 'decisão do contador sobre a atualização do kit';

let dono: { id: string; username: string };
const scope = (): BindingScope => ({ ownerUserId: dono.id, actorUserId: dono.id, unitId: UNIT });
const where = () => ({ userId: dono.id, unitId: UNIT });
const factory = () => ApplicationFactory.getInstance();
const onlyUpTo = (max: number): KitVersionsLookup => (k) => KIT_REGISTRY[k]?.filter((v) => v.kitVersion <= max);

async function preparar(perfil: Record<string, unknown> = {}) {
  await resetDb();
  dono = await prisma.user.create({ data: { name: 'pend', username: 'pend-dono', email: 'pend@test.local', password: 'x', role: 'USER' } });
  const codigos = [...new Set(BEAUTY_SALON_KIT_V4.referential.flatMap((b) => b.entries.map((e) => e.referentialCode)))];
  for (const code of [...codigos, '9.99.99.99.99']) await prisma.referentialAccount.create({ data: { layoutVersion: '2025', code, name: code, isAnalytic: true } });
  await prisma.fiscalProfile.create({ data: { ...where(), regimeTributario: 'PRESUMIDO', pisCofinsRegime: 'CUMULATIVO', d1fConfirmado: false, ...perfil } });
  // BE-INCR-PLANO-4-NIVEIS (F-L8-9 a): kit v1–v5 é do plano de 3 níveis — a unidade nasce no plano da época.
  await prisma.account.createMany({ data: CANONICAL_ACCOUNTS_PRE_L8.map((a) => ({ ...where(), ...a })) });
  await factory()
    .getKitInstallService(scope(), onlyUpTo(1))
    .install(scope(), { kitKey: 'beautySalon', ano: Number(TODAY.slice(0, 4)), installChartIfEmpty: true, openCurrentPeriodIfMissing: true, today: TODAY });
}

const atualizar = async (deployId: string, lookup?: KitVersionsLookup) => {
  // Registro preso no v4 (o catálogo semeado e as contagens são do v4; o v5 do #656 publicou depois).
  const svc = factory().getKitUpgradeService(scope(), lookup ?? onlyUpTo(4));
  await svc.upgrade(scope(), { mode: 'DRY_RUN', deployId, actor: 'deploy-cli' });
  return svc.upgrade(scope(), { mode: 'APPLY', deployId, actor: 'deploy-cli' });
};
const accountId = async (code: string) => (await prisma.account.findFirstOrThrow({ where: { ...where(), code, deletedAt: null } })).id;
const pendencia = async (itemKey: string) => prisma.kitUpgradePending.findFirstOrThrow({ where: { ...where(), itemKey } });
const activeCode = async (role: string) => {
  const row = await prisma.accountingBinding.findFirstOrThrow({ where: { ...where(), status: 'Active' } });
  const payload = JSON.parse(row.payload) as { eventBindings: Array<{ roleSlots: Array<{ role: string; accountCode: string }> }> };
  return payload.eventBindings.flatMap((eb) => eb.roleSlots).find((r) => r.role === role)!.accountCode;
};
const decidir = (id: string, acao: 'accept' | 'reject', body: Record<string, unknown> = {}) =>
  request(app).post(`/api/accounting-kit/pending/${id}/${acao}`).set(authHeader(dono)).send({ unitId: UNIT, motivo: MOTIVO, ...body });
const eventos = (eventType: string) => prisma.auditEvent.findMany({ where: { scopeUserId: dono.id, eventType }, select: { payload: true } });

function comPapel(base: SectorKitV1, kitVersion: number, role: string, code: string): SectorKitV1 {
  return {
    ...base,
    kitVersion,
    changelog: [...base.changelog, `v${kitVersion}: kit de teste`],
    binding: {
      ...base.binding,
      eventBindings: base.binding.eventBindings.map((eb) => ({ ...eb, roleSlots: eb.roleSlots.map((r) => (r.role === role ? { ...r, accountCode: code } : r)) })),
    },
  };
}

describe('KitPendingService (integração)', () => {
  beforeAll(() => pushTestSchema(), 120000);
  afterAll(async () => prisma.$disconnect());

  it('aceitar campo preenchido grava o valor do kit; decidir de novo dá 409', async () => {
    await preparar();
    await prisma.fiscalProfile.updateMany({ where: where(), data: { irpjDespesaAccountId: await accountId('4.1') } });
    await atualizar('d1');
    const p = await pendencia('roleDefault:fiscalProfile.irpjDespesaAccountCode');
    expect(p).toMatchObject({ reason: 'field_set_by_user', status: 'OPEN' });

    const list = await request(app).get('/api/accounting-kit/pending').query({ unitId: UNIT, status: 'OPEN' }).set(authHeader(dono));
    expect(list.status).toBe(200);
    expect(list.body.data.map((x: { itemKey: string }) => x.itemKey)).toEqual(['roleDefault:fiscalProfile.irpjDespesaAccountCode']);

    const curto = await decidir(p.id, 'accept', { motivo: 'curto' });
    expect(curto.status).toBe(400);

    const res = await decidir(p.id, 'accept');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'ACCEPTED', motivo: MOTIVO, decidedById: dono.id });
    expect((await prisma.fiscalProfile.findFirstOrThrow({ where: where() })).irpjDespesaAccountId).toBe(await accountId('4.5.1'));
    expect((await eventos('kit.upgrade_pending_accepted')).map((e) => JSON.parse(e.payload))).toEqual([
      { pendingId: p.id, itemKey: p.itemKey, reason: 'field_set_by_user' },
    ]);

    const de_novo = await decidir(p.id, 'reject');
    expect({ status: de_novo.status, code: de_novo.body.code }).toEqual({ status: 409, code: 'KIT_PENDING_NOT_OPEN' });
    const fora = await decidir('nao-existe', 'accept');
    expect({ status: fora.status, code: fora.body.code }).toEqual({ status: 404, code: 'KIT_PENDING_NOT_FOUND' });

    const kit = await request(app).get('/api/accounting-kit').query({ unitId: UNIT }).set(authHeader(dono));
    // A rota usa o registro publicado: a última versão é a dele, não a do registro preso no v4.
    expect(kit.body.data).toMatchObject({ kitVersion: 4, latestVersion: latestKit('beautySalon')!.kitVersion, openPendingCount: 0 });
    const semKit = await request(app).get('/api/accounting-kit').query({ unitId: 'outra' }).set(authHeader(dono));
    expect(semKit.body).toEqual({ success: true, data: null });
  }, T);

  it('ano congelado: aceitar dá 422; recusar fecha e mantém o mapeamento do tenant', async () => {
    await preparar();
    await prisma.companyFiscalProfile.create({ data: { userId: dono.id, anoCalendario: 2025, regime: 'PRESUMIDO', ecfRecibo: 'REC-2025' } });
    await atualizar('d1');
    const congeladas = await prisma.kitUpgradePending.findMany({ where: where() });
    expect(congeladas.length).toBe(23);
    expect(congeladas.every((p) => p.reason === 'referential_year_frozen')).toBe(true);
    expect(await prisma.referentialMapping.count({ where: { ...where(), mappingVersion: '2025' } })).toBe(0);

    const res = await decidir(congeladas[0].id, 'accept');
    expect({ status: res.status, code: res.body.code }).toEqual({ status: 422, code: 'KIT_PENDING_FROZEN_YEAR' });
    expect((await pendencia(congeladas[0].itemKey)).status).toBe('OPEN');
    const rej = await decidir(congeladas[0].id, 'reject');
    expect(rej.body.data.status).toBe('REJECTED');
    expect(await prisma.referentialMapping.count({ where: { ...where(), mappingVersion: '2025' } })).toBe(0);
  }, T);

  it('aceitar mapeamento diferente troca pelo código do kit', async () => {
    await preparar();
    await prisma.referentialMapping.create({
      data: { ...where(), accountId: await accountId('3.1'), referentialCode: '9.99.99.99.99', label: 'do tenant', mappingVersion: '2025' },
    });
    await atualizar('d1');
    const p = await pendencia('referential:2025:3.1');
    expect(p.reason).toBe('referential_mapped_differently');
    expect((await decidir(p.id, 'accept')).status).toBe(200);
    const kitCode = BEAUTY_SALON_KIT_V4.referential.find((b) => b.regime === 'PRESUMIDO')!.entries.find((e) => e.accountCode === '3.1')!.referentialCode;
    expect((await prisma.referentialMapping.findFirstOrThrow({ where: { ...where(), mappingVersion: '2025', accountId: await accountId('3.1') } })).referentialCode).toBe(kitCode);
  }, T);

  it('review B1: o ano congelou depois da pendência ⇒ aceitar o referencial dá 422 e não muda o mapeamento', async () => {
    await preparar();
    await prisma.referentialMapping.create({
      data: { ...where(), accountId: await accountId('3.1'), referentialCode: '9.99.99.99.99', label: 'do tenant', mappingVersion: '2025' },
    });
    await atualizar('d1'); // 2025 aberto: nasce referential_mapped_differently
    const p = await pendencia('referential:2025:3.1');
    expect(p.reason).toBe('referential_mapped_differently');
    await prisma.companyFiscalProfile.create({ data: { userId: dono.id, anoCalendario: 2025, regime: 'PRESUMIDO', ecfRecibo: 'REC-2025' } });

    const res = await decidir(p.id, 'accept');
    expect({ status: res.status, code: res.body.code }).toEqual({ status: 422, code: 'KIT_PENDING_FROZEN_YEAR' });
    expect((await prisma.referentialMapping.findFirstOrThrow({ where: { ...where(), mappingVersion: '2025', accountId: await accountId('3.1') } })).referentialCode).toBe('9.99.99.99.99');
    expect((await pendencia(p.itemKey)).status).toBe('OPEN');
  }, T);

  it('aceitar conta apagada com recompilação Draft: a conta volta a ser apagada e dá 422', async () => {
    await preparar();
    const id48 = (await prisma.account.create({ data: { ...where(), code: '4.8', name: 'CMV próprio', nature: 'Expense' } })).id;
    await prisma.account.update({ where: { id: id48 }, data: { deletedAt: new Date() } });
    const lookup: KitVersionsLookup = () => [BEAUTY_SALON_KIT_V1, comPapel(BEAUTY_SALON_KIT_V1, 2, 'custo-mercadoria-vendida', '4.8')];
    await atualizar('d1', lookup);
    const p = await pendencia('account:4.8');
    // mês fechado: o dry-run do validador reprova a recompilação
    await prisma.accountingPeriod.updateMany({ where: { ...where(), year: Number(TODAY.slice(0, 4)), month: Number(TODAY.slice(5, 7)) }, data: { status: 'SOFT_CLOSED' } });

    await expect(factory().getKitPendingService(scope(), lookup).accept(scope(), p.id, { unitId: UNIT, motivo: MOTIVO })).rejects.toMatchObject({
      errorCode: 'KIT_PENDING_COMPILE_DRAFT',
      statusCode: 422,
    });
    expect((await prisma.account.findUniqueOrThrow({ where: { id: id48 } })).deletedAt).not.toBeNull();
    expect((await pendencia('account:4.8')).status).toBe('OPEN');
  }, T);

  // ADR-OBSERVABILIDADE OBS-R8 (Fase C, item 6): o desfazer que falha não some sem rastro — vira warn — e o erro que
  // sobe continua sendo o da recompilação. Assert na linha do console parseada (o contexto entra no formatLog).
  it('aceitar conta apagada: se o desfazer falhar, registra warn e o 422 da recompilação ainda sobe', async () => {
    await preparar();
    const id48 = (await prisma.account.create({ data: { ...where(), code: '4.8', name: 'CMV próprio', nature: 'Expense' } })).id;
    await prisma.account.update({ where: { id: id48 }, data: { deletedAt: new Date() } });
    const lookup: KitVersionsLookup = () => [BEAUTY_SALON_KIT_V1, comPapel(BEAUTY_SALON_KIT_V1, 2, 'custo-mercadoria-vendida', '4.8')];
    await atualizar('d1', lookup);
    const p = await pendencia('account:4.8');
    await prisma.accountingPeriod.updateMany({ where: { ...where(), year: Number(TODAY.slice(0, 4)), month: Number(TODAY.slice(5, 7)) }, data: { status: 'SOFT_CLOSED' } });

    const svc = factory().getKitPendingService(scope(), lookup);
    jest.spyOn(svc['write'], 'deleteAccount').mockRejectedValueOnce(new Error('disk gone'));
    const out = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await expect(svc.accept(scope(), p.id, { unitId: UNIT, motivo: MOTIVO })).rejects.toMatchObject({ errorCode: 'KIT_PENDING_COMPILE_DRAFT' });
      const lines = out.mock.calls.map((c) => LogEntrySchema.parse(JSON.parse(c[0] as string)));
      expect(lines).toContainEqual(expect.objectContaining({
        level: 'warn',
        message: '[KitPendingService] undo of restoreAccount failed after recompile error',
        unitId: UNIT,
        accountCode: '4.8',
        error: expect.objectContaining({ message: 'disk gone' }),
      }));
    } finally {
      out.mockRestore();
    }
  }, T);

  it('aceitar override remove o ajuste e recompila no código do kit', async () => {
    await preparar();
    // 3.9: o 3.5 virou conta canônica no #656 (mesma troca que ele fez nos testes do PR-3)
    const id35 = (await prisma.account.create({ data: { ...where(), code: '3.9', name: 'Receita própria', nature: 'Revenue' } })).id;
    await factory().getRoleAccountOverrideService(scope(), onlyUpTo(1)).set(scope(), 'receita-serviço', { unitId: UNIT, accountId: id35, motivo: MOTIVO });
    const lookup: KitVersionsLookup = () => [BEAUTY_SALON_KIT_V1, comPapel(BEAUTY_SALON_KIT_V1, 2, 'receita-serviço', '3.3')];
    await atualizar('d1', lookup);
    expect(await activeCode('receita-serviço')).toBe('3.9'); // o ajuste (3.9) sobrevive ao upgrade

    const p = await pendencia('role:receita-serviço');
    const out = await factory().getKitPendingService(scope(), lookup).accept(scope(), p.id, { unitId: UNIT, motivo: MOTIVO });
    expect(out.status).toBe('ACCEPTED');
    expect(await prisma.roleAccountOverride.count({ where: { ...where(), deletedAt: null } })).toBe(0);
    expect(await activeCode('receita-serviço')).toBe('3.3'); // o código do kit agora instalado (v2)
  }, T);

  it('aceitar override sem ajuste vivo só fecha a pendência', async () => {
    await preparar();
    const id35 = (await prisma.account.create({ data: { ...where(), code: '3.9', name: 'Receita própria', nature: 'Revenue' } })).id;
    const lookup: KitVersionsLookup = () => [BEAUTY_SALON_KIT_V1, comPapel(BEAUTY_SALON_KIT_V1, 2, 'receita-serviço', '3.3')];
    await factory().getRoleAccountOverrideService(scope(), onlyUpTo(1)).set(scope(), 'receita-serviço', { unitId: UNIT, accountId: id35, motivo: MOTIVO });
    await atualizar('d1', lookup);
    await factory().getRoleAccountOverrideService(scope(), lookup).remove(scope(), 'receita-serviço');
    const bindings = await prisma.accountingBinding.count({ where: where() });

    const p = await pendencia('role:receita-serviço');
    await expect(factory().getKitPendingService(scope(), lookup).accept(scope(), p.id, { unitId: UNIT, motivo: MOTIVO })).resolves.toMatchObject({ status: 'ACCEPTED' });
    expect(await prisma.accountingBinding.count({ where: where() })).toBe(bindings); // nada recompilado
  }, T);

  it('aceitar conta apagada restaura e recompila; a próxima atualização aplica', async () => {
    await preparar();
    const id48 = (await prisma.account.create({ data: { ...where(), code: '4.8', name: 'CMV próprio', nature: 'Expense' } })).id;
    await prisma.account.update({ where: { id: id48 }, data: { deletedAt: new Date() } });
    const lookup: KitVersionsLookup = () => [BEAUTY_SALON_KIT_V1, comPapel(BEAUTY_SALON_KIT_V1, 2, 'custo-mercadoria-vendida', '4.8')];
    expect((await atualizar('d1', lookup)).status).toBe('FAILED');

    const p = await pendencia('account:4.8');
    await factory().getKitPendingService(scope(), lookup).accept(scope(), p.id, { unitId: UNIT, motivo: MOTIVO });
    expect(await accountId('4.8')).toBe(id48);

    expect(await atualizar('d2', lookup)).toMatchObject({ status: 'APPLIED', run: { fromVersion: 1, toVersion: 2 } });
    expect(await activeCode('custo-mercadoria-vendida')).toBe('4.8');
  }, T);

  it('aceitar conta mudada com partida renomeia (a natureza fica)', async () => {
    await preparar();
    const id = (await prisma.account.create({ data: { ...where(), code: '4.7', name: 'Nome do tenant', nature: 'Expense' } })).id;
    const run = await prisma.kitUpgradeRun.create({
      data: { ...where(), kitKey: 'beautySalon', fromVersion: 1, toVersion: 2, deployId: 'd', mode: 'APPLY', status: 'APPLIED', report: '{}', actor: 'deploy-cli' },
    });
    // a pendência como o diff a grava (o caso "com partida" do classificador está em classifyKitDiff.test.ts)
    const p = await prisma.kitUpgradePending.create({
      data: {
        ...where(), kitKey: 'beautySalon', toVersion: 2, runId: run.id, itemKey: 'account:4.7', reason: 'account_changed_in_use', status: 'OPEN',
        kitValue: JSON.stringify({ code: '4.7', name: 'Nome do kit', nature: 'Asset' }),
        tenantValue: JSON.stringify({ code: '4.7', name: 'Nome do tenant', nature: 'Expense' }),
      },
    });
    expect((await decidir(p.id, 'accept')).status).toBe(200);
    expect(await prisma.account.findUniqueOrThrow({ where: { id } })).toMatchObject({ name: 'Nome do kit', nature: 'Expense' });
  }, T);
});
