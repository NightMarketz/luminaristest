/**
 * BE-INCR-FISCAL-OBLIGATION-PROFILE (nó X13, BRIEF itens 3–4, §4.2; PRE-ADR F-OBP-3/4 → a; F-XP-7 → a).
 *
 * Matriz regime × obrigação SPED como DADO versionado (não engine — `R-motor-regras` rejeitado). Só entra linha com
 * fonte verificada no corpus (`docs/accounting/fontes-oficiais/IN-RFB-2003-2021-ECD.txt`, `…2004-2021-ECF.txt`) ou
 * no Planalto (LC 123 art. 18-A §1º, baixado 24/09). EFD-Contribuições e EFD ICMS/IPI ficam FORA até ter fonte (F-XP-7 a;
 * BRIEF §5 item 1). A DCTFWeb entrou com o X9 (BE-INCR-MIT-EXPORT item 13, F-X9-6 a; IN RFB 2.237/2024 relida no Sijut
 * em 03/10). PGDAS-D, DEFIS, Livro Caixa (dispensado com escrituração) e DASN-SIMEI entraram com o X14 PR-3 (item 22;
 * Res. CGSN 140/2018 arts. 38, 40, 63 § 3º, 72 e 109, corpus).
 *
 * BE-INCR-LEGAL-PARAMS PR-2 (item 20): as linhas da matriz moram na tabela de plataforma `OBRIGACAO_REGIME` (chave =
 * obrigação, discriminador = regime, `valorJson` = status base, condições, pergunta e status da inativa), cópia byte a
 * byte com a mesma fonte e vigência. O serviço monta a fotografia; a função pura recebe a matriz.
 */
import type { RegimeEmpresa } from './regimeEmpresa';
import { linhasVigentesDaTabela, type LinhaLegal } from '../../legalParameters/models/legalParameter';

export const STATUS_OBRIGACAO = ['OBRIGATORIA', 'CONDICIONAL', 'FACULTATIVA', 'NAO_SE_APLICA'] as const;
export type StatusObrigacao = (typeof STATUS_OBRIGACAO)[number];
/** O nome do tipo fica (BRIEF X9 item 13): DCTFWeb não é SPED, mas renomear mexe em 3 arquivos sem ganho. */
export type ObrigacaoSped = 'ECD' | 'ECF' | 'DCTFWEB' | 'PGDAS_D' | 'DEFIS' | 'LIVRO_CAIXA' | 'DASN_SIMEI';

/** Respostas do perfil que mudam o status. `null` = ainda não respondida (vira CONDICIONAL). */
export interface CondicoesPerfil {
  aporteInvestidorAnjo: boolean | null;
  livroCaixaSemEscrituracao: boolean | null;
  distribuicaoAcimaBase: boolean | null;
}

export interface Condicao {
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

/** A ordem da matriz (ECD, ECF; DCTFWEB no fim — lacuna do X9 PR-1 decidida pelo dono em 06/10). */
const ORDEM_OBRIGACOES: readonly ObrigacaoSped[] = ['ECD', 'ECF', 'DCTFWEB', 'PGDAS_D', 'DEFIS', 'LIVRO_CAIXA', 'DASN_SIMEI'];

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
export function resolverObrigacoes(perfil: PerfilParaObrigacoes, matriz: readonly LinhaMatriz[]): ObrigacaoResolvida[] {
  return matriz.filter((l) => l.regime === perfil.regime).map((linha) => {
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
