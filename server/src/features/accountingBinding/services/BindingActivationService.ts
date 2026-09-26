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
import type { BindingCompileService } from './BindingCompileService';

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
 * + emenda F-I3-1 → a). Equivalente HTTP de `jobs/activateAccountingBindingCli.ts`:
 *
 *   1. policy (item 2) → 403;
 *   2. setor do registry (default = salão) — desconhecido ⇒ 400, nunca compila o binding de outro setor;
 *   3. Active já existente ⇒ `already-active`, sem compilar (idempotência, mesmo pré-check do CLI);
 *   4. PRÉ-CHECK sem efeito colateral: chart vazio sem `installChartIfEmpty` ⇒ `CHART_OF_ACCOUNTS_EMPTY`;
 *      período do mês corrente MISSING/FUTURE sem `openCurrentPeriodIfMissing` ⇒ `ACCOUNTING_PERIOD_NOT_OPEN`;
 *      período SOFT/HARD_CLOSED ⇒ `ACCOUNTING_PERIOD_NOT_OPEN` mesmo com a flag (a flag é "if missing":
 *      reabrir período fechado exige motivo e é ato do `reopen`, não desta rota). Qualquer bloqueante
 *      ⇒ `status: 'Draft'` SEM gravar versão (decisão do dono 2026-09-25) — todos os bloqueantes são
 *      avaliados ANTES de qualquer escrita, então nunca sobra chart instalado com resposta bloqueada;
 *   5. aplica as flags pedidas, depois `BindingCompileService.compile()` — o MESMO caminho de
 *      `POST /compile` e do CLI (validador real, auditoria `binding.*` da cadeia existente, nenhum
 *      eventType novo — item 5).
 *
 * "Mês corrente" = o `today` UTC que o dry-run do validador usa (`BindingValidationService.todayDateOnly`)
 * — é esse o mês que o gate `assertPeriodOpen` checa; abrir o mês de outro relógio deixaria o compile
 * Draft na virada de mês.
 *
 * ponytail: o pré-check do passo 3 e o compile são idas separadas ao banco (TOCTOU, mesmo teto aceito
 * no CLI): duas chamadas simultâneas podem ambas compilar; o compile supersede atomicamente, sobra UMA
 * Active e uma versão extra. Upgrade: mover o pré-check para dentro da tx do compile.
 */
export class BindingActivationService {
  constructor(
    private readonly policy: IAccountingBindingPolicy,
    private readonly repo: IAccountingBindingRepository,
    private readonly compileService: Pick<BindingCompileService, 'compile'>,
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

    const active = await this.repo.findActive(scope, sectorKey);
    if (active) return { status: 'already-active', bindingVersion: active.bindingVersion };

    const [year, month] = this.today().split('-').map(Number);
    const chart = await this.chartPort.listChart();
    const periodStatus = await this.periodPort.status(year, month);
    const periodLabel = `${year}/${String(month).padStart(2, '0')}`;

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
        message: `O período ${periodLabel} não está aberto. Envie openCurrentPeriodIfMissing: true para abri-lo.`,
      });
    } else if (periodStatus === 'SOFT_CLOSED' || periodStatus === 'HARD_CLOSED') {
      blocking.push({
        code: 'ACCOUNTING_PERIOD_NOT_OPEN',
        message: `O período ${periodLabel} está fechado (${periodStatus}); reabra-o antes de ativar o binding.`,
      });
    }
    if (blocking.length > 0) return { status: 'Draft', blocking };

    let chartSnapshot = chart;
    if (chart.length === 0) {
      await this.chartPort.installCanonicalChart();
      chartSnapshot = await this.chartPort.listChart();
    }
    if (periodMissing) await this.periodPort.seedAndOpen(year, month);

    const result = await this.compileService.compile(scope, {
      sectorKey,
      operationalSchema: entry.operationalSchema,
      chart: chartSnapshot,
      eventBindings: entry.binding.eventBindings,
    });

    if (result.status === 'Active') return { status: 'Active', bindingVersion: result.binding.bindingVersion };
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
    };
  }
}
