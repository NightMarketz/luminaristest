import { apiClient } from '../api/api-client';
import type {
  AlertaSimplesInput,
  SalaoParceriaContratoInput,
  SalaoParceriaContratoPatchInput,
  SimplesDasRegistroInput,
  SimplesDasnUpsertInput,
  SimplesDefisDigitadoInput,
  SimplesDefisUpsertInput,
  SimplesHistoricoUpsertInput,
  SimplesSegregacaoParcelaInput,
  SimplesSegregacaoUpsertInput,
  SimplesUnitQueryInput,
} from '@/types/contracts/accounting/SimplesDto.gen';

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

// espelha SalaoParceriaContratoView (server/src/features/accounting/dtos/SimplesDto.ts:141-153)
export interface SalaoParceriaContrato {
  id: string;
  unitId: string;
  profissionalContactId: string;
  cotaSalaoBp: number;
  naturezaCota: 'ALUGUEL_BEM_MOVEL' | 'GESTAO';
  homologadoEm: string;
  sindicato: string;
  vigenteDesde: string;
  vigenteAte: string | null;
  createdAt: string;
  updatedAt: string;
}

// espelha SimplesHistoricoView / SimplesSegregacaoView (server/src/features/accounting/dtos/SimplesDto.ts:125-140)
export interface SimplesHistorico {
  id: string;
  unitId: string;
  competencia: string;
  receitaBrutaCents: number;
  folhaCents: number | null;
  sourceDocumentId: string | null;
  updatedAt: string;
}
export interface SimplesSegregacao {
  id: string;
  unitId: string;
  competencia: string;
  /** `excluir` = tributos que a parcela tira do DAS, derivados do motivo no BE (`excluirDoMotivo`) — nunca digitados. */
  parcelas: Array<SimplesSegregacaoParcelaInput & { excluir: TributoSimples[] }>;
  updatedAt: string;
}

// ---- PR-D (itens 13–15) — declarações anuais e alíquotas sugeridas

// espelha AliquotasSimples (server/src/features/accounting/services/SimplesApuracaoService.ts:92-115)
export interface AliquotasSimples {
  competencia: string;
  /** O PA cuja faixa vale; no mês de início, a própria competência. */
  mesReferencia: string;
  sugestao: true;
  regra: 'INICIO_ATIVIDADE' | 'FAIXA_MES_ANTERIOR' | 'FAIXA_MES_PRESTACAO';
  periodoApuracao: string | null;
  rbt12Cents: number | null;
  janelaRbt12: ApuracaoSimples['janelaRbt12'] | null;
  atividades: Array<{
    anexo: string | null;
    natureza: NaturezaSimples;
    cTribNac: string | null;
    faixa: number | null;
    fatorR: string | null;
    aliquotaEfetiva: string | null;
    issRetencao: string | null;
    beneficioMunicipal: { legislacao: string; tipo: string; pisoAplicado: boolean; excecaoPiso: boolean } | null;
    pTotTribSNSugerido: string | null;
    creditoAdquirente: { ICMS: string | null; IBS: string | null; CBS: string | null } | null;
  }>;
  avisos: string[];
  alertas: AlertaSimples[];
}

// espelha SimplesDasnSimeiView (server/src/features/accounting/dtos/SimplesDto.ts:267-274)
export interface SimplesDasnSimeiView {
  ano: number;
  prazo: string;
  receitaBrutaTotalCents: number;
  receitaIcmsCents: number;
  mesesSemSubrazao: string[];
  digitado: { contratouEmpregado: boolean } | null;
}

// espelha SimplesDefisView + SimplesDefisLucroContabil (SimplesDto.ts:281-297); `digitado` já vem lido com 0 / [] pelo BE
export interface SimplesDefisView {
  ano: number;
  prazo: string;
  mesesApurados: string[];
  lucroContabil: {
    valorCents: number;
    limiteIsencaoCents: number | null;
    informar: boolean;
    calculo: 'PRESUNCAO' | 'SEM_ESCRITURACAO';
    avisos: string[];
  };
  estoqueInicialCents: number;
  estoqueFinalCents: number;
  digitado: SimplesDefisDigitadoInput | null;
}

export type {
  SalaoParceriaContratoInput,
  SalaoParceriaContratoPatchInput,
  SimplesDasRegistroInput,
  SimplesDasnUpsertInput,
  SimplesDefisDigitadoInput,
  SimplesDefisUpsertInput,
  SimplesHistoricoUpsertInput,
  SimplesSegregacaoParcelaInput,
  SimplesSegregacaoUpsertInput,
};

/** O 404 `NOT_FOUND` dos GETs de entrada = mês sem registro (F-GE-1) → `null`. Outro erro propaga. */
function semRegistro(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const o = e as { status?: unknown; code?: unknown };
  return o.status === 404 && o.code === 'NOT_FOUND';
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

  /** PUT …/apuracoes/:competencia/das — registra o DAS oficial (ME/EPP e MEI); 409 = entradas mudaram; 400 = bloqueantes. */
  async registrarDas(competencia: string, body: SimplesDasRegistroInput): Promise<Apuracao> {
    return (await apiClient.put<ApiEnvelope<Apuracao>>(`${base}/apuracoes/${enc(competencia)}/das`, body)).data;
  },

  /** GET /historico/:competencia — `null` quando o mês não tem histórico (o apiClient ainda mostra o toast do 404). */
  async obterHistorico(competencia: string, query: SimplesUnitQueryInput): Promise<SimplesHistorico | null> {
    try {
      return (await apiClient.get<ApiEnvelope<SimplesHistorico>>(`${base}/historico/${enc(competencia)}?unitId=${enc(query.unitId)}`)).data;
    } catch (e) {
      if (semRegistro(e)) return null;
      throw e;
    }
  },

  async salvarHistorico(competencia: string, body: SimplesHistoricoUpsertInput): Promise<SimplesHistorico> {
    return (await apiClient.put<ApiEnvelope<SimplesHistorico>>(`${base}/historico/${enc(competencia)}`, body)).data;
  },

  /** GET /segregacao/:competencia — `null` quando o mês não tem segregação manual. */
  async obterSegregacao(competencia: string, query: SimplesUnitQueryInput): Promise<SimplesSegregacao | null> {
    try {
      return (await apiClient.get<ApiEnvelope<SimplesSegregacao>>(`${base}/segregacao/${enc(competencia)}?unitId=${enc(query.unitId)}`)).data;
    } catch (e) {
      if (semRegistro(e)) return null;
      throw e;
    }
  },

  /** PUT /segregacao/:competencia — substitui o conjunto inteiro do mês (lista vazia limpa). */
  async salvarSegregacao(competencia: string, body: SimplesSegregacaoUpsertInput): Promise<SimplesSegregacao> {
    return (await apiClient.put<ApiEnvelope<SimplesSegregacao>>(`${base}/segregacao/${enc(competencia)}`, body)).data;
  },

  /** Contratos salão-parceiro (Lei 12.592) da unidade — item 13 do X14. */
  async listParcerias(query: SimplesUnitQueryInput): Promise<SalaoParceriaContrato[]> {
    return (await apiClient.get<ApiEnvelope<SalaoParceriaContrato[]>>(`${base}/parcerias?unitId=${enc(query.unitId)}`)).data;
  },

  async criarParceria(body: SalaoParceriaContratoInput): Promise<SalaoParceriaContrato> {
    return (await apiClient.post<ApiEnvelope<SalaoParceriaContrato>>(`${base}/parcerias`, body)).data;
  },

  async atualizarParceria(id: string, body: SalaoParceriaContratoPatchInput): Promise<SalaoParceriaContrato> {
    return (await apiClient.patch<ApiEnvelope<SalaoParceriaContrato>>(`${base}/parcerias/${enc(id)}`, body)).data;
  },

  /** GET /aliquotas/:competencia — SUGESTÃO por atividade (X14 item 29); ano MEI ⇒ 400. */
  async obterAliquotas(competencia: string, query: SimplesUnitQueryInput): Promise<AliquotasSimples> {
    return (await apiClient.get<ApiEnvelope<AliquotasSimples>>(`${base}/aliquotas/${enc(competencia)}?unitId=${enc(query.unitId)}`)).data;
  },

  /** GET /dasn-simei/:ano — ano MEI (Res. CGSN 140 art. 109); outro regime ⇒ 400. */
  async obterDasnSimei(ano: number, query: SimplesUnitQueryInput): Promise<SimplesDasnSimeiView> {
    return (await apiClient.get<ApiEnvelope<SimplesDasnSimeiView>>(`${base}/dasn-simei/${ano}?unitId=${enc(query.unitId)}`)).data;
  },

  async salvarDasnSimei(ano: number, body: SimplesDasnUpsertInput): Promise<SimplesDasnSimeiView> {
    return (await apiClient.put<ApiEnvelope<SimplesDasnSimeiView>>(`${base}/dasn-simei/${ano}`, body)).data;
  },

  /** GET /defis/:ano — ano SIMPLES ≤ 2026 com mês apurado; fora disso 400 com o texto do BE. */
  async obterDefis(ano: number, query: SimplesUnitQueryInput): Promise<SimplesDefisView> {
    return (await apiClient.get<ApiEnvelope<SimplesDefisView>>(`${base}/defis/${ano}?unitId=${enc(query.unitId)}`)).data;
  },

  /** PUT /defis/:ano — substitui os campos digitados; sócios + tesouraria = 100% é regra do BE (400 com o texto dele). */
  async salvarDefis(ano: number, body: SimplesDefisUpsertInput): Promise<SimplesDefisView> {
    return (await apiClient.put<ApiEnvelope<SimplesDefisView>>(`${base}/defis/${ano}`, body)).data;
  },

  /** Soft-delete no BE. */
  async removerParceria(id: string, query: SimplesUnitQueryInput): Promise<void> {
    await apiClient.delete(`${base}/parcerias/${enc(id)}?unitId=${enc(query.unitId)}`);
  },
};
