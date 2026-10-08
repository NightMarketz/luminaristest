import { apiClient } from '../api/api-client';
import type { ListLegalParametersQueryInput, ProposeLegalParameterInput } from '@/types/contracts/legalParameters/LegalParameterDto.gen';

/**
 * Coeficientes de lei da plataforma (FE-INCR-LEGAL-PARAMS, item 2) — cliente fino de `/api/legal-parameters`
 * (BE-INCR-LEGAL-PARAMS PR-1). Entrada = contrato GERADO; resposta declarada à mão, espelho de `LegalParameterView`
 * (decisão 9 de D-2026-09-28). Ler: qualquer autenticado. Propor/publicar/revogar: só PLATFORM_ADMIN (o BE barra).
 */

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export type LegalParameterStatus = 'DRAFT' | 'PUBLISHED' | 'REVOKED';
export type LegalParameterTabela = NonNullable<ListLegalParametersQueryInput['tabela']>;
export type { ProposeLegalParameterInput };

export interface LegalParameter {
  id: string;
  tabela: string;
  chave: string;
  discriminador: string | null;
  valorInt: number | null;
  valorTexto: string | null;
  valorJson: unknown;
  fonte: string;
  fonteUrl: string | null;
  fonteSha256: string | null;
  vigenteDesde: string;
  vigenteAte: string | null;
  status: LegalParameterStatus;
  supersedesId: string | null;
  motivo: string;
  proposedById: string;
  publishedById: string | null;
  publishedAt: string | null;
  revokedById: string | null;
  revokedAt: string | null;
  createdAt: string;
}

const enc = encodeURIComponent;

export const legalParametersService = {
  async list(query: ListLegalParametersQueryInput = {}): Promise<LegalParameter[]> {
    const p = new URLSearchParams();
    if (query.tabela) p.set('tabela', query.tabela);
    if (query.status) p.set('status', query.status);
    const qs = p.toString() ? `?${p.toString()}` : '';
    return (await apiClient.get<ApiEnvelope<LegalParameter[]>>(`/legal-parameters${qs}`)).data;
  },

  async propose(input: ProposeLegalParameterInput): Promise<LegalParameter> {
    return (await apiClient.post<ApiEnvelope<LegalParameter>>('/legal-parameters', input)).data;
  },

  async publish(id: string): Promise<LegalParameter> {
    return (await apiClient.post<ApiEnvelope<LegalParameter>>(`/legal-parameters/${enc(id)}/publish`, {})).data;
  },

  async revoke(id: string): Promise<LegalParameter> {
    return (await apiClient.post<ApiEnvelope<LegalParameter>>(`/legal-parameters/${enc(id)}/revoke`, {})).data;
  },
};
