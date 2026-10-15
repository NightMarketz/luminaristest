import { ForbiddenError, ValidationError } from '../../../../lib/errors';
import { BindingSectorConflictError } from '../../models/bindingSectorConflict';
import { AccountingBindingPolicy } from '../../policies/AccountingBindingPolicy';
import type { IAccountingBindingPolicy } from '../../policies/IAccountingBindingPolicy';
import type { BindingScope, IAccountingBindingRepository } from '../../repositories/IAccountingBindingRepository';
import {
  BindingActivationService,
  type ActivationChartPort,
  type ActivationPeriodPort,
  type ActivationPeriodStatus,
} from '../BindingActivationService';
import { SALE_BINDING_V2, SALE_OPERATIONAL_SCHEMA_SNAPSHOT } from '../../fixtures/saleBinding';
import { CLINIC_BINDING_V2 } from '../../fixtures/clinicBinding';
import { KitInstallService } from '../../../sectorKits/services/KitInstallService';
import { SectorKitPolicy } from '../../../sectorKits/policies/SectorKitPolicy';
import type { IKitInstallationRepository } from '../../../sectorKits/repositories/IKitInstallationRepository';

/**
 * LAC-B — unidade do `BindingActivationService` (FE-INCR-BINDING-ACTIVATION itens 1–3 + emenda F-I3-1 a).
 * Portas e compile são dublês: aqui se prova a ORDEM e o "nada escrito quando bloqueia". O caminho
 * com banco real (chart canônico + período + compile de verdade) está em
 * `routes/__tests__/accountingBinding.activateDefault.integration.test.ts`.
 */
const scope: BindingScope = { ownerUserId: 'u1', actorUserId: 'u1', unitId: 'unit-1' };
/** Identidade da tx do dublê: o gate do PR-0 tem de ler o binding COM ela (review do #680, ressalva 1). */
const TX = { __tx: 'kit-begin' };
const TODAY = '2026-09-25';
const CHART = [{ code: '1.1.2.01', nature: 'Asset', acceptsEntries: true }];

function build(opts: {
  policy?: IAccountingBindingPolicy;
  active?: { bindingVersion: number } | null;
  chart?: typeof CHART;
  period?: ActivationPeriodStatus;
  compileStatus?: 'Active' | 'Draft';
  /** E-5: o kit vigente (v4) traz contas do perfil fiscal — sem perfil a ativação bloqueia. Padrão: perfil existe. */
  hasFiscalProfile?: boolean;
  /** LAC-B PR-0: linhas `Active` do escopo em QUALQUER setor, por chamada (a 1ª é o pré-check, a 2ª a da tx do begin).
   *  Padrão: o `active` acima, no setor do salão. */
  activeRowsByCall?: Array<Array<{ sectorKey: string }>>;
  /** LAC-B PR-0: instalação de kit já existente na unidade. */
  installation?: { kitKey: string; status: string };
  /** LAC-B PR-0: o `begin` perde a corrida do `@@unique` (P2002) para este kit. */
  beginLosesRaceTo?: string;
} = {}) {
  const findActive = jest.fn(async () => opts.active ?? null);
  const defaultRows = opts.active ? [{ sectorKey: SALE_BINDING_V2.sectorKey }] : [];
  let findManyCall = 0;
  const findMany = jest.fn(async () => opts.activeRowsByCall?.[findManyCall++] ?? defaultRows);
  const repo = { findActive, findMany } as unknown as IAccountingBindingRepository;
  const compile = jest.fn(async () => ({
    status: opts.compileStatus ?? 'Active',
    binding: { bindingVersion: 7 },
    validation: {
      ok: opts.compileStatus !== 'Draft',
      blocking: opts.compileStatus === 'Draft' ? [{ code: 'DRY_RUN_FAILED', message: 'falhou' }] : [],
      warnings: [],
    },
    coverage: { missing: opts.compileStatus === 'Draft' ? ['salon.x'] : [], orphan: [] },
  }));
  let chart = opts.chart ?? CHART;
  const chartPort: ActivationChartPort = {
    listChart: jest.fn(async () => chart),
    installCanonicalChart: jest.fn(async () => {
      chart = CHART;
    }),
  };
  const periodPort: ActivationPeriodPort = {
    status: jest.fn(async () => opts.period ?? 'OPEN'),
    seedAndOpen: jest.fn(async () => {}),
  };
  // BE-INCR-KIT-SETOR PR-2 (item 11): o activate-default delega ao KitInstallService — aqui o REAL, sobre os
  // mesmos dublês (compile, chart, período) e um repositório de instalação em memória. Kit v1 = vazio.
  let installation: { id: string; kitKey: string; kitVersion: number; status: string; steps: string } | null =
    opts.installation ? { id: 'k0', kitVersion: 1, steps: '{"lastCompletedStep":0,"warnings":[]}', ...opts.installation } : null;
  const begin = jest.fn(async (_s: BindingScope, kit: { kitKey: string; kitVersion: number }) => {
      if (opts.beginLosesRaceTo) {
        installation = { id: 'k9', kitKey: opts.beginLosesRaceTo, kitVersion: 1, status: 'INSTALLING', steps: '{"lastCompletedStep":0,"warnings":[]}' };
        throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
      }
      installation = installation
        ? { ...installation, status: 'INSTALLING' }
        : { id: 'k1', ...kit, status: 'INSTALLING', steps: '{"lastCompletedStep":0,"warnings":[]}' };
      return installation as never;
    });
  const kitRepo: IKitInstallationRepository = {
    findByScope: async () => installation as never,
    begin: begin as never,
    saveSteps: async (_s, _id, steps) => {
      installation = { ...installation!, steps: JSON.stringify(steps) };
      return installation as never;
    },
    finish: async (_s, _id, status, steps) => {
      installation = { ...installation!, status, steps: JSON.stringify(steps) };
      return installation as never;
    },
    advanceVersion: async () => 1, // PR-4 — não exercitado aqui
    findAllInstalled: async () => [],
    runTransaction: async (fn) => fn(TX as never),
  };
  const kitInstaller = new KitInstallService(
    new SectorKitPolicy(),
    kitRepo,
    repo,
    { compile } as never,
    { ...chartPort, createAccountIfAbsent: async () => 'exists' as const, findLiveAccountId: async () => null },
    periodPort,
    { hasFiscalProfile: async () => opts.hasFiscalProfile ?? true, fillNullScopeSettings: async () => [], fillNullFiscalProfile: async () => [] },
    { catalogLoaded: async () => false, mappedAccountIds: async () => new Set<string>(), batchSet: async () => {} },
    { companyRegime: async () => null, unitRegime: async () => null },
    { append: async () => {} },
  );
  const service = new BindingActivationService(
    opts.policy ?? new AccountingBindingPolicy(),
    repo,
    kitInstaller,
    chartPort,
    periodPort,
    () => TODAY,
  );
  return { service, findActive, findMany, begin, compile, chartPort, periodPort };
}

const nothingWritten = (b: ReturnType<typeof build>) => {
  expect(b.compile).not.toHaveBeenCalled();
  expect(b.chartPort.installCanonicalChart).not.toHaveBeenCalled();
  expect(b.periodPort.seedAndOpen).not.toHaveBeenCalled();
};

describe('BindingActivationService.activateDefault', () => {
  it('E-5 (mantida pelo dono, 13/10): kit vigente com contas do perfil fiscal e unidade sem perfil ⇒ Draft KIT_FISCAL_PROFILE_REQUIRED, nada escrito', async () => {
    const b = build({ hasFiscalProfile: false });
    const out = await b.service.activateDefault(scope, {});
    expect(out.status).toBe('Draft');
    expect(JSON.stringify(out)).toContain('KIT_FISCAL_PROFILE_REQUIRED');
    nothingWritten(b);
  });

  it('CONTROLE feliz: chart e período prontos ⇒ compila o binding do SALÃO (default) e devolve Active', async () => {
    const b = build();
    await expect(b.service.activateDefault(scope, {})).resolves.toEqual({
      status: 'Active',
      bindingVersion: 7,
      kit: { kitKey: 'beautySalon', kitVersion: 6, status: 'INSTALLED' }, // BE-INCR-PLANO-4-NIVEIS: a vigente é a v6
    });
    expect(b.compile).toHaveBeenCalledWith(scope, {
      sectorKey: SALE_BINDING_V2.sectorKey,
      operationalSchema: SALE_OPERATIONAL_SCHEMA_SNAPSHOT,
      chart: CHART,
      eventBindings: SALE_BINDING_V2.eventBindings,
    });
  });

  it('sectorKey explícito escolhe o binding DAQUELE setor (nunca o do salão sob outro rótulo)', async () => {
    const b = build();
    await b.service.activateDefault(scope, { sectorKey: CLINIC_BINDING_V2.sectorKey });
    expect(b.compile).toHaveBeenCalledWith(scope, expect.objectContaining({
      sectorKey: 'aestheticClinic',
      eventBindings: CLINIC_BINDING_V2.eventBindings,
    }));
  });

  it('policy nega ⇒ ForbiddenError, nada lido nem escrito (item 2)', async () => {
    const nega = { canActivateDefault: () => false } as unknown as IAccountingBindingPolicy;
    const b = build({ policy: nega });
    await expect(b.service.activateDefault(scope, {})).rejects.toThrow(ForbiddenError);
    expect(b.findActive).not.toHaveBeenCalled();
    nothingWritten(b);
  });

  it('setor sem binding padrão ⇒ ValidationError (400), nada escrito', async () => {
    const b = build();
    await expect(b.service.activateDefault(scope, { sectorKey: 'padaria' })).rejects.toThrow(ValidationError);
    nothingWritten(b);
  });

  it('idempotente: Active existente ⇒ already-active com a versão vigente, sem compilar', async () => {
    const b = build({ active: { bindingVersion: 3 } });
    await expect(b.service.activateDefault(scope, { installChartIfEmpty: true })).resolves.toEqual({
      status: 'already-active',
      bindingVersion: 3,
    });
    nothingWritten(b);
  });

  it('F-B2 (b): chart vazio SEM a flag ⇒ Draft CHART_OF_ACCOUNTS_EMPTY, sem versão, nada escrito', async () => {
    const b = build({ chart: [] });
    const r = await b.service.activateDefault(scope, {});
    expect(r.status).toBe('Draft');
    expect(r.bindingVersion).toBeUndefined();
    expect(r.blocking?.map((i) => i.code)).toEqual(['CHART_OF_ACCOUNTS_EMPTY']);
    nothingWritten(b);
  });

  it('F-B2 (a): chart vazio COM a flag ⇒ instala o plano canônico e compila com o chart relido', async () => {
    const b = build({ chart: [] });
    await expect(b.service.activateDefault(scope, { installChartIfEmpty: true })).resolves.toMatchObject({ status: 'Active' });
    expect(b.chartPort.installCanonicalChart).toHaveBeenCalledTimes(1);
    expect(b.compile).toHaveBeenCalledWith(scope, expect.objectContaining({ chart: CHART }));
  });

  it('chart NÃO vazio com a flag ⇒ não reinstala nada', async () => {
    const b = build();
    await b.service.activateDefault(scope, { installChartIfEmpty: true });
    expect(b.chartPort.installCanonicalChart).not.toHaveBeenCalled();
  });

  it.each<ActivationPeriodStatus>(['MISSING', 'FUTURE'])(
    'F-I3-1 sem flag: período %s ⇒ Draft ACCOUNTING_PERIOD_NOT_OPEN do mês do today, nada escrito',
    async (period) => {
      const b = build({ period });
      const r = await b.service.activateDefault(scope, {});
      expect(r).toEqual({
        status: 'Draft',
        blocking: [expect.objectContaining({ code: 'ACCOUNTING_PERIOD_NOT_OPEN', period: '2026-09' })],
      });
      expect(b.periodPort.status).toHaveBeenCalledWith(2026, 9);
      nothingWritten(b);
    },
  );

  it.each<ActivationPeriodStatus>(['MISSING', 'FUTURE'])(
    'F-I3-1 (a) com flag: período %s ⇒ seedAndOpen(ano, mês) ANTES do compile',
    async (period) => {
      const b = build({ period });
      await b.service.activateDefault(scope, { openCurrentPeriodIfMissing: true });
      expect(b.periodPort.seedAndOpen).toHaveBeenCalledWith(2026, 9);
      const seedOrder = (b.periodPort.seedAndOpen as jest.Mock).mock.invocationCallOrder[0];
      expect(seedOrder).toBeLessThan(b.compile.mock.invocationCallOrder[0]);
    },
  );

  it.each<ActivationPeriodStatus>(['SOFT_CLOSED', 'HARD_CLOSED'])(
    'período %s bloqueia MESMO com a flag ("if missing" não reabre período fechado)',
    async (period) => {
      const b = build({ period });
      const r = await b.service.activateDefault(scope, { openCurrentPeriodIfMissing: true });
      expect(r.blocking?.map((i) => i.code)).toEqual(['ACCOUNTING_PERIOD_NOT_OPEN']);
      nothingWritten(b);
    },
  );

  it('dois bloqueantes juntos, e flag do chart SEM a do período ⇒ nenhum efeito parcial (chart não é instalado)', async () => {
    const both = build({ chart: [], period: 'MISSING' });
    expect((await both.service.activateDefault(scope, {})).blocking?.map((i) => i.code)).toEqual([
      'CHART_OF_ACCOUNTS_EMPTY',
      'ACCOUNTING_PERIOD_NOT_OPEN',
    ]);
    nothingWritten(both);

    const partial = build({ chart: [], period: 'MISSING' });
    const r = await partial.service.activateDefault(scope, { installChartIfEmpty: true });
    expect(r.blocking?.map((i) => i.code)).toEqual(['ACCOUNTING_PERIOD_NOT_OPEN']);
    nothingWritten(partial);
  });

  describe('LAC-B PR-0 — um setor por unidade (F-BA-5 → a; D-2026-10-14-LAC-B-PR0-LACUNAS)', () => {
    const conflito = async (b: ReturnType<typeof build>, sectorKey = CLINIC_BINDING_V2.sectorKey) => {
      const err = await b.service.activateDefault(scope, { sectorKey }).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(BindingSectorConflictError);
      expect(err).toMatchObject({ statusCode: 409, errorCode: 'BINDING_SECTOR_CONFLICT' });
      return err as BindingSectorConflictError;
    };

    it('binding Active do salão (unidade legada, sem KitInstallation) + pedido da clínica ⇒ 409 com o setor ativo, nada escrito', async () => {
      const b = build({ active: { bindingVersion: 1 } });
      const err = await conflito(b);
      expect(err.message).toContain('beautySalon');
      expect(b.begin).not.toHaveBeenCalled();
      nothingWritten(b);
    });

    it.each(['INSTALLED', 'FAILED', 'INSTALLING'])('KitInstallation do salão em %s + pedido da clínica ⇒ 409, nada escrito', async (status) => {
      const b = build({ installation: { kitKey: 'beautySalon', status } });
      await conflito(b);
      expect(b.begin).not.toHaveBeenCalled();
      nothingWritten(b);
    });

    it('mesmo setor segue already-active (não é conflito)', async () => {
      const b = build({ active: { bindingVersion: 3 } });
      await expect(b.service.activateDefault(scope, { sectorKey: 'beautySalon' })).resolves.toEqual({ status: 'already-active', bindingVersion: 3 });
    });

    it('gate autoritativo: o pré-check passa, mas na tx do begin já há Active de outro setor ⇒ 409 e o begin não grava', async () => {
      const b = build({ activeRowsByCall: [[], [{ sectorKey: 'beautySalon' }]] });
      await conflito(b);
      expect(b.findMany).toHaveBeenCalledTimes(2);
      expect((b.findMany.mock.calls[1] as unknown[])[2]).toBe(TX);
      expect(b.begin).not.toHaveBeenCalled();
      nothingWritten(b);
    });

    it('corrida do @@unique: o begin toma P2002 e o vencedor é outro kit ⇒ 409 (não 500)', async () => {
      const b = build({ beginLosesRaceTo: 'beautySalon' });
      await conflito(b);
      expect(b.compile).not.toHaveBeenCalled();
    });

    it('corrida do @@unique com o MESMO kit ⇒ o P2002 sobe como veio (não é conflito de setor)', async () => {
      const b = build({ beginLosesRaceTo: 'aestheticClinic' });
      await expect(b.service.activateDefault(scope, { sectorKey: CLINIC_BINDING_V2.sectorKey })).rejects.toMatchObject({ code: 'P2002' });
    });
  });

  it('compile Draft ⇒ repassa versão + bloqueantes do validador + cobertura ausente', async () => {
    const b = build({ compileStatus: 'Draft' });
    const r = await b.service.activateDefault(scope, {});
    expect(r.status).toBe('Draft');
    expect(r.bindingVersion).toBe(7);
    expect(r.blocking?.map((i) => i.code)).toEqual(['DRY_RUN_FAILED', 'EVENT_COVERAGE_MISSING']);
  });
});
