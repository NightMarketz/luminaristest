/**
 * BE-INCR-KIT-SETOR PR-4 — atualização do kit contra SQLite REAL, pelos adaptadores reais do `lib/factory.ts` (itens
 * 27–36; emenda §12). O tenant instala o v1 (o estado das unidades do backfill do PR-2) e atualiza para o vigente; os
 * cenários de forward/conflito usam kits derivados injetados pelo parâmetro de teste, sem publicar versão nova.
 *
 * Todo caso confere a BASE (contas, perfil, referencial, binding, versão instalada, pendências, auditoria).
 */
import prisma from '@/lib/prisma';
import { pushTestSchema, resetDb } from '@test/helpers/db';
import { ApplicationFactory } from '@/lib/factory';
import type { BindingScope } from '@/features/accountingBinding/repositories/IAccountingBindingRepository';
import type { SectorKitV1 } from '@/features/sectorKits/dtos/SectorKitDto';
import { BEAUTY_SALON_KIT_V1 } from '@/features/sectorKits/kits/beautySalon/kit.v1';
import { BEAUTY_SALON_KIT_V4 } from '@/features/sectorKits/kits/beautySalon/kit.v4';
import { KIT_REGISTRY } from '@/features/sectorKits/registry';
import { KitUpgradeDryRunRequiredError } from '@/features/sectorKits/models/kitUpgradeTypes';
import type { KitVersionsLookup } from '@/features/sectorKits/services/KitInstallService';

const UNIT = 'unit-upgrade';
const TODAY = new Date().toISOString().slice(0, 10);
const T = 60000; // resetDb + instalação + atualização passa de 5 s no Windows
const MOTIVO = 'decisão do contador sobre a atualização do kit';

let ownerId: string;
const scope = (): BindingScope => ({ ownerUserId: ownerId, actorUserId: ownerId, unitId: UNIT });
const where = () => ({ userId: ownerId, unitId: UNIT });
const factory = () => ApplicationFactory.getInstance();
const onlyUpTo = (max: number): KitVersionsLookup => (k) => KIT_REGISTRY[k]?.filter((v) => v.kitVersion <= max);

/** O kit com a conta de um papel trocada no binding (e a extensão dada). */
function derived(base: SectorKitV1, kitVersion: number, over: { role?: [string, string]; chartExtension?: SectorKitV1['chartExtension'] } = {}): SectorKitV1 {
  const [role, code] = over.role ?? [];
  return {
    ...base,
    kitVersion,
    changelog: [...base.changelog, `v${kitVersion}: kit de teste`],
    chartExtension: over.chartExtension ?? base.chartExtension,
    binding: {
      ...base.binding,
      eventBindings: base.binding.eventBindings.map((eb) => ({
        ...eb,
        roleSlots: eb.roleSlots.map((r) => (r.role === role ? { ...r, accountCode: code! } : r)),
      })),
    },
  };
}

async function preparar(perfil: Record<string, unknown> = {}) {
  await resetDb();
  ownerId = (await prisma.user.create({ data: { name: 'upg', username: 'upg-dono', email: 'upg@test.local', password: 'x', role: 'USER' } })).id;
  const codigos = [...new Set(BEAUTY_SALON_KIT_V4.referential.flatMap((b) => b.entries.map((e) => e.referentialCode)))];
  for (const code of codigos) await prisma.referentialAccount.create({ data: { layoutVersion: '2025', code, name: code, isAnalytic: true } });
  await prisma.fiscalProfile.create({ data: { ...where(), regimeTributario: 'PRESUMIDO', pisCofinsRegime: 'CUMULATIVO', d1fConfirmado: false, ...perfil } });
  await expect(
    factory()
      .getKitInstallService(scope(), onlyUpTo(1))
      .install(scope(), { kitKey: 'beautySalon', ano: Number(TODAY.slice(0, 4)), installChartIfEmpty: true, openCurrentPeriodIfMissing: true, today: TODAY }),
  ).resolves.toMatchObject({ status: 'INSTALLED', kit: { kitVersion: 1 } });
}

const upgrade = (mode: 'DRY_RUN' | 'APPLY', deployId: string, lookup?: KitVersionsLookup) =>
  // O registro fica preso no v4: as contagens abaixo são do conteúdo v1 → v4 (o v5 do #656 publicou depois).
  factory().getKitUpgradeService(scope(), lookup ?? onlyUpTo(4)).upgrade(scope(), { mode, deployId, actor: 'deploy-cli' });

const foto = async () => ({
  contas: await prisma.account.count({ where: { ...where(), deletedAt: null } }),
  perfil: await prisma.fiscalProfile.findFirstOrThrow({ where: where(), select: { irpjDespesaAccountId: true, pisRecolherAccountId: true } }),
  mapeamentos: await prisma.referentialMapping.count({ where: where() }),
  bindings: await prisma.accountingBinding.count({ where: where() }),
  kitVersion: (await prisma.kitInstallation.findFirstOrThrow({ where: where() })).kitVersion,
});
const eventos = (eventType: string) => prisma.auditEvent.findMany({ where: { scopeUserId: ownerId, eventType }, select: { payload: true } });
const accountId = async (code: string) => (await prisma.account.findFirstOrThrow({ where: { ...where(), code, deletedAt: null } })).id;
const activeCode = async (role: string) => {
  const row = await prisma.accountingBinding.findFirstOrThrow({ where: { ...where(), status: 'Active' } });
  const payload = JSON.parse(row.payload) as { eventBindings: Array<{ roleSlots: Array<{ role: string; accountCode: string }> }> };
  return payload.eventBindings.flatMap((eb) => eb.roleSlots).find((r) => r.role === role)!.accountCode;
};
const pendencias = () => prisma.kitUpgradePending.findMany({ where: where(), orderBy: { itemKey: 'asc' } });

describe('KitUpgradeService (integração)', () => {
  beforeAll(() => pushTestSchema(), 120000);
  afterAll(async () => prisma.$disconnect());

  it('v1 → v4: dry-run grava o plano sem escrever; apply aplica (a) e avança a versão', async () => {
    await preparar();
    const antes = await foto();

    const dry = await upgrade('DRY_RUN', 'deploy-1');
    expect(dry.status).toBe('PLANNED');
    if (dry.status === 'UP_TO_DATE') throw new Error('inesperado');
    expect(dry.run.counts).toEqual({ additive: 8 + 8 + 23, forward: 0, conflicts: 0 }); // contas, campos do perfil, referencial 2025
    expect(await foto()).toEqual(antes); // o dry-run não escreve domínio
    expect(await eventos('kit.upgrade_applied')).toEqual([]); // nem audita (item 39)

    // item 34/40: apply sem o dry-run DESTE deploy é recusado
    await expect(upgrade('APPLY', 'deploy-outro')).rejects.toBeInstanceOf(KitUpgradeDryRunRequiredError);
    expect(await foto()).toEqual(antes);

    const applied = await upgrade('APPLY', 'deploy-1');
    expect(applied).toMatchObject({ status: 'APPLIED', run: { fromVersion: 1, toVersion: 4, mode: 'APPLY' } });
    const depois = await foto();
    expect(depois.contas).toBe(antes.contas + 8);
    expect(depois.perfil).toEqual({ irpjDespesaAccountId: await accountId('4.5.1'), pisRecolherAccountId: await accountId('2.1.5') });
    expect(depois.mapeamentos).toBe(23);
    expect(depois.bindings).toBe(antes.bindings); // o binding do v4 é o do v1: nada a recompilar
    expect(depois.kitVersion).toBe(4);
    expect((await eventos('kit.upgrade_applied')).map((e) => JSON.parse(e.payload))).toEqual([
      { fromVersion: '1', toVersion: '4', additive: '39', forward: '0', conflicts: '0' },
    ]);

    const view = await factory().getKitUpgradeService(scope(), onlyUpTo(4)).view(scope());
    expect(view).toMatchObject({ kitKey: 'beautySalon', kitVersion: 4, latestVersion: 4, openPendingCount: 0, changelog: [], lastRun: { status: 'APPLIED' } });
  }, T);

  it('item 35: reexecutar o apply do mesmo deploy é no-op', async () => {
    await preparar();
    await upgrade('DRY_RUN', 'deploy-1');
    await upgrade('APPLY', 'deploy-1');
    const antes = await foto();
    await expect(upgrade('APPLY', 'deploy-1')).resolves.toEqual({ status: 'UP_TO_DATE', kitKey: 'beautySalon', kitVersion: 4 });
    expect(await foto()).toEqual(antes);
    expect(await prisma.kitUpgradeRun.count({ where: where() })).toBe(2);
  }, T);

  it('view antes de atualizar: changelog só das versões que faltam', async () => {
    await preparar();
    const view = await factory().getKitUpgradeService(scope(), onlyUpTo(4)).view(scope());
    expect(view!.changelog.map((c) => c.kitVersion)).toEqual([2, 3, 4]);
    expect(view!.changelog.every((c) => c.entries.length === 1)).toBe(true);
    expect(view!.changelog[0].entries[0]).toMatch(/^v2:/);
  }, T);

  it('item 36: o ajuste sobrevive à atualização que muda o mesmo papel e vira pendência override', async () => {
    await preparar();
    // 3.9: o 3.5 virou conta canônica no #656 (mesma troca que ele fez nos testes do PR-3)
    const id35 = (await prisma.account.create({ data: { ...where(), code: '3.9', name: 'Receita própria', nature: 'Revenue' } })).id;
    await factory()
      .getRoleAccountOverrideService(scope(), onlyUpTo(1))
      .set(scope(), 'receita-serviço', { unitId: UNIT, accountId: id35, motivo: MOTIVO });
    const v2 = derived(BEAUTY_SALON_KIT_V1, 2, { role: ['receita-serviço', '3.3'] });
    const lookup: KitVersionsLookup = () => [BEAUTY_SALON_KIT_V1, v2];

    await upgrade('DRY_RUN', 'd', lookup);
    const out = await upgrade('APPLY', 'd', lookup);
    expect(out).toMatchObject({ status: 'APPLIED', run: { counts: { conflicts: 1 } } });
    expect(await activeCode('receita-serviço')).toBe('3.5'); // a empresa segue no ajuste
    expect(await prisma.roleAccountOverride.count({ where: { ...where(), deletedAt: null } })).toBe(1);
    expect((await foto()).kitVersion).toBe(2); // a pendência não trava a versão (item 35)
    expect((await pendencias()).map((p) => ({ reason: p.reason, itemKey: p.itemKey, status: p.status }))).toEqual([
      { reason: 'override', itemKey: 'role:receita-serviço', status: 'OPEN' },
    ]);
  }, T);

  it('forward com Draft: a unidade falha, os aditivos ficam e a versão não avança', async () => {
    await preparar();
    // O alvo leva o CMV para 4.8, que o tenant criou e apagou; e traz a conta nova 4.9.
    const id48 = (await prisma.account.create({ data: { ...where(), code: '4.8', name: 'CMV próprio', nature: 'Expense' } })).id;
    await prisma.account.update({ where: { id: id48 }, data: { deletedAt: new Date() } });
    const v2 = derived(BEAUTY_SALON_KIT_V1, 2, {
      role: ['custo-mercadoria-vendida', '4.8'],
      chartExtension: [{ code: '4.9', name: 'Outra despesa (kit teste)', nature: 'Expense', acceptsEntries: true }],
    });
    const lookup: KitVersionsLookup = () => [BEAUTY_SALON_KIT_V1, v2];
    const bindingsAntes = (await foto()).bindings;

    await upgrade('DRY_RUN', 'd1', lookup);
    const out = await upgrade('APPLY', 'd1', lookup);
    expect(out.status).toBe('FAILED');
    if (out.status === 'UP_TO_DATE') throw new Error('inesperado');
    expect(out.report.results.find((r) => r.itemKey === 'binding:sale.cogs')).toMatchObject({ outcome: 'failed' });
    expect(await accountId('4.9')).toBeTruthy(); // o aditivo ficou
    expect((await foto()).kitVersion).toBe(1); // E-12.4
    expect(await activeCode('custo-mercadoria-vendida')).toBe('4.2'); // o binding Active segue o de antes
    expect((await foto()).bindings).toBe(bindingsAntes + 1); // a versão Draft do compile reprovado
    expect(await eventos('kit.upgrade_applied')).toEqual([]);
    const [p] = await pendencias();
    expect(p).toMatchObject({ reason: 'account_deleted_by_user', itemKey: 'account:4.8', status: 'OPEN' });

    // recusada, não reaparece para o mesmo toVersion numa reexecução (item 37)
    await factory().getKitPendingService(scope(), lookup).reject(scope(), p.id, { unitId: UNIT, motivo: MOTIVO });
    await upgrade('DRY_RUN', 'd2', lookup);
    expect((await upgrade('APPLY', 'd2', lookup)).status).toBe('FAILED');
    expect((await pendencias()).map((x) => x.status)).toEqual(['REJECTED']);
  }, T);

  it('E-12.2: conta da extensão que veio do kit, sem partida, é renomeada com aviso (forward)', async () => {
    await preparar();
    await upgrade('DRY_RUN', 'd1');
    await upgrade('APPLY', 'd1'); // agora no v4, com 2.1.3 como o kit criou
    const v5: SectorKitV1 = {
      ...BEAUTY_SALON_KIT_V4,
      kitVersion: 5,
      changelog: [...BEAUTY_SALON_KIT_V4.changelog, 'v5: kit de teste'],
      chartExtension: BEAUTY_SALON_KIT_V4.chartExtension.map((a) => (a.code === '2.1.3' ? { ...a, name: 'IRPJ a pagar (v5)' } : a)),
    };
    const lookup: KitVersionsLookup = (k) => [...onlyUpTo(4)(k)!, v5];
    await upgrade('DRY_RUN', 'd2', lookup);
    const out = await upgrade('APPLY', 'd2', lookup);
    expect(out).toMatchObject({ status: 'APPLIED', run: { counts: { forward: 1, conflicts: 0 } } });
    expect((await prisma.account.findFirstOrThrow({ where: { ...where(), code: '2.1.3' } })).name).toBe('IRPJ a pagar (v5)');
  }, T);
});
