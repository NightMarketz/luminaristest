/**
 * DepreciationRateService (BE-INCR-FIXED-ASSETS, nó C8, Bloco A). Unit: repo/seed/audit são
 * dublês; prova-se ORDEM (policy antes de dado), o gatilho lazy do seed em toda leitura, a
 * tradução cross-tenant → NotFound (D11), e o conteúdo do payload de auditoria.
 */
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import { DepreciationRateService } from '@/features/accounting/services/DepreciationRateService';
import type { DepreciationRateSeedService } from '@/features/accounting/services/DepreciationRateSeedService';
import type {
  CreateDepreciationRateData,
  IDepreciationRateRepository,
} from '@/features/accounting/repositories/IDepreciationRateRepository';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';
import type { IAccountingPolicy } from '@/features/accounting/policies/IAccountingPolicy';
import type { AuditService } from '@/features/accounting/services/AuditService';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';
import { DEPRECIATION_RATE_CREATED, DEPRECIATION_RATE_HIDDEN } from '@/features/accounting/models/FixedAsset.model';

const scope = resolveAccountingScope({ userId: 'dono-a' }, 'unit-1');

const rateRow = {
  id: 'rate-1',
  userId: 'dono-a',
  unitId: 'unit-1',
  ncm: null as string | null,
  sourceRow: null as number | null,
  description: 'Torno CNC',
  lifeYears: 10,
  annualRateBp: 1000,
  source: 'CUSTOM',
  sourceUrl: null as string | null,
  sourceSha256: null as string | null,
  justification: 'Laudo técnico do fornecedor',
  hiddenAt: null as Date | null,
  createdById: 'dono-a',
  createdAt: new Date('2026-09-18T12:00:00Z'),
};

function build(opts: { canRead?: boolean; canManage?: boolean; found?: typeof rateRow | null } = {}) {
  const auditAppend = jest.fn(async (_tx: unknown, _scope: AccountingScope, _input: { eventType: string; targetId: string; payload: Record<string, unknown> }) => undefined);
  const create = jest.fn(async (_data: CreateDepreciationRateData, _tx?: unknown) => rateRow);
  const findById = jest.fn(async () => (opts.found === undefined ? rateRow : opts.found));
  const findManyByUnit = jest.fn(async () => [rateRow]);
  const hide = jest.fn(async (_scope: AccountingScope, _id: string, _tx?: unknown) => ({ ...rateRow, hiddenAt: new Date() }));
  const runTransaction = jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({ tx: true }));
  const seed = jest.fn(async () => undefined);

  const repo = { create, findById, findManyByUnit, hide, runTransaction } as unknown as IDepreciationRateRepository;
  const seedService = { seed } as unknown as DepreciationRateSeedService;
  const policy = {
    canRead: () => opts.canRead ?? true,
    canManageFixedAssets: () => opts.canManage ?? true,
  } as unknown as IAccountingPolicy;
  const auditService = { append: auditAppend } as unknown as AuditService;

  return {
    service: new DepreciationRateService(repo, seedService, auditService, policy),
    create, findById, findManyByUnit, hide, runTransaction, seed, auditAppend,
  };
}

describe('DepreciationRateService.listRates', () => {
  it('nega ANTES de tocar seed/repo quando canRead=false', async () => {
    const { service, seed, findManyByUnit } = build({ canRead: false });
    await expect(service.listRates(scope, false)).rejects.toBeInstanceOf(ForbiddenError);
    expect(seed).not.toHaveBeenCalled();
    expect(findManyByUnit).not.toHaveBeenCalled();
  });

  it('toda leitura dispara o seed lazy ANTES de listar (item 3)', async () => {
    const { service, seed, findManyByUnit } = build();
    await service.listRates(scope, true);
    expect(seed).toHaveBeenCalledWith(scope);
    expect(findManyByUnit).toHaveBeenCalledWith(scope, true);
  });
});

describe('DepreciationRateService.createCustomRate', () => {
  it('nega ANTES de tocar o repo quando canManageFixedAssets=false', async () => {
    const { service, create } = build({ canManage: false });
    await expect(
      service.createCustomRate(scope, { unitId: 'unit-1', description: 'x', lifeYears: 5, annualRateBp: 2000, justification: 'j' }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(create).not.toHaveBeenCalled();
  });

  it('cria com source=CUSTOM, sourceRow=null (F-FA10 → a) e audita ids/números — nunca description/justification', async () => {
    const { service, create, auditAppend } = build();
    await service.createCustomRate(scope, {
      unitId: 'unit-1', ncm: '8471', description: 'Torno CNC', lifeYears: 10, annualRateBp: 1000, justification: 'Laudo técnico',
    });
    const [data] = create.mock.calls[0];
    expect(data).toMatchObject({ source: 'CUSTOM', sourceRow: null, ncm: '8471', createdById: 'dono-a' });

    const [, , auditInput] = auditAppend.mock.calls[0];
    expect(auditInput).toMatchObject({ eventType: DEPRECIATION_RATE_CREATED, targetId: rateRow.id });
    expect(auditInput.payload).not.toHaveProperty('description');
    expect(auditInput.payload).not.toHaveProperty('justification');
    expect(auditInput.payload).toMatchObject({ rateId: rateRow.id, source: 'CUSTOM' });
  });
});

describe('DepreciationRateService.hideRate', () => {
  it('id de outro escopo é NotFoundError (D11) — nunca Forbidden, nunca toca hide', async () => {
    const { service, hide } = build({ found: null });
    await expect(service.hideRate(scope, 'rate-alheio')).rejects.toBeInstanceOf(NotFoundError);
    expect(hide).not.toHaveBeenCalled();
  });

  it('oculta (soft) e audita rateId + source — nunca description', async () => {
    const { service, hide, auditAppend } = build();
    await service.hideRate(scope, 'rate-1');
    expect(hide).toHaveBeenCalledWith(scope, 'rate-1', { tx: true });
    const [, , auditInput] = auditAppend.mock.calls[0];
    expect(auditInput).toMatchObject({ eventType: DEPRECIATION_RATE_HIDDEN, targetId: 'rate-1' });
    expect(auditInput.payload).toEqual({ rateId: 'rate-1', source: 'CUSTOM' });
  });
});
