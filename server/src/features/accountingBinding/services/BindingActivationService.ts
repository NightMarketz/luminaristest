import { ForbiddenError, ValidationError } from '../../../lib/errors';
import type { ChartAccountSnapshot } from '../dtos/CompileBindingDto';
import type {
  ActivateDefaultBindingRequest,
  ActivateDefaultBindingResult,
  ActivationBlockingIssue,
} from '../dtos/ActivateDefaultBindingDto';
import { DEFAULT_SECTOR_KEY, SECTOR_BINDING_REGISTRY } from '../fixtures/sectorBindingRegistry';
import type { IAccountingBindingPolicy } from '../policies/IAccountingBindingPolicy';
import type { BindingScope, IAccountingBindingRepository } from '../repositories/IAccountingBindingRepository';
import type { KitInstallService } from '../../sectorKits/services/KitInstallService';
import { KitInstallStepFailedError } from '../../sectorKits/models/kitInstallTypes';

/**
 * Plano de contas do escopo, visto pelo módulo do binding. Porta (não import de
 * `features/accounting`) pela fronteira do `importBoundary.test.ts`; o adaptador real vive em
 * `lib/factory.ts`, fechado sobre o escopo — mesmo desenho do `ChartLookupPort`.
 */
export interface ActivationChartPort {
  listChart(): Promise<ChartAccountSnapshot[]>;
  /** Instala o plano canônico (`ChartOfAccountsFixture`) — cria-se-faltar, idempotente. */
  installCanonicalChart(): Promise<void>;
}

export type ActivationPeriodStatus = 'MISSING' | 'FUTURE' | 'OPEN' | 'SOFT_CLOSED' | 'HARD_CLOSED';

/** Período contábil do escopo, idem (adaptador real sobre `PeriodService` em `lib/factory.ts`). */
export interface ActivationPeriodPort {
  status(year: number, month: number): Promise<ActivationPeriodStatus>;
  /** seed-year do ano (idempotente) + open do mês. Só chamado com status MISSING ou FUTURE. */
  seedAndOpen(year: number, month: number): Promise<void>;
}

/**
 * LAC-B — `POST /accounting-binding/activate-default` (FE-INCR-BINDING-ACTIVATION-brief.md item 1–3
 * + emenda F-I3-1 → a). Desde o BE-INCR-KIT-SETOR PR-2 (item 11) ele INSTALA O KIT do setor, delegando ao
 * `KitInstallService`; o contrato HTTP e os pré-checks são os de antes:
 *
 *   1. policy (item 2) → 403;
 *   2. setor do registry (default = salão) — desconhecido ⇒ 400, nunca compila o binding de outro setor;
 *   3. kit já instalado ⇒ `already-active` com a versão Active e o `kit` (idempotência). Unidade sem
 *      `KitInstallation` mas com binding Active (setor fora do backfill da migração) ⇒ `already-active` como antes;
 *   4. PRÉ-CHECK sem efeito colateral: chart vazio sem `installChartIfEmpty` ⇒ `CHART_OF_ACCOUNTS_EMPTY`;
 *      período do mês corrente MISSING/FUTURE sem `openCurrentPeriodIfMissing` ⇒ `ACCOUNTING_PERIOD_NOT_OPEN`;
 *      período SOFT/HARD_CLOSED ⇒ `ACCOUNTING_PERIOD_NOT_OPEN` mesmo com a flag (a flag é "if missing":
 *      reabrir período fechado exige motivo e é ato do `reopen`, não desta rota); kit com contas-padrão do
 *      perfil fiscal e unidade sem perfil ⇒ `KIT_FISCAL_PROFILE_REQUIRED` (emenda E-5). Qualquer bloqueante
 *      ⇒ `status: 'Draft'` SEM gravar nada (decisão do dono 2026-09-25) — todos os bloqueantes são
 *      avaliados ANTES de qualquer escrita, então nunca sobra chart instalado com resposta bloqueada;
 *   5. `KitInstallService.install()` com as flags pedidas: 7 passos com commit próprio, e o compile é o MESMO
 *      `BindingCompileService.compile()` de `POST /compile` e do CLI. Exceção num passo ⇒ `Draft` com
 *      `KIT_INSTALL_STEP_FAILED { step }` (item 14); compile reprovado ⇒ o `Draft` de antes, com os
 *      bloqueantes do validador (emenda E-7). Uma nova chamada retoma do passo que falhou.
 *
 * "Mês corrente" = o `today` UTC que o dry-run do validador usa (`BindingValidationService.todayDateOnly`)
 * — é esse o mês que o gate `assertPeriodOpen` checa; abrir o mês de outro relógio deixaria o compile
 * Draft na virada de mês. O ano desse `today` é o ano do referencial (item 12).
 *
 * ponytail: o pré-check do passo 3 e a instalação são idas separadas ao banco (TOCTOU, mesmo teto aceito
 * no CLI): duas chamadas simultâneas podem ambas instalar; o compile pula quando já há Active e supersede
 * atomicamente, então sobra UMA Active (no pior caso, uma versão extra). Upgrade: mover o pré-check para
 * dentro da tx do `begin` da instalação.
 */
export class BindingActivationService {
  constructor(
    private readonly policy: IAccountingBindingPolicy,
    private readonly repo: IAccountingBindingRepository,
    private readonly kitInstaller: Pick<KitInstallService, 'install' | 'findInstallation' | 'resolveKit' | 'preconditions'>,
    private readonly chartPort: ActivationChartPort,
    private readonly periodPort: ActivationPeriodPort,
    private readonly today: () => string = () => new Date().toISOString().slice(0, 10),
  ) {}

  async activateDefault(
    scope: BindingScope,
    input: Omit<ActivateDefaultBindingRequest, 'unitId'>,
  ): Promise<ActivateDefaultBindingResult> {
    if (!this.policy.canActivateDefault(scope)) {
      throw new ForbiddenError('Você não tem permissão para ativar o binding contábil padrão.');
    }

    const sectorKey = input.sectorKey ?? DEFAULT_SECTOR_KEY;
    const entry = SECTOR_BINDING_REGISTRY[sectorKey];
    if (!entry) {
      throw new ValidationError(
        `Setor '${sectorKey}' não tem binding padrão. Setores conhecidos: ${Object.keys(SECTOR_BINDING_REGISTRY).join(', ')}.`,
      );
    }

    const installation = await this.kitInstaller.findInstallation(scope);
    if (installation?.status === 'INSTALLED' && installation.kitKey === sectorKey) {
      const active = await this.repo.findActive(scope, sectorKey);
      return { status: 'already-active', bindingVersion: active?.bindingVersion, kit: installation };
    }
    if (!installation) {
      const active = await this.repo.findActive(scope, sectorKey);
      if (active) return { status: 'already-active', bindingVersion: active.bindingVersion };
    }

    const today = this.today();
    const [year, month] = today.split('-').map(Number);
    const chart = await this.chartPort.listChart();
    const periodStatus = await this.periodPort.status(year, month);
    const period = `${year}-${String(month).padStart(2, '0')}`;

    const blocking: ActivationBlockingIssue[] = [];
    if (chart.length === 0 && !input.installChartIfEmpty) {
      blocking.push({
        code: 'CHART_OF_ACCOUNTS_EMPTY',
        message: 'O plano de contas da unidade está vazio. Envie installChartIfEmpty: true para instalar o plano padrão.',
      });
    }
    const periodMissing = periodStatus === 'MISSING' || periodStatus === 'FUTURE';
    if (periodMissing && !input.openCurrentPeriodIfMissing) {
      blocking.push({
        code: 'ACCOUNTING_PERIOD_NOT_OPEN',
        period,
        message: `O período ${period} não está aberto. Envie openCurrentPeriodIfMissing: true para abri-lo.`,
      });
    } else if (periodStatus === 'SOFT_CLOSED' || periodStatus === 'HARD_CLOSED') {
      blocking.push({
        code: 'ACCOUNTING_PERIOD_NOT_OPEN',
        period,
        message: `O período ${period} está fechado (${periodStatus}); reabra-o antes de ativar o binding.`,
      });
    }
    const kit = await this.kitInstaller.resolveKit(scope, sectorKey);
    if (kit) blocking.push(...(await this.kitInstaller.preconditions(kit)));
    if (blocking.length > 0) return { status: 'Draft', blocking };

    let outcome: Awaited<ReturnType<KitInstallService['install']>>;
    try {
      outcome = await this.kitInstaller.install(scope, {
        kitKey: sectorKey,
        ano: year,
        installChartIfEmpty: input.installChartIfEmpty ?? false,
        openCurrentPeriodIfMissing: input.openCurrentPeriodIfMissing ?? false,
        today,
      });
    } catch (error) {
      if (!(error instanceof KitInstallStepFailedError)) throw error;
      const failed = await this.kitInstaller.findInstallation(scope);
      return {
        status: 'Draft',
        blocking: [{ code: 'KIT_INSTALL_STEP_FAILED', step: error.step, message: error.message }],
        ...(failed ? { kit: failed } : {}),
      };
    }

    if (outcome.status === 'INSTALLED') return { status: 'Active', bindingVersion: outcome.bindingVersion, kit: outcome.kit };
    const result = outcome.compile;
    return {
      status: 'Draft',
      bindingVersion: result.binding.bindingVersion,
      blocking: [
        ...result.validation.blocking,
        ...result.coverage.missing.map((eventKey) => ({
          code: 'EVENT_COVERAGE_MISSING',
          message: `O evento '${eventKey}' é emitido pela operação instalada e não tem eventBinding.`,
        })),
      ],
      kit: outcome.kit,
    };
  }
}
