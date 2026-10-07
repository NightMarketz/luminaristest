import logger from '../../../lib/logger';
import { ForbiddenError, OnboardingRolledBackError, OnboardingRollbackFailedError } from '../../../lib/errors';
import type { UserContext } from '../../../types/UserContext';
import type { DynamicTableService } from '../../dynamicTables/services/DynamicTableService';
import type { PresetTableDefinition } from '../../dynamicTables/presets';
import type { UnitInput } from '../../dynamicTables/dtos/CreateDashboard.dto';
import { UpsertCompanyFiscalProfileSchema } from '../../accounting/dtos/CompanyFiscalProfileDto';
import type { OnboardingFiscalInput } from '../../accounting/dtos/CompanyFiscalProfileDto';
import { anoCorrente } from '../../accounting/services/CompanyFiscalProfileService';
import type { CompanyFiscalProfileService } from '../../accounting/services/CompanyFiscalProfileService';
import type { ObrigacaoResolvida } from '../../accounting/models/obrigacoesPorRegime';
import { resolveAccountingScope } from '../../accounting/scope/AccountingScope';
import type { IActionProposalRepository } from '../../chat/repositories/IActionProposalRepository';
import type { IKnowledgeGraphRepository } from '../../chat/repositories/IKnowledgeGraphRepository';
import type { ISystemProvisioningPolicy } from '../policies/ISystemProvisioningPolicy';

/** O que o serviço usa do motor de tabelas (por interface — os testes injetam fakes). */
export type ProvisioningTableService = Pick<
  DynamicTableService,
  'getTablesForUser' | 'installPresetAsSystem' | 'createTableData' | 'deleteAllTablesForUser'
>;
/** O que o serviço usa do perfil fiscal da empresa. */
export type ProvisioningFiscalService = Pick<CompanyFiscalProfileService, 'upsert' | 'resolverObrigacoesDoAno'>;

export interface ProvisionInput {
  /** Já montado (Rápido via `buildQuickPreset`, Controle Total pelo controller). */
  preset: { tables: Record<string, PresetTableDefinition> };
  unit: UnitInput;
  fiscal?: OnboardingFiscalInput;
}

export interface FiscalDoOnboarding {
  status: 'criado' | 'pendente';
  ano: number;
  obrigacoes?: ObrigacaoResolvida[];
}

export interface ProvisionResult {
  /** O Controle Total espalha este resultado na resposta do create. */
  installResult: Awaited<ReturnType<DynamicTableService['installPresetAsSystem']>>;
  /** Id da linha de `units`. */
  unitId: string;
  fiscal: FiscalDoOnboarding;
}

export interface ISystemProvisioningService {
  /**
   * Guarda one-shot isolada (policy + contagem de tabelas). O controller a chama ANTES de montar o preset, para o 403
   * continuar vindo antes de qualquer 404/400 de montagem (ordem de hoje); o `provision` a repete.
   * @throws ForbiddenError
   */
  assertCanProvision(ctx: UserContext): Promise<void>;
  /** @throws ForbiddenError | OnboardingRolledBackError | OnboardingRollbackFailedError */
  provision(ctx: UserContext, input: ProvisionInput): Promise<ProvisionResult>;
  /** Compensação do onboarding + "Resetar sistema" (o nó I7 separa as duas intenções depois). */
  purgeUserSystem(userId: string): Promise<void>;
}

/**
 * BE-INCR-SEED-UNIDADE-E-ENV (nó SEED-UNITS; F-S1 → a1, F-P1..F-P3, F-P7) — monta o sistema de um usuário: instala o
 * preset, cria a 1ª linha de `units` e (com regime conhecido) o perfil fiscal da empresa. Serve o onboarding HTTP
 * (Rápido e Controle Total) e o seed contábil. Integração cross-módulo (motor de tabelas × contabilidade) mora aqui —
 * nível de serviço de integração, nunca dentro do motor (Contrato §2.1; `no-accounting-imports.boundary.test.ts`).
 *
 * atomicUntil: cada passo é um commit PRÓPRIO — instalação do preset; linha de `units` (+ plugins) pelo caminho normal
 * de escrita (F-I1-1 → b); perfil fiscal. Sem "mesma tx". Reconcile = a compensação (`purgeUserSystem`) que desfaz o
 * que foi instalado quando a unidade ou o perfil falham. Janela residual declarada no BRIEF do I1: entre a instalação e
 * a compensação, um 2º create concorrente do mesmo usuário vê o 403.
 */
export class SystemProvisioningService implements ISystemProvisioningService {
  constructor(
    private readonly tables: ProvisioningTableService,
    private readonly companyFiscalProfile: ProvisioningFiscalService,
    private readonly actionProposals: IActionProposalRepository,
    private readonly knowledgeGraphs: IKnowledgeGraphRepository,
    private readonly policy: ISystemProvisioningPolicy,
  ) {}

  async assertCanProvision(ctx: UserContext): Promise<void> {
    const existing = await this.tables.getTablesForUser(ctx.userId);
    if (!this.policy.canProvision(ctx, existing.length)) {
      throw new ForbiddenError('Setup já foi concluído. Este usuário já possui tabelas.');
    }
  }

  async provision(ctx: UserContext, input: ProvisionInput): Promise<ProvisionResult> {
    await this.assertCanProvision(ctx);
    const installResult = await this.tables.installPresetAsSystem(ctx.id, input.preset);
    const unitId = await this.createFirstUnitOrRollback(ctx, input.unit);
    const fiscal = await this.createCompanyFiscalProfileOrRollback(ctx, unitId, input.fiscal);
    return { installResult, unitId, fiscal };
  }

  /**
   * Limpa o sistema gerado do usuário: tabelas dinâmicas + KnowledgeGraph + ActionProposals (R27) — pelos donos
   * canônicos de cada tabela (F-P3 → c). O agente não injeta referências a tabelas apagadas.
   */
  async purgeUserSystem(userId: string): Promise<void> {
    await this.tables.deleteAllTablesForUser(userId);
    await this.knowledgeGraphs.deleteByUserId(userId);
    await this.actionProposals.deleteByUserId(userId);
  }

  /**
   * Passo 2 (BE-INCR-ONBOARDING-FIRST-UNIT, I1; F-I1-1 → b, F-I1-4 → b): a 1ª linha de `units` nasce pelo caminho de
   * escrita NORMAL (`createTableData`), para que os plugins de `units` rodem (pipeline de CRM, estoque por unidade).
   * `units` é tabela do Core — sempre instalada. Falha ⇒ compensação.
   */
  private async createFirstUnitOrRollback(ctx: UserContext, unit: UnitInput): Promise<string> {
    try {
      const unitsTable = (await this.tables.getTablesForUser(ctx.userId)).find((t) => t.internalName === 'units');
      if (!unitsTable) throw new Error("Tabela 'units' ausente após a instalação do preset.");
      const data: Record<string, unknown> = { name: unit.name };
      if (unit.cnpj) data.cnpj = unit.cnpj;
      if (unit.type) data.type = unit.type;
      const row = await this.tables.createTableData(ctx, unitsTable.id, { data });
      return row.id;
    } catch (error) {
      logger.error(`Onboarding: falha ao criar a primeira unidade do usuário ${ctx.userId} — compensando.`, { error });
      throw await this.compensate(ctx, error, {
        rolledBack: (detail) => `Não foi possível criar a unidade (${detail}). A instalação foi desfeita; tente novamente.`,
        rollbackFailed: 'A unidade não foi criada e a limpeza do sistema instalado falhou. Use "Resetar sistema" antes de tentar de novo.',
      });
    }
  }

  /**
   * X13 PR-3 itens 19 e 21 (F-OBP-6 → c) — passo 3, DEPOIS da unidade: com regime conhecido, nasce o perfil fiscal da
   * EMPRESA do ano corrente (fuso do escopo) pelo serviço da contabilidade (policy + auditoria + gates dele). `NAO_SEI`
   * ou bloco ausente ⇒ nada é criado e o resumo diz `pendente`. O `FiscalProfile` da UNIDADE não é criado aqui —
   * lacuna de spec L-PR3-1 (o F-X6-6 a proíbe inventar `icmsContribuinte`/`pisCofinsRegime`). Falha ⇒ compensação.
   */
  private async createCompanyFiscalProfileOrRollback(
    ctx: UserContext,
    unitId: string,
    fiscal: OnboardingFiscalInput | undefined,
  ): Promise<FiscalDoOnboarding> {
    const scope = resolveAccountingScope(ctx, unitId);
    const ano = anoCorrente(scope);
    if (!fiscal || fiscal.regime === 'NAO_SEI') return { status: 'pendente', ano };
    const regime = fiscal.regime;
    try {
      const input = UpsertCompanyFiscalProfileSchema.parse({ unitId, regime, grandePorte: fiscal.grandePorte ?? null });
      const perfil = await this.companyFiscalProfile.upsert(scope, ano, input);
      return { status: 'criado', ano, obrigacoes: await this.companyFiscalProfile.resolverObrigacoesDoAno(ano, { regime, inativa: perfil.inativa, condicoes: perfil.condicoes }) };
    } catch (error) {
      logger.error(`Onboarding: falha ao criar o perfil fiscal da empresa do usuário ${ctx.userId} — compensando.`, { error });
      throw await this.compensate(ctx, error, {
        rolledBack: (detail) => `Não foi possível criar o perfil fiscal da empresa (${detail}). A instalação foi desfeita; tente novamente.`,
        rollbackFailed: 'O perfil fiscal não foi criado e a limpeza do sistema instalado falhou. Use "Resetar sistema" antes de tentar de novo.',
      });
    }
  }

  /** Purga o sistema recém-instalado e devolve o erro tipado a lançar (desfeito × desfazer falhou). */
  private async compensate(
    ctx: UserContext,
    cause: unknown,
    messages: { rolledBack: (detail: string) => string; rollbackFailed: string },
  ): Promise<OnboardingRolledBackError | OnboardingRollbackFailedError> {
    try {
      await this.purgeUserSystem(ctx.userId);
    } catch (purgeError) {
      logger.error(`Onboarding: a compensação falhou para o usuário ${ctx.userId}.`, { purgeError });
      return new OnboardingRollbackFailedError(messages.rollbackFailed);
    }
    const detail = cause instanceof Error ? cause.message : String(cause);
    return new OnboardingRolledBackError(messages.rolledBack(detail));
  }
}
