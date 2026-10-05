import { apiClient } from '../api/api-client';
import { notify } from '../notifications/notify';
import type { UpsertFiscalProfileInput } from '@/types/contracts/accounting/FiscalProfileDto.gen';
import type { UpsertServiceFiscalProfileInput } from '@/types/contracts/accounting/ServiceFiscalProfileDto.gen';

/**
 * Perfil fiscal da unidade e dos serviços (`/api/accounting/fiscal-profile`, `/service-fiscal-profiles` — nó X10b;
 * FE-INCR-DFE PR-0, item 1). Bodies de escrita pelo contrato gerado; as views de resposta são à mão (o snapshot gera só
 * os schemas de entrada — `PLANO-FE-CONTRACT-TYPES` D11).
 */
interface Envelope<T> {
  success: boolean;
  data: T;
}

const CTX = 'Perfil fiscal';

// espelha server/src/features/accounting/services/FiscalProfileService.ts:39-44
export interface FiscalProfileEmissao {
  /** true quando a EMISSÃO de NFS-e tem tudo que o perfil da unidade precisa. */
  completo: boolean;
  /** nomes de campo do BE (`codMun`, `pTotTribSNCent`…) ou frase pronta (`regime MEI — …`). */
  faltantes: string[];
  /** campos do contador (D1f) ainda não confirmados por PUT. */
  pendingExternalValidation: string[];
}

// espelha server/src/features/accounting/services/FiscalProfileService.ts:46-85 (+ CostRegime, lib/nfeCost.ts:28-34).
// O BE declara `regimeTributario`/`pacoteFatoGerador`/`emissaoForaDoMes` como `string`; aqui são as uniões do DTO,
// porque o PUT só grava valor que o Zod aceitou (sem isso o mapper de volta precisaria de `as`).
export interface FiscalProfileView {
  unitId: string;
  regimeTributario: UpsertFiscalProfileInput['regimeTributario'];
  icmsContribuinte: boolean;
  pisCofinsRegime: UpsertFiscalProfileInput['pisCofinsRegime'];
  pisCofinsCreditExcludesIcms: boolean;
  pisCofinsCreditIncludesIpi: boolean;
  pisCofinsCreditFromSimplesSupplier: boolean;
  icmsRecuperavelAccountId: string | null;
  pisCofinsRecuperavelAccountId: string | null;
  insumoExpenseAccountId: string | null;
  irpjDespesaAccountId: string | null;
  csllDespesaAccountId: string | null;
  irpjRecolherAccountId: string | null;
  csllRecolherAccountId: string | null;
  partnerAccountRef: string | null;
  codMun: string | null;
  inscricaoMunicipal: string | null;
  cnae: string | null;
  dpsSerie: number;
  regEspTrib: number;
  regApTribSN: number | null;
  issAliquotaBp: number | null;
  issRetidoTomadorPj: boolean;
  pacoteFatoGerador: NonNullable<UpsertFiscalProfileInput['pacoteFatoGerador']>;
  pacoteCTribNac: string | null;
  pacoteCNBS: string | null;
  ibsCbsInformar: boolean;
  ibsCbsCst: string | null;
  ibsCbsClassTrib: string | null;
  pTotTribFedCent: number | null;
  pTotTribEstCent: number | null;
  pTotTribMunCent: number | null;
  pTotTribSNCent: number | null;
  emissaoForaDoMes: NonNullable<UpsertFiscalProfileInput['emissaoForaDoMes']>;
  d1fConfirmado: boolean;
  emissao: FiscalProfileEmissao;
  updatedAt: string;
}

// espelha server/src/features/accounting/services/ServiceFiscalProfileService.ts:13-24
export interface ServiceFiscalProfileView {
  serviceRef: string;
  cTribNac: string;
  /** descrição do subitem na lista nacional (transcrição) — informativo. */
  cTribNacDescricao: string;
  cTribMun: string | null;
  cNBS: string | null;
  cIndOp: string;
  cLocPrestacao: string | null;
  xDescServ: string | null;
  updatedAt: string;
}

export type { UpsertFiscalProfileInput, UpsertServiceFiscalProfileInput };

const enc = encodeURIComponent;

/** O 404 de "ainda não cadastrado" (`fiscalProfileController.ts:18`) — o único 404 que vira `null`. */
function isProfileMissing(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const o = e as { status?: unknown; error?: unknown };
  return o.status === 404 && o.error === 'fiscal_profile_missing';
}

export const fiscalProfileService = {
  /** Perfil da unidade; `null` quando ainda não existe (404 `fiscal_profile_missing`). Outro erro propaga. */
  async getUnitProfile(unitId: string): Promise<FiscalProfileView | null> {
    try {
      return (await apiClient.get<Envelope<FiscalProfileView>>(`/accounting/fiscal-profile?unitId=${enc(unitId)}`)).data;
    } catch (e) {
      if (isProfileMissing(e)) return null;
      throw e;
    }
  },

  /** Substituição TOTAL (defaults do Zod nos omitidos) — quem chama manda o formulário inteiro. */
  async putUnitProfile(body: UpsertFiscalProfileInput): Promise<FiscalProfileView> {
    const res = await apiClient.put<Envelope<FiscalProfileView>>('/accounting/fiscal-profile', body);
    notify('Perfil fiscal da unidade salvo.', 'success', CTX);
    return res.data;
  },

  async listServiceProfiles(unitId: string): Promise<ServiceFiscalProfileView[]> {
    return (await apiClient.get<Envelope<ServiceFiscalProfileView[]>>(`/accounting/service-fiscal-profiles?unitId=${enc(unitId)}`)).data;
  },

  async putServiceProfile(serviceRef: string, body: UpsertServiceFiscalProfileInput): Promise<ServiceFiscalProfileView> {
    const res = await apiClient.put<Envelope<ServiceFiscalProfileView>>(`/accounting/service-fiscal-profiles/${enc(serviceRef)}`, body);
    notify('Perfil fiscal do serviço salvo.', 'success', CTX);
    return res.data;
  },

  async deleteServiceProfile(serviceRef: string, unitId: string): Promise<void> {
    await apiClient.delete(`/accounting/service-fiscal-profiles/${enc(serviceRef)}?unitId=${enc(unitId)}`);
    notify('Perfil fiscal do serviço removido.', 'success', CTX);
  },
};
