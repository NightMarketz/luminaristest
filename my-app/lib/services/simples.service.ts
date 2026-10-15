import { apiClient } from '../api/api-client';
import type { AlertaSimplesInput, SimplesUnitQueryInput } from '@/types/contracts/accounting/SimplesDto.gen';

/**
 * Simples Nacional — ME/EPP e MEI (`/api/accounting/simples/*`, nó X14; FE-INCR-SIMPLES). Entrada = contrato GERADO;
 * respostas declaradas à mão, espelho do BE (decisão 9 de D-2026-09-28; BRIEF §3). Policy do BE: ler =
 * `canReadTaxAssessment`, gravar = `canManageTaxAssessment`.
 */

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

/** espelha `AlertaSimplesSchema` (server/src/features/accounting/dtos/SimplesDto.ts:113-121) — o shape é o do `.gen`. */
export type AlertaSimples = AlertaSimplesInput;
export type CodigoAlertaSimples = AlertaSimples['codigo'];

// espelha TRIBUTOS_SIMPLES / AnexoSimples / NaturezaSimples (server/src/features/accounting/models/simplesCalc.ts:16-31)
export type TributoSimples = 'IRPJ' | 'CSLL' | 'COFINS' | 'PIS' | 'CBS' | 'IBS' | 'CPP' | 'ICMS' | 'ISS' | 'IPI';
export type AnexoSimples = 'I' | 'II' | 'III' | 'IV' | 'V';
export type NaturezaSimples = 'SERVICO' | 'REVENDA' | 'LOCACAO_MOVEL' | 'PARCERIA_GESTAO';

export interface LinhaTabelaLegal {
  legalParameterId: string;
  fonte: string;
  vigenteDesde: string;
}

export interface DasOficial {
  id: string;
  numeroDocumento: string;
  valorCents: number;
  vencimento: string;
  provisaoPendente: boolean;
}

// espelha AtividadeApurada (simplesCalc.ts:119-138)
export interface AtividadeApurada {
  anexo: AnexoSimples;
  natureza: NaturezaSimples;
  cTribNac: string | null;
  receitaCents: number;
  faixa: number;
  /** percentual, 2 casas */
  aliquotaNominal: string;
  parcelaDeduzirCents: number;
  /** percentual, 4 casas */
  aliquotaEfetiva: string;
  /** razão, 4 casas — só atividade sujeita ao fator R */
  fatorR: string | null;
  tributos: Partial<Record<TributoSimples, number>>;
  percentuais: Partial<Record<TributoSimples, string>>;
  beneficioIss?: { issTabela: string; pisoAplicado: boolean; excecaoPiso: boolean; desvantajoso: boolean };
}

// espelha EspelhoAtividade (server/src/features/accounting/models/simplesEspelho.ts:11-23)
export interface EspelhoAtividade {
  item: '1' | '5' | '7';
  atividade: string;
  detalhe: string;
  anexo: AnexoSimples;
  receitaCents: number;
  parcelas: Array<{ receitaCents: number; qualificacoes: Partial<Record<TributoSimples, string>> }>;
}

// espelha ApuracaoSimples (server/src/features/accounting/services/SimplesApuracaoService.ts:63-70 + ApuracaoCalculada)
export interface ApuracaoSimples {
  competencia: string;
  regime: 'SIMPLES';
  rbt12Cents: number;
  janelaRbt12: { de: string; ate: string; regra: 'LC123-art18-§1' | 'LC214-art517' };
  atividades: AtividadeApurada[];
  totalCalculadoCents: number;
  tabela: LinhaTabelaLegal[];
  espelho: EspelhoAtividade[];
  dasOficial: DasOficial | null;
  divergenciaCents: number | null;
  tieOut: { subrazaoCents: number; razaoCents: number; ok: boolean };
  alertas: AlertaSimples[];
}

// espelha ApuracaoMei = ApuracaoSimei + extras (SimplesApuracaoService.ts:73-81; simplesCalc.ts:486-507)
export interface ApuracaoMei {
  competencia: string;
  regime: 'MEI';
  salarioMinimoCents: number;
  transportadorCargas: boolean;
  /** 500 = 5%; 1200 = 12% (transportador autônomo de cargas, desde 04/2022) */
  cppAliquotaBp: number;
  /** centavos */
  tributos: Partial<Record<'CPP' | 'ICMS' | 'ISS', number>>;
  /** milésimos de real; `{}` antes de 2027 (F-TAC-7 a) */
  tributosMilesimos: Partial<Record<'CBS' | 'IBS', number>>;
  totalCalculadoCents: number;
  tabela: LinhaTabelaLegal[];
  enquadramento: { contribuinteIcms: boolean; contribuinteIss: boolean };
  receitaPaCents: number;
  receitaAcumuladaAnoCents: number;
  limiteAnoCents: number;
  dasOficial: DasOficial | null;
  divergenciaCents: number | null;
  alertas: AlertaSimples[];
}

/** `calcular`/`obter` devolvem uma ou outra conforme o perfil do ano (SimplesApuracaoService.ts:182-189). */
export type Apuracao = ApuracaoSimples | ApuracaoMei;

/** BRIEF item 3 — discriminação da resposta. */
export const ehMei = (a: Apuracao): a is ApuracaoMei => a.regime === 'MEI';

const enc = encodeURIComponent;
const base = '/accounting/simples';

export const simplesService = {
  /** GET …/apuracoes/:competencia?unitId — recalcula + DAS oficial registrado (item 18 do X14). */
  async obterApuracao(competencia: string, query: SimplesUnitQueryInput): Promise<Apuracao> {
    return (await apiClient.get<ApiEnvelope<Apuracao>>(`${base}/apuracoes/${enc(competencia)}?unitId=${enc(query.unitId)}`)).data;
  },

  /** POST …/apuracoes/:competencia/calcular — nada é gravado (B-2 → a). */
  async calcularApuracao(competencia: string, body: SimplesUnitQueryInput): Promise<Apuracao> {
    return (await apiClient.post<ApiEnvelope<Apuracao>>(`${base}/apuracoes/${enc(competencia)}/calcular`, body)).data;
  },
};
