/**
 * BE-INCR-GUARDA-UPGRADE-PRE-L8 (item 5 do BRIEF) — com o registro REAL (kit v6, plano de 4 níveis), o
 * `upgradeSectorKitsCli` recusa levar uma unidade do plano de 3 níveis (v1–v5) direto ao v6: a passagem é do
 * `migratePlano4NiveisCli` (F-L8-12 a). Sem a guarda, o upgrade criaria contas e binding do plano novo num plano velho.
 */
import prisma from '@/lib/prisma';
import { pushTestSchema, resetDb } from '@test/helpers/db';
import { ApplicationFactory } from '@/lib/factory';
import type { BindingScope } from '@/features/accountingBinding/repositories/IAccountingBindingRepository';
import { KIT_REGISTRY } from '@/features/sectorKits/registry';
import { KitUpgradePreL8MigrationRequiredError, ULTIMA_VERSAO_KIT_PRE_L8 } from '@/features/sectorKits/models/kitUpgradeTypes';
import { runUpgrade } from '@/jobs/upgradeSectorKitsCli';
import { CANONICAL_ACCOUNTS_PRE_L8 } from '@/features/accounting/fixtures/ChartOfAccountsFixture';

const TODAY = new Date().toISOString().slice(0, 10);
const T = 90000;
let ownerId: string;

async function instalar(unitId: string, versao: number): Promise<BindingScope> {
  const scope: BindingScope = { ownerUserId: ownerId, actorUserId: ownerId, unitId };
  await prisma.fiscalProfile.create({ data: { userId: ownerId, unitId, regimeTributario: 'PRESUMIDO', pisCofinsRegime: 'CUMULATIVO', d1fConfirmado: false } });
  await prisma.account.createMany({ data: CANONICAL_ACCOUNTS_PRE_L8.map((a) => ({ userId: ownerId, unitId, ...a })) });
  await ApplicationFactory.getInstance()
    .getKitInstallService(scope, (k) => KIT_REGISTRY[k]?.filter((v) => v.kitVersion <= versao))
    .install(scope, { kitKey: 'beautySalon', ano: Number(TODAY.slice(0, 4)), installChartIfEmpty: true, openCurrentPeriodIfMissing: true, today: TODAY });
  return scope;
}

describe('upgradeSectorKitsCli — guarda do plano de 3 níveis (pré-L8)', () => {
  beforeAll(() => pushTestSchema(), 120000);
  afterAll(async () => prisma.$disconnect());
  afterEach(() => jest.restoreAllMocks());

  it('unidade em v1 com registro até v6: dry-run e apply falham a unidade, mandam rodar o migratePlano4NiveisCli e nada é gravado', async () => {
    expect(KIT_REGISTRY.beautySalon.at(-1)!.kitVersion).toBeGreaterThan(ULTIMA_VERSAO_KIT_PRE_L8);
    await resetDb();
    ownerId = (await prisma.user.create({ data: { name: 'cli', username: 'cli-prel8', email: 'cli-prel8@test.local', password: 'x', role: 'USER' } })).id;
    await instalar('u-a', 1);
    const contasAntes = await prisma.account.count({ where: { userId: ownerId } });
    const erros: string[] = [];
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation((msg: unknown) => void erros.push(String(msg)));

    expect(await runUpgrade({ mode: 'DRY_RUN', deployId: 'd1' })).toBe(1);
    expect(await runUpgrade({ mode: 'APPLY', deployId: 'd1' })).toBe(1);

    expect(erros).toHaveLength(2);
    for (const e of erros) expect(e).toMatch(/migratePlano4NiveisCli/);
    expect((await prisma.kitInstallation.findFirstOrThrow({ where: { userId: ownerId, unitId: 'u-a' } })).kitVersion).toBe(1);
    expect(await prisma.kitUpgradeRun.count({ where: { userId: ownerId } })).toBe(0);
    expect(await prisma.account.count({ where: { userId: ownerId } })).toBe(contasAntes);
  }, T);

  it('serviço: v5 → v6 é recusado com o erro 409 próprio; v1 → v5 (registro preso no v5, o caminho da migração) segue', async () => {
    await resetDb();
    ownerId = (await prisma.user.create({ data: { name: 'svc', username: 'svc-prel8', email: 'svc-prel8@test.local', password: 'x', role: 'USER' } })).id;
    const scope = await instalar('u-b', ULTIMA_VERSAO_KIT_PRE_L8);
    const svc = ApplicationFactory.getInstance().getKitUpgradeService(scope);
    const err = await svc.upgrade(scope, { mode: 'DRY_RUN', deployId: 'd1', actor: 'deploy-cli' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(KitUpgradePreL8MigrationRequiredError);
    expect(err).toMatchObject({ statusCode: 409, errorCode: 'KIT_UPGRADE_REQUIRES_PLANO_4_NIVEIS_MIGRATION' });

    const v1 = await instalar('u-c', 1);
    const ateV5 = ApplicationFactory.getInstance().getKitUpgradeService(v1, (k) => KIT_REGISTRY[k]?.filter((v) => v.kitVersion <= ULTIMA_VERSAO_KIT_PRE_L8));
    const dry = await ateV5.upgrade(v1, { mode: 'DRY_RUN', deployId: 'd2', actor: 'deploy-cli' });
    expect(dry.status).toBe('PLANNED');
  }, T);
});
