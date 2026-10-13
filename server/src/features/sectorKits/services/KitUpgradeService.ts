/**
 * KitUpgradeService — atualização do kit em 3 níveis (BE-INCR-KIT-SETOR, PR-4, itens 26–36 e 38). FIRST-CLASS PRISMA.
 * Respostas do dono às lacunas: emenda §12 do BRIEF (E-12.1..5, chat, 2026-10-13).
 *
 * atomicUntil: execução por unidade (sem tx única — cada serviço dono abre a sua; F-KB-2 → Contrato §2.3)
 *   commit 1 — (a) aditivos, cada um no serviço dono: conta da extensão (cria-se-falta), contas-padrão só no campo
 *              nulo (relido in-tx pelo serviço), referencial só na conta sem mapeamento; forward `changed_account`
 *              relendo "sem partida" in-tx (E-12.2)
 *              teste: KitUpgradeService.integration.test.ts › "v1 → v4: dry-run grava o plano sem escrever; apply aplica (a) e avança a versão"
 *   commit 2 — (b) binding: um `compile()` do alvo (tx própria, com os ajustes vivos do PR-3); `Draft` ⇒ a unidade falha
 *              (E-12.4): os aditivos ficam, a versão não avança
 *              teste: KitUpgradeService.integration.test.ts › "forward com Draft: a unidade falha, os aditivos ficam e a versão não avança"
 *   commit 3 — tx final: pendências (c) que ainda não existem + avanço CAS da `kitVersion` (só sem falha) + `report` +
 *              `kit.upgrade_applied` (só contagens), juntos
 *              teste: KitUpgradeService.integration.test.ts › "item 36: o ajuste sobrevive à atualização que muda o mesmo papel e vira pendência override"
 *   reconcile — reexecutar o `--apply`: o diff é recalculado do estado real, então o que já foi aplicado sai do diff e
 *              as pendências não duplicam (@@unique); instalação já na última versão ⇒ no-op (item 35)
 *              teste: KitUpgradeService.integration.test.ts › "item 35: reexecutar o apply do mesmo deploy é no-op"
 *   fora da tx — o DRY_RUN não escreve domínio nem audita (item 39): só a linha do `KitUpgradeRun`
 *
 * Instalar ≠ atualizar (item 36): este serviço nunca toca `RoleAccountOverride` nem campo já preenchido de
 * `AccountingScopeSettings`/`FiscalProfile` — o diff os põe em (c).
 */
import { ForbiddenError, ValidationError } from '../../../lib/errors';
import type { KitInstallation, KitUpgradeRun } from 'generated/prisma';
import type { BindingScope, IAccountingBindingRepository } from '../../accountingBinding/repositories/IAccountingBindingRepository';
import type { BindingCompileService } from '../../accountingBinding/services/BindingCompileService';
import type { SectorKitV1 } from '../dtos/SectorKitDto';
import {
  KitUpgradeReportSchema,
  UpgradeUnitInputSchema,
  type KitDiff,
  type KitInstallationView,
  type KitUpgradeReport,
  type KitUpgradeRunSummary,
  type UpgradeUnitInput,
} from '../dtos/KitUpgradeDto';
import type { KitInstallStatus } from '../models/kitInstallTypes';
import {
  KIT_UPGRADE_APPLIED,
  KitUpgradeDryRunRequiredError,
  type KitUpgradeMode,
  type KitUpgradeRunStatus,
} from '../models/kitUpgradeTypes';
import type { ISectorKitPolicy } from '../policies/ISectorKitPolicy';
import type { IKitInstallationRepository } from '../repositories/IKitInstallationRepository';
import type { IKitUpgradeRepository } from '../repositories/IKitUpgradeRepository';
import type { IRoleAccountOverrideRepository } from '../repositories/IRoleAccountOverrideRepository';
import { KIT_REGISTRY } from '../registry';
import {
  classifyKitDiff,
  type AccountItemValue,
  type ReferentialItemValue,
  type RoleDefaultItemValue,
  type TenantKitState,
} from './classifyKitDiff';
import type { IKitAuditPort, KitChartPort, KitReferentialPort, KitRoleDefaultsPort } from './kitInstallPorts';
import type { KitTenantStatePort, KitUpgradeWritePort } from './kitUpgradePorts';
import type { KitVersionsLookup } from './KitInstallService';

export type KitUpgradeOutcome =
  | { status: 'UP_TO_DATE'; kitKey: string; kitVersion: number }
  | { status: Exclude<KitUpgradeRunStatus, 'PARTIAL'>; run: KitUpgradeRunSummary; report: KitUpgradeReport };

type Result = KitUpgradeReport['results'][number];

/** `xxxAccountCode` do kit (§3.1) → `xxxAccountId` da linha, o mesmo mapeamento do passo 3 da instalação. */
const toIdField = (field: string) => field.replace(/AccountCode$/, 'AccountId');

function counts(diff: KitDiff) {
  return { additive: diff.additive.length, forward: diff.forward.length, conflicts: diff.conflict.length };
}

export function toRunSummary(run: KitUpgradeRun): KitUpgradeRunSummary {
  const report = KitUpgradeReportSchema.parse(JSON.parse(run.report));
  return {
    id: run.id,
    mode: run.mode as KitUpgradeMode,
    status: run.status as KitUpgradeRunStatus,
    fromVersion: run.fromVersion,
    toVersion: run.toVersion,
    deployId: run.deployId,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString() ?? null,
    counts: counts(report),
  };
}

export class KitUpgradeService {
  constructor(
    private readonly policy: ISectorKitPolicy,
    private readonly kitRepo: Pick<IKitInstallationRepository, 'findByScope' | 'advanceVersion'>,
    private readonly repo: IKitUpgradeRepository,
    private readonly overrideRepo: Pick<IRoleAccountOverrideRepository, 'findLive'>,
    private readonly bindingRepo: Pick<IAccountingBindingRepository, 'findActive'>,
    private readonly compileService: Pick<BindingCompileService, 'compile'>,
    private readonly chart: KitChartPort,
    private readonly roleDefaults: Pick<KitRoleDefaultsPort, 'fillNullScopeSettings' | 'fillNullFiscalProfile'>,
    private readonly referential: Pick<KitReferentialPort, 'mappedAccountIds' | 'batchSet'>,
    private readonly state: KitTenantStatePort,
    private readonly write: Pick<KitUpgradeWritePort, 'updateAccountIfUnused'>,
    private readonly audit: IKitAuditPort,
    private readonly kitVersions: KitVersionsLookup = (kitKey) => KIT_REGISTRY[kitKey],
  ) {}

  /** Item 38 — `GET /accounting-kit`: a instalação, a última execução, as pendências abertas e o changelog que falta. */
  async view(scope: BindingScope): Promise<KitInstallationView | null> {
    this.assertCanManage(scope);
    const row = await this.kitRepo.findByScope(scope);
    if (!row) return null;
    const versions = this.kitVersions(row.kitKey) ?? [];
    const latest = versions[versions.length - 1];
    const lastRun = await this.repo.findLastRun(scope, row.kitKey);
    return {
      kitKey: row.kitKey,
      kitVersion: row.kitVersion,
      latestVersion: latest?.kitVersion ?? row.kitVersion,
      status: row.status as KitInstallStatus,
      lastRun: lastRun ? toRunSummary(lastRun) : null,
      openPendingCount: await this.repo.countOpenPendings(scope),
      // O changelog de cada versão é acumulado: o que ela traz de novo é o que tem a mais que a anterior.
      changelog: versions
        .map((k, i) => ({ kitVersion: k.kitVersion, entries: k.changelog.slice(versions[i - 1]?.changelog.length ?? 0) }))
        .filter((c) => c.kitVersion > row.kitVersion),
    };
  }

  /** Itens 32–36: uma unidade, um modo. Instalação já na última versão ⇒ `UP_TO_DATE` (nada gravado). */
  async upgrade(scope: BindingScope, rawInput: UpgradeUnitInput): Promise<KitUpgradeOutcome> {
    this.assertCanManage(scope);
    const input = UpgradeUnitInputSchema.parse(rawInput);
    const installation = await this.kitRepo.findByScope(scope);
    if (!installation || installation.status !== 'INSTALLED') {
      throw new ValidationError(`KIT_NOT_INSTALLED: a unidade '${scope.unitId}' não tem kit instalado para atualizar.`);
    }
    const versions = this.kitVersions(installation.kitKey);
    const installed = versions?.find((k) => k.kitVersion === installation.kitVersion);
    const target = versions?.[versions.length - 1];
    if (!installed || !target) throw new ValidationError(`KIT_UNKNOWN: kit '${installation.kitKey}' v${installation.kitVersion} não está publicado.`);
    if (target.kitVersion <= installed.kitVersion) {
      return { status: 'UP_TO_DATE', kitKey: installation.kitKey, kitVersion: installation.kitVersion };
    }

    const diff = classifyKitDiff(target, installed, await this.loadState(scope, target));
    const runKey = { kitKey: target.kitKey, fromVersion: installed.kitVersion, toVersion: target.kitVersion, deployId: input.deployId };

    if (input.mode === 'DRY_RUN') {
      const report: KitUpgradeReport = { ...diff, results: [] };
      const run = await this.repo.createRun(scope, { ...runKey, mode: 'DRY_RUN', status: 'PLANNED', report: JSON.stringify(report), actor: input.actor });
      const finished = await this.repo.finishRun(scope, run.id, { status: 'PLANNED', report: run.report });
      return { status: 'PLANNED', run: toRunSummary(finished), report };
    }

    if (!(await this.repo.findDryRun(scope, runKey))) {
      throw new KitUpgradeDryRunRequiredError(scope.unitId, runKey.fromVersion, runKey.toVersion, input.deployId);
    }
    const run = await this.repo.createRun(scope, { ...runKey, mode: 'APPLY', status: 'PLANNED', report: JSON.stringify({ ...diff, results: [] }), actor: input.actor });
    return this.apply(scope, installation, target, diff, run);
  }

  // ---------------------------------------------------------------------------
  // Privado
  // ---------------------------------------------------------------------------

  private assertCanManage(scope: BindingScope): void {
    if (!this.policy.canManageKit(scope)) throw new ForbiddenError('Você não tem permissão para atualizar o kit de setor.');
  }

  private async loadState(scope: BindingScope, target: SectorKitV1): Promise<TenantKitState> {
    const years = [...new Set(target.referential.map((b) => b.mappingVersion))];
    const active = await this.bindingRepo.findActive(scope, target.binding.sectorKey);
    const overrides = await this.overrideRepo.findLive(scope);
    return {
      ...(await this.state.load(years)),
      activeEventBindings: active ? (JSON.parse(active.payload) as { eventBindings: TenantKitState['activeEventBindings'] }).eventBindings : null,
      overrides: Object.fromEntries(overrides.map((o) => [o.role, o.account.code])),
    };
  }

  private async apply(
    scope: BindingScope,
    installation: KitInstallation,
    target: SectorKitV1,
    diff: KitDiff,
    run: KitUpgradeRun,
  ): Promise<KitUpgradeOutcome> {
    const results: Result[] = [];
    const attempt = async (itemKeys: string[], fn: () => Promise<'applied' | 'skipped'>) => {
      try {
        const outcome = await fn();
        for (const itemKey of itemKeys) results.push({ itemKey, outcome });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        for (const itemKey of itemKeys) results.push({ itemKey, outcome: 'failed', error: message });
      }
    };

    // (a) contas primeiro: os outros aditivos podem usar a conta nova
    for (const item of diff.additive.filter((i) => i.kind === 'account')) {
      const v = item.value as AccountItemValue;
      await attempt([item.itemKey], async () => ((await this.chart.createAccountIfAbsent(v)) === 'created' ? 'applied' : 'skipped'));
    }
    // (b) changed_account (E-12.2), antes do binding: é conta, não lançamento
    for (const item of diff.forward.filter((i) => i.kind === 'changed_account')) {
      const after = item.after as { code: string; name: string; nature: string };
      await attempt([item.itemKey], async () => {
        const out = await this.write.updateAccountIfUnused(after.code, { name: after.name, nature: after.nature });
        if (out === 'updated') return 'applied';
        throw new Error(out === 'in_use' ? `a conta ${after.code} ganhou partida desde o diff` : `a conta ${after.code} não está viva`);
      });
    }
    // (a) contas-padrão, por grupo (o serviço dono relê o nulo in-tx)
    for (const group of ['scopeSettings', 'fiscalProfile'] as const) {
      const items = diff.additive.filter((i) => i.kind === 'roleDefault' && (i.value as RoleDefaultItemValue).group === group);
      if (items.length === 0) continue;
      await attempt(items.map((i) => i.itemKey), async () => {
        const ids: Record<string, string> = {};
        for (const i of items) {
          const v = i.value as RoleDefaultItemValue;
          const id = await this.chart.findLiveAccountId(v.accountCode);
          if (!id) throw new Error(`a conta ${v.accountCode} não está viva`);
          ids[toIdField(v.field)] = id;
        }
        const written = group === 'scopeSettings' ? await this.roleDefaults.fillNullScopeSettings(ids) : await this.roleDefaults.fillNullFiscalProfile(ids);
        return written.length > 0 ? 'applied' : 'skipped';
      });
    }
    // (a) referencial, por versão (só conta sem mapeamento, relido agora)
    const refByVersion = new Map<string, Array<{ itemKey: string; v: ReferentialItemValue }>>();
    for (const item of diff.additive.filter((i) => i.kind === 'referential')) {
      const v = item.value as ReferentialItemValue;
      refByVersion.set(v.mappingVersion, [...(refByVersion.get(v.mappingVersion) ?? []), { itemKey: item.itemKey, v }]);
    }
    for (const [version, entries] of refByVersion) {
      await attempt(entries.map((e) => e.itemKey), async () => {
        const mapped = await this.referential.mappedAccountIds(version);
        const items: Array<{ accountId: string; referentialCode: string; label: string }> = [];
        for (const { v } of entries) {
          const accountId = await this.chart.findLiveAccountId(v.accountCode);
          if (!accountId) throw new Error(`a conta ${v.accountCode} não está viva`);
          if (!mapped.has(accountId)) items.push({ accountId, referentialCode: v.referentialCode, label: v.label });
        }
        if (items.length === 0) return 'skipped';
        await this.referential.batchSet(version, items);
        return 'applied';
      });
    }

    // (b) binding: um compile do alvo inteiro (os ajustes vivos entram pelo compile, item 25)
    const bindingItems = diff.forward.filter((i) => i.kind !== 'changed_account');
    const bindingVersionBefore = (await this.bindingRepo.findActive(scope, target.binding.sectorKey))?.bindingVersion;
    let bindingVersionAfter: number | undefined;
    if (bindingItems.length > 0) {
      await attempt(bindingItems.map((i) => i.itemKey), async () => {
        const compiled = await this.compileService.compile(scope, {
          sectorKey: target.binding.sectorKey,
          operationalSchema: target.operationalSchema,
          chart: await this.chart.listChart(),
          eventBindings: target.binding.eventBindings,
        });
        if (compiled.status !== 'Active') {
          const codes = [...compiled.validation.blocking.map((b) => b.code), ...compiled.coverage.missing.map((k) => `missing:${k}`)];
          throw new Error(`o compile do binding alvo deu Draft (v${compiled.binding.bindingVersion}): ${codes.join(', ')}`);
        }
        bindingVersionAfter = compiled.binding.bindingVersion;
        return 'applied';
      });
    }
    for (const c of diff.conflict) results.push({ itemKey: c.itemKey, outcome: 'pending' });

    const failed = results.some((r) => r.outcome === 'failed');
    const status: KitUpgradeRunStatus = failed ? 'FAILED' : 'APPLIED';
    const report: KitUpgradeReport = { ...diff, results, bindingVersionBefore, bindingVersionAfter };

    // commit 3: pendências + versão + relatório + auditoria, juntos
    const finished = await this.repo.runTransaction(async (tx) => {
      await this.repo.createPendingsIfAbsent(
        scope,
        diff.conflict.map((c) => ({
          kitKey: target.kitKey,
          toVersion: target.kitVersion,
          runId: run.id,
          itemKey: c.itemKey,
          reason: c.reason,
          kitValue: JSON.stringify(c.kitValue ?? null),
          tenantValue: JSON.stringify(c.tenantValue ?? null),
        })),
        tx,
      );
      if (!failed) {
        await this.kitRepo.advanceVersion(scope, installation.id, run.fromVersion, run.toVersion, tx);
        await this.audit.append(tx, scope, {
          eventType: KIT_UPGRADE_APPLIED,
          targetId: installation.id,
          payload: { fromVersion: run.fromVersion, toVersion: run.toVersion, ...counts(diff) },
        });
      }
      return this.repo.finishRun(scope, run.id, { status, report: JSON.stringify(report) }, tx);
    });
    return { status, run: toRunSummary(finished), report };
  }
}
