/**
 * BE-INCR-FISCAL-OBLIGATION-PROFILE (nó X13, BRIEF itens 3–4, §4.2; PRE-ADR F-OBP-3/4 → a; F-XP-7 → a).
 *
 * Matriz regime × obrigação SPED como DADO versionado (não engine — `R-motor-regras` rejeitado). Só entra linha com
 * fonte verificada no corpus (`docs/accounting/fontes-oficiais/IN-RFB-2003-2021-ECD.txt`, `…2004-2021-ECF.txt`) ou
 * no Planalto (LC 123 art. 18-A §1º, baixado 24/09). EFD-Contribuições, DCTFWeb, PGDAS-D, DEFIS, DASN-SIMEI e
 * EFD ICMS/IPI ficam FORA até ter fonte (F-XP-7 a; BRIEF §5 item 1).
 */
import type { RegimeEmpresa } from './regimeEmpresa';

export const STATUS_OBRIGACAO = ['OBRIGATORIA', 'CONDICIONAL', 'FACULTATIVA', 'NAO_SE_APLICA'] as const;
export type StatusObrigacao = (typeof STATUS_OBRIGACAO)[number];
export type ObrigacaoSped = 'ECD' | 'ECF';

/** Respostas do perfil que mudam o status. `null` = ainda não respondida (vira CONDICIONAL). */
export interface CondicoesPerfil {
  aporteInvestidorAnjo: boolean | null;
  livroCaixaSemEscrituracao: boolean | null;
  distribuicaoAcimaBase: boolean | null;
}

interface Condicao {
  chave: keyof CondicoesPerfil;
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
  vigenteDesde: string; // date-only — data das IN RFB 2.003 e 2.004 (18/01/2021)
}

const INATIVA_ECD = 'IN RFB 2.003/2021 art. 3º §1º III';
const INATIVA_ECF = 'IN RFB 2.004/2021 art. 1º §1º III';
const VIGENCIA_IN_2021 = '2021-01-18';

const APORTE: Condicao = {
  chave: 'aporteInvestidorAnjo',
  quandoTrue: 'OBRIGATORIA',
  pergunta: 'A empresa recebeu aporte de investidor-anjo (LC 123 arts. 61-A a 61-D)?',
  fonte: 'IN RFB 2.003/2021 art. 3º §2º',
};
const DISTRIBUICAO: Condicao = {
  chave: 'distribuicaoAcimaBase',
  quandoTrue: 'OBRIGATORIA',
  pergunta: 'Distribuiu lucro sem IRRF acima da base presumida diminuída dos tributos?',
  fonte: 'IN RFB 2.003/2021 art. 3º §3º',
};
const LIVRO_CAIXA: Condicao = {
  chave: 'livroCaixaSemEscrituracao',
  quandoTrue: 'FACULTATIVA',
  pergunta: 'A empresa cumpre o parágrafo único do art. 45 da Lei 8.981/1995 (livro caixa)?',
  fonte: 'IN RFB 2.003/2021 art. 3º §1º V e §6º',
};

/**
 * Linhas verificadas (BRIEF §4.2). Na ECD do Presumido a ordem das condições É a precedência do BRIEF item 4:
 * aporte/distribuição (§2º/§3º afastam a dispensa) vêm ANTES do livro caixa (§1º V). Sem nenhuma `true`, o
 * status base vale — mas só se TODAS as condições da linha foram respondidas; senão é CONDICIONAL.
 * MEI não tem a condição de aporte: o §2º fala em "microempresa ou empresa de pequeno porte" e falta fonte
 * que inclua o MEI (BRIEF §5 item 2).
 */
export const OBRIGACOES_POR_REGIME: readonly LinhaMatriz[] = [
  { obrigacao: 'ECD', regime: 'REAL', statusBase: 'OBRIGATORIA', condicoes: [], fonte: 'IN RFB 2.003/2021 art. 3º caput', vigenteDesde: VIGENCIA_IN_2021 },
  {
    obrigacao: 'ECD',
    regime: 'PRESUMIDO',
    statusBase: 'OBRIGATORIA',
    condicoes: [APORTE, DISTRIBUICAO, LIVRO_CAIXA],
    fonte: 'IN RFB 2.003/2021 art. 3º caput, §1º V, §§2º, 3º e 6º',
    vigenteDesde: VIGENCIA_IN_2021,
  },
  { obrigacao: 'ECD', regime: 'SIMPLES', statusBase: 'FACULTATIVA', condicoes: [APORTE], fonte: 'IN RFB 2.003/2021 art. 3º §1º I, §2º e §6º', vigenteDesde: VIGENCIA_IN_2021 },
  {
    obrigacao: 'ECD',
    regime: 'MEI',
    statusBase: 'FACULTATIVA',
    condicoes: [],
    fonte: 'IN RFB 2.003/2021 art. 3º §1º I e §6º + LC 123/2006 art. 18-A §1º',
    vigenteDesde: VIGENCIA_IN_2021,
  },
  { obrigacao: 'ECF', regime: 'REAL', statusBase: 'OBRIGATORIA', condicoes: [], fonte: 'IN RFB 2.004/2021 art. 1º caput e §2º', vigenteDesde: VIGENCIA_IN_2021 },
  { obrigacao: 'ECF', regime: 'PRESUMIDO', statusBase: 'OBRIGATORIA', condicoes: [], fonte: 'IN RFB 2.004/2021 art. 1º caput', vigenteDesde: VIGENCIA_IN_2021 },
  { obrigacao: 'ECF', regime: 'SIMPLES', statusBase: 'NAO_SE_APLICA', condicoes: [], fonte: 'IN RFB 2.004/2021 art. 1º §1º I', vigenteDesde: VIGENCIA_IN_2021 },
  {
    obrigacao: 'ECF',
    regime: 'MEI',
    statusBase: 'NAO_SE_APLICA',
    condicoes: [],
    fonte: 'IN RFB 2.004/2021 art. 1º §1º I + LC 123/2006 art. 18-A §1º',
    vigenteDesde: VIGENCIA_IN_2021,
  },
];

export interface PerfilParaObrigacoes {
  regime: RegimeEmpresa;
  inativa: boolean;
  condicoes: CondicoesPerfil;
}

export interface ObrigacaoResolvida {
  obrigacao: ObrigacaoSped;
  status: StatusObrigacao;
  fonte: string;
  perguntaPendente?: string;
}

/**
 * BRIEF item 4 — função pura, sem I/O. Uma linha por obrigação do regime, na ordem da matriz.
 *
 * Avaliação em ordem de precedência: a primeira condição `true` decide. Uma condição ainda sem resposta (`null`)
 * ANTES dela só torna o resultado CONDICIONAL se a resposta pudesse mudá-lo (o `quandoTrue` dela difere). Ex.:
 * Presumido com aporte `null` e distribuição `true` → OBRIGATORIA (os dois dão OBRIGATORIA — "aporte OU
 * distribuição", BRIEF item 4); com aporte `null` e livro caixa `true` → CONDICIONAL (o aporte afastaria a dispensa).
 */
export function resolverObrigacoes(perfil: PerfilParaObrigacoes): ObrigacaoResolvida[] {
  return OBRIGACOES_POR_REGIME.filter((l) => l.regime === perfil.regime).map((linha) => {
    if (perfil.inativa) {
      return { obrigacao: linha.obrigacao, status: 'NAO_SE_APLICA', fonte: linha.obrigacao === 'ECD' ? INATIVA_ECD : INATIVA_ECF };
    }
    const pendentes: Condicao[] = [];
    const decidir = (status: StatusObrigacao, fonte: string): ObrigacaoResolvida => {
      const relevante = pendentes.find((p) => p.quandoTrue !== status);
      return relevante
        ? { obrigacao: linha.obrigacao, status: 'CONDICIONAL', fonte: relevante.fonte, perguntaPendente: relevante.pergunta }
        : { obrigacao: linha.obrigacao, status, fonte };
    };
    for (const c of linha.condicoes) {
      const resposta = perfil.condicoes[c.chave];
      if (resposta === true) return decidir(c.quandoTrue, c.fonte);
      if (resposta === null) pendentes.push(c);
    }
    return decidir(linha.statusBase, linha.fonte);
  });
}
