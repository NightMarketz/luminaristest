import type { Prisma } from 'generated/prisma';
import type { EventBinding } from '../../accountingBinding/dtos/AccountingBindingDto';
import type { BindingScope } from '../../accountingBinding/repositories/IAccountingBindingRepository';
import type { IRoleOverrideSource } from '../../accountingBinding/services/BindingCompileService';
import type { IRoleAccountOverrideRepository } from '../repositories/IRoleAccountOverrideRepository';
import { KIT_REGISTRY } from '../registry';
import { applyRoleOverrides } from './applyRoleOverrides';

/** `sectorKey` de todos os kits publicados (um kit = um setor). */
function kitSectorKeys(): Set<string> {
  return new Set(Object.values(KIT_REGISTRY).flatMap((versions) => versions.map((kit) => kit.binding.sectorKey)));
}

/**
 * Adaptador do `IRoleOverrideSource` que o `BindingCompileService` consome (BE-INCR-KIT-SETOR, PR-3, item 25).
 * `sectorKey` de kit ⇒ aplica os ajustes vivos da unidade, lidos com o `tx` da compilação; qualquer outro
 * `sectorKey` ⇒ identidade. O código da conta vem da linha da conta mesmo se ela foi apagada depois do ajuste:
 * o validador do compile reprova (`ACCOUNT_NOT_FOUND`) em vez de o ajuste sumir em silêncio.
 */
export class RoleOverrideSource implements IRoleOverrideSource {
  constructor(
    private readonly repo: Pick<IRoleAccountOverrideRepository, 'findLive'>,
    private readonly sectorKeys: ReadonlySet<string> = kitSectorKeys(),
  ) {}

  async apply(
    scope: BindingScope,
    sectorKey: string,
    eventBindings: EventBinding[],
    tx: Prisma.TransactionClient,
  ): Promise<EventBinding[]> {
    if (!this.sectorKeys.has(sectorKey)) return eventBindings;
    const overrides = await this.repo.findLive(scope, tx);
    if (overrides.length === 0) return eventBindings;
    return applyRoleOverrides(
      eventBindings,
      overrides.map((o) => ({ role: o.role, accountCode: o.account.code })),
    ).eventBindings;
  }
}
