import type { DepreciationRate } from 'generated/prisma';
import { ForbiddenError, NotFoundError } from '../../../lib/errors';
import { DEPRECIATION_RATE_CREATED, DEPRECIATION_RATE_HIDDEN } from '../models/FixedAsset.model';
import type { UpsertDepreciationRateInput } from '../dtos/DepreciationRateDto';
import type { IDepreciationRateRepository } from '../repositories/IDepreciationRateRepository';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { AuditService } from './AuditService';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import { taxaEscolhidaDe, taxasAnexoIII, type TaxaDepreciacaoView, type TaxaEscolhida } from '../models/FixedAsset.model';
import type { ITaxaDepreciacaoCatalogo } from './ITaxaDepreciacaoCatalogo';
import { hojeDateOnly } from '../../legalParameters/models/hoje';

/** O que este serviço lê do `LegalParameterService` (F-LP-4 a: a fotografia, nunca o banco direto). */
export interface FotografiaLegal {
  fotografia(tabelas: readonly ['DEPRECIACAO_ANEXO_III']): Promise<Parameters<typeof taxasAnexoIII>[0]>;
}

function viewDeCustom(r: DepreciationRate): TaxaDepreciacaoView {
  return {
    id: r.id,
    origem: 'ESCOPO',
    ncm: r.ncm,
    sourceRow: r.sourceRow,
    description: r.description,
    lifeYears: r.lifeYears,
    annualRateBp: r.annualRateBp,
    source: r.source,
    sourceUrl: r.sourceUrl,
    sourceSha256: r.sourceSha256,
    justification: r.justification,
    hiddenAt: r.hiddenAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

/**
 * DepreciationRateService — tabela de taxas de depreciação (BE-INCR-FIXED-ASSETS, nó C8, Bloco A).
 * FIRST-CLASS PRISMA. Leitura sob `canRead`; escrita (criar CUSTOM, ocultar) sob
 * `canManageFixedAssets` (BRIEF item 11 — mesma régua de quem fecha período).
 *
 * BE-INCR-LEGAL-PARAMS PR-3 (item 9, D-3): o Anexo III não é mais semeado por escopo — é a tabela de plataforma
 * DEPRECIACAO_ANEXO_III, que uma publicação muda para todos os clientes. `depreciation_rates` guarda só CUSTOM. A
 * lista devolve os dois no mesmo shape (`origem` diz de onde veio); só CUSTOM se oculta (dono 07/10: "só CUSTOM se
 * oculta" — linha do Anexo não está em `depreciation_rates`, logo `hideRate` dá 404).
 */
export class DepreciationRateService implements ITaxaDepreciacaoCatalogo {
  constructor(
    private readonly rateRepo: IDepreciationRateRepository,
    private readonly legalParams: FotografiaLegal,
    private readonly auditService: AuditService,
    private readonly policy: IAccountingPolicy,
  ) {}

  async listRates(scope: AccountingScope, includeHidden: boolean): Promise<TaxaDepreciacaoView[]> {
    if (!this.policy.canRead(scope)) {
      throw new ForbiddenError('Você não tem permissão para ler as taxas de depreciação.');
    }
    return this.catalogo(scope, includeHidden);
  }

  /** Anexo III em vigor HOJE (o catálogo de quem escolhe agora a taxa de um bem novo) + CUSTOM do escopo. */
  async catalogo(scope: AccountingScope, includeHidden: boolean): Promise<TaxaDepreciacaoView[]> {
    const anexo = taxasAnexoIII(await this.legalParams.fotografia(['DEPRECIACAO_ANEXO_III']), hojeDateOnly());
    const custom = await this.rateRepo.findManyByUnit(scope, includeHidden);
    return [...anexo, ...custom.map(viewDeCustom)];
  }

  async resolverTaxa(scope: AccountingScope, id: string): Promise<TaxaEscolhida> {
    const custom = await this.rateRepo.findById(scope, id);
    if (custom) return taxaEscolhidaDe(viewDeCustom(custom));
    const anexo = taxasAnexoIII(await this.legalParams.fotografia(['DEPRECIACAO_ANEXO_III']), hojeDateOnly()).find((t) => t.id === id);
    if (!anexo) throw new NotFoundError(`Taxa de depreciação '${id}' não foi encontrada.`);
    return taxaEscolhidaDe(anexo);
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
