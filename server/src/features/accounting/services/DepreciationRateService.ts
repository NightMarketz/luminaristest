import type { DepreciationRate } from 'generated/prisma';
import { ForbiddenError, NotFoundError } from '../../../lib/errors';
import { DEPRECIATION_RATE_CREATED, DEPRECIATION_RATE_HIDDEN } from '../models/FixedAsset.model';
import type { UpsertDepreciationRateInput } from '../dtos/DepreciationRateDto';
import type { IDepreciationRateRepository } from '../repositories/IDepreciationRateRepository';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { AuditService } from './AuditService';
import type { DepreciationRateSeedService } from './DepreciationRateSeedService';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';

/**
 * DepreciationRateService — tabela de taxas de depreciação (BE-INCR-FIXED-ASSETS, nó C8, Bloco A).
 * FIRST-CLASS PRISMA. Leitura sob `canRead`; escrita (criar CUSTOM, ocultar) sob
 * `canManageFixedAssets` (BRIEF item 11 — mesma régua de quem fecha período).
 *
 * Linhas ANEXO_* são imutáveis por CONSTRUÇÃO (parecer D4): não existe rota de edição nesta fatia
 * (PR-1) — `createCustomRate` sempre nasce `source='CUSTOM'`, nunca toca uma linha existente.
 * `hideRate` é a única mutação sobre uma linha ANEXO_*, e é soft (`hiddenAt`) — nunca apaga, porque
 * um `FixedAsset` (PR-2) pode ter feito snapshot da taxa e a linha continua legível pelo id.
 */
export class DepreciationRateService {
  constructor(
    private readonly rateRepo: IDepreciationRateRepository,
    private readonly seedService: DepreciationRateSeedService,
    private readonly auditService: AuditService,
    private readonly policy: IAccountingPolicy,
  ) {}

  /** Gatilho LAZY do seed (item 3): a 1ª leitura do escopo semeia o Anexo antes de listar. */
  async listRates(scope: AccountingScope, includeHidden: boolean): Promise<DepreciationRate[]> {
    if (!this.policy.canRead(scope)) {
      throw new ForbiddenError('Você não tem permissão para ler as taxas de depreciação.');
    }
    await this.seedService.seed(scope);
    return this.rateRepo.findManyByUnit(scope, includeHidden);
  }

  async createCustomRate(
    scope: AccountingScope,
    dto: UpsertDepreciationRateInput,
  ): Promise<DepreciationRate> {
    if (!this.policy.canManageFixedAssets(scope)) {
      throw new ForbiddenError('Você não tem permissão para criar taxas de depreciação.');
    }
    const { userId, unitId } = accountingScopeWhere(scope);
    return this.rateRepo.runTransaction(async (tx) => {
      const created = await this.rateRepo.create(
        {
          userId,
          unitId,
          ncm: dto.ncm ?? null,
          sourceRow: null, // F-FA10 → a: CUSTOM não tem unique de negócio — a chave é o id
          description: dto.description,
          lifeYears: dto.lifeYears,
          annualRateBp: dto.annualRateBp,
          source: 'CUSTOM',
          sourceUrl: null,
          sourceSha256: null,
          justification: dto.justification,
          createdById: scope.actorUserId,
        },
        tx,
      );
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: DEPRECIATION_RATE_CREATED,
        targetType: 'depreciation_rate',
        targetId: created.id,
        payload: {
          rateId: created.id,
          source: created.source,
          ncm: created.ncm,
          annualRateBp: created.annualRateBp,
          lifeYears: created.lifeYears,
        },
      });
      return created;
    });
  }

  async hideRate(scope: AccountingScope, id: string): Promise<DepreciationRate> {
    if (!this.policy.canManageFixedAssets(scope)) {
      throw new ForbiddenError('Você não tem permissão para ocultar taxas de depreciação.');
    }
    const rate = await this.rateRepo.findById(scope, id);
    if (!rate) throw new NotFoundError(`Taxa de depreciação '${id}' não foi encontrada.`);

    return this.rateRepo.runTransaction(async (tx) => {
      const hidden = await this.rateRepo.hide(scope, id, tx);
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: DEPRECIATION_RATE_HIDDEN,
        targetType: 'depreciation_rate',
        targetId: id,
        payload: { rateId: id, source: rate.source },
      });
      return hidden;
    });
  }
}
