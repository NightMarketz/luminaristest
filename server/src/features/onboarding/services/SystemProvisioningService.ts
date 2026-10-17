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
import { UpsertFiscalProfileSchema } from '../../accounting/dtos/FiscalProfileDto';
import type { FiscalProfileService } from '../../accounting/services/FiscalProfileService';
import { deriveUnitFiscalProfile } from './deriveUnitFiscalProfile';
import type { ObrigacaoResolvida } from '../../accounting/models/obrigacoesPorRegime';
import { scopeToday } from '../../accounting/models/dates';
import { resolveAccountingScopeInternal } from '../../accounting/scope/resolveAccountingScopeInternal';
import type { IActionProposalRepository } from '../../chat/repositories/IActionProposalRepository';
import type { IKnowledgeGraphRepository } from '../../chat/repositories/IKnowledgeGraphRepository';
import type { IDashboardLayoutRepository } from '../../dashboardLayout/repositories/IDashboardLayoutRepository';
import type { IChatInstanceRepository } from '../../chatInstances/repositories/IChatInstanceRepository';
import type { ISavedTableViewRepository } from '../../savedViews/repositories/ISavedTableViewRepository';
import type { ICrmReportDefinitionRepository } from '../../crm/repositories/ICrmReportDefinitionRepository';
import type { IAttachmentRepository } from '../../attachments/repositories/IAttachmentRepository';
import type { KpiCacheService } from '../../analytics/services/KpiCacheService';
import type { IAccountingScopeResetService } from '../../accounting/services/AccountingScopeResetService';
import type { ISystemProvisioningPolicy } from '../policies/ISystemProvisioningPolicy';

/** O que o serviço usa do motor de tabelas (por interface — os testes injetam fakes). */
export type ProvisioningTableService = Pick<
  DynamicTableService,
  'getTablesForUser' | 'installPresetAsSystem' | 'createTableData' | 'deleteAllTablesForUser'
>;
/** O que o serviço usa do perfil fiscal da empresa. */
export type ProvisioningFiscalService = Pick<CompanyFiscalProfileService, 'upsert' | 'resolverObrigacoesEm'>;
/** O que o serviço usa do perfil fiscal da UNIDADE (passo 3b). */
export type ProvisioningUnitFiscalService = Pick<FiscalProfileService, 'upsert'>;

/**
 * Donos canônicos do que o "Resetar sistema" purga além das tabelas/KG/proposals (BE-INCR-RESET-CONSISTENTE item 2,
 * F-I7-2 → "tudo, menos Documentos"). Por interface — os testes injetam fakes.
 */
export interface SystemResetOwners {
  /** Item 12 (F-I7-1): gate de movimento + remoção do SETUP contábil — serviço da contabilidade, por interface. */
  accountingReset: Pick<IAccountingScopeResetService, 'purgeSetupIfNoMovement'>;
  dashboardLayouts: Pick<IDashboardLayoutRepository, 'deleteByUserId'>;
  chatInstances: Pick<IChatInstanceRepository, 'deleteByUserId'>;
  savedTableViews: Pick<ISavedTableViewRepository, 'softDeleteByUserId'>;
  crmReportDefinitions: Pick<ICrmReportDefinitionRepository, 'softDeleteByUserId'>;
  attachments: Pick<IAttachmentRepository, 'softDeleteByUserId'>;
  /** Remoção do binário do anexo (`lib/attachmentStorage.deleteFile`). */
  attachmentStorage: { deleteFile(storageKey: string): Promise<void> };
  /** Cache de KPI em memória (E4) — invalidado no fim do reset. */
  kpiCache: Pick<KpiCacheService, 'invalidate'>;
}

export interface ProvisionInput {
  /** Já montado (Rápido via `buildQuickPreset`, Controle Total pelo controller). */
  preset: { tables: Record<string, PresetTableDefinition> };
  unit: UnitInput;
  fiscal?: OnboardingFiscalInput;
  /** Setor do binding (I4 item 9; `null` = preset sem setor). Só pesa no Lucro Real do passo 3b (F-I4-8 a). */
  sectorKey?: string | null;
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
  /**
   * "Resetar sistema" (`DELETE /dashboard/system`, nó I7): tabelas + KG + proposals + layouts, chats, visões salvas,
   * relatórios e anexos do CRM; `Document` fica (F-I7-2). Antes de tudo, a configuração contábil sem movimento sai pelo
   * serviço da contabilidade (F-I7-1). Idempotente: sistema vazio passa sem lançar.
   * @throws ForbiddenError | SystemResetBlockedByAccountingError
   */
  resetUserSystem(ctx: UserContext): Promise<void>;
}

/**
 * BE-INCR-SEED-UNIDADE-E-ENV (nó SEED-UNITS; F-S1 → a1, F-P1..F-P3, F-P7) — monta o sistema de um usuário: instala o
 * preset, cria a 1ª linha de `units` e (com regime conhecido) o perfil fiscal da empresa. Serve o onboarding HTTP
 * (Rápido e Controle Total) e o seed contábil. Integração cross-módulo (motor de tabelas × contabilidade) mora aqui —
 * nível de serviço de integração, nunca dentro do motor (Contrato §2.1; `no-accounting-imports.boundary.test.ts`).
 *
 * atomicUntil: cada passo é um commit PRÓPRIO — instalação do preset; linha de `units` (+ plugins) pelo caminho normal
 * de escrita (F-I1-1 → b); perfil fiscal. Sem "mesma tx". Reconcile = a compensação (`compensateProvisioning`) que desfaz o
 * que foi instalado quando a unidade ou o perfil falham. Janela residual declarada no BRIEF do I1: entre a instalação e
 * a compensação, um 2º create concorrente do mesmo usuário vê o 403.
 */
export class SystemProvisioningService implements ISystemProvisioningService {
  constructor(
    private readonly tables: ProvisioningTableService,
    private readonly companyFiscalProfile: ProvisioningFiscalService,
    private readonly unitFiscalProfile: ProvisioningUnitFiscalService,
    private readonly actionProposals: IActionProposalRepository,
    private readonly knowledgeGraphs: IKnowledgeGraphRepository,
    private readonly policy: ISystemProvisioningPolicy,
    private readonly resetOwners: SystemResetOwners,
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
    await this.createUnitFiscalProfileOrLog(ctx, unitId, input.fiscal, input.sectorKey);
    return { installResult, unitId, fiscal };
  }

  /**
   * BE-INCR-RESET-CONSISTENTE itens 1–3 (F-I7-2): a compensação (passos 1–3) e, depois, o resto do que o usuário
   * construiu sobre o sistema — cada um pelo dono canônico, nenhum `prisma.*` aqui. Ordem do BRIEF; o binário do anexo
   * sai best-effort (falha ⇒ `logger.warn`, o reset segue). `Document` NÃO é tocado. Por fim, o cache de KPI.
   *
   * Item 12 (F-I7-1): PRIMEIRO o reset contábil (`purgeSetupIfNoMovement`) — se ele lança o 409, nada não contábil foi
   * apagado. Integração cross-módulo no nível de serviço de integração, nunca pelo motor (Contrato §2.1).
   *
   * atomicUntil: commit 1 = o reset contábil (uma tx: gate + evento na trilha + remoção do SETUP); depois, cada dono não
   * contábil é um commit próprio. Sem "mesma tx". Reconcile = rodar o reset de novo: idempotente (a contabilidade já
   * vazia passa direto).
   */
  async resetUserSystem(ctx: UserContext): Promise<void> {
    if (!this.policy.canResetSystem(ctx)) {
      throw new ForbiddenError('Você não tem permissão para resetar este sistema.');
    }
    const userId = ctx.userId;
    const o = this.resetOwners;
    await o.accountingReset.purgeSetupIfNoMovement(userId);
    await this.compensateProvisioning(userId);
    await o.dashboardLayouts.deleteByUserId(userId);
    await o.chatInstances.deleteByUserId(userId);
    await o.savedTableViews.softDeleteByUserId(userId);
    await o.crmReportDefinitions.softDeleteByUserId(userId);
    const attachments = await o.attachments.softDeleteByUserId(userId);
    for (const att of attachments) {
      try {
        await o.attachmentStorage.deleteFile(att.storageKey);
      } catch (error) {
        logger.warn(`Reset: falha ao remover o arquivo do anexo ${att.id} do usuário ${userId} — segue.`, { error });
      }
    }
    o.kpiCache.invalidate(userId);
  }

  /**
   * Compensação do onboarding: tabelas dinâmicas + KnowledgeGraph + ActionProposals (R27) — pelos donos canônicos de
   * cada tabela (F-P3 → c). O agente não injeta referências a tabelas apagadas. Só desfaz o que o `provision` instalou;
   * o "Resetar sistema" é o `resetUserSystem` (I7 item 1).
   */
  private async compensateProvisioning(userId: string): Promise<void> {
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
   * ou bloco ausente ⇒ nada é criado e o resumo diz `pendente`. O `FiscalProfile` da UNIDADE nasce no passo 3b
   * (`createUnitFiscalProfileOrLog`) — a lacuna L-PR3-1 fechou pela EMENDA 14/10 do I4 (F-I4-6 a), sem inventar
   * `icmsContribuinte`/`pisCofinsRegime` (F-X6-6 a). Falha ⇒ compensação.
   */
  private async createCompanyFiscalProfileOrRollback(
    ctx: UserContext,
    unitId: string,
    fiscal: OnboardingFiscalInput | undefined,
  ): Promise<FiscalDoOnboarding> {
    const scope = resolveAccountingScopeInternal(ctx, unitId);
    const ano = anoCorrente(scope);
    if (!fiscal || fiscal.regime === 'NAO_SEI') return { status: 'pendente', ano };
    const regime = fiscal.regime;
    try {
      const input = UpsertCompanyFiscalProfileSchema.parse({ unitId, regime, grandePorte: fiscal.grandePorte ?? null });
      const perfil = await this.companyFiscalProfile.upsert(scope, ano, input);
      return { status: 'criado', ano, obrigacoes: await this.companyFiscalProfile.resolverObrigacoesEm(scopeToday(scope), { regime, inativa: perfil.inativa, condicoes: perfil.condicoes }) };
    } catch (error) {
      logger.error(`Onboarding: falha ao criar o perfil fiscal da empresa do usuário ${ctx.userId} — compensando.`, { error });
      throw await this.compensate(ctx, error, {
        rolledBack: (detail) => `Não foi possível criar o perfil fiscal da empresa (${detail}). A instalação foi desfeita; tente novamente.`,
        rollbackFailed: 'O perfil fiscal não foi criado e a limpeza do sistema instalado falhou. Use "Resetar sistema" antes de tentar de novo.',
      });
    }
  }

  /**
   * Passo 3b (BE-INCR-ONBOARDING-ACTIVATION EMENDA 14/10, item 9c; F-I4-6 a): DEPOIS do perfil da empresa, o
   * `FiscalProfile` da UNIDADE derivado do bloco `fiscal` (`deriveUnitFiscalProfile`, tabela E14.2) pelo serviço
   * canônico (policy `canManageFiscalProfile` + auditoria `FISCAL_PROFILE_UPDATED`). Sem derivação possível, nada é
   * criado. Falha (F-I4-10 a): `logger.error` e segue — o tenant fica de pé e a ativação contábil sai `Draft` com
   * `KIT_FISCAL_PROFILE_REQUIRED`; o perfil da unidade só existe para a contabilidade (mesma assimetria do F-I4-2 b).
   */
  private async createUnitFiscalProfileOrLog(
    ctx: UserContext,
    unitId: string,
    fiscal: OnboardingFiscalInput | undefined,
    sectorKey: string | null | undefined,
  ): Promise<void> {
    const derived = deriveUnitFiscalProfile(fiscal?.regime, fiscal?.icmsContribuinte, sectorKey);
    if (!derived) return;
    try {
      await this.unitFiscalProfile.upsert(resolveAccountingScopeInternal(ctx, unitId), UpsertFiscalProfileSchema.parse({ unitId, ...derived }));
    } catch (error) {
      logger.error(`Onboarding: falha ao criar o perfil fiscal da unidade ${unitId} do usuário ${ctx.userId} — segue sem ele (F-I4-10 a).`, { error });
    }
  }

  /** Purga o sistema recém-instalado e devolve o erro tipado a lançar (desfeito × desfazer falhou). */
  private async compensate(
    ctx: UserContext,
    cause: unknown,
    messages: { rolledBack: (detail: string) => string; rollbackFailed: string },
  ): Promise<OnboardingRolledBackError | OnboardingRollbackFailedError> {
    try {
      await this.compensateProvisioning(ctx.userId);
    } catch (purgeError) {
      logger.error(`Onboarding: a compensação falhou para o usuário ${ctx.userId}.`, { purgeError });
      return new OnboardingRollbackFailedError(messages.rollbackFailed);
    }
    const detail = cause instanceof Error ? cause.message : String(cause);
    return new OnboardingRolledBackError(messages.rolledBack(detail));
  }
}
