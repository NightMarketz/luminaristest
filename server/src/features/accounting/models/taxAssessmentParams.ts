/**
 * BE-INCR-TAX-ASSESSMENT Fase A (nó X7, BRIEF itens 4–5; ADR D3, F-X7-10 b, F-X7-14) — parâmetros da apuração de
 * IRPJ/CSLL como DADO versionado (não engine — `R-motor-regras` rejeitado), no molde de `obrigacoesPorRegime.ts`.
 * Cada linha carrega `fonte` (obrigatória, não vazia) e `vigenteDesde` (date-only). Alíquotas e percentuais em
 * pontos-base (convenção de `FiscalProfile.issAliquotaBp`); limites em centavos (`*_CENTS`).
 *
 * O número que sai daqui só tem oráculo quando o H1 (Presumido) ou o X5 (Real) conciliam X7 × PVA (F-X7-2 a, P-9):
 * um teste verde prova a aritmética contra esta tabela, não contra a lei.
 */
import { SemLinhaVigenteError, type LinhaLegal } from '../../legalParameters/models/legalParameter';
import type { NomeCodigoReceita } from '../../legalParameters/models/formatoLinha';

/**
 * Versão gravada em `TaxAssessment.tabelaVersao` (D3). BE-INCR-LEGAL-PARAMS PR-1: as linhas moram no banco; esta
 * string continua sendo a gravada até o item 7 (PR-4) trocar por ids + hash das linhas usadas.
 */
export const TAX_ASSESSMENT_TABELA_VERSAO = '2026-10-06'; // BE-INCR-TAX-PRESUMIDO-16 item 1: 16% também no Presumido (art. 215 § 10)

export type ChaveParametro =
  | 'IRPJ_ALIQ'
  | 'IRPJ_ADIC_ALIQ'
  | 'IRPJ_ADIC_LIMITE_MES_CENTS'
  | 'PRESUNCAO_IRPJ'
  | 'PRESUNCAO_CSLL'
  | 'COMPENSACAO_TETO'
  | 'LC224_ACRESCIMO_IRPJ'
  | 'LC224_ACRESCIMO_CSLL'
  | 'LC224_LIMITE_TRIMESTRE_CENTS'
  | 'PRESUNCAO_IRPJ_REDUZIDA'
  | 'RECEITA_LIMITE_REDUZIDA_ANO_CENTS';

export type AtividadePresuncao = 'SERVICO' | 'REVENDA';

export interface ParametroApuracao {
  chave: ChaveParametro;
  atividade?: AtividadePresuncao;
  valor: number; // bp, ou centavos nos *_CENTS
  fonte: string;
  vigenteDesde: string; // YYYY-MM-DD
  vigenteAte?: string; // YYYY-MM-DD inclusive (BE-INCR-LEGAL-PARAMS: a linha de banco pode ter fim)
}

/**
 * BE-INCR-LEGAL-PARAMS PR-1 (BRIEF §3 itens 4–6; F-LP-4 a) — a "fotografia" das linhas que o serviço lê da tabela de
 * plataforma (`legal_parameters`, tabelas `TAX_ASSESSMENT` e `CSLL_ALIQUOTA`) e passa às funções puras. As linhas em
 * código saíram na migração (cópia byte a byte, teste de paridade `legalParameterParity.integration.test.ts`).
 */
export interface TabelaApuracao {
  linhas: readonly ParametroApuracao[];
  /** D8 — alíquota da CSLL pelo `CompanyFiscalProfile.ecfIndAliqCsll` (uma fonte só), vigente no fim do período. */
  aliquotaCsll: (ind: string, data: string) => { valor: number; fonte: string } | undefined;
  /** PR-2 — código de receita IRPJ/CSLL vigente na data (tabela `CODIGO_RECEITA`); sem linha ⇒ erro explícito (400). */
  codigoReceita: (nome: NomeCodigoReceita, data: string) => CodigoReceitaVigente;
}

const CHAVES: ReadonlySet<string> = new Set<ChaveParametro>([
  'IRPJ_ALIQ', 'IRPJ_ADIC_ALIQ', 'IRPJ_ADIC_LIMITE_MES_CENTS', 'PRESUNCAO_IRPJ', 'PRESUNCAO_CSLL', 'COMPENSACAO_TETO',
  'LC224_ACRESCIMO_IRPJ', 'LC224_ACRESCIMO_CSLL', 'LC224_LIMITE_TRIMESTRE_CENTS', 'PRESUNCAO_IRPJ_REDUZIDA',
  'RECEITA_LIMITE_REDUZIDA_ANO_CENTS',
]);

/**
 * Monta a fotografia a partir das linhas vigentes da plataforma (já sem as substituídas/revogadas — o serviço filtra).
 * A linha `ARREDONDAMENTO` (item 10 do inventário) só é aceita como `HALF_UP`: é a regra que `arred` implementa;
 * outro valor publicado seria uma regra que o código não tem ⇒ erro explícito (fail-closed), nunca silêncio.
 */
export function tabelaApuracaoDe(linhas: readonly LinhaLegal[]): TabelaApuracao {
  const apuracao: ParametroApuracao[] = [];
  const csll: LinhaLegal[] = [];
  const codigos: LinhaLegal[] = [];
  for (const l of linhas) {
    if (l.tabela === 'CSLL_ALIQUOTA') csll.push(l);
    if (l.tabela === 'CODIGO_RECEITA' && l.discriminador === null && l.valorTexto !== null) codigos.push(l);
    if (l.tabela !== 'TAX_ASSESSMENT') continue;
    if (l.chave === 'ARREDONDAMENTO') {
      if (l.valorTexto !== 'HALF_UP') throw new Error(`taxAssessmentParams: ARREDONDAMENTO publicado como ${l.valorTexto ?? '∅'} — só HALF_UP é implementado (F-TA-2 a)`);
      continue;
    }
    if (!CHAVES.has(l.chave) || l.valorInt === null) throw new Error(`taxAssessmentParams: linha ${l.id} (${l.chave}) fora do formato de TAX_ASSESSMENT`);
    apuracao.push({
      chave: l.chave as ChaveParametro,
      ...(l.discriminador ? { atividade: l.discriminador as AtividadePresuncao } : {}),
      valor: l.valorInt,
      fonte: l.fonte,
      vigenteDesde: l.vigenteDesde,
      ...(l.vigenteAte ? { vigenteAte: l.vigenteAte } : {}),
    });
  }
  return {
    linhas: apuracao,
    aliquotaCsll: (ind, data) => {
      const l = maisRecente(csll.filter((c) => c.chave === ind && c.valorInt !== null && dentro(c, data)));
      return l ? { valor: l.valorInt!, fonte: l.fonte } : undefined;
    },
    codigoReceita: (nome, data) => {
      const l = maisRecente(codigos.filter((c) => c.chave === nome && dentro(c, data)));
      if (!l) throw new SemLinhaVigenteError('CODIGO_RECEITA', data, nome);
      return { codigo: l.valorTexto!, fonte: l.fonte };
    },
  };
}

const dentro = (l: { vigenteDesde: string; vigenteAte?: string | null }, data: string): boolean =>
  l.vigenteDesde <= data && (!l.vigenteAte || data <= l.vigenteAte);

function maisRecente<T extends { vigenteDesde: string }>(ls: T[]): T | undefined {
  let melhor: T | undefined;
  for (const l of ls) if (!melhor || l.vigenteDesde > melhor.vigenteDesde) melhor = l;
  return melhor;
}

const ACRESCIMO_LC224: ReadonlySet<ChaveParametro> = new Set(['LC224_ACRESCIMO_IRPJ', 'LC224_ACRESCIMO_CSLL']);

/** Linha vigente em `dataFimDoPeriodo` (a de `vigenteDesde` mais recente ≤ data, sem ter vencido), ou `undefined`. */
export function linhaVigente(t: TabelaApuracao, chave: ChaveParametro, dataFimDoPeriodo: string, atividade?: AtividadePresuncao): ParametroApuracao | undefined {
  return maisRecente(t.linhas.filter((p) => p.chave === chave && p.atividade === atividade && dentro(p, dataFimDoPeriodo)));
}

/**
 * Lookup puro (item 4). Sem linha vigente: o acréscimo da LC 224 vale 0 (antes da vigência); qualquer outra chave é
 * erro explícito (a tabela cobre todo ano apurável).
 */
export function parametroVigente(t: TabelaApuracao, chave: ChaveParametro, dataFimDoPeriodo: string, atividade?: AtividadePresuncao): number {
  const p = linhaVigente(t, chave, dataFimDoPeriodo, atividade);
  if (p) return p.valor;
  if (ACRESCIMO_LC224.has(chave)) return 0;
  throw new Error(`taxAssessmentParams: sem linha vigente de ${chave}${atividade ? `/${atividade}` : ''} em ${dataFimDoPeriodo}`);
}

/**
 * Códigos de receita (6 dígitos = código + variação) — BE-INCR-LEGAL-PARAMS PR-2: moram na tabela de plataforma
 * `CODIGO_RECEITA` (itens 9 e 14 do inventário; nomes em `formatoLinha.ts`), com a fonte por linha. Que o MIT use a
 * mesma tabela é inferido (P-8).
 */
export interface CodigoReceitaVigente {
  codigo: string;
  fonte: string;
}

/**
 * F-TA-2 (a) — A ÚNICA função de arredondamento da apuração: meia unidade para cima (half-up) de `num / den` ao
 * centavo inteiro. Toda multiplicação por bp e todo rateio proporcional passam por aqui; cada linha da memória guarda
 * o valor já arredondado. Fonte primária de arredondamento não encontrada (P-4); o PVA usa `ARRED(…)`.
 */
export function arred(num: bigint, den: bigint): bigint {
  if (den <= 0n) throw new Error('arred: denominador deve ser positivo');
  let q = num / den;
  let r = num % den;
  if (r < 0n) {
    q -= 1n;
    r += den;
  } // piso
  return 2n * r >= den ? q + 1n : q;
}

/** `cents × bp₁ × bp₂ … / 10000ⁿ`, arredondado UMA vez por `arred`. */
export function mulBp(cents: bigint, ...bps: number[]): bigint {
  let num = cents;
  let den = 1n;
  for (const bp of bps) {
    num *= BigInt(bp);
    den *= 10_000n;
  }
  return arred(num, den);
}
