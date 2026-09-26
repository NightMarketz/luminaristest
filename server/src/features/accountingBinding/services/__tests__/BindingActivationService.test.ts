import { ForbiddenError, ValidationError } from '../../../../lib/errors';
import { AccountingBindingPolicy } from '../../policies/AccountingBindingPolicy';
import type { IAccountingBindingPolicy } from '../../policies/IAccountingBindingPolicy';
import type { BindingScope, IAccountingBindingRepository } from '../../repositories/IAccountingBindingRepository';
import {
  BindingActivationService,
  type ActivationChartPort,
  type ActivationPeriodPort,
  type ActivationPeriodStatus,
} from '../BindingActivationService';
import { SALE_BINDING_V1, SALE_OPERATIONAL_SCHEMA_SNAPSHOT } from '../../fixtures/saleBinding';
import { CLINIC_BINDING_V1 } from '../../fixtures/clinicBinding';

/**
 * LAC-B — unidade do `BindingActivationService` (FE-INCR-BINDING-ACTIVATION itens 1–3 + emenda F-I3-1 a).
 * Portas e compile são dublês: aqui se prova a ORDEM e o "nada escrito quando bloqueia". O caminho
 * com banco real (chart canônico + período + compile de verdade) está em
 * `routes/__tests__/accountingBinding.activateDefault.integration.test.ts`.
 */
const scope: BindingScope = { ownerUserId: 'u1', actorUserId: 'u1', unitId: 'unit-1' };
const TODAY = '2026-09-25';
const CHART = [{ code: '1.1.2', nature: 'Asset', acceptsEntries: true }];

function build(opts: {
  policy?: IAccountingBindingPolicy;
  active?: { bindingVersion: number } | null;
  chart?: typeof CHART;
  period?: ActivationPeriodStatus;
  compileStatus?: 'Active' | 'Draft';
} = {}) {
  const findActive = jest.fn(async () => opts.active ?? null);
  const repo = { findActive } as unknown as IAccountingBindingRepository;
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
  const service = new BindingActivationService(
    opts.policy ?? new AccountingBindingPolicy(),
    repo,
    { compile } as never,
    chartPort,
    periodPort,
    () => TODAY,
  );
  return { service, findActive, compile, chartPort, periodPort };
}

const nothingWritten = (b: ReturnType<typeof build>) => {
  expect(b.compile).not.toHaveBeenCalled();
  expect(b.chartPort.installCanonicalChart).not.toHaveBeenCalled();
  expect(b.periodPort.seedAndOpen).not.toHaveBeenCalled();
};

describe('BindingActivationService.activateDefault', () => {
  it('CONTROLE feliz: chart e período prontos ⇒ compila o binding do SALÃO (default) e devolve Active', async () => {
    const b = build();
    await expect(b.service.activateDefault(scope, {})).resolves.toEqual({ status: 'Active', bindingVersion: 7 });
    expect(b.compile).toHaveBeenCalledWith(scope, {
      sectorKey: SALE_BINDING_V1.sectorKey,
      operationalSchema: SALE_OPERATIONAL_SCHEMA_SNAPSHOT,
      chart: CHART,
      eventBindings: SALE_BINDING_V1.eventBindings,
    });
  });

  it('sectorKey explícito escolhe o binding DAQUELE setor (nunca o do salão sob outro rótulo)', async () => {
    const b = build();
    await b.service.activateDefault(scope, { sectorKey: CLINIC_BINDING_V1.sectorKey });
    expect(b.compile).toHaveBeenCalledWith(scope, expect.objectContaining({
      sectorKey: 'aestheticClinic',
      eventBindings: CLINIC_BINDING_V1.eventBindings,
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

  it('compile Draft ⇒ repassa versão + bloqueantes do validador + cobertura ausente', async () => {
    const b = build({ compileStatus: 'Draft' });
    const r = await b.service.activateDefault(scope, {});
    expect(r.status).toBe('Draft');
    expect(r.bindingVersion).toBe(7);
    expect(r.blocking?.map((i) => i.code)).toEqual(['DRY_RUN_FAILED', 'EVENT_COVERAGE_MISSING']);
  });
});
