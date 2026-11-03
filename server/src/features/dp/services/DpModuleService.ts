import type { DpModuloAtivacao, Prisma } from 'generated/prisma';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../lib/errors';
import type { AccountingScope } from '../../accounting/scope/AccountingScope';
import type { AuditService } from '../../accounting/services/AuditService';
import type { AtivarModuloInput, EncerrarModuloInput } from '../dtos/DpModuleDto';
import type { Competencia } from '../models/competencia';
import { dpConflictError } from '../models/erros';
import {
  DP_MODULE_REGISTRY,
  resolveDpModuleActivation,
  type DpModuleDef,
  type DpModuleKey,
  type DpModuleRegistry,
} from '../models/moduleRegistry';
import { ativaEm, sobrepoeCompetencia, type VigenciaCompetencia } from '../models/vigencia';
import type { IDpPolicy } from '../policies/IDpPolicy';
import type { IDpModuloAtivacaoRepository } from '../repositories/IDpModuloAtivacaoRepository';

export const DP_MODULE_ACTIVATION_CREATED = 'dp.module_activation.created';
export const DP_MODULE_ACTIVATION_ENDED = 'dp.module_activation.ended';

export interface DpModuloAtivacaoView {
  id: string;
  moduleKey: string;
  competenciaInicio: string;
  competenciaFim: string | null;
  motivo: string;
  motivoFim: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * BE-INCR-DP-F0-F1 itens 12, 13 e 19 (PR-1) — ativação dos submódulos opcionais do DP, por instância (R8: só
 * `ownerUserId`) e por competência (D-4). Policy primeiro; a resolução do item 11, a sobreposição e o dependente ativo
 * são checados DENTRO da tx, sobre o `tx` propagado ao repositório (memória authoritative-gate-inside-tx), e a
 * auditoria grava na mesma tx. Desativar grava `competenciaFim` e nunca apaga dado (spec §3 regra 1).
 */
export class DpModuleService {
  constructor(
    private readonly repo: IDpModuloAtivacaoRepository,
    private readonly policy: IDpPolicy,
    private readonly auditService: AuditService,
    private readonly registry: DpModuleRegistry = DP_MODULE_REGISTRY,
  ) {}

  /** O catálogo é dado de código; a policy de leitura vale igual (contrato: policy em toda operação). */
  listCatalog(scope: AccountingScope): DpModuleDef[] {
    this.assertRead(scope);
    return Object.values(this.registry);
  }

  async listActivations(scope: AccountingScope): Promise<DpModuloAtivacaoView[]> {
    this.assertRead(scope);
    return (await this.repo.list(scope.ownerUserId)).map(toView);
  }

  /**
   * Chaves dos módulos ativos na competência. Uso interno (o `DpPortResolver` e o cálculo da competência), sem escopo
   * HTTP: quem chama já tem o dono resolvido.
   */
  async modulosAtivosEm(ownerUserId: string, competencia: Competencia): Promise<DpModuleKey[]> {
    return ativosEm(await this.repo.list(ownerUserId), competencia);
  }

  async activate(scope: AccountingScope, input: AtivarModuloInput): Promise<DpModuloAtivacaoView> {
    this.assertManage(scope);
    return this.repo.runTransaction(async (tx) => {
      const todas = await this.repo.list(scope.ownerUserId, tx);
      resolveDpModuleActivation(input.moduleKey, ativosEm(todas, input.competenciaInicio), this.registry);
      this.assertSemSobreposicao(todas, input.moduleKey, { competenciaInicio: input.competenciaInicio, competenciaFim: null }, null);
      const row = await this.repo.create(
        scope.ownerUserId,
        scope.actorUserId,
        { moduleKey: input.moduleKey, competenciaInicio: input.competenciaInicio, motivo: input.motivo },
        tx,
      );
      await this.audit(tx, scope, DP_MODULE_ACTIVATION_CREATED, row.id, {
        activationId: row.id,
        moduleKey: row.moduleKey,
        competenciaInicio: row.competenciaInicio,
      });
      return toView(row);
    });
  }

  async end(scope: AccountingScope, id: string, input: EncerrarModuloInput): Promise<DpModuloAtivacaoView> {
    this.assertManage(scope);
    return this.repo.runTransaction(async (tx) => {
      const row = await this.repo.findById(scope.ownerUserId, id, tx);
      if (!row) throw new NotFoundError('Ativação de submódulo não encontrada.');
      if (input.competenciaFim < row.competenciaInicio) {
        throw new ValidationError(
          `competenciaFim (${input.competenciaFim}) antes de competenciaInicio (${row.competenciaInicio}).`,
          { competenciaInicio: row.competenciaInicio, competenciaFim: input.competenciaFim },
        );
      }
      const todas = await this.repo.list(scope.ownerUserId, tx);
      this.assertSemSobreposicao(todas, row.moduleKey, { competenciaInicio: vig(row).competenciaInicio, competenciaFim: input.competenciaFim }, row.id);
      // Dependente que continua ativo depois de competenciaFim ficaria sem a dependência (leitura do item 13; ver PR).
      const dependentes = todas.filter(
        (a) =>
          a.moduleKey !== row.moduleKey &&
          (this.registry[a.moduleKey as DpModuleKey]?.dependsOn ?? []).includes(row.moduleKey as DpModuleKey) &&
          (a.competenciaFim === null || a.competenciaFim > input.competenciaFim),
      );
      if (dependentes.length) {
        throw dpConflictError(
          'DP_MODULE_DEPENDENT_ACTIVE',
          `Não dá para encerrar '${row.moduleKey}' em ${input.competenciaFim}: ${[...new Set(dependentes.map((d) => `'${d.moduleKey}'`))].join(', ')} depende(m) dele e segue(m) ativo(s) depois.`,
        );
      }
      const ended = await this.repo.end(row.id, scope.actorUserId, input.competenciaFim, input.motivo, tx);
      await this.audit(tx, scope, DP_MODULE_ACTIVATION_ENDED, ended.id, {
        activationId: ended.id,
        moduleKey: ended.moduleKey,
        competenciaFim: input.competenciaFim,
      });
      return toView(ended);
    });
  }

  private assertSemSobreposicao(todas: DpModuloAtivacao[], moduleKey: string, nova: VigenciaCompetencia, selfId: string | null): void {
    const conflito = todas.find((a) => a.id !== selfId && a.moduleKey === moduleKey && sobrepoeCompetencia(vig(a), nova));
    if (conflito) {
      throw dpConflictError(
        'DP_MODULE_ACTIVATION_OVERLAP',
        `'${moduleKey}' já tem ativação de ${conflito.competenciaInicio} a ${conflito.competenciaFim ?? 'em aberto'} (id ${conflito.id}), que se cruza com ${nova.competenciaInicio} a ${nova.competenciaFim ?? 'em aberto'}.`,
      );
    }
  }

  private async audit(
    tx: Prisma.TransactionClient,
    scope: AccountingScope,
    eventType: typeof DP_MODULE_ACTIVATION_CREATED | typeof DP_MODULE_ACTIVATION_ENDED,
    targetId: string,
    payload: Record<string, string>,
  ): Promise<void> {
    await this.auditService.append(tx, scope, {
      actorUserId: scope.actorUserId,
      eventType,
      targetType: 'dp_module_activation',
      targetId,
      payload,
    });
  }

  private assertRead(scope: AccountingScope): void {
    if (!this.policy.canRead(scope)) throw new ForbiddenError('Você não tem permissão para ler os submódulos do DP.');
  }

  private assertManage(scope: AccountingScope): void {
    if (!this.policy.canManage(scope)) throw new ForbiddenError('Você não tem permissão para ativar submódulos do DP.');
  }
}

function vig(a: DpModuloAtivacao): VigenciaCompetencia {
  return { competenciaInicio: a.competenciaInicio as Competencia, competenciaFim: (a.competenciaFim ?? null) as Competencia | null };
}

function ativosEm(todas: DpModuloAtivacao[], c: Competencia): DpModuleKey[] {
  return [...new Set(todas.filter((a) => ativaEm(vig(a), c)).map((a) => a.moduleKey as DpModuleKey))];
}

function toView(a: DpModuloAtivacao): DpModuloAtivacaoView {
  return {
    id: a.id,
    moduleKey: a.moduleKey,
    competenciaInicio: a.competenciaInicio,
    competenciaFim: a.competenciaFim,
    motivo: a.motivo,
    motivoFim: a.motivoFim,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}
