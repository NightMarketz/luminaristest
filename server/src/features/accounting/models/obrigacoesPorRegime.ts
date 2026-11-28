/**
 * BE-INCR-FISCAL-OBLIGATION-PROFILE (nó X13, BRIEF itens 3–4, §4.2; PRE-ADR F-OBP-3/4 → a; F-XP-7 → a).
 *
 * Matriz regime × obrigação SPED como DADO versionado (não engine — `R-motor-regras` rejeitado). Só entra linha com
 * fonte verificada no corpus (`docs/accounting/fontes-oficiais/IN-RFB-2003-2021-ECD.txt`, `…2004-2021-ECF.txt`) ou
 * no Planalto (LC 123 art. 18-A §1º, baixado 24/09). EFD-Contribuições e EFD ICMS/IPI ficam FORA até ter fonte (F-XP-7 a;
 * BRIEF §5 item 1). A DCTFWeb entrou com o X9 (BE-INCR-MIT-EXPORT item 13, F-X9-6 a; IN RFB 2.237/2024 relida no Sijut
 * em 03/10). PGDAS-D, DEFIS, Livro Caixa (dispensado com escrituração) e DASN-SIMEI entraram com o X14 PR-3 (item 22;
 * Res. CGSN 140/2018 arts. 38, 40, 63 § 3º, 72 e 109, corpus). IBS_CBS_APURACAO entrou com o IBS-CBS-2027 PR-5 (item 21;
 * LC 214 arts. 41 § 1º, 43, 45 § 6º; Dec. 12.955 art. 44 § 6º para a inativa — dono, 23/10). REINF entrou com o EFD-REINF
 * PR-3 (item 20; PRE-ADR D7; IN RFB 2.043 arts. 3º I e VIII, § 1º I e 4º, Sijut 28/10): CONDICIONAL em todo regime.
 *
 * BE-INCR-LEGAL-PARAMS PR-2 (item 20): as linhas da matriz moram na tabela de plataforma `OBRIGACAO_REGIME` (chave =
 * obrigação, discriminador = regime, `valorJson` = status base, condições, pergunta e status da inativa), cópia byte a
 * byte com a mesma fonte e vigência. O serviço monta a fotografia; a função pura recebe a matriz.
 *
 * Lacuna L-20261127-184105-7694 (dono, chat, 27/11/2026): RECEITAS_ANTERIORES_OPCAO — o módulo "Receitas Anteriores à
 * Opção" do PGDAS-D (Res. CGSN 140 arts. 144-D e 144-E, incl. Res. CGSN 190/2026; efeitos imediatos pela Res. CGSN 196/2026
 * art. 4º, nova redação do art. 9º I da 190). É a primeira linha com PRAZO (`entregas`) e com condição DERIVADA de dois
 * perfis (`CondicoesDerivadas`, calculada por `ingressoComReceitasAnteriores` do perfil do ano e do anterior).
 */
import type { RegimeEmpresa } from './regimeEmpresa';
import { linhasVigentesDaTabela, type LinhaLegal } from '../../legalParameters/models/legalParameter';

export const STATUS_OBRIGACAO = ['OBRIGATORIA', 'CONDICIONAL', 'FACULTATIVA', 'NAO_SE_APLICA'] as const;
export type StatusObrigacao = (typeof STATUS_OBRIGACAO)[number];
/** O nome do tipo fica (BRIEF X9 item 13): DCTFWeb não é SPED, mas renomear mexe em 3 arquivos sem ganho. */
export type ObrigacaoSped =
  | 'ECD'
  | 'ECF'
  | 'DCTFWEB'
  | 'PGDAS_D'
  | 'DEFIS'
  | 'LIVRO_CAIXA'
  | 'DASN_SIMEI'
  | 'IBS_CBS_APURACAO'
  | 'REINF'
  | 'RECEITAS_ANTERIORES_OPCAO';

/** Respostas do perfil que mudam o status. `null` = ainda não respondida (vira CONDICIONAL). */
export interface CondicoesPerfil {
  aporteInvestidorAnjo: boolean | null;
  livroCaixaSemEscrituracao: boolean | null;
  distribuicaoAcimaBase: boolean | null;
}

/**
 * L-7694: condições que NÃO são resposta do perfil — o serviço as deriva de dados que o modelo já tem (perfil do ano ×
 * perfil do ano anterior). `null` = falta o dado de entrada (vira CONDICIONAL com a pergunta da linha), nunca "não".
 */
export interface CondicoesDerivadas {
  /** Res. CGSN 140 art. 144-D I e II: ingresso no Simples em 01/01/2027 sem o regime em todo o ano-calendário 2026. */
  ingressoComReceitasAnteriores: boolean | null;
}

export interface Condicao {
  chave: keyof CondicoesPerfil | keyof CondicoesDerivadas;
  /** Status quando a resposta é `true`. Condições são avaliadas em ordem; a primeira `true` decide. */
  quandoTrue: StatusObrigacao;
  pergunta: string;
  fonte: string;
}

export interface LinhaMatriz {
  obrigacao: ObrigacaoSped;
  regime: RegimeEmpresa;
  /** Status quando nenhuma condição é `true` (e todas foram respondidas). */
  statusBase: StatusObrigacao;
  condicoes: Condicao[];
  fonte: string;
  /** Pergunta quando o `statusBase` já é CONDICIONAL sem condição do perfil que a resolva (DCTFWEB do MEI). */
  perguntaBase?: string;
  vigenteDesde: string; // date-only — data das IN RFB 2.003 e 2.004 (18/01/2021); 2.237/2024 para a DCTFWEB
  /**
   * Status da PJ inativa, com fonte por linha (BRIEF X9 item 13 — substitui o ternário ECD/ECF). L-7694: `segueCondicoes`
   * = a norma não distingue a inativa, e a linha resolve pelas condições como para a ativa (o `status` fica de registro).
   */
  inativa: { status: StatusObrigacao; fonte: string; pergunta?: string; segueCondicoes?: boolean };
  /** L-7694: entregas com prazo (competências `YYYY-MM` de/até e prazo `YYYY-MM-DD`), só nas obrigações de calendário. */
  entregas?: Entrega[];
}

export interface Entrega {
  competenciaDe: string;
  competenciaAte: string;
  prazo: string;
  fonte: string;
}

/** A ordem da matriz (ECD, ECF; DCTFWEB no fim — lacuna do X9 PR-1 decidida pelo dono em 06/10). */
// IBS-CBS-2027 PR-5 (BRIEF item 21): a apuração mensal de IBS/CBS (regime regular, desde 2027-01-01) vai no fim.
// EFD-REINF PR-3 (BRIEF item 20): REINF no fim.
// L-7694: RECEITAS_ANTERIORES_OPCAO no fim.
export const ORDEM_OBRIGACOES: readonly ObrigacaoSped[] = ['ECD', 'ECF', 'DCTFWEB', 'PGDAS_D', 'DEFIS', 'LIVRO_CAIXA', 'DASN_SIMEI', 'IBS_CBS_APURACAO', 'REINF', 'RECEITAS_ANTERIORES_OPCAO'];

/**
 * Fotografia → matriz vigente em `data`. Na ECD do Presumido a ordem das condições (guardada na linha) É a precedência
 * do BRIEF item 4: aporte/distribuição (§2º/§3º afastam a dispensa) vêm ANTES do livro caixa (§1º V).
 */
export function matrizObrigacoesDe(linhas: readonly LinhaLegal[], data: string): LinhaMatriz[] {
  return linhasVigentesDaTabela(linhas, 'OBRIGACAO_REGIME', data)
    .map((l): LinhaMatriz => {
      const v = JSON.parse(l.valorJson ?? '{}') as Omit<LinhaMatriz, 'obrigacao' | 'regime' | 'fonte' | 'vigenteDesde'>;
      return { obrigacao: l.chave as ObrigacaoSped, regime: l.discriminador as RegimeEmpresa, ...v, fonte: l.fonte, vigenteDesde: l.vigenteDesde };
    })
    .sort((a, b) => ORDEM_OBRIGACOES.indexOf(a.obrigacao) - ORDEM_OBRIGACOES.indexOf(b.obrigacao));
}

export interface PerfilParaObrigacoes {
  regime: RegimeEmpresa;
  inativa: boolean;
  condicoes: CondicoesPerfil;
  /** L-7694: obrigatório — quem não sabe passa `null` (CONDICIONAL), nunca omite (omitir seria "não sujeito" silencioso). */
  derivadas: CondicoesDerivadas;
}

export interface ObrigacaoResolvida {
  obrigacao: ObrigacaoSped;
  status: StatusObrigacao;
  fonte: string;
  perguntaPendente?: string;
  /** L-7694: os prazos da linha, quando ela os tem e a obrigação se aplica (status ≠ NAO_SE_APLICA). */
  entregas?: Entrega[];
}

/**
 * L-7694 — Res. CGSN 140 art. 144-D I: "aqueles cuja opção pelo Simples Nacional produza efeitos em 1º de janeiro de 2027".
 * A data é do texto do dispositivo (regra de transição única, não parâmetro que muda por ano), como o
 * `INICIO_CGSN190_MES_SEGUINTE` do SimplesApuracaoService; a vigência da linha (prazos do art. 144-E) mora na tabela.
 */
export const INGRESSO_RECEITAS_ANTERIORES_EM = '2027-01-01';

/** O que o derivador lê de cada perfil (o do ano e o do ano anterior). */
export interface PerfilParaIngresso {
  ano: number;
  regime: RegimeEmpresa;
  inicioAtividadeEm: string | null;
  simplesExclusaoEfeitosEm: string | null;
}

/**
 * L-7694 — sujeição ao art. 144-D pelos perfis que o modelo já tem (um regime por ano-calendário):
 * - fora do perfil SIMPLES de 2027, ou com início de atividade DEPOIS de 01/01/2027 (opção de início de atividade, efeitos
 *   desde a inscrição, sem período anterior) ⇒ `false`;
 * - sem o perfil de 2026 ⇒ `null` (falta o dado de entrada: CONDICIONAL com pergunta, nunca suposição);
 * - 2026 PRESUMIDO/REAL ⇒ `true` (inciso I "a": não esteve no regime);
 * - 2026 MEI ⇒ `true` (inciso II: desenquadramento do Simei em 2026, sujeição ao Simples em 01/01/2027);
 * - 2026 SIMPLES com exclusão de efeitos em 2026 ⇒ `true` (inciso I "b": só parte do ano); sem exclusão ⇒ `false` — inclui
 *   a empresa que iniciou atividade em 2026 no Simples e nele ficou até 31/12 (§ 1º).
 */
export function ingressoComReceitasAnteriores(perfil: PerfilParaIngresso, anterior: PerfilParaIngresso | null): boolean | null {
  const ano = Number(INGRESSO_RECEITAS_ANTERIORES_EM.slice(0, 4));
  if (perfil.ano !== ano || perfil.regime !== 'SIMPLES') return false;
  if (perfil.inicioAtividadeEm !== null && perfil.inicioAtividadeEm > INGRESSO_RECEITAS_ANTERIORES_EM) return false;
  if (!anterior) return null;
  if (anterior.regime === 'PRESUMIDO' || anterior.regime === 'REAL' || anterior.regime === 'MEI') return true;
  const exclusao = anterior.simplesExclusaoEfeitosEm;
  return exclusao !== null && exclusao.startsWith(`${ano - 1}-`);
}

/**
 * BRIEF item 4 — função pura, sem I/O. Uma linha por obrigação do regime, na ordem da matriz.
 *
 * Avaliação em ordem de precedência: a primeira condição `true` decide. Uma condição ainda sem resposta (`null`)
 * ANTES dela só torna o resultado CONDICIONAL se a resposta pudesse mudá-lo (o `quandoTrue` dela difere). Ex.:
 * Presumido com aporte `null` e distribuição `true` → OBRIGATORIA (os dois dão OBRIGATORIA — "aporte OU
 * distribuição", BRIEF item 4); com aporte `null` e livro caixa `true` → CONDICIONAL (o aporte afastaria a dispensa).
 */
export function resolverObrigacoes(perfil: PerfilParaObrigacoes, matriz: readonly LinhaMatriz[]): ObrigacaoResolvida[] {
  const respostas: Partial<Record<keyof CondicoesPerfil | keyof CondicoesDerivadas, boolean | null>> = { ...perfil.condicoes, ...perfil.derivadas };
  return matriz.filter((l) => l.regime === perfil.regime).map((linha) => {
    const resolvida = resolverLinha(linha);
    return linha.entregas && resolvida.status !== 'NAO_SE_APLICA' ? { ...resolvida, entregas: linha.entregas } : resolvida;
  });

  function resolverLinha(linha: LinhaMatriz): ObrigacaoResolvida {
    if (perfil.inativa && !linha.inativa.segueCondicoes) {
      const { status, fonte, pergunta } = linha.inativa;
      return pergunta ? { obrigacao: linha.obrigacao, status, fonte, perguntaPendente: pergunta } : { obrigacao: linha.obrigacao, status, fonte };
    }
    const pendentes: Condicao[] = [];
    const decidir = (status: StatusObrigacao, fonte: string): ObrigacaoResolvida => {
      const relevante = pendentes.find((p) => p.quandoTrue !== status);
      return relevante
        ? { obrigacao: linha.obrigacao, status: 'CONDICIONAL', fonte: relevante.fonte, perguntaPendente: relevante.pergunta }
        : { obrigacao: linha.obrigacao, status, fonte };
    };
    for (const c of linha.condicoes) {
      // L-7694: chave sem resposta (`undefined`) conta como não respondida — falha para CONDICIONAL, nunca para "não".
      const resposta = respostas[c.chave] ?? null;
      if (resposta === true) return decidir(c.quandoTrue, c.fonte);
      if (resposta === null) pendentes.push(c);
    }
    const base = decidir(linha.statusBase, linha.fonte);
    return linha.perguntaBase && base.status === 'CONDICIONAL' && !base.perguntaPendente ? { ...base, perguntaPendente: linha.perguntaBase } : base;
  }
}
