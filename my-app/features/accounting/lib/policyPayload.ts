import type { ProposePolicyVersionInput, PolicyTarget } from '../../../lib/services/policyVersions.service';
import type { UpsertFiscalProfileInput } from '../../../lib/services/fiscalProfile.service';
import type { FixedAssetAccountsPatch } from '../../../lib/services/accounting.service';
import { formatPctHundredths } from './fiscalProfileForm';

/**
 * Proposta de política a partir do MESMO corpo que o PUT mandaria (FE-INCR-ACCOUNTING-POLICY-VERSION item 2) e o
 * diff campo a campo do detalhe (item 8, F-FE-POL-3 a). Tudo função pura, com retorno declarado (regra do mapper).
 */

type FiscalProposal = Extract<ProposePolicyVersionInput, { target: 'FISCAL_PROFILE' }>;
type SettingsProposal = Extract<ProposePolicyVersionInput, { target: 'SCOPE_SETTINGS' }>;

// Guarda de compilação: o payload da proposta tem EXATAMENTE as chaves do corpo do PUT menos `unitId`. Se o DTO de um
// lado ganhar/perder campo, o `tsc` cai aqui — é o que torna seguro o rest abaixo (sem cópia campo a campo).
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const fiscalPayloadMatchesPut: Exact<Omit<UpsertFiscalProfileInput, 'unitId'>, FiscalProposal['payload']> = true;
void fiscalPayloadMatchesPut;

/** Corpo do `PUT /fiscal-profile` → proposta: `unitId` sobe ao nível de cima; o resto é o payload, intacto. */
export function toFiscalProfileProposal(body: UpsertFiscalProfileInput): FiscalProposal {
  const { unitId, ...payload } = body;
  return { unitId, target: 'FISCAL_PROFILE', payload };
}

/** Patch das 3 contas do imobilizado → proposta parcial (as outras 3 chaves do `SCOPE_SETTINGS` não vão). */
export function toScopeSettingsProposal(patch: FixedAssetAccountsPatch): SettingsProposal {
  return {
    unitId: patch.unitId,
    target: 'SCOPE_SETTINGS',
    payload: {
      depreciationExpenseAccountId: patch.depreciationExpenseAccountId,
      disposalGainAccountId: patch.disposalGainAccountId,
      disposalLossAccountId: patch.disposalLossAccountId,
    },
  };
}

// ─────────────────────────────────────────────────────────────── diff

export type TFn = (key: string, fallback: string, vars?: Record<string, string>) => string;

export interface PolicyDiffRow {
  key: string;
  label: string;
  current: string;
  proposed: string;
  changed: boolean;
}

/** Nome do campo → a chave i18n que a tela de origem já usa (com o fallback dela). Fora daqui: o nome técnico. */
const FIELD_LABEL: Record<string, [string, string]> = {
  regimeTributario: ['fiscalProfile.field.regimeTributario', 'Regime tributário'],
  pisCofinsRegime: ['fiscalProfile.field.pisCofinsRegime', 'Regime de PIS/COFINS'],
  icmsContribuinte: ['fiscalProfile.field.icmsContribuinte', 'Contribuinte de ICMS'],
  codMun: ['fiscalProfile.faltante.codMun', 'Município do emitente (código IBGE)'],
  inscricaoMunicipal: ['fiscalProfile.field.inscricaoMunicipal', 'Inscrição municipal'],
  cnae: ['fiscalProfile.field.cnae', 'CNAE'],
  regEspTrib: ['fiscalProfile.field.regEspTrib', 'Regime especial de tributação (0–9)'],
  regApTribSN: ['fiscalProfile.field.regApTribSN', 'Regime de apuração pelo Simples'],
  dpsSerie: ['fiscalProfile.field.dpsSerie', 'Série da DPS'],
  issAliquotaBp: ['fiscalProfile.field.issAliquota', 'Alíquota do ISS (%)'],
  issRetidoTomadorPj: ['fiscalProfile.field.issRetidoTomadorPj', 'ISS retido pelo tomador pessoa jurídica'],
  pTotTribSNCent: ['fiscalProfile.faltante.pTotTribSNCent', 'Tributos aproximados — Simples Nacional (%)'],
  pTotTribFedCent: ['fiscalProfile.faltante.pTotTribFedCent', 'Tributos aproximados — federal (%)'],
  pTotTribEstCent: ['fiscalProfile.faltante.pTotTribEstCent', 'Tributos aproximados — estadual (%)'],
  pTotTribMunCent: ['fiscalProfile.faltante.pTotTribMunCent', 'Tributos aproximados — municipal (%)'],
  ibsCbsInformar: ['fiscalProfile.field.ibsCbsInformar', 'Informar IBS/CBS na NFS-e'],
  ibsCbsCst: ['fiscalProfile.faltante.ibsCbsCst', 'IBS/CBS — CST'],
  ibsCbsClassTrib: ['fiscalProfile.faltante.ibsCbsClassTrib', 'IBS/CBS — cClassTrib'],
  emissaoForaDoMes: ['fiscalProfile.field.emissaoForaDoMes', 'Competência fora do mês'],
  pacoteFatoGerador: ['fiscalProfile.field.pacoteFatoGerador', 'Fato gerador do pacote'],
  partnerAccountRef: ['fiscalProfile.field.partnerAccountRef', 'Conta no parceiro emissor'],
  pisCofinsCreditExcludesIcms: ['fiscalProfile.field.creditExcludesIcms', 'Crédito de PIS/COFINS exclui o ICMS da base'],
  pisCofinsCreditIncludesIpi: ['fiscalProfile.field.creditIncludesIpi', 'Crédito de PIS/COFINS inclui o IPI (regra fixa: não)'],
  pisCofinsCreditFromSimplesSupplier: ['fiscalProfile.field.creditFromSimplesSupplier', 'Crédito sobre compra de fornecedor do Simples'],
  icmsRecuperavelAccountId: ['fiscalProfile.field.icmsRecuperavelAccountId', 'Conta de ICMS a recuperar'],
  pisCofinsRecuperavelAccountId: ['fiscalProfile.field.pisCofinsRecuperavelAccountId', 'Conta de PIS/COFINS a recuperar'],
  depreciationExpenseAccountId: ['fixedAssets.accounts.depreciationExpense', 'Despesa de depreciação'],
  disposalGainAccountId: ['fixedAssets.accounts.disposalGain', 'Ganho na baixa'],
  disposalLossAccountId: ['fixedAssets.accounts.disposalLoss', 'Perda na baixa'],
};

/** Enum do perfil → as chaves de rótulo do `FiscalProfilePanel`. */
const ENUM_LABEL: Record<string, Record<string, [string, string]>> = {
  regimeTributario: {
    SIMPLES: ['fiscalProfile.regime.SIMPLES', 'Simples Nacional'],
    PRESUMIDO: ['fiscalProfile.regime.PRESUMIDO', 'Lucro Presumido'],
    REAL: ['fiscalProfile.regime.REAL', 'Lucro Real'],
  },
  pisCofinsRegime: {
    SIMPLES: ['fiscalProfile.pisCofins.SIMPLES', 'Simples'],
    CUMULATIVO: ['fiscalProfile.pisCofins.CUMULATIVO', 'Cumulativo'],
    NAO_CUMULATIVO: ['fiscalProfile.pisCofins.NAO_CUMULATIVO', 'Não cumulativo'],
  },
  emissaoForaDoMes: {
    AVISAR: ['fiscalProfile.foraDoMes.AVISAR', 'Avisar'],
    BLOQUEAR: ['fiscalProfile.foraDoMes.BLOQUEAR', 'Bloquear'],
  },
  pacoteFatoGerador: {
    CONSUMO: ['fiscalProfile.fatoGerador.CONSUMO', 'Consumo'],
    VENDA: ['fiscalProfile.fatoGerador.VENDA', 'Venda'],
  },
};

/** Campos em centésimos de ponto percentual (mesmo formatador do painel). */
const PCT_FIELDS = new Set(['issAliquotaBp', 'pTotTribSNCent', 'pTotTribFedCent', 'pTotTribEstCent', 'pTotTribMunCent']);

function formatValue(key: string, v: unknown, accountLabels: Record<string, string>, t: TFn): string {
  if (v === null || v === undefined || v === '') return '—';
  if (key.endsWith('AccountId') && typeof v === 'string') {
    return accountLabels[v] ?? t('policy.diff.accountMissing', 'conta não encontrada ({{id}})', { id: `${v.slice(0, 8)}…` });
  }
  if (typeof v === 'boolean') return v ? t('policy.diff.yes', 'Sim') : t('policy.diff.no', 'Não');
  if (PCT_FIELDS.has(key) && typeof v === 'number') return formatPctHundredths(v);
  const enumLabel = typeof v === 'string' ? ENUM_LABEL[key]?.[v] : undefined;
  if (enumLabel) return t(enumLabel[0], enumLabel[1]);
  return typeof v === 'string' ? v : JSON.stringify(v);
}

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * Linhas do diff: SÓ as chaves presentes no `payload` (campo fora dele não muda na aprovação). `base` é o `current`
 * — ou o `appliedSnapshot` numa versão `APPLIED`, escolhido pelo chamador. `target` fica na assinatura do BRIEF §4:
 * os rótulos das duas telas não colidem, então o mapa é um só.
 */
export function toPolicyDiffRows(
  target: PolicyTarget,
  payload: Record<string, unknown>,
  base: Record<string, unknown> | null,
  accountLabels: Record<string, string>,
  t: TFn,
): PolicyDiffRow[] {
  void target;
  return Object.keys(payload).map((key): PolicyDiffRow => {
    const label = FIELD_LABEL[key] ? t(FIELD_LABEL[key][0], FIELD_LABEL[key][1]) : key;
    const cur = base ? base[key] : null;
    const prop = payload[key];
    return {
      key,
      label,
      current: formatValue(key, cur, accountLabels, t),
      proposed: formatValue(key, prop, accountLabels, t),
      changed: !same(cur, prop),
    };
  });
}
