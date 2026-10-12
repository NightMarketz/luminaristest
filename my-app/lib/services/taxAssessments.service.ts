import { apiClient } from '../api/api-client';
import type { TaxAssessmentListQueryInput, TaxAssessmentScopeQueryInput } from '@/types/contracts/accounting/TaxAssessmentDto.gen';

/**
 * Apuração IRPJ/CSLL (X7) e PIS/Cofins (X8) — leitura + reconcile da provisão (FE-INCR-TAX-ASSESSMENT PR-1).
 * Entrada = contrato GERADO; resposta declarada à mão, espelho de `TaxAssessmentView` do BE (decisão 9 de
 * D-2026-09-28; BRIEF §2). Policy do BE: ler = `canReadTaxAssessment`, reconcile = `canManageTaxAssessment`.
 */

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export type TributoApuracao = 'IRPJ' | 'CSLL' | 'PIS' | 'COFINS';

export interface MemoriaLinha {
  codigo: string;
  descricao: string;
  valorCents: string;
  fonte: string;
}

export interface TaxAssessment {
  id: string;
  tributo: TributoApuracao;
  periodo: string;
  modo: string;
  codigoReceita: string;
  baseCents: string;
  devidoCents: string;
  deducoesCents: string;
  aPagarCents: string;
  saldoNegativoCents: string;
  diferencaPostergadaCents: string;
  status: 'CONFIRMED' | 'SUPERSEDED';
  supersedesId: string | null;
  provisaoPendente: boolean;
  tabelaVersao: string;
  parametrosSha256: string | null;
  avisoParametroLegal: string | null;
  memoria: MemoriaLinha[];
  confirmedAt: string;
}

const enc = encodeURIComponent;

export const taxAssessmentsService = {
  /** Lista do ano (X7 + X8, vivas e substituídas quando `status` é omitido). */
  async list(query: TaxAssessmentListQueryInput): Promise<TaxAssessment[]> {
    const p = new URLSearchParams({ unitId: query.unitId, anoCalendario: String(query.anoCalendario) });
    if (query.periodo) p.set('periodo', query.periodo);
    if (query.tributo) p.set('tributo', query.tributo);
    if (query.status) p.set('status', query.status);
    return (await apiClient.get<ApiEnvelope<TaxAssessment[]>>(`/accounting/tax-assessments?${p.toString()}`)).data;
  },

  /** Detalhe com a memória de cálculo. */
  async get(id: string, query: TaxAssessmentScopeQueryInput): Promise<TaxAssessment> {
    return (await apiClient.get<ApiEnvelope<TaxAssessment>>(`/accounting/tax-assessments/${enc(id)}?unitId=${enc(query.unitId)}`)).data;
  },

  /** Reconcilia a provisão pendente (idempotente no BE). */
  async reconcileProvisao(id: string, body: TaxAssessmentScopeQueryInput): Promise<TaxAssessment> {
    return (await apiClient.post<ApiEnvelope<TaxAssessment>>(`/accounting/tax-assessments/${enc(id)}/provisao`, body)).data;
  },
};
