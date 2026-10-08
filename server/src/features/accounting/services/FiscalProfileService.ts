import { ForbiddenError, ValidationError } from '../../../lib/errors';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IAccountRepository } from '../repositories/IAccountRepository';
import type { IFiscalProfileRepository } from '../repositories/IFiscalProfileRepository';
import type { ICompanyFiscalProfileRepository } from '../repositories/ICompanyFiscalProfileRepository';
import { regimeUnidadeEsperado } from '../models/regimeEmpresa';
import type { RegimeEmpresa } from '../models/regimeEmpresa';
import { scopeToday } from '../models/dates';
import type { AuditService } from './AuditService';
import type { IAccountantAssignmentRepository } from '../repositories/IAccountantAssignmentRepository';
import type { IAccountingPolicyVersionRepository } from '../repositories/IAccountingPolicyVersionRepository';
import { applyDirectInTx, assertNoActiveAccountant } from './policyVersionApply';
import { FiscalProfilePolicyPayloadSchema, type UpsertFiscalProfileInput, type FiscalProfilePolicyPayload } from '../dtos/FiscalProfileDto';
import type { CostRegime } from '../../../lib/nfeCost';
import type { FiscalProfile, Prisma } from 'generated/prisma';

export const FISCAL_PROFILE_UPDATED = 'fiscal_profile.updated';

/** Contas-padrão do perfil que o kit de setor pode preencher (BE-INCR-KIT-SETOR §3.1, `roleDefaults.fiscalProfile`). */
export type FiscalProfileAccountField =
  | 'icmsRecuperavelAccountId'
  | 'pisCofinsRecuperavelAccountId'
  | 'insumoExpenseAccountId'
  | 'irpjDespesaAccountId'
  | 'csllDespesaAccountId'
  | 'irpjRecolherAccountId'
  | 'csllRecolherAccountId'
  | 'pisDespesaAccountId'
  | 'cofinsDespesaAccountId'
  | 'pisRecolherAccountId'
  | 'cofinsRecolherAccountId';

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
  insumoExpenseAccountId: string | null;
  // X7 Fase A (BRIEF item 3, F-TA-6 a)
  irpjDespesaAccountId: string | null;
  csllDespesaAccountId: string | null;
  irpjRecolherAccountId: string | null;
  csllRecolherAccountId: string | null;
  // X8 (BRIEF item 2, F-PCB-1 b)
  pisDespesaAccountId: string | null;
  cofinsDespesaAccountId: string | null;
  pisRecolherAccountId: string | null;
  cofinsRecolherAccountId: string | null;
  pisCofinsCreditoOutrosAccountId: string | null; // X8 PR-3 (L-5)
  pisCofinsRetidoCompensarAccountId: string | null; // X8 PR-3 (retenções)
  pisCofinsRetencaoConciliarAccountId: string | null; // X8 PR-3 (retenções)
  simplesDasDeducaoAccountId: string | null; // X14 PR-3 item 21
  simplesRecolherAccountId: string | null;
  irpjSaldoNegativoAccountId: string | null;
  csllSaldoNegativoAccountId: string | null;
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
  pacoteCTribNac: string | null;
  pacoteCNBS: string | null;
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
export function fiscalProfileEmissaoStatus(
  row: Pick<FiscalProfile, 'regimeTributario' | 'codMun' | 'ibsCbsInformar' | 'ibsCbsCst' | 'ibsCbsClassTrib' | 'pTotTribFedCent' | 'pTotTribEstCent' | 'pTotTribMunCent' | 'pTotTribSNCent' | 'd1fConfirmado'>,
  regimeEmpresa: RegimeEmpresa | null = null,
): FiscalProfileEmissaoStatus {
  const faltantes: string[] = [];
  // X13 PR-2 item 17 (F-XP-4 a): opSimpNac=2 (MEI) está fora do MVP da DPS (`DpsPayloadDto.ts:38`) — a emissão de
  // empresa MEI fica BLOQUEADA com o motivo explícito, em vez de sair como ME/EPP (opSimpNac=3), que seria errado.
  if (regimeEmpresa === 'MEI') faltantes.push('regime MEI — emissão fora do escopo (opSimpNac=2)');
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
 * BE-INCR-ACCOUNTING-POLICY-VERSION (itens 5–6): parâmetro governado — com contador ACTIVE o PUT dá 409 e a mudança
 * vai por proposta; toda aplicação (PUT ou aprovação) passa por `applyInTx` e grava uma versão APPLIED.
 */
export class FiscalProfileService {
  constructor(
    private readonly repo: IFiscalProfileRepository,
    private readonly accountRepo: IAccountRepository,
    private readonly policy: IAccountingPolicy,
    private readonly auditService: AuditService,
    // X13 PR-2 (itens 15/17): regime da EMPRESA no ano corrente — consistência da unidade e bloqueio de emissão MEI.
    private readonly companyRepo: ICompanyFiscalProfileRepository,
    // GOV-CONTADOR política versionada (item 13): gate do PUT com contador ativo + versão APPLIED.
    private readonly assignmentRepo: IAccountantAssignmentRepository,
    private readonly policyVersionRepo: IAccountingPolicyVersionRepository,
  ) {}

  /** Regime da empresa no ano corrente (fuso do escopo), ou `null` sem perfil da empresa naquele ano. */
  private async regimeEmpresaHoje(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<RegimeEmpresa | null> {
    const row = await this.companyRepo.findByYear(scope, Number(scopeToday(scope).slice(0, 4)), tx);
    return (row?.regime as RegimeEmpresa | undefined) ?? null;
  }

  async get(scope: AccountingScope): Promise<FiscalProfileView | null> {
    if (!this.policy.canReadFiscalProfile(scope)) throw new ForbiddenError('Você não tem permissão para ler o perfil fiscal.');
    const row = await this.repo.findByScope(scope);
    return row ? this.toView(row, await this.regimeEmpresaHoje(scope)) : null;
  }

  /** F-X6-6 (a): sem perfil o import/preview NÃO inventa default — 400 nomeado. */
  async requireCostRegime(scope: AccountingScope): Promise<FiscalProfileView> {
    const row = await this.repo.findByScope(scope);
    if (!row) {
      throw new ValidationError(
        'fiscal_profile_missing: perfil fiscal da unidade não cadastrado (PUT /api/accounting/fiscal-profile) — nenhum custo é calculado sem ele (F-X6-6 a).',
      );
    }
    // X8 item 1b (F-PCB-5 a): linha gravada antes do refine do item 1 com o par ilegal não credita — 400 até o PUT corrigir.
    if (row.regimeTributario === 'PRESUMIDO' && row.pisCofinsRegime === 'NAO_CUMULATIVO') {
      throw new ValidationError(
        'fiscal_profile_regime_incoerente: o perfil fiscal da unidade está em PRESUMIDO com pisCofinsRegime=NAO_CUMULATIVO — o Presumido é cumulativo (IN RFB 2.121/2022 art. 122) e não credita PIS/COFINS na compra. Corrija com PUT /api/accounting/fiscal-profile (pisCofinsRegime=CUMULATIVO).',
      );
    }
    return this.toView(row, await this.regimeEmpresaHoje(scope));
  }

  async upsert(scope: AccountingScope, input: UpsertFiscalProfileInput): Promise<FiscalProfileView> {
    if (!this.policy.canManageFiscalProfile(scope)) throw new ForbiddenError('Você não tem permissão para alterar o perfil fiscal.');
    const { unitId: _unitId, ...payload } = input;
    await assertNoActiveAccountant(this.assignmentRepo, scope); // preflight (item 6)
    return this.repo.runTransaction(async (tx) => {
      await assertNoActiveAccountant(this.assignmentRepo, scope, tx); // autoritativo, dentro da tx
      return applyDirectInTx(this.policyVersionRepo, scope, 'FISCAL_PROFILE', payload, tx, (policyVersionId) =>
        this.applyInTx(scope, payload, tx, policyVersionId),
      );
    });
  }

  /**
   * BE-INCR-KIT-SETOR PR-2 (item 10, passo 3): contas-padrão do kit de setor, **só nos campos nulos** do perfil que
   * já existe (regra Odoo: o modelo preenche, nunca sobrescreve). Sem perfil ⇒ 400 `fiscal_profile_missing` — o kit
   * não inventa regime (emenda E-5: o pré-check do `activate-default` já barra antes). Mesmo caminho de escrita do
   * PUT (policy, gate do contador dentro da tx, versão APPLIED, `fiscal_profile.updated`), com o perfil inteiro
   * relido DENTRO da tx e o `d1fConfirmado` preservado. Devolve os campos gravados.
   */
  async fillNullAccounts(scope: AccountingScope, accountIds: Partial<Record<FiscalProfileAccountField, string>>): Promise<string[]> {
    if (!this.policy.canManageFiscalProfile(scope)) throw new ForbiddenError('Você não tem permissão para alterar o perfil fiscal.');
    return this.repo.runTransaction(async (tx) => {
      const row = await this.repo.findByScope(scope, tx);
      if (!row) {
        throw new ValidationError('fiscal_profile_missing: perfil fiscal da unidade não cadastrado (PUT /api/accounting/fiscal-profile).');
      }
      const patch = Object.fromEntries(
        Object.entries(accountIds).filter(([field]) => row[field as FiscalProfileAccountField] == null),
      );
      const fields = Object.keys(patch);
      if (fields.length === 0) return [];
      // gate do contador DEPOIS de saber que há o que gravar: kit sem campo nulo não vira parâmetro governado
      await assertNoActiveAccountant(this.assignmentRepo, scope, tx);
      const { unitId: _unitId, d1fConfirmado, emissao: _emissao, updatedAt: _updatedAt, ...current } = this.toView(row, null);
      const payload = FiscalProfilePolicyPayloadSchema.parse({ ...current, ...patch });
      await applyDirectInTx(this.policyVersionRepo, scope, 'FISCAL_PROFILE', payload, tx, (policyVersionId) =>
        this.applyInTx(scope, payload, tx, policyVersionId, { d1fConfirmado }),
      );
      return fields;
    });
  }

  /**
   * Asserções do perfil (contas do escopo + regime da empresa), só leitura. A proposta usa sem `tx` (item 7.3, erro
   * rápido para o dono); `applyInTx` reusa dentro da tx. Devolve o regime da empresa no ano corrente.
   */
  async validate(scope: AccountingScope, input: FiscalProfilePolicyPayload, tx?: Prisma.TransactionClient): Promise<RegimeEmpresa | null> {
    if (input.icmsRecuperavelAccountId) await this.assertAssetAccount(scope, input.icmsRecuperavelAccountId, 'ICMS a recuperar', tx);
    if (input.pisCofinsRecuperavelAccountId) await this.assertAssetAccount(scope, input.pisCofinsRecuperavelAccountId, 'PIS/COFINS a recuperar', tx);
    if (input.insumoExpenseAccountId) await this.assertExpenseAccount(scope, input.insumoExpenseAccountId, 'insumo do serviço', tx);
    // X7 item 3 (F-TA-6 a): provisão D despesa / C a recolher (item 15) — despesa = Expense, a recolher = Liability.
    if (input.irpjDespesaAccountId) await this.assertExpenseAccount(scope, input.irpjDespesaAccountId, 'despesa de IRPJ', tx);
    if (input.csllDespesaAccountId) await this.assertExpenseAccount(scope, input.csllDespesaAccountId, 'despesa de CSLL', tx);
    if (input.irpjRecolherAccountId) await this.assertLiabilityAccount(scope, input.irpjRecolherAccountId, 'IRPJ a recolher', tx);
    if (input.csllRecolherAccountId) await this.assertLiabilityAccount(scope, input.csllRecolherAccountId, 'CSLL a recolher', tx);
    // X8 item 2 (F-PCB-1 b): provisão de PIS/Cofins — despesa = Expense (não dedução da receita), a recolher = Liability.
    if (input.pisDespesaAccountId) await this.assertExpenseAccount(scope, input.pisDespesaAccountId, 'despesa de PIS', tx);
    if (input.cofinsDespesaAccountId) await this.assertExpenseAccount(scope, input.cofinsDespesaAccountId, 'despesa de COFINS', tx);
    if (input.pisRecolherAccountId) await this.assertLiabilityAccount(scope, input.pisRecolherAccountId, 'PIS a recolher', tx);
    if (input.cofinsRecolherAccountId) await this.assertLiabilityAccount(scope, input.cofinsRecolherAccountId, 'COFINS a recolher', tx);
    // X8 PR-3 (L-5, dono 06/10): contrapartida dos outros créditos — redutora de despesa (Expense), fora do gate da ECF (F-PCB-1 b).
    if (input.pisCofinsCreditoOutrosAccountId) await this.assertExpenseAccount(scope, input.pisCofinsCreditoOutrosAccountId, 'créditos de PIS/COFINS sobre despesas', tx);
    // X8 PR-3 (retenções, dono 06/10): retido a compensar = ativo; retenções a conciliar = ativo redutor de clientes.
    if (input.pisCofinsRetidoCompensarAccountId) await this.assertAssetAccount(scope, input.pisCofinsRetidoCompensarAccountId, 'PIS/COFINS retido a compensar', tx);
    if (input.pisCofinsRetencaoConciliarAccountId) await this.assertAssetAccount(scope, input.pisCofinsRetencaoConciliarAccountId, 'retenções de PIS/COFINS a conciliar com clientes', tx);
    // X14 PR-3 item 21: o DAS é dedução da receita (folha de natureza Revenue, saldo devedor) / passivo a recolher.
    if (input.simplesDasDeducaoAccountId) await this.assertRevenueAccount(scope, input.simplesDasDeducaoAccountId, 'Simples Nacional (DAS) — dedução da receita', tx);
    if (input.simplesRecolherAccountId) await this.assertLiabilityAccount(scope, input.simplesRecolherAccountId, 'Simples Nacional a recolher', tx);
    // X7 Fase B item 16 (F-TB-3 a): o ajuste anual negativo debita o saldo negativo a compensar — ativo (Asset).
    if (input.irpjSaldoNegativoAccountId) await this.assertAssetAccount(scope, input.irpjSaldoNegativoAccountId, 'saldo negativo de IRPJ a compensar', tx);
    if (input.csllSaldoNegativoAccountId) await this.assertAssetAccount(scope, input.csllSaldoNegativoAccountId, 'saldo negativo de CSLL a compensar', tx);
    // X13 PR-2 item 15 (F-OBP-1 a): a unidade segue o regime da EMPRESA no ano corrente (MEI/SIMPLES → SIMPLES).
    const regimeEmpresa = await this.regimeEmpresaHoje(scope, tx);
    if (regimeEmpresa && regimeUnidadeEsperado(regimeEmpresa) !== input.regimeTributario) {
      throw new ValidationError(
        `regime_divergente_da_empresa: a empresa está em ${regimeEmpresa} no ano corrente — a unidade deve ser ${regimeUnidadeEsperado(regimeEmpresa)}, não ${input.regimeTributario}.`,
      );
    }
    return regimeEmpresa;
  }

  /**
   * BE-INCR-ACCOUNTING-POLICY-VERSION item 5: o único caminho de escrita — `PUT` sem contador e aprovação do contador.
   * Re-valida dentro da tx (conta apagada ou regime da empresa mudado entre proposta e aprovação → 400, tx volta).
   * O `actor` do `fiscal_profile.updated` é o ator do escopo (o contador, na aprovação); o `scopeUserId`, o dono.
   */
  async applyInTx(
    scope: AccountingScope,
    input: FiscalProfilePolicyPayload,
    tx: Prisma.TransactionClient,
    policyVersionId: string,
    /** BE-INCR-KIT-SETOR PR-2: o kit preenche contas sem o operador ver os defaults D1f, então não os confirma. */
    opts: { d1fConfirmado?: boolean } = {},
  ): Promise<FiscalProfileView> {
    const regimeEmpresa = await this.validate(scope, input, tx);
    const { ibsCbsInformar, ...rest } = input;
    const data = {
      ...rest,
      ibsCbsInformar: ibsCbsInformar ?? input.regimeTributario !== 'SIMPLES',
      d1fConfirmado: opts.d1fConfirmado ?? true,
    };
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
        insumoExpenseAccountId: row.insumoExpenseAccountId ?? '', // ITEM-DESTINATION item 20 (decisão do dono 02/10)
        // X7 item 3 (F-TA-6 a): contas da provisão — só ids
        irpjDespesaAccountId: row.irpjDespesaAccountId ?? '',
        csllDespesaAccountId: row.csllDespesaAccountId ?? '',
        irpjRecolherAccountId: row.irpjRecolherAccountId ?? '',
        csllRecolherAccountId: row.csllRecolherAccountId ?? '',
        // X8 item 2: contas da provisão de PIS/Cofins — só ids
        pisDespesaAccountId: row.pisDespesaAccountId ?? '',
        cofinsDespesaAccountId: row.cofinsDespesaAccountId ?? '',
        pisRecolherAccountId: row.pisRecolherAccountId ?? '',
        cofinsRecolherAccountId: row.cofinsRecolherAccountId ?? '',
        pisCofinsCreditoOutrosAccountId: row.pisCofinsCreditoOutrosAccountId ?? '', // X8 PR-3 (L-5)
        pisCofinsRetidoCompensarAccountId: row.pisCofinsRetidoCompensarAccountId ?? '', // X8 PR-3 (retenções)
        pisCofinsRetencaoConciliarAccountId: row.pisCofinsRetencaoConciliarAccountId ?? '',
        simplesDasDeducaoAccountId: row.simplesDasDeducaoAccountId ?? '', // X14 PR-3 item 21
        simplesRecolherAccountId: row.simplesRecolherAccountId ?? '',
        irpjSaldoNegativoAccountId: row.irpjSaldoNegativoAccountId ?? '',
        csllSaldoNegativoAccountId: row.csllSaldoNegativoAccountId ?? '',
        // BE-INCR-DFE (item 9): enum/boolean/int como string — sem texto livre (IM/CNAE ficam fora do evento)
        codMun: row.codMun ?? '',
        dpsSerie: String(row.dpsSerie),
        regEspTrib: String(row.regEspTrib),
        regApTribSN: row.regApTribSN == null ? '' : String(row.regApTribSN),
        issAliquotaBp: row.issAliquotaBp == null ? '' : String(row.issAliquotaBp),
        issRetidoTomadorPj: String(row.issRetidoTomadorPj),
        pacoteFatoGerador: row.pacoteFatoGerador,
        // BE-INCR-PACOTE-VALIDADE 13a: códigos da lista nacional/NBS — sem texto livre
        pacoteCTribNac: row.pacoteCTribNac ?? '',
        pacoteCNBS: row.pacoteCNBS ?? '',
        ibsCbsInformar: String(row.ibsCbsInformar),
        ibsCbsCst: row.ibsCbsCst ?? '',
        ibsCbsClassTrib: row.ibsCbsClassTrib ?? '',
        pTotTribFedCent: row.pTotTribFedCent == null ? '' : String(row.pTotTribFedCent),
        pTotTribEstCent: row.pTotTribEstCent == null ? '' : String(row.pTotTribEstCent),
        pTotTribMunCent: row.pTotTribMunCent == null ? '' : String(row.pTotTribMunCent),
        pTotTribSNCent: row.pTotTribSNCent == null ? '' : String(row.pTotTribSNCent),
        emissaoForaDoMes: row.emissaoForaDoMes,
        policyVersionId, // GOV-CONTADOR (item 14): a versão que aplicou esta escrita
      },
    });
    return this.toView(row, regimeEmpresa);
  }

  private async assertAssetAccount(scope: AccountingScope, id: string, label: string, tx?: Prisma.TransactionClient): Promise<void> {
    const account = await this.accountRepo.findById(scope, id, tx);
    if (!account || account.deletedAt) throw new ValidationError(`Conta de ${label} '${id}' não existe neste escopo.`);
    if (!account.acceptsEntries) throw new ValidationError(`Conta de ${label} '${account.code}' não aceita lançamentos (não é folha).`);
    if (account.nature !== 'Asset') {
      throw new ValidationError(`Conta de ${label} '${account.code}' tem natureza ${account.nature}; esperado Asset (crédito a recuperar é ativo — BRIEF X6 item 18).`);
    }
  }

  /** ITEM-DESTINATION item 20 (F-ID-5 a): análogo ao `assertAssetAccount` — o insumo do serviço vai para
   *  DESPESA na entrada (F-ID-3 a), então a conta é folha de resultado `nature = Expense` do escopo. */
  private async assertExpenseAccount(scope: AccountingScope, id: string, label: string, tx?: Prisma.TransactionClient): Promise<void> {
    const account = await this.accountRepo.findById(scope, id, tx);
    if (!account || account.deletedAt) throw new ValidationError(`Conta de ${label} '${id}' não existe neste escopo.`);
    if (!account.acceptsEntries) throw new ValidationError(`Conta de ${label} '${account.code}' não aceita lançamentos (não é folha).`);
    if (account.nature !== 'Expense') {
      throw new ValidationError(`Conta de ${label} '${account.code}' tem natureza ${account.nature}; esperado Expense (insumo vai para despesa na entrada — ITEM-DESTINATION F-ID-3 a).`);
    }
  }

  /** X14 PR-3 item 21: a dedução da receita (DAS) é folha de natureza Revenue com saldo devedor, como 3.2 Devoluções. */
  private async assertRevenueAccount(scope: AccountingScope, id: string, label: string, tx?: Prisma.TransactionClient): Promise<void> {
    const account = await this.accountRepo.findById(scope, id, tx);
    if (!account || account.deletedAt) throw new ValidationError(`Conta de ${label} '${id}' não existe neste escopo.`);
    if (!account.acceptsEntries) throw new ValidationError(`Conta de ${label} '${account.code}' não aceita lançamentos (não é folha).`);
    if (account.nature !== 'Revenue') {
      throw new ValidationError(`Conta de ${label} '${account.code}' tem natureza ${account.nature}; esperado Revenue (dedução da receita bruta — BRIEF X14 item 21).`);
    }
  }

  /** X7 item 3 (F-TA-6 a): análogo ao `assertAssetAccount` — o imposto a recolher é passivo (`nature = Liability`). */
  private async assertLiabilityAccount(scope: AccountingScope, id: string, label: string, tx?: Prisma.TransactionClient): Promise<void> {
    const account = await this.accountRepo.findById(scope, id, tx);
    if (!account || account.deletedAt) throw new ValidationError(`Conta de ${label} '${id}' não existe neste escopo.`);
    if (!account.acceptsEntries) throw new ValidationError(`Conta de ${label} '${account.code}' não aceita lançamentos (não é folha).`);
    if (account.nature !== 'Liability') {
      throw new ValidationError(`Conta de ${label} '${account.code}' tem natureza ${account.nature}; esperado Liability (imposto a recolher é passivo — BRIEF X7 item 3 / X8 item 2).`);
    }
  }

  private toView(row: FiscalProfile, regimeEmpresa: RegimeEmpresa | null): FiscalProfileView {
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
      insumoExpenseAccountId: row.insumoExpenseAccountId,
      irpjDespesaAccountId: row.irpjDespesaAccountId,
      csllDespesaAccountId: row.csllDespesaAccountId,
      irpjRecolherAccountId: row.irpjRecolherAccountId,
      csllRecolherAccountId: row.csllRecolherAccountId,
      pisDespesaAccountId: row.pisDespesaAccountId,
      cofinsDespesaAccountId: row.cofinsDespesaAccountId,
      pisRecolherAccountId: row.pisRecolherAccountId,
      cofinsRecolherAccountId: row.cofinsRecolherAccountId,
      pisCofinsCreditoOutrosAccountId: row.pisCofinsCreditoOutrosAccountId,
      pisCofinsRetidoCompensarAccountId: row.pisCofinsRetidoCompensarAccountId,
      pisCofinsRetencaoConciliarAccountId: row.pisCofinsRetencaoConciliarAccountId,
      simplesDasDeducaoAccountId: row.simplesDasDeducaoAccountId, // X14 PR-3 item 21
      simplesRecolherAccountId: row.simplesRecolherAccountId,
      irpjSaldoNegativoAccountId: row.irpjSaldoNegativoAccountId,
      csllSaldoNegativoAccountId: row.csllSaldoNegativoAccountId,
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
      pacoteCTribNac: row.pacoteCTribNac,
      pacoteCNBS: row.pacoteCNBS,
      ibsCbsInformar: row.ibsCbsInformar,
      ibsCbsCst: row.ibsCbsCst,
      ibsCbsClassTrib: row.ibsCbsClassTrib,
      pTotTribFedCent: row.pTotTribFedCent,
      pTotTribEstCent: row.pTotTribEstCent,
      pTotTribMunCent: row.pTotTribMunCent,
      pTotTribSNCent: row.pTotTribSNCent,
      emissaoForaDoMes: row.emissaoForaDoMes,
      d1fConfirmado: row.d1fConfirmado,
      emissao: fiscalProfileEmissaoStatus(row, regimeEmpresa),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
