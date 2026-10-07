/**
 * BE-INCR-DFE (nó X10b, BRIEF item 8) — LISTA NACIONAL DE SERVIÇOS (código de tributação nacional do
 * ISSQN, `cTribNac` [195] da DPS) TRANSCRITA da fonte primária: `docs/accounting/fontes-oficiais/
 * NFSe-ANEXO-I-leiaute-DPS-NFSe-v1.01.xlsx`, aba `MUN.INCID_INFO.SERV.` (sha256[:12]=de5bc492959e).
 * Chave = ORDINAL DA FONTE (nº da linha da planilha), memória tabela-transcrita-de-lei-conferir-redacao-vigente.
 * `li` = localidade de incidência do ISSQN (LC 116/2003 art. 3º): EP = estabelecimento/domicílio do
 * prestador, LP = local da prestação, ET = estabelecimento/domicílio do tomador. `grupo` = grupo de
 * informação específico obrigatório na DPS (obra | atvEvento) — fora do MVP (BRIEF §1).
 * GERADO por script a partir do xlsx — não editar à mão; regenerar se o MANIFEST mudar de hash. Desde o
 * BE-INCR-LEGAL-PARAMS PR-2 as linhas são dado de plataforma (`LC116_SERVICO`); versão nova do leiaute = linhas novas.
 */
import { linhasVigentesDaTabela, type LinhaLegal } from '../../legalParameters/models/legalParameter';
import { linhasEmCacheSincrono } from '../../legalParameters/services/legalParameterCache';
import { hojeDateOnly } from '../../legalParameters/models/hoje';
export interface Lc116ServicoNacional {
  /** nº da linha na aba da fonte (ordinal). */
  linha: number;
  /** 6 dígitos, zero à esquerda (ex.: '060101'). */
  codigo: string;
  descricao: string;
  li: ReadonlyArray<'EP' | 'LP' | 'ET'>;
  grupo: 'obra' | 'atvEvento' | null;
}

/** Lista vigente indexada por código (6 dígitos, zero à esquerda). */
export type ListaLc116 = ReadonlyMap<string, Lc116ServicoNacional>;

/**
 * BE-INCR-LEGAL-PARAMS PR-2 (item 21) — a lista mora na tabela de plataforma `LC116_SERVICO` (chave = código, `valorJson`
 * = linha/descrição/li/grupo; fonte e sha256 da planilha por linha), cópia byte a byte. Fotografia → lista vigente.
 */
export function listaLc116De(linhas: readonly LinhaLegal[], data: string): ListaLc116 {
  return new Map(
    linhasVigentesDaTabela(linhas, 'LC116_SERVICO', data).map((l) => {
      const v = JSON.parse(l.valorJson ?? '{}') as Omit<Lc116ServicoNacional, 'codigo'>;
      return [l.chave, { linha: v.linha, codigo: l.chave, descricao: v.descricao, li: v.li, grupo: v.grupo }];
    }),
  );
}

/**
 * Emenda §9 L-8 (dono, 07/10: "DTO lê o cache síncrono") — a lista vigente HOJE, lida do cache de parâmetros legais
 * (aquecido no boot). Só para o DTO Zod estático; serviço monta a fotografia (F-LP-4 a).
 */
export function listaLc116DoCache(hoje: string = hojeDateOnly()): ListaLc116 {
  return listaLc116De(linhasEmCacheSincrono('LC116_SERVICO'), hoje);
}

/** `cTribNac` válido = existe na lista nacional vigente (6 dígitos, zero à esquerda). */
export function findLc116(codigo: string, lista: ListaLc116): Lc116ServicoNacional | undefined {
  return lista.get(codigo);
}

export function isLc116Codigo(codigo: string, lista: ListaLc116): boolean {
  return lista.has(codigo);
}
