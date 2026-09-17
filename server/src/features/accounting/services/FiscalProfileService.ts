import { ForbiddenError, ValidationError } from '../../../lib/errors';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IAccountRepository } from '../repositories/IAccountRepository';
import type { IFiscalProfileRepository } from '../repositories/IFiscalProfileRepository';
import type { AuditService } from './AuditService';
import type { UpsertFiscalProfileInput } from '../dtos/FiscalProfileDto';
import type { CostRegime } from '../../../lib/nfeCost';
import type { FiscalProfile } from 'generated/prisma';

export const FISCAL_PROFILE_UPDATED = 'fiscal_profile.updated';

/**
 * BE-INCR-DFE (BRIEF item 7) — campos cujo valor vem de resposta pendente do contador (D1f, itens 5a–5f
 * + IBPT), listados em `pendingExternalValidation` até o operador confirmar por PUT (`d1fConfirmado`).
 */
export const D1F_FIELDS = [
  'issAliquotaBp', // 5a
  'issRetidoTomadorPj', // 5b
  'pacoteFatoGerador', // 5c
  'ibsCbsInformar', // 5d
  'ibsCbsCst', // 5d / 1b
  'ibsCbsClassTrib', // 5d / 1b
  'regApTribSN', // 5e
  'pTotTribSNCent', // 5e
  'emissaoForaDoMes', // 5f
  'pTotTribFedCent', // Lei 12.741 / IBPT (linha nova do pedido)
  'pTotTribEstCent',
  'pTotTribMunCent',
] as const;

export interface FiscalProfileEmissaoStatus {
  /** true quando a EMISSÃO de NFS-e tem tudo que o perfil da unidade precisa (BRIEF item 14 iii). */
  completo: boolean;
  faltantes: string[];
  pendingExternalValidation: string[];
}

export interface FiscalProfileView extends CostRegime {
  unitId: string;
  regimeTributario: string;
  icmsRecuperavelAccountId: string | null;
  pisCofinsRecuperavelAccountId: string | null;
  partnerAccountRef: string | null;
  codMun: string | null;
  inscricaoMunicipal: string | null;
  cnae: string | null;
  dpsSerie: number;
  regEspTrib: number;
  regApTribSN: number | null;
  issAliquotaBp: number | null;
  issRetidoTomadorPj: boolean;
  pacoteFatoGerador: string;
  ibsCbsInformar: boolean;
  ibsCbsCst: string | null;
  ibsCbsClassTrib: string | null;
  pTotTribFedCent: number | null;
  pTotTribEstCent: number | null;
  pTotTribMunCent: number | null;
  pTotTribSNCent: number | null;
  emissaoForaDoMes: string;
  d1fConfirmado: boolean;
  emissao: FiscalProfileEmissaoStatus;
  updatedAt: string;
}

/**
 * Função pura (BRIEF item 7): o que falta no perfil da UNIDADE para emitir NFS-e. Cada linha cita o leiaute
 * (Anexo I v1.01) / RN que a exige. Perfil de serviço e tomador são checados na emissão (item 14), não aqui.
 */
export function fiscalProfileEmissaoStatus(row: Pick<FiscalProfile, 'regimeTributario' | 'codMun' | 'ibsCbsInformar' | 'ibsCbsCst' | 'ibsCbsClassTrib' | 'pTotTribFedCent' | 'pTotTribEstCent' | 'pTotTribMunCent' | 'pTotTribSNCent' | 'd1fConfirmado'>): FiscalProfileEmissaoStatus {
  const faltantes: string[] = [];
  if (!row.codMun) faltantes.push('codMun'); // cLocEmi [112] 1-1
  if (row.regimeTributario === 'SIMPLES') {
    if (row.pTotTribSNCent == null) faltantes.push('pTotTribSNCent'); // totTrib [325] 1-1; ME/EPP => pTotTribSN (RN E0712)
  } else {
    // totTrib [325] 1-1 e indTotTrib PROIBIDO para não-optante (RN E0713) => pTotTrib{Fed,Est,Mun}
    if (row.pTotTribFedCent == null) faltantes.push('pTotTribFedCent');
    if (row.pTotTribEstCent == null) faltantes.push('pTotTribEstCent');
    if (row.pTotTribMunCent == null) faltantes.push('pTotTribMunCent');
  }
  if (row.ibsCbsInformar) {
    if (!row.ibsCbsCst) faltantes.push('ibsCbsCst'); // gIBSCBS/CST [405] 1-1 quando o grupo é informado
    if (!row.ibsCbsClassTrib) faltantes.push('ibsCbsClassTrib'); // [406]
  }
  return {
    completo: faltantes.length === 0,
    faltantes,
    pendingExternalValidation: row.d1fConfirmado ? [] : [...D1F_FIELDS],
  };
}

/**
 * BE-INCR-NFE-COST-REGIME (nó X6) — perfil fiscal por escopo (F-X6-1 a). `upsert` é comando idempotente
 * (item 4). As contas "a recuperar" (F-X6-8 a) têm de existir no escopo, aceitar lançamento e ser ATIVO
 * (`nature = Asset`) — o crédito nasce no ativo (BRIEF item 18). Os CÓDIGOS são do contador (§5).
 * BE-INCR-DFE (itens 6–7): campos do emitente + D1f configurável; `ibsCbsInformar` default por regime
 * (SIMPLES => false — leiaute [336]: "para optantes do Simples Nacional … só a partir de 2027"); todo PUT
 * marca `d1fConfirmado = true` (o operador viu os defaults).
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
    const { unitId: _unitId, ibsCbsInformar, ...rest } = input;
    const data = {
      ...rest,
      ibsCbsInformar: ibsCbsInformar ?? input.regimeTributario !== 'SIMPLES',
      d1fConfirmado: true,
    };
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
          // BE-INCR-DFE (item 9): enum/boolean/int como string — sem texto livre (IM/CNAE ficam fora do evento)
          codMun: row.codMun ?? '',
          dpsSerie: String(row.dpsSerie),
          regEspTrib: String(row.regEspTrib),
          regApTribSN: row.regApTribSN == null ? '' : String(row.regApTribSN),
          issAliquotaBp: row.issAliquotaBp == null ? '' : String(row.issAliquotaBp),
          issRetidoTomadorPj: String(row.issRetidoTomadorPj),
          pacoteFatoGerador: row.pacoteFatoGerador,
          ibsCbsInformar: String(row.ibsCbsInformar),
          ibsCbsCst: row.ibsCbsCst ?? '',
          ibsCbsClassTrib: row.ibsCbsClassTrib ?? '',
          pTotTribFedCent: row.pTotTribFedCent == null ? '' : String(row.pTotTribFedCent),
          pTotTribEstCent: row.pTotTribEstCent == null ? '' : String(row.pTotTribEstCent),
          pTotTribMunCent: row.pTotTribMunCent == null ? '' : String(row.pTotTribMunCent),
          pTotTribSNCent: row.pTotTribSNCent == null ? '' : String(row.pTotTribSNCent),
          emissaoForaDoMes: row.emissaoForaDoMes,
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

  private toView(row: FiscalProfile): FiscalProfileView {
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
      codMun: row.codMun,
      inscricaoMunicipal: row.inscricaoMunicipal,
      cnae: row.cnae,
      dpsSerie: row.dpsSerie,
      regEspTrib: row.regEspTrib,
      regApTribSN: row.regApTribSN,
      issAliquotaBp: row.issAliquotaBp,
      issRetidoTomadorPj: row.issRetidoTomadorPj,
      pacoteFatoGerador: row.pacoteFatoGerador,
      ibsCbsInformar: row.ibsCbsInformar,
      ibsCbsCst: row.ibsCbsCst,
      ibsCbsClassTrib: row.ibsCbsClassTrib,
      pTotTribFedCent: row.pTotTribFedCent,
      pTotTribEstCent: row.pTotTribEstCent,
      pTotTribMunCent: row.pTotTribMunCent,
      pTotTribSNCent: row.pTotTribSNCent,
      emissaoForaDoMes: row.emissaoForaDoMes,
      d1fConfirmado: row.d1fConfirmado,
      emissao: fiscalProfileEmissaoStatus(row),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
