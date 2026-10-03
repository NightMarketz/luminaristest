/**
 * ITEM-DESTINATION PR-2 (BRIEF item 17, F-ID-2 a) — ProductDestinationService: 403 pela policy fiscal, 400 de produto
 * inexistente/de outro tenant (porta `IProductRefLookup`, reuso do LAC-E), evento DENTRO da tx da escrita.
 */
import { ForbiddenError, NotFoundError, ValidationError } from '../../../../lib/errors';
import { ProductDestinationService, PRODUCT_DESTINATION_CLEARED, PRODUCT_DESTINATION_SET } from '../ProductDestinationService';
import type { AccountingScope } from '../../scope/AccountingScope';

const scope = { ownerUserId: 'owner-1', unitId: 'unit-1', actorUserId: 'actor-1' } as unknown as AccountingScope;
const TX = { tx: true };
const ROW = { id: 'pd-1', userId: 'owner-1', unitId: 'unit-1', productRef: 'prod-1', destination: 'INSUMO_SERVICO', createdAt: new Date(), updatedAt: new Date('2026-10-03T12:00:00Z'), deletedAt: null };

function build(opts: { canManage?: boolean; canRead?: boolean; exists?: boolean; row?: typeof ROW | null } = {}) {
  const repo = {
    list: jest.fn(async () => [ROW]),
    findByProductRef: jest.fn(async () => (opts.row === undefined ? ROW : opts.row)),
    upsert: jest.fn(async () => ROW),
    softDelete: jest.fn(async () => 1),
    runTransaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(TX)),
  };
  const lookup = { productExists: jest.fn(async () => opts.exists ?? true) };
  const policy = { canManageFiscalProfile: () => opts.canManage ?? true, canReadFiscalProfile: () => opts.canRead ?? true };
  const audit = { append: jest.fn(async () => undefined) };
  const service = new ProductDestinationService(repo as never, lookup, policy as never, audit as never);
  return { service, repo, lookup, audit };
}

const input = { unitId: 'unit-1', productRef: 'prod-1', destination: 'INSUMO_SERVICO' as const };

describe('ProductDestinationService', () => {
  it('upsert: 403 sem canManageFiscalProfile — nada é lido nem escrito', async () => {
    const { service, repo, lookup } = build({ canManage: false });
    await expect(service.upsert(scope, input)).rejects.toBeInstanceOf(ForbiddenError);
    expect(lookup.productExists).not.toHaveBeenCalled();
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it('upsert: produto inexistente ou de outro tenant (productExists=false) → 400, sem escrita', async () => {
    const { service, repo, lookup } = build({ exists: false });
    await expect(service.upsert(scope, input)).rejects.toBeInstanceOf(ValidationError);
    expect(lookup.productExists).toHaveBeenCalledWith(scope, 'prod-1');
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it('upsert: grava na tx e emite product_destination.set com a MESMA tx; devolve a view', async () => {
    const { service, repo, audit } = build();
    const view = await service.upsert(scope, input);
    expect(view).toEqual({ productRef: 'prod-1', destination: 'INSUMO_SERVICO', updatedAt: '2026-10-03T12:00:00.000Z' });
    expect(repo.upsert).toHaveBeenCalledWith(scope, 'prod-1', 'INSUMO_SERVICO', TX);
    expect(audit.append).toHaveBeenCalledWith(TX, scope, expect.objectContaining({
      eventType: PRODUCT_DESTINATION_SET, targetId: 'pd-1', payload: { productRef: 'prod-1', destination: 'INSUMO_SERVICO' },
    }));
  });

  it('delete: 403 sem a policy; 404 sem default vivo; senão soft-delete + product_destination.cleared na mesma tx', async () => {
    await expect(build({ canManage: false }).service.delete(scope, 'prod-1')).rejects.toBeInstanceOf(ForbiddenError);
    const missing = build({ row: null });
    await expect(missing.service.delete(scope, 'prod-1')).rejects.toBeInstanceOf(NotFoundError);
    expect(missing.audit.append).not.toHaveBeenCalled();

    const { service, repo, audit } = build();
    await service.delete(scope, 'prod-1');
    expect(repo.softDelete).toHaveBeenCalledWith(scope, 'prod-1', TX);
    expect(audit.append).toHaveBeenCalledWith(TX, scope, expect.objectContaining({
      eventType: PRODUCT_DESTINATION_CLEARED, payload: { productRef: 'prod-1', destination: 'INSUMO_SERVICO' },
    }));
  });

  it('list: 403 sem canReadFiscalProfile; senão as views', async () => {
    await expect(build({ canRead: false }).service.list(scope)).rejects.toBeInstanceOf(ForbiddenError);
    expect(await build().service.list(scope)).toEqual([{ productRef: 'prod-1', destination: 'INSUMO_SERVICO', updatedAt: '2026-10-03T12:00:00.000Z' }]);
  });
});
