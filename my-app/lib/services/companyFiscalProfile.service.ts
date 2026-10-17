import { apiClient } from '../api/api-client';
import { notify } from '../notifications/notify';
import type { CompanyDeclaranteInput, UpsertCompanyFiscalProfileInput } from '@/types/contracts/accounting/CompanyFiscalProfileDto.gen';

/**
 * Perfil fiscal da EMPRESA por ano (`/api/accounting/company-fiscal-profile/:ano`, nó X13). O PUT é substituição total
 * (campo omitido volta ao default do Zod) — quem grava manda o perfil inteiro. FE-INCR-SIMPLES PR-A: o regime do ano
 * decide a grade da aba Apuração (item 1) e os campos do enquadramento MEI são editados aqui (item 8; lacuna decidida
 * por questionário em D-2026-10-15-FE-SIMPLES-PR-A-LACUNAS).
 */
interface Envelope<T> {
  success: boolean;
  data: T;
}

// espelha CompanyFiscalProfileView (server/src/features/accounting/services/CompanyFiscalProfileService.ts:40-72).
// O BE declara os enums como `string`; aqui são as uniões do DTO de entrada, porque o PUT só grava valor que o Zod aceitou.
export interface CompanyFiscalProfileView {
  ano: number;
  regime: UpsertCompanyFiscalProfileInput['regime'];
  grandePorte: boolean | null;
  inativa: boolean;
  condicoes: { aporteInvestidorAnjo: boolean | null; livroCaixaSemEscrituracao: boolean | null; distribuicaoAcimaBase: boolean | null };
  declarante: CompanyDeclaranteInput | null;
  ecd: { indNire: '0' | '1'; nire: string | null; numOrd: string | null; natLivr: string | null } | null;
  ecf: { indAliqCsll: NonNullable<UpsertCompanyFiscalProfileInput['ecf']>['indAliqCsll'] | null; indRecReceita: NonNullable<UpsertCompanyFiscalProfileInput['ecf']>['indRecReceita'] | null } | null;
  contadorContactId: string | null;
  representanteLegalSignerId: string | null;
  ecfRecibo: string | null;
  regimeTravadoEm: string | null;
  formaApuracaoIrpjCsll: NonNullable<UpsertCompanyFiscalProfileInput['formaApuracaoIrpjCsll']> | null;
  formaApuracaoTravadaEm: string | null;
  lucroRealObrigatorio: boolean | null;
  inicioAtividadeEm: string | null;
  encerramentoAtividadeEm: string | null;
  lc224AcrescimoSuspenso: boolean;
  lc224LiminarReferencia: string | null;
  prestadoraExclusivaServicos: boolean;
  declaraNaoProfissaoRegulamentada: boolean;
  meiContribuinteIcms: boolean | null;
  meiContribuinteIss: boolean | null;
  meiTransportadorCargas: boolean | null;
  meiOcupacoes: string[] | null;
  simplesRegimeApuracao: NonNullable<UpsertCompanyFiscalProfileInput['simplesRegimeApuracao']>;
  ibsCbsOpcaoS1: NonNullable<UpsertCompanyFiscalProfileInput['ibsCbsOpcaoS1']> | null;
  ibsCbsOpcaoS2: NonNullable<UpsertCompanyFiscalProfileInput['ibsCbsOpcaoS2']> | null;
  updatedAt: string;
}

export type { UpsertCompanyFiscalProfileInput };

const enc = encodeURIComponent;

/** O 404 de "ainda não cadastrado" (`companyFiscalProfileController.ts:29-33`) — o único 404 que vira `null`. */
function isProfileMissing(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const o = e as { status?: unknown; error?: unknown };
  return o.status === 404 && o.error === 'company_fiscal_profile_missing';
}

export const companyFiscalProfileService = {
  /** Perfil do ano; `null` quando não cadastrado. Outro erro propaga. */
  async get(ano: number, unitId: string): Promise<CompanyFiscalProfileView | null> {
    try {
      return (await apiClient.get<Envelope<CompanyFiscalProfileView>>(`/accounting/company-fiscal-profile/${ano}?unitId=${enc(unitId)}`)).data;
    } catch (e) {
      if (isProfileMissing(e)) return null;
      throw e;
    }
  },

  /** Substituição TOTAL do perfil do ano. */
  async put(ano: number, body: UpsertCompanyFiscalProfileInput): Promise<CompanyFiscalProfileView> {
    const res = await apiClient.put<Envelope<CompanyFiscalProfileView>>(`/accounting/company-fiscal-profile/${ano}`, body);
    notify('Perfil fiscal do ano salvo.', 'success', 'Perfil fiscal');
    return res.data;
  },
};
