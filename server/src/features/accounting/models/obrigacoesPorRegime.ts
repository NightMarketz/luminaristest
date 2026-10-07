/**
 * BE-INCR-FISCAL-OBLIGATION-PROFILE (nó X13, BRIEF itens 3–4, §4.2; PRE-ADR F-OBP-3/4 → a; F-XP-7 → a).
 *
 * Matriz regime × obrigação SPED como DADO versionado (não engine — `R-motor-regras` rejeitado). Só entra linha com
 * fonte verificada no corpus (`docs/accounting/fontes-oficiais/IN-RFB-2003-2021-ECD.txt`, `…2004-2021-ECF.txt`) ou
 * no Planalto (LC 123 art. 18-A §1º, baixado 24/09). EFD-Contribuições, PGDAS-D, DEFIS, DASN-SIMEI e EFD ICMS/IPI
 * ficam FORA até ter fonte (F-XP-7 a; BRIEF §5 item 1). A DCTFWeb entrou com o X9 (BE-INCR-MIT-EXPORT item 13,
 * F-X9-6 a; IN RFB 2.237/2024 relida no Sijut em 03/10).
 */
import type { RegimeEmpresa } from './regimeEmpresa';

export const STATUS_OBRIGACAO = ['OBRIGATORIA', 'CONDICIONAL', 'FACULTATIVA', 'NAO_SE_APLICA'] as const;
export type StatusObrigacao = (typeof STATUS_OBRIGACAO)[number];
/** O nome do tipo fica (BRIEF X9 item 13): DCTFWeb não é SPED, mas renomear mexe em 3 arquivos sem ganho. */
export type ObrigacaoSped = 'ECD' | 'ECF' | 'DCTFWEB';

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
  /** Pergunta quando o `statusBase` já é CONDICIONAL sem condição do perfil que a resolva (DCTFWEB do MEI). */
  perguntaBase?: string;
  vigenteDesde: string; // date-only — data das IN RFB 2.003 e 2.004 (18/01/2021); 2.237/2024 para a DCTFWEB
  /** Status da PJ inativa, com fonte por linha (BRIEF X9 item 13 — substitui o ternário ECD/ECF). */
  inativa: { status: StatusObrigacao; fonte: string; pergunta?: string };
}

const INATIVA_ECD = 'IN RFB 2.003/2021 art. 3º §1º III';
const INATIVA_ECF = 'IN RFB 2.004/2021 art. 1º §1º III';
const VIGENCIA_IN_2021 = '2021-01-18';
const INATIVA_ECD_LINHA = { status: 'NAO_SE_APLICA', fonte: INATIVA_ECD } as const;
const INATIVA_ECF_LINHA = { status: 'NAO_SE_APLICA', fonte: INATIVA_ECF } as const;

// DCTFWEB (BRIEF X9 item 13, F-X9-6 a; IN RFB 2.237/2024 — V-fonte 03/10). Vigência = 1º PA da DCTFWeb do MIT.
const VIGENCIA_DCTFWEB = '2025-01-01';
const DCTFWEB_FONTE = 'IN RFB 2.237/2024 art. 3º I; art. 6º § 2º II (sem movimento)';
/** F-MIT-3 a: o art. 4º não dispensa a inativa; o art. 6º § 2º II torna a entrega condicional ao 1º mês sem movimento. */
const INATIVA_DCTFWEB = {
  status: 'CONDICIONAL',
  fonte: 'IN RFB 2.237/2024 art. 4º (sem dispensa para inativa) e art. 6º § 2º II',
  pergunta: 'Este ano contém o 1º mês sem movimento? Se sim, entregue a DCTFWeb desse mês; nos seguintes, fica dispensada',
} as const;

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
  { obrigacao: 'ECD', regime: 'REAL', statusBase: 'OBRIGATORIA', condicoes: [], fonte: 'IN RFB 2.003/2021 art. 3º caput', vigenteDesde: VIGENCIA_IN_2021, inativa: INATIVA_ECD_LINHA },
  {
    obrigacao: 'ECD',
    regime: 'PRESUMIDO',
    statusBase: 'OBRIGATORIA',
    condicoes: [APORTE, DISTRIBUICAO, LIVRO_CAIXA],
    fonte: 'IN RFB 2.003/2021 art. 3º caput, §1º V, §§2º, 3º e 6º',
    vigenteDesde: VIGENCIA_IN_2021,
    inativa: INATIVA_ECD_LINHA,
  },
  { obrigacao: 'ECD', regime: 'SIMPLES', statusBase: 'FACULTATIVA', condicoes: [APORTE], fonte: 'IN RFB 2.003/2021 art. 3º §1º I, §2º e §6º', vigenteDesde: VIGENCIA_IN_2021, inativa: INATIVA_ECD_LINHA },
  {
    obrigacao: 'ECD',
    regime: 'MEI',
    statusBase: 'FACULTATIVA',
    condicoes: [],
    fonte: 'IN RFB 2.003/2021 art. 3º §1º I e §6º + LC 123/2006 art. 18-A §1º',
    vigenteDesde: VIGENCIA_IN_2021,
    inativa: INATIVA_ECD_LINHA,
  },
  { obrigacao: 'ECF', regime: 'REAL', statusBase: 'OBRIGATORIA', condicoes: [], fonte: 'IN RFB 2.004/2021 art. 1º caput e §2º', vigenteDesde: VIGENCIA_IN_2021, inativa: INATIVA_ECF_LINHA },
  { obrigacao: 'ECF', regime: 'PRESUMIDO', statusBase: 'OBRIGATORIA', condicoes: [], fonte: 'IN RFB 2.004/2021 art. 1º caput', vigenteDesde: VIGENCIA_IN_2021, inativa: INATIVA_ECF_LINHA },
  { obrigacao: 'ECF', regime: 'SIMPLES', statusBase: 'NAO_SE_APLICA', condicoes: [], fonte: 'IN RFB 2.004/2021 art. 1º §1º I', vigenteDesde: VIGENCIA_IN_2021, inativa: INATIVA_ECF_LINHA },
  {
    obrigacao: 'ECF',
    regime: 'MEI',
    statusBase: 'NAO_SE_APLICA',
    condicoes: [],
    fonte: 'IN RFB 2.004/2021 art. 1º §1º I + LC 123/2006 art. 18-A §1º',
    vigenteDesde: VIGENCIA_IN_2021,
    inativa: INATIVA_ECF_LINHA,
  },
  // DCTFWEB no fim da matriz (lacuna do PR-1 decidida pelo dono em 06/10): a ordem ECD, ECF de hoje não muda.
  { obrigacao: 'DCTFWEB', regime: 'REAL', statusBase: 'OBRIGATORIA', condicoes: [], fonte: DCTFWEB_FONTE, vigenteDesde: VIGENCIA_DCTFWEB, inativa: INATIVA_DCTFWEB },
  { obrigacao: 'DCTFWEB', regime: 'PRESUMIDO', statusBase: 'OBRIGATORIA', condicoes: [], fonte: DCTFWEB_FONTE, vigenteDesde: VIGENCIA_DCTFWEB, inativa: INATIVA_DCTFWEB },
  { obrigacao: 'DCTFWEB', regime: 'SIMPLES', statusBase: 'OBRIGATORIA', condicoes: [], fonte: DCTFWEB_FONTE, vigenteDesde: VIGENCIA_DCTFWEB, inativa: INATIVA_DCTFWEB },
  {
    obrigacao: 'DCTFWEB',
    regime: 'MEI',
    statusBase: 'CONDICIONAL',
    condicoes: [],
    fonte: 'IN RFB 2.237/2024 art. 3º IX; art. 4º IX',
    perguntaBase: 'O MEI contratou segurado, reteve IR ou está em outra hipótese do art. 3º IX?',
    vigenteDesde: VIGENCIA_DCTFWEB,
    inativa: INATIVA_DCTFWEB,
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
      const resposta = perfil.condicoes[c.chave];
      if (resposta === true) return decidir(c.quandoTrue, c.fonte);
      if (resposta === null) pendentes.push(c);
    }
    const base = decidir(linha.statusBase, linha.fonte);
    return linha.perguntaBase && base.status === 'CONDICIONAL' && !base.perguntaPendente ? { ...base, perguntaPendente: linha.perguntaBase } : base;
  });
}
