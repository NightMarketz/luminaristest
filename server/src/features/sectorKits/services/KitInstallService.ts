/**
 * KitInstallService — instalação do kit de setor (BE-INCR-KIT-SETOR, PR-2). FIRST-CLASS PRISMA.
 *
 * atomicUntil: passo do kit (sem tx única — cada serviço orquestrado abre a sua; F-KB-2 → Contrato §2.3)
 *   commit 1 — razão: nenhum postEntry. Os passos 1–7 commitam cada um no serviço dono (plano canônico, extensão,
 *              roleDefaults, período, compile do binding, perfis fiscais por serviço, referencial), em ordem fixa
 *              teste: KitInstallService.integration.test.ts › "instala o kit com conteúdo: os 7 passos em ordem"
 *   commit 2 — KitInstallation.steps = último passo concluído, gravado depois do commit do passo; no fim,
 *              status INSTALLED + `kit.installed` na mesma tx (falha: FAILED + `kit.install_failed`, steps preservado)
 *              teste: KitInstallService.integration.test.ts › "falha injetada no passo 6: FAILED, steps=5, Draft KIT_INSTALL_STEP_FAILED"
 *   reconcile — install() de novo: retoma do primeiro passo não concluído; cada passo é read-first idempotente
 *              (cria-se-falta, só campo nulo, compile só sem Active, upsert só sem perfil, batchSet só sem mapeamento)
 *              teste: KitInstallService.integration.test.ts › "retomada: a 2ª chamada retoma do passo 6 sem duplicar efeito"
 *              teste: KitInstallService.integration.test.ts › "idempotência: reexecutar os 7 passos sobre o tenant instalado não duplica nada"
 *   fora da tx — nada
 *
 * Ordem dos passos = emenda E-1 do BRIEF (dono, 08/10): o período abre ANTES do compile, porque o dry-run do
 * validador (`PostingService.validateEntry`) exige o mês aberto.
 *
 * Teto conhecido (o mesmo do `activate-default` e do CLI): se o processo morrer entre o commit de um passo e a
 * gravação de `steps`, a retomada reexecuta aquele passo — por isso cada passo é idempotente pelo estado, não
 * pelo `steps`. O compile é o único não idempotente por si (sempre nasce uma versão nova); o passo 5 pula quando
 * já há binding `Active` do setor.
 */
import { ForbiddenError, ValidationError } from '../../../lib/errors';
import type { BindingScope, IAccountingBindingRepository } from '../../accountingBinding/repositories/IAccountingBindingRepository';
import type { ActivationPeriodPort } from '../../accountingBinding/services/BindingActivationService';
import type { BindingCompileService, CompileBindingResult } from '../../accountingBinding/services/BindingCompileService';
import type { SectorKitV1 } from '../dtos/SectorKitDto';
import { InstallKitInputSchema, KitInstallStepsSchema, type InstallKitInput, type KitInstallSteps, type KitRef } from '../dtos/KitInstallationDto';
import {
  KIT_FISCAL_PROFILE_REQUIRED,
  KIT_INSTALL_FAILED,
  KIT_INSTALL_STEPS,
  KIT_INSTALLED,
  KitInstallStepFailedError,
  LAST_KIT_INSTALL_STEP,
  type KitInstallStatus,
  type KitInstallStep,
  type KitInstallWarning,
} from '../models/kitInstallTypes';
import type { ISectorKitPolicy } from '../policies/ISectorKitPolicy';
import type { IKitInstallationRepository } from '../repositories/IKitInstallationRepository';
import { KIT_REGISTRY } from '../registry';
import { applyRoleOverrides } from './applyRoleOverrides';
import type {
  IKitAuditPort,
  KitChartPort,
  KitReferentialPort,
  KitRegime,
  KitRegimePort,
  KitRoleDefaultsPort,
  KitServiceFiscalPort,
} from './kitInstallPorts';

/** Resultado de `install()`. Falha por exceção não volta aqui: vira `KitInstallStepFailedError` (item 14). */
export type KitInstallOutcome =
  | { status: 'INSTALLED'; kit: KitRef; bindingVersion?: number; warnings: KitInstallWarning[] }
  /** Emenda E-7: o compile terminou `Draft` (sem exceção). A resposta segue a de hoje (versão + bloqueantes). */
  | { status: 'COMPILE_DRAFT'; kit: KitRef; compile: CompileBindingResult };

export interface KitPreconditionIssue {
  code: typeof KIT_FISCAL_PROFILE_REQUIRED;
  message: string;
}

/** Versões publicadas de um kit, em ordem (o `KIT_REGISTRY`, injetável para o teste com kit de conteúdo). */
export type KitVersionsLookup = (kitKey: string) => readonly SectorKitV1[] | undefined;

type StepResult = { warnings?: KitInstallWarning[]; compileDraft?: CompileBindingResult; bindingVersion?: number };

function toAccountIdFields(codes: Record<string, string | undefined>): Array<[field: string, code: string]> {
  // `xxxAccountCode` do kit (§3.1) → `xxxAccountId` da linha (schema.prisma).
  return Object.entries(codes)
    .filter((e): e is [string, string] => typeof e[1] === 'string')
    .map(([field, code]) => [field.replace(/AccountCode$/, 'AccountId'), code]);
}

export class KitInstallService {
  constructor(
    private readonly policy: ISectorKitPolicy,
    private readonly repo: IKitInstallationRepository,
    private readonly bindingRepo: Pick<IAccountingBindingRepository, 'findActive'>,
    private readonly compileService: Pick<BindingCompileService, 'compile'>,
    private readonly chart: KitChartPort,
    private readonly period: ActivationPeriodPort,
    private readonly roleDefaults: KitRoleDefaultsPort,
    private readonly serviceFiscal: KitServiceFiscalPort,
    private readonly referential: KitReferentialPort,
    private readonly regime: KitRegimePort,
    private readonly audit: IKitAuditPort,
    private readonly kitVersions: KitVersionsLookup = (kitKey) => KIT_REGISTRY[kitKey],
  ) {}

  /** A instalação viva da unidade, como aparece na resposta do `activate-default` (item 11). */
  async findInstallation(scope: BindingScope): Promise<KitRef | null> {
    const row = await this.repo.findByScope(scope);
    return row ? { kitKey: row.kitKey, kitVersion: row.kitVersion, status: row.status as KitInstallStatus } : null;
  }

  /** O kit que `install()` usaria: a versão já registrada na unidade (retomada) ou a última publicada. */
  async resolveKit(scope: BindingScope, kitKey: string): Promise<SectorKitV1 | undefined> {
    const versions = this.kitVersions(kitKey);
    if (!versions || versions.length === 0) return undefined;
    const row = await this.repo.findByScope(scope);
    if (row && row.kitKey === kitKey) return versions.find((k) => k.kitVersion === row.kitVersion);
    return versions[versions.length - 1];
  }

  /**
   * Pré-check sem efeito (emenda E-5): kit com `roleDefaults.fiscalProfile` exige `FiscalProfile` na unidade.
   * O perfil se preenche pelo `PUT /accounting/fiscal-profile`; nada é escrito aqui.
   */
  async preconditions(kit: SectorKitV1): Promise<KitPreconditionIssue[]> {
    if (Object.keys(kit.roleDefaults.fiscalProfile).length === 0) return [];
    if (await this.roleDefaults.hasFiscalProfile()) return [];
    return [
      {
        code: KIT_FISCAL_PROFILE_REQUIRED,
        message:
          `O kit '${kit.kitKey}' traz contas-padrão do perfil fiscal, e a unidade não tem perfil fiscal. ` +
          'Cadastre o perfil fiscal da unidade antes de instalar o kit.',
      },
    ];
  }

  async install(scope: BindingScope, rawInput: InstallKitInput): Promise<KitInstallOutcome> {
    if (!this.policy.canInstallKit(scope)) throw new ForbiddenError('Você não tem permissão para instalar o kit de setor.');
    const input = InstallKitInputSchema.parse(rawInput);

    const existing = await this.repo.findByScope(scope);
    if (existing && existing.kitKey !== input.kitKey) {
      // Item 9: um kit por unidade (dois colidiriam no mapper `unitId:sourceType`).
      throw new ValidationError(
        `A unidade já tem o kit '${existing.kitKey}' (status ${existing.status}); um kit por unidade — não instala '${input.kitKey}'.`,
      );
    }
    const kit = await this.resolveKit(scope, input.kitKey);
    if (!kit) throw new ValidationError(`KIT_UNKNOWN: kit '${input.kitKey}' não existe.`);
    const ref = (status: KitInstallStatus): KitRef => ({ kitKey: kit.kitKey, kitVersion: kit.kitVersion, status });

    if (existing?.status === 'INSTALLED') {
      const active = await this.bindingRepo.findActive(scope, kit.binding.sectorKey);
      const steps = KitInstallStepsSchema.parse(JSON.parse(existing.steps));
      return { status: 'INSTALLED', kit: ref('INSTALLED'), bindingVersion: active?.bindingVersion, warnings: steps.warnings };
    }

    const row = await this.repo.begin(scope, { kitKey: kit.kitKey, kitVersion: kit.kitVersion });
    let steps = KitInstallStepsSchema.parse(JSON.parse(row.steps));
    let bindingVersion: number | undefined;

    for (let step = steps.lastCompletedStep + 1; step <= LAST_KIT_INSTALL_STEP; step++) {
      let result: StepResult;
      try {
        result = await this.runStep(step as KitInstallStep, scope, kit, input);
      } catch (error) {
        await this.fail(scope, row.id, kit, steps, step as KitInstallStep);
        throw new KitInstallStepFailedError(step as KitInstallStep, error instanceof Error ? error.message : String(error));
      }
      if (result.compileDraft) {
        await this.fail(scope, row.id, kit, steps, step as KitInstallStep);
        return { status: 'COMPILE_DRAFT', kit: ref('FAILED'), compile: result.compileDraft };
      }
      bindingVersion = result.bindingVersion ?? bindingVersion;
      const warnings = [...new Set([...steps.warnings, ...(result.warnings ?? [])])];
      steps = { lastCompletedStep: step, warnings };
      if (step < LAST_KIT_INSTALL_STEP) await this.repo.saveSteps(scope, row.id, steps);
    }

    await this.repo.runTransaction(async (tx) => {
      await this.repo.finish(scope, row.id, 'INSTALLED', steps, tx);
      await this.audit.append(tx, scope, {
        eventType: KIT_INSTALLED,
        targetId: row.id,
        payload: { kitKey: kit.kitKey, kitVersion: kit.kitVersion, unitId: scope.unitId },
      });
    });
    bindingVersion ??= (await this.bindingRepo.findActive(scope, kit.binding.sectorKey))?.bindingVersion;
    return { status: 'INSTALLED', kit: ref('INSTALLED'), bindingVersion, warnings: steps.warnings };
  }

  private async fail(scope: BindingScope, id: string, kit: SectorKitV1, steps: KitInstallSteps, step: KitInstallStep): Promise<void> {
    await this.repo.runTransaction(async (tx) => {
      await this.repo.finish(scope, id, 'FAILED', steps, tx);
      await this.audit.append(tx, scope, {
        eventType: KIT_INSTALL_FAILED,
        targetId: id,
        payload: { kitKey: kit.kitKey, kitVersion: kit.kitVersion, step },
      });
    });
  }

  private runStep(step: KitInstallStep, scope: BindingScope, kit: SectorKitV1, input: InstallKitInput): Promise<StepResult> {
    switch (step) {
      case KIT_INSTALL_STEPS.CANONICAL_CHART:
        return this.stepCanonicalChart(input);
      case KIT_INSTALL_STEPS.CHART_EXTENSION:
        return this.stepChartExtension(kit);
      case KIT_INSTALL_STEPS.ROLE_DEFAULTS:
        return this.stepRoleDefaults(kit);
      case KIT_INSTALL_STEPS.PERIOD:
        return this.stepPeriod(input);
      case KIT_INSTALL_STEPS.COMPILE:
        return this.stepCompile(scope, kit);
      case KIT_INSTALL_STEPS.SERVICE_FISCAL_DEFAULTS:
        return this.stepServiceFiscalDefaults(kit);
      case KIT_INSTALL_STEPS.REFERENTIAL:
        return this.stepReferential(kit, input);
    }
  }

  /** Passo 1 — plano canônico, só com o plano vazio (o mesmo critério do `activate-default` de hoje). */
  private async stepCanonicalChart(input: InstallKitInput): Promise<StepResult> {
    const chart = await this.chart.listChart();
    if (chart.length > 0) return {};
    if (!input.installChartIfEmpty) {
      throw new ValidationError('CHART_OF_ACCOUNTS_EMPTY: o plano de contas da unidade está vazio e a instalação não foi autorizada.');
    }
    await this.chart.installCanonicalChart();
    return {};
  }

  /** Passo 2 — extensão do plano: cria o que falta, nunca restaura conta apagada. */
  private async stepChartExtension(kit: SectorKitV1): Promise<StepResult> {
    for (const account of kit.chartExtension) await this.chart.createAccountIfAbsent(account);
    return {};
  }

  /** Passo 3 — contas-padrão por papel, só nos campos nulos (regra Odoo: o modelo preenche, nunca sobrescreve). */
  private async stepRoleDefaults(kit: SectorKitV1): Promise<StepResult> {
    const resolve = async (codes: Record<string, string | undefined>): Promise<Record<string, string>> => {
      const out: Record<string, string> = {};
      for (const [field, code] of toAccountIdFields(codes)) {
        const id = await this.chart.findLiveAccountId(code);
        if (id) out[field] = id; // conta apagada pelo contador: o campo fica como está
      }
      return out;
    };
    const settings = await resolve(kit.roleDefaults.scopeSettings);
    if (Object.keys(settings).length > 0) await this.roleDefaults.fillNullScopeSettings(settings);
    const fiscal = await resolve(kit.roleDefaults.fiscalProfile);
    if (Object.keys(fiscal).length > 0) await this.roleDefaults.fillNullFiscalProfile(fiscal);
    return {};
  }

  /** Passo 4 — período do mês, só se ausente/FUTURE e autorizado (o CLI nunca abre, como hoje). */
  private async stepPeriod(input: InstallKitInput): Promise<StepResult> {
    const [year, month] = input.today.split('-').map(Number);
    const status = await this.period.status(year, month);
    if ((status === 'MISSING' || status === 'FUTURE') && input.openCurrentPeriodIfMissing) {
      await this.period.seedAndOpen(year, month);
    }
    return {};
  }

  /** Passo 5 — compile do binding do kit (com o ajuste papel→conta, identidade no PR-2). Pula se já há Active. */
  private async stepCompile(scope: BindingScope, kit: SectorKitV1): Promise<StepResult> {
    const active = await this.bindingRepo.findActive(scope, kit.binding.sectorKey);
    if (active) return { bindingVersion: active.bindingVersion };
    const result = await this.compileService.compile(scope, {
      sectorKey: kit.binding.sectorKey,
      operationalSchema: kit.operationalSchema,
      chart: await this.chart.listChart(),
      eventBindings: applyRoleOverrides(kit.binding.eventBindings),
    });
    return result.status === 'Active' ? { bindingVersion: result.binding.bindingVersion } : { compileDraft: result };
  }

  /** Passo 6 — padrões fiscais por serviço, só onde não há perfil. */
  private async stepServiceFiscalDefaults(kit: SectorKitV1): Promise<StepResult> {
    for (const d of kit.serviceFiscalDefaults) {
      if (await this.serviceFiscal.hasProfile(d.serviceRef)) continue;
      await this.serviceFiscal.upsert(d.serviceRef, { cTribNac: d.cTribNac, cNBS: d.cNBS, cIndOp: d.cIndOp });
    }
    return {};
  }

  /** Passo 7 — referencial do regime × ano (itens 12–13; emenda E-6: `mappingVersion == ano`). */
  private async stepReferential(kit: SectorKitV1, input: InstallKitInput): Promise<StepResult> {
    if (kit.referential.length === 0) return {};
    const regime = input.regime !== undefined ? input.regime : await this.resolveRegime(input.ano);
    if (!regime) return { warnings: ['KIT_REFERENTIAL_SKIPPED_NO_REGIME'] };

    const version = String(input.ano);
    const blocks = kit.referential.filter((r) => r.regime === regime && r.mappingVersion === version);
    if (blocks.length === 0) return {};
    if (!(await this.referential.catalogLoaded(version))) return { warnings: ['KIT_REFERENTIAL_SKIPPED_NO_CATALOG'] };

    const mapped = await this.referential.mappedAccountIds(version);
    const items: Array<{ accountId: string; referentialCode: string; label: string }> = [];
    for (const entry of blocks.flatMap((b) => b.entries)) {
      const accountId = await this.chart.findLiveAccountId(entry.accountCode);
      if (!accountId || mapped.has(accountId)) continue;
      mapped.add(accountId);
      items.push({ accountId, referentialCode: entry.referentialCode, label: entry.label });
    }
    if (items.length > 0) await this.referential.batchSet(version, items);
    return {};
  }

  /** Item 12: `CompanyFiscalProfile.regime` do ano; senão `FiscalProfile.regimeTributario` da unidade; senão nenhum. */
  private async resolveRegime(ano: number): Promise<KitRegime | null> {
    return (await this.regime.companyRegime(ano)) ?? (await this.regime.unitRegime());
  }
}
