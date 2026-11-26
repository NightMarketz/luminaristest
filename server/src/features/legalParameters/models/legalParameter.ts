/**
 * BE-INCR-LEGAL-PARAMS (nó LEGAL-PARAMS; BRIEF §3 itens 2 e 4, emenda §9 L-6/L-7) — o lookup PURO por data do fato
 * gerador. Guarda números e listas, nunca lógica (`R-motor-regras`).
 *
 * BE-INCR-PAIS-NA-BORDA-F3 item 13 (F-F3-1 a): a plataforma não tem mais catálogo de nomes. O catálogo é o registro de
 * formato (`formatRegistry.ts`), composto pelas bordas de cada domínio e país; cada domínio declara os nomes que lê ao
 * lado do leitor (`AccountingLegalTable`, `DpLegalTable`), e o lookup aceita `string`.
 */
import { createHash } from 'crypto';
import { AppError, ValidationError } from '../../../lib/errors';

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
 * Onda 3.2 (datas de corte de lei como linha) — as linhas em vigor da tabela (e da chave, quando dada), em qualquer data.
 * Só `linhasEmVigor`: rascunho, revogada e substituída não definem marco (uma substituída aberta não "estende" o fim).
 */
function linhasDoMarco(linhas: readonly LinhaLegal[], tabela: string, chave: string | null): LinhaLegal[] {
  return linhasEmVigor(linhas).filter((l) => l.tabela === tabela && (chave === null || l.chave === chave));
}

/**
 * Onda 3.2 — o primeiro dia em que a tabela/chave tem linha em vigor (menor `vigenteDesde`): o marco de lei que JÁ é uma
 * linha, no lugar do literal em código. Sem nenhuma linha ⇒ `ParametroLegalAusenteError` (fail-closed, nunca um
 * default). `dataConsultada` só nomeia o fato gerador na mensagem.
 */
export function inicioDeVigencia(linhas: readonly LinhaLegal[], tabela: string, chave: string | null, dataConsultada: string): string {
  const doMarco = linhasDoMarco(linhas, tabela, chave);
  if (doMarco.length === 0) throw new ParametroLegalAusenteError(tabela, dataConsultada, chave ?? undefined);
  return doMarco.reduce((menor, l) => (l.vigenteDesde < menor ? l.vigenteDesde : menor), doMarco[0].vigenteDesde);
}

/**
 * Onda 3.2 — o dia em que a lei deixa de valer: o dia seguinte ao maior `vigenteAte` das linhas em vigor da tabela/chave.
 * FAIL-CLOSED (ressalva do #1357, dono 24/11/2026): a linha que marca o fim da lei EXIGE `vigenteAte`. Nenhuma linha em
 * vigor ⇒ `ParametroLegalAusenteError`; alguma linha em vigor SEM `vigenteAte` ⇒ `FimDeVigenciaNaoPublicadoError` (mesmo
 * código `PARAMETRO_LEGAL_AUSENTE`) — uma linha aberta não pode apagar o fim que a lei fixa (devolver `null` ligava de novo
 * o ISS/o monofásico para sempre). Caso contrário o dia seguinte ao último `vigenteAte`.
 */
export function diaSeguinteAoFimDeVigencia(linhas: readonly LinhaLegal[], tabela: string, chave: string | null, dataConsultada: string): string {
  const doMarco = linhasDoMarco(linhas, tabela, chave);
  if (doMarco.length === 0) throw new ParametroLegalAusenteError(tabela, dataConsultada, chave ?? undefined);
  const abertas = doMarco.filter((l) => l.vigenteAte === null);
  if (abertas.length > 0) throw new FimDeVigenciaNaoPublicadoError(tabela, dataConsultada, chave ?? undefined, abertas.map((l) => l.id));
  let ultimo = '';
  for (const l of doMarco) {
    if (l.vigenteAte !== null && l.vigenteAte > ultimo) ultimo = l.vigenteAte;
  }
  const d = new Date(`${ultimo}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * PR-2 — tabelas-LISTA (CST, CFOP, cStat, NCM, LC 116, feriados…): as linhas em vigor da tabela na `data` do fato, em
 * qualquer chave. Ausência de UMA chave = "não está na lista"; ausência da tabela INTEIRA na data é erro explícito
 * (item 4: sem linha vigente ⇒ erro), nunca uma lista vazia que recusaria tudo em silêncio.
 */
export function linhasVigentesDaTabela<T extends LinhaLegal>(linhas: readonly T[], tabela: string, data: string): T[] {
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

/**
 * BRD F-69.1 — `valorJson` gravado que não é JSON: defeito do dado da plataforma (500), com tipo e o id da linha,
 * em vez do `SyntaxError` cru que não dizia qual linha.
 */
export class LinhaLegalIlegivelError extends AppError {
  constructor(id: string, tabela: string, chave: string) {
    super(`valorJson ilegível na linha de parâmetro legal ${id} (${tabela}/${chave}).`, 500, 'PARAMETRO_LEGAL_ILEGIVEL');
    Object.setPrototypeOf(this, LinhaLegalIlegivelError.prototype);
    this.name = 'LinhaLegalIlegivelError';
  }
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
 * BE-INCR-PAIS-NA-BORDA-F3 item 13 (F-F3-1 a) — tabela fora do registro de formato: 400
 * `PARAMETRO_LEGAL_TABELA_DESCONHECIDA` no `propose`, no filtro do `list` e no `vigente` (o DTO só confere a sintaxe do
 * nome). Completa o conjunto `PARAMETRO_LEGAL_AUSENTE` / `PARAMETRO_LEGAL_ILEGIVEL` (F-PBA-1 a).
 */
export class TabelaLegalDesconhecidaError extends ValidationError {
  constructor(tabela: string) {
    super(`${tabela}: tabela sem formato registrado — nenhum domínio a declara (GET /api/legal-parameters/tabelas lista as registradas).`, null, 'PARAMETRO_LEGAL_TABELA_DESCONHECIDA');
    Object.setPrototypeOf(this, TabelaLegalDesconhecidaError.prototype);
    this.name = 'TabelaLegalDesconhecidaError';
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

/**
 * Ressalva do #1357 (dono 24/11/2026) — a linha em vigor que deveria marcar o fim da lei não publica `vigenteAte`. Mesma
 * classe e mesmo código (`PARAMETRO_LEGAL_AUSENTE`, 400) dos demais parâmetros ausentes, com mensagem própria: o que falta
 * é o FIM, não a linha. Nomeia as linhas abertas (`ids`) para o operador publicar o `vigenteAte`.
 */
export class FimDeVigenciaNaoPublicadoError extends ParametroLegalAusenteError {
  constructor(tabela: string, data: string, chave: string | undefined, ids: readonly string[]) {
    super(tabela, data, chave);
    this.message = `Linha de ${tabela}${chave ? `/${chave}` : ''} em vigor sem vigenteAte (${ids.join(', ')}): a linha que marca o fim da lei precisa publicar o vigenteAte; sem ele o fim (consulta em ${data}) seria apagado, não presumido.`;
    Object.setPrototypeOf(this, FimDeVigenciaNaoPublicadoError.prototype);
    this.name = 'FimDeVigenciaNaoPublicadoError';
  }
}

/**
 * BE-INCR-IRRF-DISTRIBUICAO PR-1 (item 5): a linha vigente que o cálculo EXIGE — sem ela, 400 `PARAMETRO_LEGAL_AUSENTE`
 * (F-PR4-7), nunca o zero silencioso.
 */
export function exigirLinhaVigente<T extends LinhaLegal>(
  linhas: readonly T[],
  tabela: string,
  chave: string,
  data: string,
  discriminador: string | null = null,
): T {
  const linha = linhaLegalVigente(linhas, tabela, chave, data, discriminador);
  if (!linha) throw new ParametroLegalAusenteError(tabela, data, chave);
  return linha;
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
