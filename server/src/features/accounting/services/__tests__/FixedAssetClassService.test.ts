/**
 * FixedAssetClassService (BE-INCR-FIXED-ASSETS, nó C8, item 1/7). Unit: repos são dublês; prova-se
 * ORDEM (policy antes de dado), o bloqueio de soft-delete com ativo vivo, e a tradução
 * cross-tenant → NotFound (D11).
 */
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';
import { FixedAssetClassService } from '@/features/accounting/services/FixedAssetClassService';
import type { IFixedAssetClassRepository } from '@/features/accounting/repositories/IFixedAssetClassRepository';
import type { IFixedAssetRepository } from '@/features/accounting/repositories/IFixedAssetRepository';
import type { IAccountRepository } from '@/features/accounting/repositories/IAccountRepository';
import type { IAccountingPolicy } from '@/features/accounting/policies/IAccountingPolicy';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';

const scope = resolveAccountingScope({ userId: 'dono-a' }, 'unit-1');

const classRow = {
  id: 'class-1',
  userId: 'dono-a',
  unitId: 'unit-1',
  code: 'MAQ',
  name: 'Máquinas',
  depreciable: true,
  costAccountId: 'acc-cost',
  accumulatedDepreciationAccountId: 'acc-acc' as string | null,
  createdAt: new Date('2026-09-18T00:00:00Z'),
  updatedAt: new Date('2026-09-18T00:00:00Z'),
  deletedAt: null as Date | null,
};

const accountRow = { id: 'acc-cost', code: '1.2.1', nature: 'Asset', acceptsEntries: true, deletedAt: null as Date | null };

function build(opts: { canManage?: boolean; canRead?: boolean; found?: typeof classRow | null; liveAssets?: number } = {}) {
  const create = jest.fn(async () => classRow);
  const findById = jest.fn(async () => (opts.found === undefined ? classRow : opts.found));
  const findManyByUnit = jest.fn(async () => [classRow]);
  const update = jest.fn(async () => classRow);
  const softDelete = jest.fn(async () => ({ ...classRow, deletedAt: new Date() }));
  const classRepo = { create, findById, findManyByUnit, update, softDelete } as unknown as IFixedAssetClassRepository;

  const countByClass = jest.fn(async () => opts.liveAssets ?? 0);
  const assetRepo = { countByClass } as unknown as IFixedAssetRepository;

  const accountFindById = jest.fn(async (_s: unknown, id: string) => (id === accountRow.id ? accountRow : { ...accountRow, id }));
  const accountRepo = { findById: accountFindById } as unknown as IAccountRepository;

  const policy = {
    canRead: () => opts.canRead ?? true,
    canManageFixedAssets: () => opts.canManage ?? true,
  } as unknown as IAccountingPolicy;

  return {
    service: new FixedAssetClassService(classRepo, assetRepo, accountRepo, policy),
    create, findById, findManyByUnit, update, softDelete, countByClass, accountFindById,
  };
}

describe('FixedAssetClassService.createClass', () => {
  it('nega ANTES de tocar o repo quando canManageFixedAssets=false', async () => {
    const { service, create } = build({ canManage: false });
    await expect(
      service.createClass(scope, { unitId: 'unit-1', code: 'MAQ', name: 'Máquinas', depreciable: true, costAccountId: 'acc-cost', accumulatedDepreciationAccountId: 'acc-acc' }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(create).not.toHaveBeenCalled();
  });

  it('valida as contas antes de criar', async () => {
    const { service, create, accountFindById } = build();
    await service.createClass(scope, { unitId: 'unit-1', code: 'MAQ', name: 'Máquinas', depreciable: true, costAccountId: 'acc-cost', accumulatedDepreciationAccountId: 'acc-acc' });
    expect(accountFindById).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenCalledTimes(1);
  });
});

describe('FixedAssetClassService.deleteClass — item 7', () => {
  it('classe com ativo vivo (qualquer status) → 400, nunca chega no softDelete', async () => {
    const { service, softDelete } = build({ liveAssets: 2 });
    await expect(service.deleteClass(scope, 'class-1')).rejects.toBeInstanceOf(ValidationError);
    expect(softDelete).not.toHaveBeenCalled();
  });

  it('classe sem ativo vivo → soft-delete', async () => {
    const { service, softDelete } = build({ liveAssets: 0 });
    await service.deleteClass(scope, 'class-1');
    expect(softDelete).toHaveBeenCalledWith(scope, 'class-1');
  });

  it('id de outro escopo é NotFoundError (D11) — nunca Forbidden', async () => {
    const { service } = build({ found: null });
    await expect(service.deleteClass(scope, 'class-alheia')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('FixedAssetClassService.updateClass — depreciable ⇒ accumulatedDepreciationAccountId', () => {
  it('setar depreciable=true sem accumulatedDepreciationAccountId (e a classe atual também não tem) é 400', async () => {
    const { service } = build({ found: { ...classRow, depreciable: false, accumulatedDepreciationAccountId: null } });
    await expect(
      service.updateClass(scope, 'class-1', { unitId: 'unit-1', classId: 'class-1', depreciable: true }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
