/**
 * BE-INCR-KIT-SETOR PR-2 — instalação do kit contra SQLite REAL, pelos adaptadores reais do `lib/factory.ts`
 * (plano, settings, perfil fiscal, período, compile, perfis fiscais por serviço, referencial, auditoria).
 *
 * Os kits v1 publicados são vazios (F-KB-6 → a), então os passos 2, 3, 6 e 7 só provam alguma coisa com um kit
 * que TENHA conteúdo. `TEST_KIT` deriva do kit v1 do salão e acrescenta extensão, contas-padrão, padrão fiscal
 * por serviço e referencial — injetado pelo parâmetro de teste do `getKitInstallService`, sem publicar um v2.
 */
import prisma from '@/lib/prisma';
import { pushTestSchema, resetDb } from '@test/helpers/db';
import { ApplicationFactory } from '@/lib/factory';
import type { BindingScope } from '@/features/accountingBinding/repositories/IAccountingBindingRepository';
import { SectorKitV1Schema, type SectorKitV1 } from '@/features/sectorKits/dtos/SectorKitDto';
import { BEAUTY_SALON_KIT_V1 } from '@/features/sectorKits/kits/beautySalon/kit.v1';
import { KitInstallStepFailedError } from '@/features/sectorKits/models/kitInstallTypes';
import { CANONICAL_ACCOUNTS } from '@/features/accounting/fixtures/ChartOfAccountsFixture';
import type { InstallKitInput } from '@/features/sectorKits/dtos/KitInstallationDto';

const UNIT = 'unit-kit';
const TODAY = new Date().toISOString().slice(0, 10);
const YEAR = Number(TODAY.slice(0, 4));
const MONTH = Number(TODAY.slice(5, 7));
/** Código analítico do catálogo RFB 2025 (fixture), semeado como catálogo da versão do ano corrente. */
const REF_CODE = '1.01.01.01.01';

const TEST_KIT: SectorKitV1 = SectorKitV1Schema.parse({
  ...BEAUTY_SALON_KIT_V1,
  changelog: ['kit de teste (não publicado): extensão, contas-padrão, padrão fiscal por serviço e referencial'],
  chartExtension: [
    { code: '4.3', name: 'Despesas Bancárias (kit teste)', nature: 'Expense', acceptsEntries: true },
    { code: '4.4', name: 'Despesa de IRPJ (kit teste)', nature: 'Expense', acceptsEntries: true },
    { code: '2.1.9', name: 'IRPJ a Recolher (kit teste)', nature: 'Liability', acceptsEntries: true },
  ],
  roleDefaults: {
    scopeSettings: { bankChargeExpenseAccountCode: '4.3', depreciationExpenseAccountCode: '4.3' },
    fiscalProfile: { irpjDespesaAccountCode: '4.4', irpjRecolherAccountCode: '2.1.9' },
  },
  serviceFiscalDefaults: [{ serviceRef: 'svc-corte', cTribNac: '060101', cIndOp: '030101' }],
  referential: [
    {
      regime: 'PRESUMIDO',
      mappingVersion: String(YEAR),
      entries: [{ accountCode: '4.3', referentialCode: REF_CODE, label: 'Conta referencial (teste)' }],
    },
  ],
});

let ownerId: string;
const scope = (): BindingScope => ({ ownerUserId: ownerId, actorUserId: ownerId, unitId: UNIT });
const kitService = () => ApplicationFactory.getInstance().getKitInstallService(scope(), () => [TEST_KIT]);
const input = (over: Partial<InstallKitInput> = {}): InstallKitInput => ({
  kitKey: 'beautySalon',
  ano: YEAR,
  installChartIfEmpty: true,
  openCurrentPeriodIfMissing: true,
  today: TODAY,
  ...over,
});

const where = () => ({ userId: ownerId, unitId: UNIT });
const accountId = async (code: string) => (await prisma.account.findFirst({ where: { ...where(), code, deletedAt: null } }))?.id ?? null;

/** Fotografia de tudo que os 7 passos escrevem — a idempotência compara duas. */
const foto = async () => ({
  contasVivas: await prisma.account.count({ where: { ...where(), deletedAt: null } }),
  contas: await prisma.account.count({ where: where() }),
  settings: await prisma.accountingScopeSettings.findFirst({
    where: where(),
    select: { bankChargeExpenseAccountId: true, depreciationExpenseAccountId: true, bankChargeIncomeAccountId: true },
  }),
  perfilFiscal: await prisma.fiscalProfile.findFirst({
    where: where(),
    select: { irpjDespesaAccountId: true, irpjRecolherAccountId: true, d1fConfirmado: true },
  }),
  versoesDePolitica: await prisma.accountingPolicyVersion.count({ where: where() }),
  periodos: await prisma.accountingPeriod.count({ where: where() }),
  bindings: await prisma.accountingBinding.count({ where: where() }),
  perfisDeServico: await prisma.serviceFiscalProfile.count({ where: where() }),
  referencial: await prisma.referentialMapping.count({ where: where() }),
});

const eventos = async (eventType: string) => prisma.auditEvent.findMany({ where: { scopeUserId: ownerId, eventType } });

async function seedFiscalProfile(data: Record<string, unknown> = {}) {
  await prisma.fiscalProfile.create({
    data: { ...where(), regimeTributario: 'PRESUMIDO', pisCofinsRegime: 'CUMULATIVO', d1fConfirmado: false, ...data },
  });
}

describe('KitInstallService (integração, kit com conteúdo)', () => {
  beforeAll(() => pushTestSchema(), 120000);
  afterAll(async () => prisma.$disconnect());

  beforeEach(async () => {
    await resetDb();
    ownerId = (
      await prisma.user.create({ data: { name: 'kit', username: 'kit-dono', email: 'kit@test.local', password: 'x', role: 'USER' } })
    ).id;
    await prisma.referentialAccount.create({ data: { layoutVersion: String(YEAR), code: REF_CODE, name: 'Referencial', isAnalytic: true } });
  });

  it('instala o kit com conteúdo: os 7 passos em ordem', async () => {
    await seedFiscalProfile();
    const out = await kitService().install(scope(), input());

    expect(out).toMatchObject({ status: 'INSTALLED', kit: { kitKey: 'beautySalon', kitVersion: 1, status: 'INSTALLED' }, bindingVersion: 1 });
    // 1 + 2: canônico + extensão
    for (const code of ['1.1.1', '4.3', '4.4', '2.1.9']) expect(await accountId(code)).not.toBeNull();
    // 3: contas-padrão nos campos nulos (settings criada; perfil fiscal existente, d1f NÃO confirmado pelo kit)
    const f = await foto();
    expect(f.settings).toEqual({
      bankChargeExpenseAccountId: await accountId('4.3'),
      depreciationExpenseAccountId: await accountId('4.3'),
      bankChargeIncomeAccountId: null,
    });
    expect(f.perfilFiscal).toEqual({ irpjDespesaAccountId: await accountId('4.4'), irpjRecolherAccountId: await accountId('2.1.9'), d1fConfirmado: false });
    // 4: período do mês aberto
    expect((await prisma.accountingPeriod.findFirst({ where: { ...where(), year: YEAR, month: MONTH } }))?.status).toBe('OPEN');
    // 5: binding Active
    expect(await prisma.accountingBinding.findMany({ where: where(), select: { status: true, bindingVersion: true } })).toEqual([
      { status: 'Active', bindingVersion: 1 },
    ]);
    // 6: perfil fiscal do serviço
    expect(await prisma.serviceFiscalProfile.findFirst({ where: { ...where(), serviceRef: 'svc-corte' }, select: { cTribNac: true } })).toEqual({
      cTribNac: '060101',
    });
    // 7: referencial do regime (unidade PRESUMIDO) × ano
    expect(await prisma.referentialMapping.findMany({ where: where(), select: { accountId: true, referentialCode: true, mappingVersion: true } })).toEqual([
      { accountId: await accountId('4.3'), referentialCode: REF_CODE, mappingVersion: String(YEAR) },
    ]);
    const row = await prisma.kitInstallation.findFirst({ where: where() });
    expect(row).toMatchObject({ kitKey: 'beautySalon', kitVersion: 1, status: 'INSTALLED' });
    expect(JSON.parse(row!.steps)).toEqual({ lastCompletedStep: 7, warnings: [] });
    expect(row!.installedAt).not.toBeNull();
    const [installed] = await eventos('kit.installed');
    expect(JSON.parse(installed.payload)).toEqual({ kitKey: 'beautySalon', kitVersion: '1', unitId: UNIT });
  });

  it('passo 3 só preenche campo nulo: o que o tenant já escolheu fica', async () => {
    await prisma.account.create({ data: { ...where(), code: '4.1', name: 'Despesas Operacionais', nature: 'Expense', acceptsEntries: true } });
    const escolhida = (await accountId('4.1'))!;
    await prisma.accountingScopeSettings.create({ data: { ...where(), bankChargeExpenseAccountId: escolhida, updatedById: ownerId } });
    await seedFiscalProfile({ irpjDespesaAccountId: escolhida });

    await kitService().install(scope(), input());

    const f = await foto();
    expect(f.settings?.bankChargeExpenseAccountId).toBe(escolhida); // preenchido pelo tenant: intocado
    expect(f.settings?.depreciationExpenseAccountId).toBe(await accountId('4.3')); // nulo: preenchido pelo kit
    expect(f.perfilFiscal?.irpjDespesaAccountId).toBe(escolhida);
    expect(f.perfilFiscal?.irpjRecolherAccountId).toBe(await accountId('2.1.9'));
  });

  it('passo 2 não restaura conta de extensão apagada pelo contador', async () => {
    await seedFiscalProfile();
    await prisma.account.create({
      data: { ...where(), code: '4.3', name: 'Despesas Bancárias', nature: 'Expense', acceptsEntries: true, deletedAt: new Date() },
    });

    await kitService().install(scope(), input());

    expect(await accountId('4.3')).toBeNull();
    expect(await prisma.account.count({ where: { ...where(), code: '4.3' } })).toBe(1); // a linha apagada, só ela
    expect(await accountId('4.4')).not.toBeNull(); // o resto da extensão entra
    const f = await foto();
    expect(f.settings).toBeNull(); // os dois campos do kit apontavam para 4.3: nada a preencher
    expect(f.referencial).toBe(0); // o referencial do kit era de 4.3
  });

  it('falha injetada no passo 6: FAILED, steps=5, KitInstallStepFailedError e kit.install_failed', async () => {
    await seedFiscalProfile();
    const sfp = ApplicationFactory.getInstance().getServiceFiscalProfileService();
    const spy = jest.spyOn(sfp, 'upsert').mockRejectedValueOnce(new Error('falha injetada'));
    try {
      await expect(kitService().install(scope(), input())).rejects.toMatchObject({ step: 6 });
      await expect(kitService().install(scope(), input())).resolves.toMatchObject({ status: 'INSTALLED' });
    } finally {
      spy.mockRestore();
    }
    const [failed] = await eventos('kit.install_failed');
    expect(JSON.parse(failed.payload)).toEqual({ kitKey: 'beautySalon', kitVersion: '1', step: '6' });
  });

  it('retomada: a 2ª chamada retoma do passo 6 sem duplicar efeito', async () => {
    await seedFiscalProfile();
    const sfp = ApplicationFactory.getInstance().getServiceFiscalProfileService();
    const spy = jest.spyOn(sfp, 'upsert').mockRejectedValueOnce(new Error('falha injetada'));
    try {
      const erro = await kitService().install(scope(), input()).catch((e: unknown) => e);
      expect(erro).toBeInstanceOf(KitInstallStepFailedError);
      const row = await prisma.kitInstallation.findFirst({ where: where() });
      expect(row?.status).toBe('FAILED');
      expect(JSON.parse(row!.steps)).toEqual({ lastCompletedStep: 5, warnings: [] });
      const antes = await foto();
      expect(antes.perfisDeServico).toBe(0);

      // sonda do passo 3 (contas-padrão) e do passo 1 (plano): na retomada do passo 6 eles NÃO são chamados — os
      // passos são idempotentes, então só a sonda distingue "retomou do 6" de "refez tudo"
      const settings = jest.spyOn(ApplicationFactory.getInstance().getAccountingScopeSettingsService(), 'fillNullAccounts');
      const fiscal = jest.spyOn(ApplicationFactory.getInstance().getFiscalProfileService(), 'fillNullAccounts');
      await expect(kitService().install(scope(), input())).resolves.toMatchObject({ status: 'INSTALLED', bindingVersion: 1 });
      expect(settings).not.toHaveBeenCalled();
      expect(fiscal).not.toHaveBeenCalled();
      settings.mockRestore();
      fiscal.mockRestore();

      const depois = await foto();
      // passos 1–5 NÃO rodaram de novo: nada do que eles escrevem mudou
      expect({ ...depois, perfisDeServico: 0, referencial: 0 }).toEqual({ ...antes, referencial: 0 });
      // passos 6–7 rodaram uma vez
      expect(depois.perfisDeServico).toBe(1);
      expect(depois.referencial).toBe(1);
      expect(depois.bindings).toBe(1); // o compile não rodou de novo (rodaria uma versão nova)
      expect(JSON.parse((await prisma.kitInstallation.findFirst({ where: where() }))!.steps).lastCompletedStep).toBe(7);
    } finally {
      spy.mockRestore();
    }
  });

  it('idempotência: reexecutar os 7 passos sobre o tenant instalado não duplica nada', async () => {
    await seedFiscalProfile();
    await kitService().install(scope(), input());
    const antes = await foto();
    // força a releitura de TODOS os passos (como um processo que morreu antes de gravar `steps`)
    await prisma.kitInstallation.updateMany({ where: where(), data: { status: 'FAILED', steps: '{"lastCompletedStep":0,"warnings":[]}' } });

    await expect(kitService().install(scope(), input())).resolves.toMatchObject({ status: 'INSTALLED', bindingVersion: 1 });

    expect(await foto()).toEqual(antes);
    expect(await eventos('kit.installed')).toHaveLength(2);
  });

  it('INSTALLED: nova chamada não roda passo nenhum', async () => {
    await seedFiscalProfile();
    await kitService().install(scope(), input());
    const antes = await foto();
    await expect(kitService().install(scope(), input())).resolves.toMatchObject({ status: 'INSTALLED', bindingVersion: 1 });
    expect(await foto()).toEqual(antes);
    expect(await eventos('kit.installed')).toHaveLength(1);
  });

  it('compile Draft (E-7): FAILED com steps=4 e kit.install_failed {step:5}; uma nova chamada recompila', async () => {
    await seedFiscalProfile();
    // sem abrir o período (o caminho do CLI): o dry-run do validador reprova
    const out = await kitService().install(scope(), input({ openCurrentPeriodIfMissing: false }));
    expect(out).toMatchObject({ status: 'COMPILE_DRAFT', kit: { status: 'FAILED' } });
    const row = await prisma.kitInstallation.findFirst({ where: where() });
    expect(row?.status).toBe('FAILED');
    expect(JSON.parse(row!.steps).lastCompletedStep).toBe(4);
    expect(JSON.parse((await eventos('kit.install_failed'))[0].payload)).toMatchObject({ step: '5' });

    const period = ApplicationFactory.getInstance().getPeriodService();
    const asAccounting = { ...scope(), ledgerCode: 'DEFAULT' as const, baseCurrencyCode: 'BRL' as const, timeZone: 'America/Sao_Paulo' as const };
    const p = (await period.seedYear(asAccounting, YEAR)).find((x) => x.month === MONTH)!;
    if (p.status === 'FUTURE') await period.openPeriod(asAccounting, p.id);

    await expect(kitService().install(scope(), input({ openCurrentPeriodIfMissing: false }))).resolves.toMatchObject({
      status: 'INSTALLED',
      bindingVersion: 2,
    });
  });

  it('item 12: sem regime da empresa nem da unidade ⇒ passo 7 pula com KIT_REFERENTIAL_SKIPPED_NO_REGIME', async () => {
    const semFiscal = SectorKitV1Schema.parse({ ...TEST_KIT, roleDefaults: { scopeSettings: {}, fiscalProfile: {} } });
    const out = await ApplicationFactory.getInstance()
      .getKitInstallService(scope(), () => [semFiscal])
      .install(scope(), input());
    expect(out).toMatchObject({ status: 'INSTALLED', warnings: ['KIT_REFERENTIAL_SKIPPED_NO_REGIME'] });
    expect((await foto()).referencial).toBe(0);
  });

  it('item 12: o regime da EMPRESA no ano vence o da unidade', async () => {
    // kit sem contas fiscais: o passo 3 não escreve o perfil (que recusaria unidade ≠ empresa)
    const semFiscal = SectorKitV1Schema.parse({ ...TEST_KIT, roleDefaults: { scopeSettings: {}, fiscalProfile: {} } });
    await seedFiscalProfile(); // unidade PRESUMIDO — o kit só tem referencial PRESUMIDO
    await prisma.companyFiscalProfile.create({ data: { userId: ownerId, anoCalendario: YEAR, regime: 'REAL' } });
    const out = await ApplicationFactory.getInstance()
      .getKitInstallService(scope(), () => [semFiscal])
      .install(scope(), input());
    // empresa REAL: não há bloco REAL no kit ⇒ nada a mapear, sem aviso (o PRESUMIDO da unidade é ignorado)
    expect(out).toMatchObject({ status: 'INSTALLED', warnings: [] });
    expect((await foto()).referencial).toBe(0);
  });

  it('item 12: sem perfil da unidade, o regime da empresa no ano decide o bloco do referencial', async () => {
    const semFiscal = SectorKitV1Schema.parse({ ...TEST_KIT, roleDefaults: { scopeSettings: {}, fiscalProfile: {} } });
    await prisma.companyFiscalProfile.create({ data: { userId: ownerId, anoCalendario: YEAR, regime: 'PRESUMIDO' } });
    const out = await ApplicationFactory.getInstance()
      .getKitInstallService(scope(), () => [semFiscal])
      .install(scope(), input());
    expect(out).toMatchObject({ status: 'INSTALLED', warnings: [] });
    expect((await foto()).referencial).toBe(1);
  });

  it('item 13: sem catálogo da versão ⇒ passo 7 pula com KIT_REFERENTIAL_SKIPPED_NO_CATALOG', async () => {
    await seedFiscalProfile();
    await prisma.referentialAccount.deleteMany();
    const out = await kitService().install(scope(), input());
    expect(out).toMatchObject({ status: 'INSTALLED', warnings: ['KIT_REFERENTIAL_SKIPPED_NO_CATALOG'] });
    expect((await foto()).referencial).toBe(0);
  });

  /** Contador ACTIVE na unidade (GOV-CONTADOR): settings e perfil fiscal viram parâmetro governado (PUT ⇒ 409). */
  async function contadorAtivo() {
    const contador = await prisma.user.create({ data: { name: 'ct', username: 'kit-contador', email: 'ct@test.local', password: 'x', role: 'USER' } });
    const contato = await prisma.accountingContact.create({
      data: { ...where(), name: 'Contador', email: 'c@test.local', cpf: '52998224725', crcNumber: 'SP-123456/O-3', crcUf: 'SP' },
    });
    await prisma.accountantAssignment.create({
      data: {
        ...where(), accountantUserId: contador.id, accountingContactId: contato.id, crcNumber: 'SP-123456/O-3', crcUf: 'SP',
        status: 'ACTIVE', activeSlot: 'ACTIVE', activeFrom: new Date(), createdById: ownerId,
      },
    });
  }
  async function contasDoKitVivas() {
    // plano já instalado (canônico + extensão), como numa unidade que roda o kit pela 2ª vez
    for (const a of [...CANONICAL_ACCOUNTS, ...TEST_KIT.chartExtension]) await prisma.account.create({ data: { ...where(), ...a } });
  }

  it('contador ativo e nenhum campo nulo a preencher: o passo 3 não vira parâmetro governado (achado do review)', async () => {
    await contasDoKitVivas();
    const [c43, c44, c219] = [(await accountId('4.3'))!, (await accountId('4.4'))!, (await accountId('2.1.9'))!];
    await prisma.accountingScopeSettings.create({
      data: { ...where(), bankChargeExpenseAccountId: c43, depreciationExpenseAccountId: c43, updatedById: ownerId },
    });
    await seedFiscalProfile({ irpjDespesaAccountId: c44, irpjRecolherAccountId: c219 });
    await contadorAtivo();
    const versoes = await prisma.accountingPolicyVersion.count({ where: where() });

    await expect(kitService().install(scope(), input())).resolves.toMatchObject({ status: 'INSTALLED' });
    expect(await prisma.accountingPolicyVersion.count({ where: where() })).toBe(versoes);
  });

  it('contador ativo e campo nulo a preencher: o passo 3 falha pelo gate do contador (a mudança vai por proposta)', async () => {
    await seedFiscalProfile();
    await contadorAtivo();
    await expect(kitService().install(scope(), input())).rejects.toMatchObject({ step: 3 });
    expect((await prisma.kitInstallation.findFirst({ where: where() }))?.status).toBe('FAILED');
  });

  it('um kit por unidade (item 9): outro kitKey na mesma unidade ⇒ 400, nada escrito', async () => {
    await seedFiscalProfile();
    await kitService().install(scope(), input());
    const antes = await foto();
    await expect(kitService().install(scope(), input({ kitKey: 'aestheticClinic' }))).rejects.toThrow(/um kit por unidade/);
    expect(await foto()).toEqual(antes);
  });
});
