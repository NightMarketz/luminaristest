/**
 * DepreciationService (BE-INCR-FIXED-ASSETS, nó C8, PR-3, Bloco C itens 12-17). Unit: repos/
 * serviços injetados são dublês MUTÁVEIS (o `assetState` é um objeto único atualizado em-lugar por
 * `addAccumulated`/`reconcileAccumulated`, para simular o efeito real de chamadas sequenciais de
 * `runMonth` mês a mês) — prova os falsificadores do BRIEF §8: Σ12 exato, vida útil fecha (120º mês
 * 10%, 37º mês 33,3%), idempotência (2ª chamada `posted=0`), os 4 casos de período, o predicado
 * barato [D3] de tx2 pendente, e o tie-out do `reconcile`.
 */
import { AccountingPeriodNotOpenError, ConflictError, ForbiddenError, ValidationError } from '@/lib/errors';
import { DepreciationService } from '@/features/accounting/services/DepreciationService';
import type { FixedAsset, FixedAssetClass } from 'generated/prisma';
import type { IFixedAssetRepository } from '@/features/accounting/repositories/IFixedAssetRepository';
import type { IFixedAssetClassRepository } from '@/features/accounting/repositories/IFixedAssetClassRepository';
import type { IAccountRepository } from '@/features/accounting/repositories/IAccountRepository';
import type { IJournalEntryRepository } from '@/features/accounting/repositories/IJournalEntryRepository';
import type { IPostingRepository } from '@/features/accounting/repositories/IPostingRepository';
import type { AccountingScopeSettingsService } from '@/features/accounting/services/AccountingScopeSettingsService';
import type { PostingService } from '@/features/accounting/services/PostingService';
import type { AuditService } from '@/features/accounting/services/AuditService';
import type { IAccountingPolicy } from '@/features/accounting/policies/IAccountingPolicy';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';

const scope = resolveAccountingScope({ userId: 'dono-a' }, 'unit-1');

const classRow: FixedAssetClass = {
  id: 'class-1', userId: 'dono-a', unitId: 'unit-1', code: 'MAQ', name: 'Máquinas',
  depreciable: true, costAccountId: 'acc-cost', accumulatedDepreciationAccountId: 'acc-accdep',
  createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
} as unknown as FixedAssetClass;

function makeAssetState(over: Partial<Record<string, unknown>> = {}): FixedAsset {
  return {
    id: 'asset-1', userId: 'dono-a', unitId: 'unit-1', classId: 'class-1', code: 'A-001', description: 'Torno CNC',
    ncmPrefix: null, quantity: 1,
    costCents: 100_000n, residualValueCents: 0n,
    rateId: null, annualRateBp: 1000, bookAnnualRateBp: null, bookRateJustification: null,
    openingAccumulatedCents: 0n, accumulatedDepreciationCents: 0n,
    status: 'ACTIVE', acquiredAt: new Date('2026-01-01T00:00:00Z'),
    activatedAt: new Date('2026-01-01T00:00:00Z'), disposedAt: null, disposalEntryId: null,
    sourceDocumentId: null, payableId: null, version: 1, createdById: 'dono-a',
    createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
    ...over,
  } as unknown as FixedAsset;
}

/** Monta um harness com estado MUTÁVEL de UM ativo, repos dublês e o service real. */
function makeHarness(opts: { asset?: FixedAsset; klass?: FixedAssetClass; canManage?: boolean; missingExpenseAccount?: boolean; missingAccumulatedAccount?: boolean } = {}) {
  const assetState: FixedAsset = opts.asset ?? makeAssetState();
  const postedEntries = new Map<string, { id: string }>();
  const creditsByAssetPrefix = new Map<string, number>();
  let periodError: AccountingPeriodNotOpenError | null = null;

  const findActiveDepreciable = jest.fn(async () => (assetState.status === 'ACTIVE' ? [assetState] : []));
  const findById = jest.fn(async () => assetState);
  const findManyByUnit = jest.fn(async () => [assetState]);
  const addAccumulated = jest.fn(
    async (
      _s: unknown,
      _id: string,
      delta: bigint,
      expected: { accumulatedDepreciationCents: bigint; version: number },
      nextStatus: string | undefined,
    ) => {
      if (expected.version !== assetState.version || expected.accumulatedDepreciationCents !== assetState.accumulatedDepreciationCents) {
        return null;
      }
      Object.assign(assetState, {
        accumulatedDepreciationCents: assetState.accumulatedDepreciationCents + delta,
        version: assetState.version + 1,
        ...(nextStatus ? { status: nextStatus } : {}),
      });
      return assetState;
    },
  );
  const reconcileAccumulated = jest.fn(async (_s: unknown, _id: string, value: bigint) => {
    Object.assign(assetState, { accumulatedDepreciationCents: value });
  });
  const runTransaction = jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({ tx: true }));
  const assetRepo = {
    findActiveDepreciable, findById, findManyByUnit, addAccumulated, reconcileAccumulated, runTransaction,
  } as unknown as IFixedAssetRepository;

  const classFindById = jest.fn(async () => opts.klass ?? classRow);
  const classRepo = { findById: classFindById } as unknown as IFixedAssetClassRepository;

  const accountFindById = jest.fn(async (_s: unknown, id: string) => ({ id, code: `code-${id}`, nature: 'Expense', acceptsEntries: true, deletedAt: null }));
  const accountRepo = { findById: accountFindById } as unknown as IAccountRepository;

  const findBySource = jest.fn(async (_s: unknown, _type: string, sourceId: string) => postedEntries.get(sourceId) ?? null);
  const journalEntryRepo = { findBySource } as unknown as IJournalEntryRepository;

  const sumCreditsBySourcePrefix = jest.fn(async (_s: unknown, _type: string, prefix: string) => creditsByAssetPrefix.get(prefix) ?? 0);
  const postingRepo = { sumCreditsBySourcePrefix } as unknown as IPostingRepository;

  const settingsGet = jest.fn(async () => ({
    unitId: 'unit-1',
    bankChargeExpenseAccountId: null, bankChargeIncomeAccountId: null,
    depreciationExpenseAccountId: opts.missingExpenseAccount ? null : 'acc-exp',
    disposalGainAccountId: null, disposalLossAccountId: null,
    depreciationParteBAccountId: null, updatedAt: null,
  }));
  const settingsService = { get: settingsGet } as unknown as AccountingScopeSettingsService;

  const postEntry = jest.fn(async (_s: unknown, input: { sourceId?: string; lines: Array<{ accountCode: string; debitCents: number; creditCents: number }> }) => {
    if (periodError) throw periodError;
    const entry = { id: `entry-${input.sourceId}` };
    postedEntries.set(input.sourceId!, entry);
    const creditLine = input.lines.find((l) => l.creditCents > 0)!;
    const prefix = `${input.sourceId!.split(':')[0]}:`;
    creditsByAssetPrefix.set(prefix, (creditsByAssetPrefix.get(prefix) ?? 0) + creditLine.creditCents);
    return entry;
  });
  const postingService = { postEntry } as unknown as PostingService;

  const auditAppend = jest.fn(async () => undefined);
  const auditService = { append: auditAppend } as unknown as AuditService;

  const policy = { canManageFixedAssets: () => opts.canManage ?? true } as unknown as IAccountingPolicy;

  if (opts.missingAccumulatedAccount) {
    classFindById.mockResolvedValue({ ...classRow, accumulatedDepreciationAccountId: null });
  }

  const service = new DepreciationService(assetRepo, classRepo, accountRepo, journalEntryRepo, postingRepo, settingsService, postingService, auditService, policy);

  return {
    service, assetState, postedEntries, creditsByAssetPrefix,
    findActiveDepreciable, findById, findManyByUnit, addAccumulated, reconcileAccumulated, runTransaction,
    classFindById, accountFindById, findBySource, sumCreditsBySourcePrefix, settingsGet, postEntry, auditAppend,
    setPeriodError: (err: AccountingPeriodNotOpenError | null) => { periodError = err; },
  };
}

/** Roda `count` meses consecutivos a partir de (startYear, startMonth); devolve o último resultado. */
async function runMonths(
  service: DepreciationService,
  startYear: number,
  startMonth: number,
  count: number,
) {
  let year = startYear;
  let month = startMonth;
  let last;
  for (let i = 0; i < count; i += 1) {
    const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
    last = await service.runMonth(scope, { unitId: 'unit-1', yearMonth });
    month += 1;
    if (month > 12) { month = 1; year += 1; }
  }
  return last!;
}

describe('DepreciationService.runMonth — Σ12 exato e vida útil (item 12, BRIEF §8)', () => {
  it('100.000 @ 10% a.a. → Σ12 = 10.000 exato (833/833/…/834), status continua ACTIVE', async () => {
    const { service, assetState } = makeHarness();
    await runMonths(service, 2026, 1, 12);
    expect(assetState.accumulatedDepreciationCents).toBe(10_000n);
    expect(assetState.status).toBe('ACTIVE');
  });

  it('100.000 @ 10% a.a. → mês 120 fecha em 100.000 e FULLY_DEPRECIATED; mês 121 devolve posted=0 SEM o ativo no loop', async () => {
    const { service, assetState, findActiveDepreciable } = makeHarness();
    await runMonths(service, 2026, 1, 120);
    expect(assetState.accumulatedDepreciationCents).toBe(100_000n);
    expect(assetState.status).toBe('FULLY_DEPRECIATED');

    findActiveDepreciable.mockClear();
    const result = await service.runMonth(scope, { unitId: 'unit-1', yearMonth: '2036-01' });
    expect(result).toEqual({ yearMonth: '2036-01', posted: 0, skipped: 0, failed: [] });
    const returned = await findActiveDepreciable.mock.results[0]!.value;
    expect(returned).toEqual([]); // status FULLY_DEPRECIATED — fora do filtro ACTIVE
  });

  it('100.000 @ 33,3% a.a. → mês 37 posta o resíduo (100) e fecha em 100.000 FULLY_DEPRECIATED', async () => {
    const { service, assetState, postEntry } = makeHarness({ asset: makeAssetState({ annualRateBp: 3330 }) });
    const beforeLast = await runMonths(service, 2026, 1, 36);
    expect(beforeLast.posted).toBe(1);
    const accumulatedBeforeMonth37 = assetState.accumulatedDepreciationCents;

    const last = await service.runMonth(scope, { unitId: 'unit-1', yearMonth: '2029-01' }); // mês 37
    expect(last.posted).toBe(1);
    expect(assetState.accumulatedDepreciationCents - accumulatedBeforeMonth37).toBe(100n); // resíduo
    expect(assetState.accumulatedDepreciationCents).toBe(100_000n);
    expect(assetState.status).toBe('FULLY_DEPRECIATED');

    const month37Call = postEntry.mock.calls.find(([, input]) => (input as { sourceId?: string }).sourceId === 'asset-1:2029-01');
    const quotaLine = (month37Call![1] as { lines: Array<{ debitCents: number }> }).lines.find((l) => l.debitCents > 0);
    expect(quotaLine!.debitCents).toBe(100);
  });
});

describe('DepreciationService.runMonth — idempotência (2ª chamada, memória comentario-de-teste-afirma-o-que-nao-assere)', () => {
  it('rodar o MESMO mês 2×: a 1ª posta, a 2ª é skipped=1/posted=0 (asserindo a SEGUNDA)', async () => {
    const { service, postEntry } = makeHarness();
    const first = await service.runMonth(scope, { unitId: 'unit-1', yearMonth: '2026-01' });
    expect(first.posted).toBe(1);

    const second = await service.runMonth(scope, { unitId: 'unit-1', yearMonth: '2026-01' });
    expect(second).toEqual({ yearMonth: '2026-01', posted: 0, skipped: 1, failed: [] });
    expect(postEntry).toHaveBeenCalledTimes(1); // não duplica o posting
  });
});

describe('DepreciationService.runMonth — predicado barato [D3]: tx2 pendente de um crash anterior', () => {
  it('entry já existe (tx1 feita) mas accumulated não reflete → completa SÓ a tx2, sem repostar', async () => {
    const { service, assetState, postedEntries, postEntry, addAccumulated, auditAppend } = makeHarness();
    // Simula uma chamada anterior que crashou entre tx1 (postEntry, já gravou a entry) e tx2
    // (addAccumulated, nunca rodou — accumulated continua 0).
    postedEntries.set('asset-1:2026-01', { id: 'entry-crash' });

    const result = await service.runMonth(scope, { unitId: 'unit-1', yearMonth: '2026-01' });
    expect(result).toEqual({ yearMonth: '2026-01', posted: 0, skipped: 1, failed: [] });
    expect(postEntry).not.toHaveBeenCalled(); // tx1 nunca reexecuta
    expect(addAccumulated).toHaveBeenCalledTimes(1); // tx2 completada agora
    expect(assetState.accumulatedDepreciationCents).toBe(833n);
    expect(auditAppend).toHaveBeenCalledTimes(1); // depreciation.posted — 1ª vez que a tx2 de fato roda
  });
});

describe('DepreciationService.runMonth — 4 casos de período (item 15, erro-especifico-para-skip-em-job)', () => {
  // `AccountingPeriodNotOpenError` é o MESMO erro para os 4 casos (HARD_CLOSED, SOFT_CLOSED,
  // FUTURE, inexistente) — `PostingService.assertPeriodOpen` (chamado por `postEntry`, aqui
  // simulado no dublê) já os unifica: `!period || period.status !== 'OPEN'` cobre os quatro.
  // Cada caso usa um harness NOVO (ativo ACTIVE, accumulated=0, k contado desde 2026-01-01) — os 4
  // meses ficam dentro da vida útil de 120 meses (10 % a.a.) de propósito, senão a quota do mês já
  // dá 0 por estar "além da vida" no cálculo isolado do caso, e o mock nunca chega a chamar
  // `postEntry` (o que mascararia o próprio caso de período testado).
  it.each([
    [2026, 1],
    [2026, 3],
    [2026, 7],
    [2026, 12],
  ])('período %i-%i não OPEN → failed[] com code PERIOD_NOT_OPEN, 0 postagens', async (year, month) => {
    const { service, addAccumulated, setPeriodError } = makeHarness();
    const err = new AccountingPeriodNotOpenError(year, month);
    setPeriodError(err);
    const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
    const result = await service.runMonth(scope, { unitId: 'unit-1', yearMonth });
    expect(result).toEqual({ yearMonth, posted: 0, skipped: 0, failed: [{ assetId: 'asset-1', code: 'PERIOD_NOT_OPEN', message: err.message }] });
    expect(addAccumulated).not.toHaveBeenCalled();
  });

  it('erro que NÃO é AccountingPeriodNotOpenError aborta a chamada inteira (nunca vira failed[])', async () => {
    const { service, postEntry } = makeHarness();
    postEntry.mockRejectedValueOnce(new Error('boom'));
    await expect(service.runMonth(scope, { unitId: 'unit-1', yearMonth: '2026-01' })).rejects.toThrow('boom');
  });

  it('CAS: addAccumulated devolve null (conflito de version) → ConflictError propaga e aborta (nunca vira failed[])', async () => {
    const { service, addAccumulated } = makeHarness();
    addAccumulated.mockResolvedValueOnce(null);
    await expect(service.runMonth(scope, { unitId: 'unit-1', yearMonth: '2026-01' })).rejects.toBeInstanceOf(ConflictError);
  });
});

describe('DepreciationService.runMonth — item 16: contas ausentes recusam ANTES de postar qualquer ativo', () => {
  it('sem depreciationExpenseAccountId → ValidationError, nenhum postEntry', async () => {
    const { service, postEntry } = makeHarness({ missingExpenseAccount: true });
    await expect(service.runMonth(scope, { unitId: 'unit-1', yearMonth: '2026-01' })).rejects.toBeInstanceOf(ValidationError);
    expect(postEntry).not.toHaveBeenCalled();
  });

  it('classe sem accumulatedDepreciationAccountId → ValidationError, nenhum postEntry', async () => {
    const { service, postEntry } = makeHarness({ missingAccumulatedAccount: true });
    await expect(service.runMonth(scope, { unitId: 'unit-1', yearMonth: '2026-01' })).rejects.toBeInstanceOf(ValidationError);
    expect(postEntry).not.toHaveBeenCalled();
  });
});

describe('DepreciationService.runMonth — policy', () => {
  it('nega ANTES de tocar o repo quando canManageFixedAssets=false', async () => {
    const { service, findActiveDepreciable } = makeHarness({ canManage: false });
    await expect(service.runMonth(scope, { unitId: 'unit-1', yearMonth: '2026-01' })).rejects.toBeInstanceOf(ForbiddenError);
    expect(findActiveDepreciable).not.toHaveBeenCalled();
  });
});

describe('DepreciationService.reconcile — tie-out (item 13/14, espelho de reconcileInventory)', () => {
  it('sem drift (contabilizado bate com o razão) → repaired=0', async () => {
    const { service } = makeHarness();
    const result = await service.reconcile(scope, { unitId: 'unit-1' });
    expect(result).toEqual({ checked: 1, repaired: 0, draftsCreated: 0 });
  });

  it('drift (accumulated diverge da soma do razão) → repara 1×; 2ª chamada não repara mais nada', async () => {
    const { service, assetState, reconcileAccumulated } = makeHarness();
    await service.runMonth(scope, { unitId: 'unit-1', yearMonth: '2026-01' }); // credita 833 no razão
    Object.assign(assetState, { accumulatedDepreciationCents: 0n }); // simula drift (tx2 "perdida")

    const first = await service.reconcile(scope, { unitId: 'unit-1' });
    expect(first).toEqual({ checked: 1, repaired: 1, draftsCreated: 0 });
    expect(assetState.accumulatedDepreciationCents).toBe(833n);
    expect(reconcileAccumulated).toHaveBeenCalledTimes(1);

    const second = await service.reconcile(scope, { unitId: 'unit-1' });
    expect(second).toEqual({ checked: 1, repaired: 0, draftsCreated: 0 });
    expect(reconcileAccumulated).toHaveBeenCalledTimes(1); // não repete
  });

  it('item re-drive falhando não aborta o passo (best-effort, espelho de reconcileInventory)', async () => {
    const { service, sumCreditsBySourcePrefix } = makeHarness();
    sumCreditsBySourcePrefix.mockRejectedValueOnce(new Error('db down'));
    const result = await service.reconcile(scope, { unitId: 'unit-1' });
    expect(result.checked).toBe(1);
    expect(result.repaired).toBe(0);
  });

  it('nega ANTES de tocar o repo quando canManageFixedAssets=false', async () => {
    const { service, findManyByUnit } = makeHarness({ canManage: false });
    await expect(service.reconcile(scope, { unitId: 'unit-1' })).rejects.toBeInstanceOf(ForbiddenError);
    expect(findManyByUnit).not.toHaveBeenCalled();
  });
});

describe('DepreciationService.postQuotaForDisposal — chamado pelo FixedAssetService.disposeAsset (Passo 14)', () => {
  it('classe depreciable=false (LAND) é no-op', async () => {
    const landClass = { ...classRow, id: 'class-land', depreciable: false, accumulatedDepreciationAccountId: null } as unknown as FixedAssetClass;
    const { service, postEntry } = makeHarness({ asset: makeAssetState({ classId: 'class-land' }), klass: landClass });
    await service.postQuotaForDisposal(scope, 'asset-1', '2026-01-31');
    expect(postEntry).not.toHaveBeenCalled();
  });

  it('posta a quota do mês informado (mesmo mecanismo do runMonth)', async () => {
    const { service, assetState, postEntry } = makeHarness();
    await service.postQuotaForDisposal(scope, 'asset-1', '2026-01-31');
    expect(postEntry).toHaveBeenCalledTimes(1);
    expect(assetState.accumulatedDepreciationCents).toBe(833n);
  });

  it('idempotente: chamar 2× o mesmo mês não duplica o posting', async () => {
    const { service, postEntry } = makeHarness();
    await service.postQuotaForDisposal(scope, 'asset-1', '2026-01-31');
    await service.postQuotaForDisposal(scope, 'asset-1', '2026-01-31');
    expect(postEntry).toHaveBeenCalledTimes(1);
  });
});
