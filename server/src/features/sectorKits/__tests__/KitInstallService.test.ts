import { ForbiddenError } from '../../../lib/errors';
import type { BindingScope } from '../../accountingBinding/repositories/IAccountingBindingRepository';
import { SectorKitV1Schema } from '../dtos/SectorKitDto';
import { BEAUTY_SALON_KIT_V1 } from '../kits/beautySalon/kit.v1';
import { KitInstallStepFailedError } from '../models/kitInstallTypes';
import type { IKitInstallationRepository } from '../repositories/IKitInstallationRepository';
import { KitInstallService } from '../services/KitInstallService';

/**
 * Unidade do `KitInstallService` (BE-INCR-KIT-SETOR PR-2): a ORDEM dos 7 passos (emenda E-1), o que cada um
 * chama, a falha por exceção (item 14) e o pré-check do perfil fiscal (E-5). Portas são dublês que registram a
 * chamada; o caminho com banco real está em `KitInstallService.integration.test.ts`.
 */
const scope: BindingScope = { ownerUserId: 'u1', actorUserId: 'u1', unitId: 'unit-1' };
const KIT = SectorKitV1Schema.parse({
  ...BEAUTY_SALON_KIT_V1,
  chartExtension: [{ code: '4.3', name: 'Despesas Bancárias', nature: 'Expense', acceptsEntries: true }],
  roleDefaults: { scopeSettings: { bankChargeExpenseAccountCode: '4.3' }, fiscalProfile: { irpjDespesaAccountCode: '4.3' } },
  serviceFiscalDefaults: [{ serviceRef: 'svc', cTribNac: '060101' }],
  referential: [{ regime: 'SIMPLES', mappingVersion: '2026', entries: [{ accountCode: '4.3', referentialCode: 'R', label: 'r' }] }],
});
const INPUT = { kitKey: 'beautySalon', ano: 2026, installChartIfEmpty: true, openCurrentPeriodIfMissing: true, today: '2026-10-08' };

function build(opts: { failOn?: string; compileStatus?: 'Active' | 'Draft'; chart?: number; canInstall?: boolean; hasFiscalProfile?: boolean } = {}) {
  const calls: string[] = [];
  const hit = async <T,>(name: string, value: T): Promise<T> => {
    calls.push(name);
    if (opts.failOn === name) throw new Error(`falha injetada em ${name}`);
    return value;
  };
  let row: { id: string; kitKey: string; kitVersion: number; status: string; steps: string } | null = null;
  const repo: IKitInstallationRepository = {
    findByScope: async () => row as never,
    begin: async (_s, kit) => {
      row = row ? { ...row, status: 'INSTALLING' } : { id: 'k1', ...kit, status: 'INSTALLING', steps: '{"lastCompletedStep":0,"warnings":[]}' };
      return row as never;
    },
    saveSteps: async (_s, _id, steps) => {
      row = { ...row!, steps: JSON.stringify(steps) };
      return row as never;
    },
    finish: async (_s, _id, status, steps) => {
      calls.push(`finish:${status}`);
      row = { ...row!, status, steps: JSON.stringify(steps) };
      return row as never;
    },
    runTransaction: async (fn) => fn({} as never),
  };
  const compile = jest.fn(async () => {
    await hit('compile', null);
    return {
      status: opts.compileStatus ?? 'Active',
      binding: { bindingVersion: 3 },
      validation: { ok: opts.compileStatus !== 'Draft', blocking: [], warnings: [] },
      coverage: { missing: [] },
    } as never;
  });
  const service = new KitInstallService(
    { canInstallKit: () => opts.canInstall ?? true },
    repo,
    { findActive: async () => null },
    { compile },
    {
      listChart: () => hit('listChart', Array.from({ length: opts.chart ?? 0 }, () => ({ code: 'x', nature: 'Asset', acceptsEntries: true }))),
      installCanonicalChart: () => hit('installCanonicalChart', undefined),
      createAccountIfAbsent: () => hit('createAccountIfAbsent', 'created' as const),
      findLiveAccountId: (code) => hit(`findLiveAccountId:${code}`, `id-${code}`),
    },
    { status: () => hit('period.status', 'MISSING' as const), seedAndOpen: () => hit('seedAndOpen', undefined) },
    {
      hasFiscalProfile: () => hit('hasFiscalProfile', opts.hasFiscalProfile ?? true),
      fillNullScopeSettings: () => hit('fillNullScopeSettings', []),
      fillNullFiscalProfile: () => hit('fillNullFiscalProfile', []),
    },
    { hasProfile: () => hit('hasProfile', false), upsert: () => hit('serviceFiscal.upsert', undefined) },
    {
      catalogLoaded: () => hit('catalogLoaded', true),
      mappedAccountIds: () => hit('mappedAccountIds', new Set<string>()),
      batchSet: () => hit('batchSet', undefined),
    },
    { companyRegime: () => hit('companyRegime', 'SIMPLES' as const), unitRegime: () => hit('unitRegime', null) },
    { append: async (_tx, _s, e) => void calls.push(`audit:${e.eventType}`) },
    () => [KIT],
  );
  return { service, calls, compile, row: () => row };
}

describe('KitInstallService.install', () => {
  it('7 passos na ordem da emenda E-1: plano, extensão, contas-padrão, PERÍODO, COMPILE, serviços, referencial', async () => {
    const b = build();
    await expect(b.service.install(scope, INPUT)).resolves.toMatchObject({ status: 'INSTALLED', bindingVersion: 3 });
    const marcos = ['installCanonicalChart', 'createAccountIfAbsent', 'fillNullScopeSettings', 'fillNullFiscalProfile', 'seedAndOpen', 'compile', 'serviceFiscal.upsert', 'batchSet', 'finish:INSTALLED', 'audit:kit.installed'];
    expect(b.calls.filter((c) => marcos.includes(c))).toEqual(marcos);
  });

  it('falha por exceção no passo 6 ⇒ KitInstallStepFailedError(6), FAILED com steps=5 e kit.install_failed', async () => {
    const b = build({ failOn: 'serviceFiscal.upsert' });
    const erro = await b.service.install(scope, INPUT).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(KitInstallStepFailedError);
    expect((erro as KitInstallStepFailedError).step).toBe(6);
    expect(b.row()).toMatchObject({ status: 'FAILED', steps: '{"lastCompletedStep":5,"warnings":[]}' });
    expect(b.calls.slice(-2)).toEqual(['finish:FAILED', 'audit:kit.install_failed']);
    expect(b.calls).not.toContain('batchSet');
  });

  it('compile Draft (E-7) ⇒ COMPILE_DRAFT, FAILED com steps=4, sem passos 6–7', async () => {
    const b = build({ compileStatus: 'Draft' });
    await expect(b.service.install(scope, INPUT)).resolves.toMatchObject({ status: 'COMPILE_DRAFT', kit: { status: 'FAILED' } });
    expect(JSON.parse(b.row()!.steps).lastCompletedStep).toBe(4);
    expect(b.calls).not.toContain('serviceFiscal.upsert');
  });

  it('o CLI (flags false) nunca instala plano nem abre período', async () => {
    const b = build({ chart: 3 });
    await b.service.install(scope, { ...INPUT, installChartIfEmpty: false, openCurrentPeriodIfMissing: false });
    expect(b.calls).not.toContain('installCanonicalChart');
    expect(b.calls).not.toContain('seedAndOpen');
  });

  it('policy nega ⇒ ForbiddenError antes de qualquer porta', async () => {
    const b = build({ canInstall: false });
    await expect(b.service.install(scope, INPUT)).rejects.toThrow(ForbiddenError);
    expect(b.calls).toEqual([]);
  });

  it('pré-check E-5: kit com contas fiscais e unidade sem perfil ⇒ KIT_FISCAL_PROFILE_REQUIRED; o v1 publicado não exige', async () => {
    expect((await build({ hasFiscalProfile: false }).service.preconditions(KIT)).map((i) => i.code)).toEqual(['KIT_FISCAL_PROFILE_REQUIRED']);
    expect(await build({ hasFiscalProfile: true }).service.preconditions(KIT)).toEqual([]);
    expect(await build({ hasFiscalProfile: false }).service.preconditions(BEAUTY_SALON_KIT_V1)).toEqual([]);
  });
});
