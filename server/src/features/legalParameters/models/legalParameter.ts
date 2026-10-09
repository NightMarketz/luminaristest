/**
 * BE-INCR-LEGAL-PARAMS (nó LEGAL-PARAMS; BRIEF §3 itens 2 e 4, emenda §9 L-6/L-7) — catálogo fechado de tabelas de
 * lei e o lookup PURO por data do fato gerador. Guarda números e listas, nunca lógica (`R-motor-regras`).
 */
import { createHash } from 'crypto';
import { ValidationError } from '../../../lib/errors';

/** Item 2 — uma tabela por fonte de verdade que hoje está em código. Fora do enum ⇒ 400 no DTO. */
export const LEGAL_PARAMETER_TABELAS = [
  'TAX_ASSESSMENT',
  'CSLL_ALIQUOTA',
  'CODIGO_RECEITA',
  'PIS_COFINS',
  'PIS_COFINS_MONOFASICO_NCM',
  'CST_PIS_COFINS',
  'CFOP_IMOBILIZADO',
  'NFE_CSTAT_AUTORIZADA',
  'OBRIGACAO_REGIME',
  'LC116_SERVICO',
  'ISS_LIMITE',
  'DEPRECIACAO_ANEXO_III',
  'LEIAUTE_SPED',
  'FERIADO_NACIONAL',
  // BE-INCR-SIMPLES-NACIONAL PR-1 (nó X14, BRIEF item 1; F-SN-2 → b): tabelas do Simples no canônico, sem model novo.
  'SIMPLES_ANEXO_FAIXA',
  'SIMPLES_ANEXO_REPARTICAO',
  'SIMPLES_TETO_ISS',
  'SIMPLES_ENQUADRAMENTO',
  'SIMPLES_LIMITE',
  'SIMEI_VALOR',
  'SALARIO_MINIMO',
  // SIMPLES-PISO-ANEXO-XI bloco 2 (BRIEF item 11): ocupações permitidas ao MEI (Res. CGSN 140 Anexo XI, Tabelas A e B).
  'MEI_ANEXO_XI',
] as const;
export type LegalParameterTabela = (typeof LEGAL_PARAMETER_TABELAS)[number];

/**
 * Tabelas cujo consumidor já lê do banco (emenda §9 L-4: PR-1 = IRPJ/CSLL e PIS/Cofins; PR-2 = as demais, menos a
 * depreciação; PR-3 = DEPRECIACAO_ANEXO_III). Desde o PR-3 são todas; o conjunto fica como guarda de que tabela nova
 * no enum só se propõe quando um consumidor a lê.
 */
// MEI_ANEXO_XI (SIMPLES-PISO-ANEXO-XI bloco 2) fica FORA até o consumidor (itens 12-16 do BRIEF, pausados pela lacuna
// das citações do F-AX-4) ler a tabela — mesmo tratamento que a DEPRECIACAO_ANEXO_III teve entre o PR-2 e o PR-3.
export const TABELAS_MIGRADAS: ReadonlySet<LegalParameterTabela> = new Set(LEGAL_PARAMETER_TABELAS.filter((t) => t !== 'MEI_ANEXO_XI'));

export const LEGAL_PARAMETER_STATUS = ['DRAFT', 'PUBLISHED', 'REVOKED'] as const;
export type LegalParameterStatus = (typeof LEGAL_PARAMETER_STATUS)[number];

/** A linha como o lookup a enxerga (subconjunto estrutural do model Prisma). */
export interface LinhaLegal {
  id: string;
  tabela: string;
  chave: string;
  discriminador: string | null;
  valorInt: number | null;
  valorTexto: string | null;
  valorJson: string | null;
  fonte: string;
  vigenteDesde: string; // YYYY-MM-DD
  vigenteAte: string | null; // YYYY-MM-DD inclusive
  status: string;
  supersedesId: string | null;
}

/**
 * Linhas que valem hoje como tabela: PUBLISHED e não substituídas por outra PUBLISHED (L-7). Uma substituta revogada
 * deixa de substituir — a anterior volta a valer.
 */
export function linhasEmVigor<T extends LinhaLegal>(linhas: readonly T[]): T[] {
  const publicadas = linhas.filter((l) => l.status === 'PUBLISHED');
  const substituidas = new Set(publicadas.map((l) => l.supersedesId).filter((id): id is string => id !== null));
  return publicadas.filter((l) => !substituidas.has(l.id));
}

/**
 * Item 4 — a linha em vigor com `vigenteDesde ≤ data ≤ vigenteAte` (null = sem fim), a de `vigenteDesde` mais recente.
 * Mesma semântica de `linhaVigente` (taxAssessmentParams) e `parametroPisCofinsVigente`.
 */
export function linhaLegalVigente<T extends LinhaLegal>(
  linhas: readonly T[],
  tabela: string,
  chave: string,
  data: string,
  discriminador: string | null = null,
): T | undefined {
  let melhor: T | undefined;
  for (const l of linhasEmVigor(linhas)) {
    if (l.tabela !== tabela || l.chave !== chave || l.discriminador !== discriminador) continue;
    if (l.vigenteDesde > data || (l.vigenteAte !== null && data > l.vigenteAte)) continue;
    if (!melhor || l.vigenteDesde > melhor.vigenteDesde) melhor = l;
  }
  return melhor;
}

/**
 * PR-2 — tabelas-LISTA (CST, CFOP, cStat, NCM, LC 116, feriados…): as linhas em vigor da tabela na `data` do fato, em
 * qualquer chave. Ausência de UMA chave = "não está na lista"; ausência da tabela INTEIRA na data é erro explícito
 * (item 4: sem linha vigente ⇒ erro), nunca uma lista vazia que recusaria tudo em silêncio.
 */
export function linhasVigentesDaTabela<T extends LinhaLegal>(linhas: readonly T[], tabela: LegalParameterTabela, data: string): T[] {
  const porChave = new Map<string, T>();
  for (const l of linhasEmVigor(linhas)) {
    if (l.tabela !== tabela || l.vigenteDesde > data || (l.vigenteAte !== null && data > l.vigenteAte)) continue;
    const k = `${l.chave}|${l.discriminador ?? ''}`;
    const atual = porChave.get(k);
    if (!atual || l.vigenteDesde > atual.vigenteDesde) porChave.set(k, l);
  }
  if (porChave.size === 0) throw new SemLinhaVigenteError(tabela, data);
  return [...porChave.values()];
}

/** Item 4 — sem linha vigente da tabela/chave na data. `ValidationError` (400) para a prévia/rota que a dispara. */
export class SemLinhaVigenteError extends ValidationError {
  constructor(tabela: string, data: string, chave?: string, errorCode?: string) {
    super(`Sem linha vigente de ${tabela}${chave ? `/${chave}` : ''} em ${data} (parâmetros legais da plataforma).`, null, errorCode);
    Object.setPrototypeOf(this, SemLinhaVigenteError.prototype); // ValidationError fixa o próprio protótipo
    this.name = 'SemLinhaVigenteError';
  }
}

/**
 * X14 PR-4 (F-PR4-7, dono 09/10: fail-fast, código próprio) — parâmetro legal que o cálculo exige e não tem linha
 * vigente (carga incompleta ou data antes da tabela). 400 `PARAMETRO_LEGAL_AUSENTE`, nunca o zero silencioso.
 */
export class ParametroLegalAusenteError extends SemLinhaVigenteError {
  constructor(tabela: string, data: string, chave?: string) {
    super(tabela, data, chave, 'PARAMETRO_LEGAL_AUSENTE');
    Object.setPrototypeOf(this, ParametroLegalAusenteError.prototype);
    this.name = 'ParametroLegalAusenteError';
  }
}

/** PR-4 (item 7, §4 `ParametrosUsados`) — as linhas de lei que valeram no período de uma apuração + o hash delas. */
export interface ParametrosUsados {
  ids: string[];
  sha256: string;
}

/**
 * PR-4 (item 7; dono 07/10: "Snapshot = proveniência") — das linhas que o cálculo recebeu, as em vigor que alcançam
 * algum dia de [`de`, `ate`] (YYYY-MM-DD). Ids ordenados e sha256 do conteúdo que o cálculo lê (valor e vigência): duas
 * fotografias com o mesmo hash dão o mesmo cálculo; hash diferente é o que o job de recálculo procura. Não guarda a
 * lógica — só a proveniência.
 */
export function parametrosUsados(linhas: readonly LinhaLegal[], de: string, ate: string): ParametrosUsados {
  const usadas = linhasEmVigor(linhas)
    .filter((l) => l.vigenteDesde <= ate && (l.vigenteAte === null || l.vigenteAte >= de))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const conteudo = usadas.map((l) => [l.id, l.tabela, l.chave, l.discriminador, l.valorInt, l.valorTexto, l.valorJson, l.vigenteDesde, l.vigenteAte]);
  return { ids: usadas.map((l) => l.id), sha256: createHash('sha256').update(JSON.stringify(conteudo)).digest('hex') };
}
