/**
 * FixedAssetService (BE-INCR-FIXED-ASSETS, nó C8, Blocos B+D). Unit: repos/serviços injetados são
 * dublês; prova-se ORDEM (policy antes de dado), a matriz de status × comando, o CAS por version
 * (activate/dispose), e a baixa sequencial do PR-3 (execution-plan Passo 14 — dispose delega a
 * postagem da quota do mês de disposedAt ao DepreciationService, dublê aqui, antes do entry de
 * baixa).
 */
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';
import { FixedAssetService } from '@/features/accounting/services/FixedAssetService';
import type { IFixedAssetRepository } from '@/features/accounting/repositories/IFixedAssetRepository';
import type { IFixedAssetClassRepository } from '@/features/accounting/repositories/IFixedAssetClassRepository';
import type { IDepreciationRateRepository } from '@/features/accounting/repositories/IDepreciationRateRepository';
import type { IAccountRepository } from '@/features/accounting/repositories/IAccountRepository';
import type { IAccountingPeriodRepository } from '@/features/accounting/repositories/IAccountingPeriodRepository';
import type { AccountingScopeSettingsService } from '@/features/accounting/services/AccountingScopeSettingsService';
import type { PostingService } from '@/features/accounting/services/PostingService';
import type { DepreciationService } from '@/features/accounting/services/DepreciationService';
import type { AuditService } from '@/features/accounting/services/AuditService';
import type { IAccountingPolicy } from '@/features/accounting/policies/IAccountingPolicy';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';

const scope = resolveAccountingScope({ userId: 'dono-a' }, 'unit-1');

const classRow = {
  id: 'class-1', userId: 'dono-a', unitId: 'unit-1', code: 'MAQ', name: 'Máquinas',
  depreciable: true, costAccountId: 'acc-cost', accumulatedDepreciationAccountId: 'acc-accdep' as string | null,
  deletedAt: null as Date | null,
};

const landClassRow = { ...classRow, id: 'class-land', code: 'LAND', name: 'Terrenos', depreciable: false, accumulatedDepreciationAccountId: null };

function makeAsset(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'asset-1', userId: 'dono-a', unitId: 'unit-1', classId: 'class-1', code: 'A-001', description: 'Torno CNC',
    ncmPrefix: null, quantity: 1,
    costCents: 100_000n, residualValueCents: 0n,
    rateId: null, annualRateBp: 1000, bookAnnualRateBp: null, bookRateJustification: null,
    openingAccumulatedCents: 0n, accumulatedDepreciationCents: 0n,
    status: 'PENDING_ACTIVATION', acquiredAt: new Date('2026-01-01T00:00:00Z'),
    activatedAt: null as Date | null, disposedAt: null as Date | null, disposalEntryId: null as string | null,
    sourceDocumentId: null, payableId: null, version: 1, createdById: 'dono-a',
    ...over,
  };
}

function accountOf(id: string, code: string, opts: Partial<{ acceptsEntries: boolean; deletedAt: Date | null }> = {}) {
  return { id, code, nature: 'Asset', acceptsEntries: opts.acceptsEntries ?? true, deletedAt: opts.deletedAt ?? null };
}

function build(opts: {
  canManage?: boolean;
  asset?: ReturnType<typeof makeAsset> | null;
  klass?: typeof classRow | null;
  earliestOpen?: { year: number; month: number } | null;
  activateResult?: ReturnType<typeof makeAsset> | null;
  disposeResult?: ReturnType<typeof makeAsset> | null;
  settings?: { disposalGainAccountId?: string | null; disposalLossAccountId?: string | null };
} = {}) {
  const asset = opts.asset === undefined ? makeAsset() : opts.asset;
  const klass = opts.klass === undefined ? classRow : opts.klass;

  const create = jest.fn(async (_data: Record<string, unknown>) => makeAsset());
  const findById = jest.fn(async () => asset);
  const update = jest.fn(async () => makeAsset());
  const softDelete = jest.fn(async () => makeAsset({ deletedAt: new Date() }));
  const activate = jest.fn(async () => (opts.activateResult !== undefined ? opts.activateResult : makeAsset({ status: 'ACTIVE' })));
  const dispose = jest.fn(async () => (opts.disposeResult !== undefined ? opts.disposeResult : makeAsset({ status: 'DISPOSED' })));
  const runTransaction = jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({ tx: true }));
  const assetRepo = { create, findById, update, softDelete, activate, dispose, runTransaction } as unknown as IFixedAssetRepository;

  const classFindById = jest.fn(async () => klass);
  const classRepo = { findById: classFindById } as unknown as IFixedAssetClassRepository;

  const rateFindById = jest.fn(async () => ({ id: 'rate-1', annualRateBp: 1000 }));
  const rateRepo = { findById: rateFindById } as unknown as IDepreciationRateRepository;

  const accountFindById = jest.fn(async (_s: unknown, id: string) => accountOf(id, `code-${id}`));
  const accountRepo = { findById: accountFindById } as unknown as IAccountRepository;

  const findEarliestOpenOrSoftClosed = jest.fn(async () => opts.earliestOpen ?? null);
  const periodRepo = { findEarliestOpenOrSoftClosed } as unknown as IAccountingPeriodRepository;

  const settingsGet = jest.fn(async () => ({
    unitId: 'unit-1',
    bankChargeExpenseAccountId: null, bankChargeIncomeAccountId: null,
    depreciationExpenseAccountId: null,
    disposalGainAccountId: opts.settings && 'disposalGainAccountId' in opts.settings ? opts.settings.disposalGainAccountId : 'acc-gain',
    disposalLossAccountId: opts.settings && 'disposalLossAccountId' in opts.settings ? opts.settings.disposalLossAccountId : 'acc-loss',
    depreciationParteBAccountId: null,
    updatedAt: null,
  }));
  const settingsService = { get: settingsGet } as unknown as AccountingScopeSettingsService;

  const postEntry = jest.fn(async (_s: unknown, input: { sourceId?: string; lines: Array<{ accountCode: string; debitCents: number; creditCents: number }> }) => ({ id: `entry-${input.sourceId}` }));
  const postingService = { postEntry } as unknown as PostingService;

  const postQuotaForDisposal = jest.fn(async () => undefined);
  const depreciationService = { postQuotaForDisposal } as unknown as DepreciationService;

  const auditAppend = jest.fn(async () => undefined);
  const auditService = { append: auditAppend } as unknown as AuditService;

  const policy = { canRead: () => true, canManageFixedAssets: () => opts.canManage ?? true } as unknown as IAccountingPolicy;

  return {
    service: new FixedAssetService(assetRepo, classRepo, rateRepo, accountRepo, periodRepo, settingsService, postingService, depreciationService, auditService, policy),
    create, findById, update, softDelete, activate, dispose, runTransaction,
    classFindById, rateFindById, accountFindById, findEarliestOpenOrSoftClosed, settingsGet, postEntry, postQuotaForDisposal, auditAppend,
  };
}

describe('FixedAssetService.createAsset', () => {
  it('nega ANTES de tocar o repo quando canManageFixedAssets=false', async () => {
    const { service, create } = build({ canManage: false });
    await expect(
      service.createAsset(scope, { unitId: 'unit-1', classId: 'class-1', code: 'A-1', description: 'x', quantity: 1, costCents: 1000, residualValueCents: 0, acquiredAt: '2026-01-01', annualRateBp: 1000 }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(create).not.toHaveBeenCalled();
  });

  it('classe inexistente é NotFoundError', async () => {
    const { service } = build({ klass: null });
    await expect(
      service.createAsset(scope, { unitId: 'unit-1', classId: 'class-x', code: 'A-1', description: 'x', quantity: 1, costCents: 1000, residualValueCents: 0, acquiredAt: '2026-01-01', annualRateBp: 1000 }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rateId resolve annualRateBp da taxa (snapshot)', async () => {
    const { service, create, rateFindById } = build();
    await service.createAsset(scope, { unitId: 'unit-1', classId: 'class-1', code: 'A-1', description: 'x', quantity: 1, costCents: 1000, residualValueCents: 0, acquiredAt: '2026-01-01', rateId: 'rate-1' });
    expect(rateFindById).toHaveBeenCalled();
    const [data] = create.mock.calls[0] as [{ annualRateBp: number; rateId: string | null }];
    expect(data.annualRateBp).toBe(1000);
    expect(data.rateId).toBe('rate-1');
  });
});

describe('FixedAssetService.updateAsset — só PENDING_ACTIVATION', () => {
  it('ativo ACTIVE não pode ser editado', async () => {
    const { service } = build({ asset: makeAsset({ status: 'ACTIVE' }) });
    await expect(service.updateAsset(scope, 'asset-1', { unitId: 'unit-1', assetId: 'asset-1', description: 'novo' })).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('FixedAssetService.deleteAsset — item 8', () => {
  it('DISPOSED não pode ser removido', async () => {
    const { service } = build({ asset: makeAsset({ status: 'DISPOSED' }) });
    await expect(service.deleteAsset(scope, 'asset-1')).rejects.toBeInstanceOf(ValidationError);
  });

  it('ACTIVE com quota já postada não pode ser removido', async () => {
    const { service } = build({ asset: makeAsset({ status: 'ACTIVE', accumulatedDepreciationCents: 100n }) });
    await expect(service.deleteAsset(scope, 'asset-1')).rejects.toBeInstanceOf(ValidationError);
  });

  it('PENDING_ACTIVATION sem quota pode ser removido', async () => {
    const { service, softDelete } = build({ asset: makeAsset({ status: 'PENDING_ACTIVATION' }) });
    await service.deleteAsset(scope, 'asset-1');
    expect(softDelete).toHaveBeenCalled();
  });
});

describe('FixedAssetService.activateAsset — item 9', () => {
  it('status diferente de PENDING_ACTIVATION → 400', async () => {
    const { service } = build({ asset: makeAsset({ status: 'ACTIVE' }) });
    await expect(
      service.activateAsset(scope, 'asset-1', { unitId: 'unit-1', assetId: 'asset-1', activatedAt: '2026-01-01', version: 1 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('activatedAt anterior ao 1º período OPEN/SOFT_CLOSED SEM openingAccumulatedCents → 400 nomeado', async () => {
    const { service } = build({ earliestOpen: { year: 2026, month: 6 } });
    await expect(
      service.activateAsset(scope, 'asset-1', { unitId: 'unit-1', assetId: 'asset-1', activatedAt: '2026-01-01', version: 1 }),
    ).rejects.toThrow(/openingAccumulatedCents/);
  });

  it('activatedAt retroativo COM openingAccumulatedCents passa', async () => {
    const { service, activate } = build({ earliestOpen: { year: 2026, month: 6 } });
    await service.activateAsset(scope, 'asset-1', { unitId: 'unit-1', assetId: 'asset-1', activatedAt: '2026-01-01', openingAccumulatedCents: 500, version: 1 });
    expect(activate).toHaveBeenCalled();
  });

  it('activatedAt dentro do histórico (sem 1º período OPEN/SOFT_CLOSED cadastrado) não exige opening', async () => {
    const { service, activate } = build({ earliestOpen: null });
    await service.activateAsset(scope, 'asset-1', { unitId: 'unit-1', assetId: 'asset-1', activatedAt: '2026-01-01', version: 1 });
    expect(activate).toHaveBeenCalled();
  });

  it('classe depreciable=false (LAND) ativa normalmente, sem exigência de quota', async () => {
    const { service, activate } = build({ klass: landClassRow, asset: makeAsset({ classId: 'class-land' }) });
    await service.activateAsset(scope, 'asset-1', { unitId: 'unit-1', assetId: 'asset-1', activatedAt: '2026-01-01', version: 1 });
    expect(activate).toHaveBeenCalled();
  });

  it('CAS: version divergente (repo devolve null) → ConflictError', async () => {
    const { service } = build({ activateResult: null });
    await expect(
      service.activateAsset(scope, 'asset-1', { unitId: 'unit-1', assetId: 'asset-1', activatedAt: '2026-01-01', version: 1 }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

describe('FixedAssetService.disposeAsset — item 18 (3 casos: >, =, <) + baixa sequencial (Passo 14, PR-3)', () => {
  const activeAsset = (accumulated: bigint) =>
    makeAsset({ status: 'ACTIVE', activatedAt: new Date('2026-01-01T00:00:00Z'), accumulatedDepreciationCents: accumulated, annualRateBp: 1000, costCents: 100_000n });

  it('status diferente de ACTIVE → 400', async () => {
    const { service } = build({ asset: makeAsset({ status: 'PENDING_ACTIVATION' }) });
    await expect(
      service.disposeAsset(scope, 'asset-1', { unitId: 'unit-1', assetId: 'asset-1', disposedAt: '2026-01-31', proceedsCents: 0, version: 1 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('version divergente do dto ANTES de qualquer efeito colateral → ConflictError; postQuotaForDisposal NUNCA chamado', async () => {
    const { service, postQuotaForDisposal, postEntry } = build({ asset: activeAsset(833n) });
    await expect(
      service.disposeAsset(scope, 'asset-1', { unitId: 'unit-1', assetId: 'asset-1', disposedAt: '2026-01-31', proceedsCents: 0, version: 99 }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(postQuotaForDisposal).not.toHaveBeenCalled();
    expect(postEntry).not.toHaveBeenCalled();
  });

  it('baixa sequencial: chama postQuotaForDisposal com o mês de disposedAt ANTES do entry de baixa', async () => {
    const { service, postQuotaForDisposal, postEntry } = build({ asset: activeAsset(833n) });
    await service.disposeAsset(scope, 'asset-1', { unitId: 'unit-1', assetId: 'asset-1', disposedAt: '2026-01-31', proceedsCents: 99_167, counterpartAccountId: 'acc-caixa', version: 1 });
    expect(postQuotaForDisposal).toHaveBeenCalledWith(scope, 'asset-1', '2026-01-31');
    const quotaCallOrder = postQuotaForDisposal.mock.invocationCallOrder[0];
    const entryCallOrder = postEntry.mock.invocationCallOrder[0];
    expect(quotaCallOrder).toBeLessThan(entryCallOrder);
  });

  it('classe depreciable=false (LAND) PULA a checagem de quota — acumulado 0 é aceito', async () => {
    const { service, postEntry } = build({
      klass: landClassRow,
      asset: makeAsset({ classId: 'class-land', status: 'ACTIVE', activatedAt: new Date('2026-01-01T00:00:00Z'), accumulatedDepreciationCents: 0n, costCents: 50_000n }),
    });
    await service.disposeAsset(scope, 'asset-1', { unitId: 'unit-1', assetId: 'asset-1', disposedAt: '2026-01-31', proceedsCents: 50_000, counterpartAccountId: 'acc-caixa', version: 1 });
    expect(postEntry).toHaveBeenCalled();
  });

  it('caso ">": proceeds > valor contábil líquido → GANHO, crédito na conta de ganho', async () => {
    // NBV = 100.000 - 833 = 99.167; proceeds = 100.000 → ganho de 833.
    const { service, postEntry } = build({ asset: activeAsset(833n) });
    await service.disposeAsset(scope, 'asset-1', { unitId: 'unit-1', assetId: 'asset-1', disposedAt: '2026-01-31', proceedsCents: 100_000, counterpartAccountId: 'acc-caixa', version: 1 });
    const [, input] = postEntry.mock.calls[0] as [unknown, { lines: Array<{ accountCode: string; debitCents: number; creditCents: number }> }];
    const gainLine = input.lines.find((l) => l.accountCode === 'code-acc-gain');
    expect(gainLine).toMatchObject({ creditCents: 833 });
  });

  it('caso "=": proceeds === valor contábil líquido → SEM linha de ganho/perda', async () => {
    // NBV = 100.000 - 833 = 99.167; proceeds = 99.167 → sem ganho nem perda.
    const { service, postEntry } = build({ asset: activeAsset(833n) });
    await service.disposeAsset(scope, 'asset-1', { unitId: 'unit-1', assetId: 'asset-1', disposedAt: '2026-01-31', proceedsCents: 99_167, counterpartAccountId: 'acc-caixa', version: 1 });
    const [, input] = postEntry.mock.calls[0] as [unknown, { lines: Array<{ accountCode: string }> }];
    expect(input.lines.some((l) => l.accountCode === 'code-acc-gain' || l.accountCode === 'code-acc-loss')).toBe(false);
  });

  it('caso "<": proceeds < valor contábil líquido → PERDA, débito na conta de perda', async () => {
    // NBV = 99.167; proceeds = 0 (imprestável) → perda de 99.167, sem linha de contrapartida.
    const { service, postEntry } = build({ asset: activeAsset(833n) });
    await service.disposeAsset(scope, 'asset-1', { unitId: 'unit-1', assetId: 'asset-1', disposedAt: '2026-01-31', proceedsCents: 0, version: 1 });
    const [, input] = postEntry.mock.calls[0] as [unknown, { lines: Array<{ accountCode: string; debitCents: number; creditCents: number }> }];
    const lossLine = input.lines.find((l) => l.accountCode === 'code-acc-loss');
    expect(lossLine).toMatchObject({ debitCents: 99_167 });
    expect(input.lines.some((l) => l.accountCode === 'code-acc-caixa')).toBe(false); // proceeds=0 → sem contrapartida
  });

  it('proceedsCents > 0 SEM counterpartAccountId → 400 (F-FA13 → a)', async () => {
    const { service } = build({ asset: activeAsset(833n) });
    await expect(
      service.disposeAsset(scope, 'asset-1', { unitId: 'unit-1', assetId: 'asset-1', disposedAt: '2026-01-31', proceedsCents: 100_000, version: 1 }),
    ).rejects.toThrow(/counterpartAccountId/);
  });

  it('sem disposalLossAccountId configurado e há perda → 400 nomeando a conta', async () => {
    const { service } = build({ asset: activeAsset(833n), settings: { disposalLossAccountId: null } });
    await expect(
      service.disposeAsset(scope, 'asset-1', { unitId: 'unit-1', assetId: 'asset-1', disposedAt: '2026-01-31', proceedsCents: 0, version: 1 }),
    ).rejects.toThrow(/disposalLossAccountId/);
  });

  it('CAS: version divergente (repo devolve null) → ConflictError; 1 entry só (postEntry chamado 1×)', async () => {
    const { service, postEntry } = build({ asset: activeAsset(833n), disposeResult: null });
    await expect(
      service.disposeAsset(scope, 'asset-1', { unitId: 'unit-1', assetId: 'asset-1', disposedAt: '2026-01-31', proceedsCents: 99_167, counterpartAccountId: 'acc-caixa', version: 1 }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(postEntry).toHaveBeenCalledTimes(1);
  });
});
