/**
 * BE-INCR-LEGAL-PARAMS (nó LEGAL-PARAMS; BRIEF §3 itens 2 e 4, emenda §9 L-6/L-7) — catálogo fechado de tabelas de
 * lei e o lookup PURO por data do fato gerador. Guarda números e listas, nunca lógica (`R-motor-regras`).
 */
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
] as const;
export type LegalParameterTabela = (typeof LEGAL_PARAMETER_TABELAS)[number];

/**
 * Tabelas cujo consumidor já lê do banco (emenda §9 L-4: PR-1 = IRPJ/CSLL e PIS/Cofins; PR-2 = as demais, menos a
 * depreciação). Propor linha de outra tabela ⇒ 400: publicaria um número que nenhum cálculo lê ainda (PR-3 abre
 * DEPRECIACAO_ANEXO_III).
 */
export const TABELAS_MIGRADAS: ReadonlySet<LegalParameterTabela> = new Set(LEGAL_PARAMETER_TABELAS.filter((t) => t !== 'DEPRECIACAO_ANEXO_III'));

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
  constructor(tabela: string, data: string, chave?: string) {
    super(`Sem linha vigente de ${tabela}${chave ? `/${chave}` : ''} em ${data} (parâmetros legais da plataforma).`);
    Object.setPrototypeOf(this, SemLinhaVigenteError.prototype); // ValidationError fixa o próprio protótipo
    this.name = 'SemLinhaVigenteError';
  }
}
