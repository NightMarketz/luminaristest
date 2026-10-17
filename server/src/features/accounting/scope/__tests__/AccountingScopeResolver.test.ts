/**
 * BE-INCR-SCOPE-UNIT-GUARD (nó I6, BRIEF item 3): a tabela estado × modo do resolver (repo falso) + governança sem
 * vínculo (403 antes do guard, repo de `units` não consultado).
 */
import { AppError, UnitDeletedError, UnitNotFoundError } from '../../../../lib/errors';
import { AccountingScopeResolver } from '../AccountingScopeResolver';
import type { AccountingScope } from '../AccountingScope';
import { resolveAccountingScopeInternal } from '../resolveAccountingScopeInternal';

type RowState = 'live' | 'deleted' | null;

function build(state: RowState, governance?: (u: { userId: string }, unitId: string, owner?: string) => Promise<AccountingScope>) {
  const unitRows = { findUnitRowState: jest.fn(async (): Promise<RowState> => state) };
  const accountantAssignmentService = {
    resolveGovernanceScope: jest.fn(
      governance ?? (async (u: { userId: string }, unitId: string) => resolveAccountingScopeInternal(u, unitId)),
    ),
  };
  const resolver = new AccountingScopeResolver(unitRows as never, accountantAssignmentService as never);
  return { resolver, unitRows, accountantAssignmentService };
}

const user = { userId: 'dono-1' };
const base = resolveAccountingScopeInternal(user, 'unit-1');

describe('AccountingScopeResolver.resolve — estado × modo', () => {
  it.each(['read', 'write'] as const)("viva + %s → escopo sem a marca", async (access) => {
    const { resolver, unitRows } = build('live');
    const scope = await resolver.resolve(user, 'unit-1', { access });
    expect(scope).toEqual(base);
    expect(scope.unitDeleted).toBeUndefined();
    expect(unitRows.findUnitRowState).toHaveBeenCalledWith('dono-1', 'unit-1');
  });

  it("apagada + read → escopo com unitDeleted: true", async () => {
    const { resolver } = build('deleted');
    await expect(resolver.resolve(user, 'unit-1', { access: 'read' })).resolves.toEqual({ ...base, unitDeleted: true });
  });

  it('apagada + write → 409 UNIT_DELETED', async () => {
    const { resolver } = build('deleted');
    await expect(resolver.resolve(user, 'unit-1', { access: 'write' })).rejects.toBeInstanceOf(UnitDeletedError);
  });

  it.each(['read', 'write'] as const)('ausente + %s → 404 UNIT_NOT_FOUND', async (access) => {
    const { resolver } = build(null);
    await expect(resolver.resolve(user, 'unit-1', { access })).rejects.toBeInstanceOf(UnitNotFoundError);
  });
});

describe('AccountingScopeResolver.resolveGovernance', () => {
  it('contador sem vínculo → 403 ACCOUNTANT_NOT_ASSIGNED e o repo de units NÃO é consultado', async () => {
    const { resolver, unitRows } = build('live', async () => {
      throw new AppError('sem vínculo', 403, 'ACCOUNTANT_NOT_ASSIGNED');
    });
    await expect(resolver.resolveGovernance({ userId: 'contador' }, 'unit-1', 'dono-1', { access: 'read' })).rejects.toMatchObject({
      statusCode: 403,
      errorCode: 'ACCOUNTANT_NOT_ASSIGNED',
    });
    expect(unitRows.findUnitRowState).not.toHaveBeenCalled();
  });

  it('contador com vínculo → a unidade é conferida contra o DONO, não o contador', async () => {
    const { resolver, unitRows } = build('live', async (_u, unitId) => ({
      ...resolveAccountingScopeInternal({ userId: 'dono-1' }, unitId),
      actorUserId: 'contador',
    }));
    const scope = await resolver.resolveGovernance({ userId: 'contador' }, 'unit-1', 'dono-1', { access: 'write' });
    expect(scope).toMatchObject({ ownerUserId: 'dono-1', actorUserId: 'contador', unitId: 'unit-1' });
    expect(unitRows.findUnitRowState).toHaveBeenCalledWith('dono-1', 'unit-1');
  });

  it('contador com vínculo + unidade do dono apagada + write → 409', async () => {
    const { resolver } = build('deleted');
    await expect(resolver.resolveGovernance(user, 'unit-1', undefined, { access: 'write' })).rejects.toBeInstanceOf(UnitDeletedError);
  });
});
