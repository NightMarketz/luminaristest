/**
 * BE-INCR-KIT-SETOR PR-4, item 34 — `upgradeSectorKitsCli` contra SQLite real: itera as instalações atrasadas, o
 * `--apply` sem o dry-run do mesmo deploy é recusado, o erro de uma unidade não para as outras e o código de saída
 * é ≠ 0 quando alguma falha.
 */
import prisma from '@/lib/prisma';
import { pushTestSchema, resetDb } from '@test/helpers/db';
import { ApplicationFactory } from '@/lib/factory';
import type { BindingScope } from '@/features/accountingBinding/repositories/IAccountingBindingRepository';
import { KitUpgradeService } from '@/features/sectorKits/services/KitUpgradeService';
import { KIT_REGISTRY } from '@/features/sectorKits/registry';
import { parseArgs, runUpgrade } from '@/jobs/upgradeSectorKitsCli';

const TODAY = new Date().toISOString().slice(0, 10);
const T = 90000;
let ownerId: string;

async function instalarV1(unitId: string) {
  const scope: BindingScope = { ownerUserId: ownerId, actorUserId: ownerId, unitId };
  await prisma.fiscalProfile.create({ data: { userId: ownerId, unitId, regimeTributario: 'PRESUMIDO', pisCofinsRegime: 'CUMULATIVO', d1fConfirmado: false } });
  await ApplicationFactory.getInstance()
    .getKitInstallService(scope, (k) => KIT_REGISTRY[k]?.filter((v) => v.kitVersion <= 1))
    .install(scope, { kitKey: 'beautySalon', ano: Number(TODAY.slice(0, 4)), installChartIfEmpty: true, openCurrentPeriodIfMissing: true, today: TODAY });
}
const versao = async (unitId: string) => (await prisma.kitInstallation.findFirstOrThrow({ where: { userId: ownerId, unitId } })).kitVersion;

describe('upgradeSectorKitsCli', () => {
  beforeAll(() => pushTestSchema(), 120000);
  afterAll(async () => prisma.$disconnect());
  afterEach(() => jest.restoreAllMocks());

  it('args: --deploy-id obrigatório; flag desconhecida e os dois modos juntos são recusados', () => {
    expect(parseArgs(['--deploy-id', 'd1'])).toEqual({ mode: 'DRY_RUN', deployId: 'd1', actorUserId: undefined });
    expect(parseArgs(['--apply', '--deploy-id', 'd1', '--actor-user-id', 'u'])).toEqual({ mode: 'APPLY', deployId: 'd1', actorUserId: 'u' });
    expect(() => parseArgs(['--apply'])).toThrow(/--deploy-id/);
    expect(() => parseArgs(['--deploy-id', 'd1', '--force'])).toThrow(/desconhecida/);
    expect(() => parseArgs(['--dry-run', '--apply', '--deploy-id', 'd1'])).toThrow(/OU/);
  });

  it('apply sem dry-run recusa; dry-run + apply atualiza todas; uma unidade que falha não para a outra e sai ≠ 0', async () => {
    await resetDb();
    ownerId = (await prisma.user.create({ data: { name: 'cli', username: 'cli-upg', email: 'cli-upg@test.local', password: 'x', role: 'USER' } })).id;
    for (const code of new Set(KIT_REGISTRY.beautySalon.at(-1)!.referential.flatMap((b) => b.entries.map((e) => e.referentialCode)))) {
      await prisma.referentialAccount.create({ data: { layoutVersion: '2025', code, name: code, isAnalytic: true } });
    }
    await instalarV1('u-a');
    await instalarV1('u-b');
    const silencio = () => {
      jest.spyOn(console, 'log').mockImplementation(() => undefined);
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
    };

    silencio();
    expect(await runUpgrade({ mode: 'APPLY', deployId: 'd1' })).toBe(1); // sem dry-run: as duas recusadas
    expect([await versao('u-a'), await versao('u-b')]).toEqual([1, 1]);
    jest.restoreAllMocks();

    silencio();
    expect(await runUpgrade({ mode: 'DRY_RUN', deployId: 'd1' })).toBe(0);
    expect(await prisma.kitUpgradeRun.count({ where: { userId: ownerId, mode: 'DRY_RUN', deployId: 'd1' } })).toBe(2);

    // u-b falha no apply; u-a segue
    const real = KitUpgradeService.prototype.upgrade;
    jest.spyOn(KitUpgradeService.prototype, 'upgrade').mockImplementation(function (this: KitUpgradeService, scope, input) {
      if (scope.unitId === 'u-b' && input.mode === 'APPLY') return Promise.reject(new Error('falha injetada em u-b'));
      return real.call(this, scope, input);
    });
    expect(await runUpgrade({ mode: 'APPLY', deployId: 'd1' })).toBe(1);
    expect([await versao('u-a'), await versao('u-b')]).toEqual([4, 1]);
    jest.restoreAllMocks();

    silencio();
    expect(await runUpgrade({ mode: 'APPLY', deployId: 'd1' })).toBe(0); // u-b, com o dry-run do mesmo deploy
    expect([await versao('u-a'), await versao('u-b')]).toEqual([4, 4]);
    expect(await runUpgrade({ mode: 'APPLY', deployId: 'd1' })).toBe(0); // nada a fazer
  }, T);
});
