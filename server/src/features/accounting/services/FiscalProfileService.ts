import { ForbiddenError, ValidationError } from '../../../lib/errors';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IAccountRepository } from '../repositories/IAccountRepository';
import type { IFiscalProfileRepository } from '../repositories/IFiscalProfileRepository';
import type { AuditService } from './AuditService';
import type { UpsertFiscalProfileInput } from '../dtos/FiscalProfileDto';
import type { CostRegime } from '../../../lib/nfeCost';

export const FISCAL_PROFILE_UPDATED = 'fiscal_profile.updated';

export interface FiscalProfileView extends CostRegime {
  unitId: string;
  regimeTributario: string;
  icmsRecuperavelAccountId: string | null;
  pisCofinsRecuperavelAccountId: string | null;
  partnerAccountRef: string | null;
  updatedAt: string;
}

/**
 * BE-INCR-NFE-COST-REGIME (nó X6) — perfil fiscal por escopo (F-X6-1 a). `upsert` é comando idempotente
 * (item 4). As contas "a recuperar" (F-X6-8 a) têm de existir no escopo, aceitar lançamento e ser ATIVO
 * (`nature = Asset`) — o crédito nasce no ativo (BRIEF item 18). Os CÓDIGOS são do contador (§5).
 */
export class FiscalProfileService {
  constructor(
    private readonly repo: IFiscalProfileRepository,
    private readonly accountRepo: IAccountRepository,
    private readonly policy: IAccountingPolicy,
    private readonly auditService: AuditService,
  ) {}

  async get(scope: AccountingScope): Promise<FiscalProfileView | null> {
    if (!this.policy.canReadFiscalProfile(scope)) throw new ForbiddenError('Você não tem permissão para ler o perfil fiscal.');
    const row = await this.repo.findByScope(scope);
    return row ? this.toView(row) : null;
  }

  /** F-X6-6 (a): sem perfil o import/preview NÃO inventa default — 400 nomeado. */
  async requireCostRegime(scope: AccountingScope): Promise<FiscalProfileView> {
    const row = await this.repo.findByScope(scope);
    if (!row) {
      throw new ValidationError(
        'fiscal_profile_missing: perfil fiscal da unidade não cadastrado (PUT /api/accounting/fiscal-profile) — nenhum custo é calculado sem ele (F-X6-6 a).',
      );
    }
    return this.toView(row);
  }

  async upsert(scope: AccountingScope, input: UpsertFiscalProfileInput): Promise<FiscalProfileView> {
    if (!this.policy.canManageFiscalProfile(scope)) throw new ForbiddenError('Você não tem permissão para alterar o perfil fiscal.');
    if (input.icmsRecuperavelAccountId) await this.assertAssetAccount(scope, input.icmsRecuperavelAccountId, 'ICMS a recuperar');
    if (input.pisCofinsRecuperavelAccountId) await this.assertAssetAccount(scope, input.pisCofinsRecuperavelAccountId, 'PIS/COFINS a recuperar');
    const { unitId: _unitId, ...data } = input;
    return this.repo.runTransaction(async (tx) => {
      const row = await this.repo.upsert(scope, data, tx);
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: FISCAL_PROFILE_UPDATED,
        targetType: 'fiscal_profile',
        targetId: row.id,
        payload: {
          regimeTributario: row.regimeTributario,
          icmsContribuinte: String(row.icmsContribuinte),
          pisCofinsRegime: row.pisCofinsRegime,
          pisCofinsCreditExcludesIcms: String(row.pisCofinsCreditExcludesIcms),
          pisCofinsCreditIncludesIpi: String(row.pisCofinsCreditIncludesIpi),
          pisCofinsCreditFromSimplesSupplier: String(row.pisCofinsCreditFromSimplesSupplier),
          icmsRecuperavelAccountId: row.icmsRecuperavelAccountId ?? '',
          pisCofinsRecuperavelAccountId: row.pisCofinsRecuperavelAccountId ?? '',
        },
      });
      return this.toView(row);
    });
  }

  private async assertAssetAccount(scope: AccountingScope, id: string, label: string): Promise<void> {
    const account = await this.accountRepo.findById(scope, id);
    if (!account || account.deletedAt) throw new ValidationError(`Conta de ${label} '${id}' não existe neste escopo.`);
    if (!account.acceptsEntries) throw new ValidationError(`Conta de ${label} '${account.code}' não aceita lançamentos (não é folha).`);
    if (account.nature !== 'Asset') {
      throw new ValidationError(`Conta de ${label} '${account.code}' tem natureza ${account.nature}; esperado Asset (crédito a recuperar é ativo — BRIEF X6 item 18).`);
    }
  }

  private toView(row: {
    unitId: string;
    regimeTributario: string;
    icmsContribuinte: boolean;
    pisCofinsRegime: string;
    pisCofinsCreditExcludesIcms: boolean;
    pisCofinsCreditIncludesIpi: boolean;
    pisCofinsCreditFromSimplesSupplier: boolean;
    icmsRecuperavelAccountId: string | null;
    pisCofinsRecuperavelAccountId: string | null;
    partnerAccountRef: string | null;
    updatedAt: Date;
  }): FiscalProfileView {
    return {
      unitId: row.unitId,
      regimeTributario: row.regimeTributario,
      icmsContribuinte: row.icmsContribuinte,
      pisCofinsRegime: row.pisCofinsRegime as CostRegime['pisCofinsRegime'],
      pisCofinsCreditExcludesIcms: row.pisCofinsCreditExcludesIcms,
      pisCofinsCreditIncludesIpi: row.pisCofinsCreditIncludesIpi,
      pisCofinsCreditFromSimplesSupplier: row.pisCofinsCreditFromSimplesSupplier,
      icmsRecuperavelAccountId: row.icmsRecuperavelAccountId,
      pisCofinsRecuperavelAccountId: row.pisCofinsRecuperavelAccountId,
      partnerAccountRef: row.partnerAccountRef,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
