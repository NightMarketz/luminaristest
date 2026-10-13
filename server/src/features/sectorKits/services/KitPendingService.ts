/**
 * KitPendingService — as pendências (nível c) da atualização do kit (BE-INCR-KIT-SETOR, PR-4, item 37). FIRST-CLASS
 * PRISMA. Aceitar aplica o valor do kit conforme o motivo (emenda E-12.3); recusar mantém o valor do tenant e a
 * pendência não reaparece para o mesmo `toVersion` (@@unique).
 *
 * atomicUntil: aceitar (sem tx única — o efeito roda no serviço dono, que abre a sua)
 *   commit 1 — o efeito do motivo: remover o ajuste e recompilar (`override`, pelo `RoleAccountOverrideService`, que
 *              desfaz sozinho se der Draft); restaurar a conta e recompilar (`account_deleted_by_user`; Draft ⇒ a
 *              conta volta a ser apagada); renomear (`account_changed_in_use`); gravar o campo por cima
 *              (`field_set_by_user`); trocar o mapeamento (`referential_mapped_differently`)
 *              teste: KitPendingService.integration.test.ts › "aceitar override remove o ajuste e recompila no código do kit"
 *   commit 2 — tx da decisão: CAS `OPEN → ACCEPTED` + `kit.upgrade_pending_accepted`, juntos
 *              teste: KitPendingService.integration.test.ts › "aceitar campo preenchido grava o valor do kit; decidir de novo dá 409"
 *   reconcile — processo morto entre os commits: o efeito ficou e a pendência segue OPEN; aceitar de novo é seguro
 *              (renomear/gravar/mapear o mesmo valor não muda nada; sem ajuste vivo, `override` só fecha)
 *              teste: KitPendingService.integration.test.ts › "aceitar override sem ajuste vivo só fecha a pendência"
 *   fora da tx — nada. Recusar é uma tx só (CAS + auditoria).
 */
import { ForbiddenError, RoleOverrideCompileDraftError, ValidationError } from '../../../lib/errors';
import type { KitUpgradePending, Prisma } from 'generated/prisma';
import type { BindingScope } from '../../accountingBinding/repositories/IAccountingBindingRepository';
import type { BindingCompileService } from '../../accountingBinding/services/BindingCompileService';
import {
  DecideKitPendingRequestSchema,
  type DecideKitPendingRequest,
  type KitUpgradePendingView,
} from '../dtos/KitUpgradeDto';
import { RoleOverrideNotFoundError } from '../models/roleOverrideTypes';
import {
  KIT_UPGRADE_PENDING_ACCEPTED,
  KIT_UPGRADE_PENDING_REJECTED,
  KitPendingFrozenYearError,
  KitPendingNotFoundError,
  KitPendingNotOpenError,
  type ConflictReason,
  type KitPendingStatus,
} from '../models/kitUpgradeTypes';
import type { ISectorKitPolicy } from '../policies/ISectorKitPolicy';
import type { IKitInstallationRepository } from '../repositories/IKitInstallationRepository';
import type { IKitUpgradeRepository } from '../repositories/IKitUpgradeRepository';
import { KIT_REGISTRY } from '../registry';
import type { AccountItemValue, OverrideItemValue, ReferentialItemValue, RoleDefaultItemValue } from './classifyKitDiff';
import type { IKitAuditPort, KitChartPort } from './kitInstallPorts';
import type { KitUpgradeWritePort } from './kitUpgradePorts';
import type { KitVersionsLookup } from './KitInstallService';
import type { RoleAccountOverrideService } from './RoleAccountOverrideService';

const toIdField = (field: string) => field.replace(/AccountCode$/, 'AccountId');

function toView(row: KitUpgradePending): KitUpgradePendingView {
  return {
    id: row.id,
    kitKey: row.kitKey,
    toVersion: row.toVersion,
    runId: row.runId,
    itemKey: row.itemKey,
    reason: row.reason as ConflictReason,
    kitValue: JSON.parse(row.kitValue),
    tenantValue: JSON.parse(row.tenantValue),
    status: row.status as KitPendingStatus,
    decidedById: row.decidedById,
    decidedAt: row.decidedAt?.toISOString() ?? null,
    motivo: row.motivo,
    createdAt: row.createdAt.toISOString(),
  };
}

export class KitPendingService {
  constructor(
    private readonly policy: ISectorKitPolicy,
    private readonly repo: IKitUpgradeRepository,
    private readonly kitRepo: Pick<IKitInstallationRepository, 'findByScope'>,
    private readonly overrides: Pick<RoleAccountOverrideService, 'remove'>,
    private readonly compileService: Pick<BindingCompileService, 'compile'>,
    private readonly chart: Pick<KitChartPort, 'findLiveAccountId' | 'listChart'>,
    private readonly write: KitUpgradeWritePort,
    private readonly audit: IKitAuditPort,
    private readonly kitVersions: KitVersionsLookup = (kitKey) => KIT_REGISTRY[kitKey],
  ) {}

  async list(scope: BindingScope, status?: KitPendingStatus): Promise<KitUpgradePendingView[]> {
    this.assertCanManage(scope);
    return (await this.repo.listPendings(scope, status)).map(toView);
  }

  /** `POST /accounting-kit/pending/:id/accept` — aplica o valor do kit (E-12.3). */
  async accept(scope: BindingScope, id: string, rawInput: DecideKitPendingRequest): Promise<KitUpgradePendingView> {
    this.assertCanManage(scope);
    const input = DecideKitPendingRequestSchema.parse(rawInput);
    const pending = await this.requireOpen(scope, id);
    await this.applyKitValue(scope, pending);
    return this.decide(scope, pending, 'ACCEPTED', input.motivo);
  }

  /** `POST /accounting-kit/pending/:id/reject` — mantém o valor do tenant. */
  async reject(scope: BindingScope, id: string, rawInput: DecideKitPendingRequest): Promise<KitUpgradePendingView> {
    this.assertCanManage(scope);
    const input = DecideKitPendingRequestSchema.parse(rawInput);
    const pending = await this.requireOpen(scope, id);
    return this.decide(scope, pending, 'REJECTED', input.motivo);
  }

  // ---------------------------------------------------------------------------
  // Privado
  // ---------------------------------------------------------------------------

  private assertCanManage(scope: BindingScope): void {
    if (!this.policy.canManageKit(scope)) throw new ForbiddenError('Você não tem permissão para decidir pendências do kit de setor.');
  }

  private async requireOpen(scope: BindingScope, id: string, tx?: Prisma.TransactionClient): Promise<KitUpgradePending> {
    const pending = await this.repo.findPending(scope, id, tx);
    if (!pending) throw new KitPendingNotFoundError();
    if (pending.status !== 'OPEN') throw new KitPendingNotOpenError(pending.status);
    return pending;
  }

  private async decide(
    scope: BindingScope,
    pending: KitUpgradePending,
    status: 'ACCEPTED' | 'REJECTED',
    motivo: string,
  ): Promise<KitUpgradePendingView> {
    return this.repo.runTransaction(async (tx) => {
      if ((await this.repo.decidePending(scope, pending.id, { status, motivo }, tx)) === 0) {
        const now = await this.repo.findPending(scope, pending.id, tx);
        throw new KitPendingNotOpenError(now?.status ?? 'desconhecido');
      }
      await this.audit.append(tx, scope, {
        eventType: status === 'ACCEPTED' ? KIT_UPGRADE_PENDING_ACCEPTED : KIT_UPGRADE_PENDING_REJECTED,
        targetType: 'KitUpgradePending',
        targetId: pending.id,
        payload: { pendingId: pending.id, itemKey: pending.itemKey, reason: pending.reason },
      });
      return toView((await this.repo.findPending(scope, pending.id, tx))!);
    });
  }

  private async liveAccountId(code: string): Promise<string> {
    const id = await this.chart.findLiveAccountId(code);
    if (!id) throw new ValidationError(`ACCOUNT_NOT_FOUND: a conta ${code} do kit não está viva no plano da unidade.`);
    return id;
  }

  /** O efeito de aceitar, por motivo (E-12.3). */
  private async applyKitValue(scope: BindingScope, pending: KitUpgradePending): Promise<void> {
    const kitValue: unknown = JSON.parse(pending.kitValue);
    switch (pending.reason as ConflictReason) {
      case 'override': {
        const { role } = kitValue as OverrideItemValue;
        try {
          await this.overrides.remove(scope, role); // recompila; Draft ⇒ 422 e o ajuste volta (PR-3)
        } catch (error) {
          if (!(error instanceof RoleOverrideNotFoundError)) throw error; // sem ajuste vivo: o kit já vale
        }
        return;
      }
      case 'account_deleted_by_user': {
        const { code } = kitValue as Pick<AccountItemValue, 'code'>;
        if (!(await this.write.restoreAccount(code))) return; // já está viva
        try {
          await this.recompileInstalled(scope);
        } catch (error) {
          await this.write.deleteAccount(code);
          throw error;
        }
        return;
      }
      case 'account_changed_in_use': {
        const { code, name } = kitValue as AccountItemValue;
        if (!(await this.write.renameAccount(code, name))) {
          throw new ValidationError(`ACCOUNT_NOT_FOUND: a conta ${code} não está viva no plano da unidade.`);
        }
        return;
      }
      case 'field_set_by_user': {
        const { group, field, accountCode } = kitValue as RoleDefaultItemValue;
        const ids = { [toIdField(field)]: await this.liveAccountId(accountCode) };
        await (group === 'scopeSettings' ? this.write.setScopeSettings(ids) : this.write.setFiscalProfile(ids));
        return;
      }
      case 'referential_mapped_differently': {
        const v = kitValue as ReferentialItemValue;
        await this.write.setReferentialMapping(v.mappingVersion, {
          accountId: await this.liveAccountId(v.accountCode),
          referentialCode: v.referentialCode,
          label: v.label,
        });
        return;
      }
      case 'referential_year_frozen':
        throw new KitPendingFrozenYearError(pending.itemKey);
    }
  }

  /** Recompila o binding do kit na versão instalada (os ajustes vivos entram pelo compile); Draft ⇒ 422. */
  private async recompileInstalled(scope: BindingScope): Promise<void> {
    const row = await this.kitRepo.findByScope(scope);
    const kit = row ? this.kitVersions(row.kitKey)?.find((k) => k.kitVersion === row.kitVersion) : undefined;
    if (!kit) throw new ValidationError('KIT_NOT_INSTALLED: a unidade não tem kit instalado.');
    const result = await this.compileService.compile(scope, {
      sectorKey: kit.binding.sectorKey,
      operationalSchema: kit.operationalSchema,
      chart: await this.chart.listChart(),
      eventBindings: kit.binding.eventBindings,
    });
    if (result.status !== 'Active') {
      throw new RoleOverrideCompileDraftError(
        {
          binding: { status: result.status, bindingVersion: result.binding.bindingVersion },
          blocking: result.validation.blocking,
          missingEventKeys: result.coverage.missing,
        },
        'A recompilação depois de aceitar a pendência reprovou; nada foi aplicado.',
        'KIT_PENDING_COMPILE_DRAFT',
      );
    }
  }
}
