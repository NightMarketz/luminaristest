/**
 * RoleAccountOverrideService — o ajuste papel→conta do contador (BE-INCR-KIT-SETOR, PR-3, itens 18–25). FIRST-CLASS
 * PRISMA. Respostas do dono às lacunas: emenda §11 do BRIEF (E-11.1..4, chat, 2026-10-13).
 *
 * atomicUntil: ajuste + recompilação (sem tx única — o `compile()` abre a sua, e o SQLite não aninha; F-KB-2)
 *   commit 1 — tx do ajuste: gate autoritativo in-tx (kit INSTALLED, conta viva/folha/do escopo, natureza × papel),
 *              unicidade viva por papel (soft-delete da linha viva + linha nova) e `kit.role_override_set` /
 *              `kit.role_override_removed` na MESMA tx
 *              teste: RoleAccountOverrideService.integration.test.ts › "PUT grava o ajuste, recompila e a versão Active usa a conta nova"
 *              teste: RoleAccountOverrideService.integration.test.ts › "natureza incompatível: 422 sem gravar nada"
 *   commit 2 — `compile()` do binding do kit instalado (tx própria), que lê os ajustes vivos com o `tx` dele (item 25)
 *              teste: RoleAccountOverrideService.integration.test.ts › "DELETE recompila de volta ao código do kit"
 *   reconcile — compile `Draft` ou exceção ⇒ tx de compensação: volta a linha ao estado anterior e audita o desfazer
 *              (E-11.1); `Draft` ⇒ 422 ROLE_OVERRIDE_COMPILE_DRAFT (E-11.2). Processo morto entre os commits 1 e 2 ⇒ o
 *              ajuste fica gravado sem versão nova; a próxima compilação por qualquer caminho o aplica (item 25), e
 *              repetir o PUT/DELETE recompila
 *              teste: RoleAccountOverrideService.integration.test.ts › "compile Draft: compensa, audita o desfazer e devolve 422"
 *   fora da tx — nada
 */
import { ForbiddenError, RoleOverrideCompileDraftError } from '../../../lib/errors';
import type { Prisma, RoleAccountOverride } from 'generated/prisma';
import type { BindingScope } from '../../accountingBinding/repositories/IAccountingBindingRepository';
import type { ActivationChartPort } from '../../accountingBinding/services/BindingActivationService';
import type { BindingCompileService, CompileBindingResult } from '../../accountingBinding/services/BindingCompileService';
import { ROLE_ALLOWED_NATURES, baseRole } from '../../accountingBinding/services/BindingValidationService';
import type { AccountRole } from '../../accountingBinding/models/types';
import type { SectorKitV1 } from '../dtos/SectorKitDto';
import {
  SetRoleOverrideRequestSchema,
  type RemoveRoleOverrideResult,
  type RoleAccountOverrideView,
  type SetRoleOverrideRequest,
  type SetRoleOverrideResult,
} from '../dtos/RoleAccountOverrideDto';
import {
  KIT_ROLE_OVERRIDE_REMOVED,
  KIT_ROLE_OVERRIDE_SET,
  KitNotInstalledError,
  RoleAccountNatureMismatchError,
  RoleNotInKitError,
  RoleOverrideAccountInvalidError,
  RoleOverrideNotFoundError,
} from '../models/roleOverrideTypes';
import type { ISectorKitPolicy } from '../policies/ISectorKitPolicy';
import type { IKitInstallationRepository } from '../repositories/IKitInstallationRepository';
import type { IRoleAccountOverrideRepository } from '../repositories/IRoleAccountOverrideRepository';
import { KIT_REGISTRY } from '../registry';
import type { IKitAuditPort, KitOverrideAccountPort } from './kitInstallPorts';
import type { KitVersionsLookup } from './KitInstallService';

/** Código que o kit traz para o papel (o primeiro `roleSlot` que o usa), ou `null`. */
function kitAccountCodeFor(kit: SectorKitV1 | null, role: string): string | null {
  if (!kit) return null;
  for (const eb of kit.binding.eventBindings) {
    const slot = eb.roleSlots.find((r) => r.role === role);
    if (slot) return slot.accountCode;
  }
  return null;
}

function toView(row: RoleAccountOverride, accountCode: string, kit: SectorKitV1 | null): RoleAccountOverrideView {
  return {
    id: row.id,
    role: row.role,
    accountId: row.accountId,
    accountCode,
    kitAccountCode: kitAccountCodeFor(kit, row.role),
    motivo: row.motivo,
    setById: row.setById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class RoleAccountOverrideService {
  constructor(
    private readonly policy: ISectorKitPolicy,
    private readonly repo: IRoleAccountOverrideRepository,
    private readonly kitRepo: Pick<IKitInstallationRepository, 'findByScope'>,
    private readonly compileService: Pick<BindingCompileService, 'compile'>,
    private readonly accounts: KitOverrideAccountPort,
    private readonly chart: Pick<ActivationChartPort, 'listChart'>,
    private readonly audit: IKitAuditPort,
    private readonly kitVersions: KitVersionsLookup = (kitKey) => KIT_REGISTRY[kitKey],
  ) {}

  /** `GET /accounting-kit/role-overrides` — os ajustes vivos da unidade. */
  async list(scope: BindingScope): Promise<RoleAccountOverrideView[]> {
    this.assertCanManage(scope);
    const kit = await this.installedKit(scope);
    const rows = await this.repo.findLive(scope);
    return rows.map((row) => toView(row, row.account.code, kit));
  }

  /** `PUT /accounting-kit/role-overrides/:role` (itens 20–21). */
  async set(scope: BindingScope, role: string, rawInput: SetRoleOverrideRequest): Promise<SetRoleOverrideResult> {
    this.assertCanManage(scope);
    const input = SetRoleOverrideRequestSchema.parse(rawInput);

    const { kit, created, previous, accountCode } = await this.repo.runTransaction(async (tx) => {
      const kit = await this.requireKitWithRole(scope, role, tx);
      const account = await this.accounts.findLiveInScope(input.accountId, tx);
      if (!account) throw new RoleOverrideAccountInvalidError('ACCOUNT_NOT_FOUND');
      if (!account.acceptsEntries) throw new RoleOverrideAccountInvalidError('ACCOUNT_NOT_LEAF');
      const allowed = ROLE_ALLOWED_NATURES[baseRole(role) as AccountRole];
      if (!allowed.includes(account.nature)) throw new RoleAccountNatureMismatchError(role, account.nature, allowed);

      const previous = await this.repo.findLiveByRole(scope, role, tx);
      if (previous) await this.repo.softDelete(scope, previous.id, tx);
      const created = await this.repo.create(scope, { role, accountId: account.id, motivo: input.motivo }, tx);
      await this.appendSet(tx, scope, created.id, role, account.id, previous?.accountId ?? null);
      return { kit, created, previous, accountCode: account.code };
    });

    const binding = await this.recompileOrCompensate(scope, kit, async (tx) => {
      await this.repo.softDelete(scope, created.id, tx);
      if (previous) {
        await this.repo.revive(scope, previous.id, tx);
        await this.appendSet(tx, scope, previous.id, role, previous.accountId, created.accountId);
      } else {
        await this.appendRemoved(tx, scope, created.id, role);
      }
    });
    return { override: toView(created, accountCode, kit), binding };
  }

  /** `DELETE /accounting-kit/role-overrides/:role` (item 22): remove e recompila de volta ao código do kit. */
  async remove(scope: BindingScope, role: string): Promise<RemoveRoleOverrideResult> {
    this.assertCanManage(scope);

    const { kit, removed } = await this.repo.runTransaction(async (tx) => {
      const kit = await this.requireKitWithRole(scope, role, tx);
      const removed = await this.repo.findLiveByRole(scope, role, tx);
      if (!removed) throw new RoleOverrideNotFoundError(role);
      await this.repo.softDelete(scope, removed.id, tx);
      await this.appendRemoved(tx, scope, removed.id, role);
      return { kit, removed };
    });

    const binding = await this.recompileOrCompensate(scope, kit, async (tx) => {
      await this.repo.revive(scope, removed.id, tx);
      await this.appendSet(tx, scope, removed.id, role, removed.accountId, null);
    });
    return { binding };
  }

  // ---------------------------------------------------------------------------
  // Privado
  // ---------------------------------------------------------------------------

  private assertCanManage(scope: BindingScope): void {
    if (!this.policy.canManageKit(scope)) {
      throw new ForbiddenError('Você não tem permissão para ajustar papel→conta do kit de setor.');
    }
  }

  /** O kit `INSTALLED` da unidade, na versão registrada na instalação; `null` sem kit instalado. */
  private async installedKit(scope: BindingScope, tx?: Prisma.TransactionClient): Promise<SectorKitV1 | null> {
    const row = await this.kitRepo.findByScope(scope, tx);
    if (!row || row.status !== 'INSTALLED') return null;
    return this.kitVersions(row.kitKey)?.find((k) => k.kitVersion === row.kitVersion) ?? null;
  }

  /** Gate in-tx: kit `INSTALLED` (E-11.3) e o papel usado por algum `roleSlot` do binding dele (§3.4). */
  private async requireKitWithRole(scope: BindingScope, role: string, tx: Prisma.TransactionClient): Promise<SectorKitV1> {
    const kit = await this.installedKit(scope, tx);
    if (!kit) throw new KitNotInstalledError();
    if (kitAccountCodeFor(kit, role) === null) throw new RoleNotInKitError(role, kit.kitKey);
    return kit;
  }

  /**
   * Commit 2 + reconcile do `atomicUntil`: recompila o binding do kit instalado (base = kit, E-11.3; o `compile()`
   * aplica os ajustes vivos). `Draft` ou exceção ⇒ roda a compensação numa tx própria; `Draft` vira 422 (E-11.2).
   */
  private async recompileOrCompensate(
    scope: BindingScope,
    kit: SectorKitV1,
    compensate: (tx: Prisma.TransactionClient) => Promise<void>,
  ): Promise<{ status: 'Active'; bindingVersion: number }> {
    let result: CompileBindingResult;
    try {
      result = await this.compileService.compile(scope, {
        sectorKey: kit.binding.sectorKey,
        operationalSchema: kit.operationalSchema,
        chart: await this.chart.listChart(),
        eventBindings: kit.binding.eventBindings,
      });
    } catch (error) {
      await this.repo.runTransaction(compensate);
      throw error;
    }
    if (result.status !== 'Active') {
      await this.repo.runTransaction(compensate);
      throw new RoleOverrideCompileDraftError({
        binding: { status: result.status, bindingVersion: result.binding.bindingVersion },
        blocking: result.validation.blocking,
        missingEventKeys: result.coverage.missing,
      });
    }
    return { status: 'Active', bindingVersion: result.binding.bindingVersion };
  }

  private appendSet(
    tx: Prisma.TransactionClient,
    scope: BindingScope,
    targetId: string,
    role: string,
    accountId: string,
    previousAccountId: string | null,
  ): Promise<void> {
    return this.audit.append(tx, scope, {
      eventType: KIT_ROLE_OVERRIDE_SET,
      targetType: 'RoleAccountOverride',
      targetId,
      payload: { role, accountId, previousAccountId },
    });
  }

  private appendRemoved(tx: Prisma.TransactionClient, scope: BindingScope, targetId: string, role: string): Promise<void> {
    return this.audit.append(tx, scope, {
      eventType: KIT_ROLE_OVERRIDE_REMOVED,
      targetType: 'RoleAccountOverride',
      targetId,
      payload: { role },
    });
  }
}
