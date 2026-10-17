import { UnitDeletedError, UnitNotFoundError } from '../../../lib/errors';
import type { UnitRowPort } from '../ports/OriginPorts';
import type { AccountantAssignmentService } from '../services/AccountantAssignmentService';
import type { AccountingScope } from './AccountingScope';
import { resolveAccountingScopeInternal } from './resolveAccountingScopeInternal';

/** F-I6-8: cada endpoint declara o modo — `'write'` se o handler grava qualquer linha, `'read'` se não grava. */
export type ScopeAccess = 'read' | 'write';

export interface IAccountingScopeResolver {
  resolve(user: { userId: string }, unitId: string, opts: { access: ScopeAccess }): Promise<AccountingScope>;
  resolveGovernance(
    user: { userId: string },
    unitId: string,
    ownerUserId: string | undefined,
    opts: { access: ScopeAccess },
  ): Promise<AccountingScope>;
}

/**
 * AccountingScopeResolver — BE-INCR-SCOPE-UNIT-GUARD (nó I6, BRIEF item 3; F-I6-1 d). Resolve o escopo de um
 * controller HTTP validando o `unitId` do cliente contra a linha de `units` do DONO:
 *
 * | linha de `units` do dono | `read`                       | `write`          |
 * |--------------------------|------------------------------|------------------|
 * | viva                     | escopo                       | escopo           |
 * | apagada                  | escopo + `unitDeleted: true` | 409 UNIT_DELETED |
 * | ausente / de outro dono  | 404 UNIT_NOT_FOUND           | 404              |
 *
 * Chamadores internos (unitId de linha já gravada) seguem com `resolveAccountingScopeInternal`, síncrona.
 * A tabela `units` entra pela porta `UnitRowPort` (núcleo portável: nada de `dynamicTables` aqui — core-boundary).
 */
export class AccountingScopeResolver implements IAccountingScopeResolver {
  constructor(
    private readonly unitRows: UnitRowPort,
    private readonly accountantAssignmentService: AccountantAssignmentService,
  ) {}

  async resolve(user: { userId: string }, unitId: string, opts: { access: ScopeAccess }): Promise<AccountingScope> {
    return this.assertUnit(resolveAccountingScopeInternal(user, unitId), opts.access);
  }

  /**
   * Governança primeiro: o 403 `ACCOUNTANT_NOT_ASSIGNED` sai antes do guard, sem revelar se a unidade existe. Depois a
   * unidade é conferida contra `scope.ownerUserId` — ela é do dono, não do contador.
   */
  async resolveGovernance(
    user: { userId: string },
    unitId: string,
    ownerUserId: string | undefined,
    opts: { access: ScopeAccess },
  ): Promise<AccountingScope> {
    const scope = await this.accountantAssignmentService.resolveGovernanceScope(user, unitId, ownerUserId);
    return this.assertUnit(scope, opts.access);
  }

  private async assertUnit(scope: AccountingScope, access: ScopeAccess): Promise<AccountingScope> {
    const state = await this.unitRows.findUnitRowState(scope.ownerUserId, scope.unitId);
    if (state === null) throw new UnitNotFoundError();
    if (state === 'deleted') {
      if (access === 'write') throw new UnitDeletedError();
      return { ...scope, unitDeleted: true };
    }
    return scope;
  }
}
