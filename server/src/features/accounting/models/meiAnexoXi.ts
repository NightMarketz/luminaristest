/**
 * SIMPLES-PISO-ANEXO-XI bloco 2 (BRIEF §3 itens 12-15; decisões do dono, chat, 10/10) — leitura PURA da tabela de
 * plataforma `MEI_ANEXO_XI` (Res. CGSN 140/2018 Anexo XI, Tabelas A e B) para o perfil e a apuração do SIMEI.
 * Guarda só a consulta; a consequência (400, bloqueio, alerta) fica no serviço que a chama.
 */
import { linhasEmVigor, type LinhaLegal } from '../../legalParameters/models/legalParameter';
import { MeiAnexoXiJson } from '../../legalParameters/models/formatoLinha';

export const TABELA_ANEXO_XI = 'MEI_ANEXO_XI' as const;

export interface OcupacaoAnexoXi {
  chave: string; // A-0001 | B-0001 (ordinal da linha na fonte)
  tabela: 'A' | 'B';
  ocupacao: string;
  cnae: string; // 7 dígitos, sem máscara (o Anexo traz 0000-0/00)
  iss: boolean;
  icms: boolean;
  vigenteAte: string | null; // YYYY-MM-DD inclusive; preenchido = ocupação excluída por alteração do Anexo XI
}

const soDigitos = (s: string): string => s.replace(/\D/g, '');

function paraOcupacao(l: LinhaLegal): OcupacaoAnexoXi {
  const v = MeiAnexoXiJson.parse(JSON.parse(l.valorJson ?? 'null'));
  return { chave: l.chave, tabela: l.chave.startsWith('B') ? 'B' : 'A', ocupacao: v.ocupacao, cnae: soDigitos(v.cnae), iss: v.iss, icms: v.icms, vigenteAte: l.vigenteAte };
}

/** Item 12 (decisão 2 do dono): chaves que não existem em nenhuma linha em vigor do Anexo XI ⇒ o perfil devolve 400. */
export function chavesInexistentes(linhas: readonly LinhaLegal[], chaves: readonly string[]): string[] {
  const existentes = new Set(linhasEmVigor(linhas).filter((l) => l.tabela === TABELA_ANEXO_XI).map((l) => l.chave));
  return chaves.filter((c) => !existentes.has(c));
}

/**
 * As ocupações do Anexo XI vigentes na data (1º dia da competência apurada — decisão 6 do dono). `null` quando a tabela
 * não tem nenhuma linha vigente na data: competência anterior à versão transcrita (F-AX-5 a; BRIEF item 12, "ano ≥ ano
 * de publicação da tabela") — o chamador não aplica as checagens do Anexo XI.
 */
export function anexoXiVigente(linhas: readonly LinhaLegal[], data: string): Map<string, OcupacaoAnexoXi> | null {
  const porChave = new Map<string, LinhaLegal>();
  for (const l of linhasEmVigor(linhas)) {
    if (l.tabela !== TABELA_ANEXO_XI || l.vigenteDesde > data || (l.vigenteAte !== null && data > l.vigenteAte)) continue;
    const atual = porChave.get(l.chave);
    if (!atual || l.vigenteDesde > atual.vigenteDesde) porChave.set(l.chave, l);
  }
  if (porChave.size === 0) return null;
  return new Map([...porChave.entries()].map(([k, l]) => [k, paraOcupacao(l)]));
}

/** Item 15 (M2/M7): CNAEs do CNPJ (7 dígitos) sem nenhuma linha vigente do Anexo XI — os impeditivos do SIMEI. */
export function cnaesForaDoAnexo(anexo: ReadonlyMap<string, OcupacaoAnexoXi>, cnaes: readonly string[]): string[] {
  const permitidos = new Set([...anexo.values()].map((o) => o.cnae));
  return [...new Set(cnaes.map(soDigitos))].filter((c) => !permitidos.has(c)).sort();
}

/** Item 13 (M5, F-AX-3 b): o ICMS/ISS que as ocupações declaradas implicam — basta uma ocupação com S na coluna. */
export function enquadramentoDasOcupacoes(ocupacoes: readonly OcupacaoAnexoXi[]): { contribuinteIcms: boolean; contribuinteIss: boolean } {
  return { contribuinteIcms: ocupacoes.some((o) => o.icms), contribuinteIss: ocupacoes.some((o) => o.iss) };
}

/**
 * Item 14 (M3/M4; decisão 5 do dono): o limite do transportador autônomo de cargas (`MEI_TAC`) só vale quando TODAS as
 * ocupações declaradas são da Tabela B (Res. CGSN 140 art. 100 § 1º-A, "ocupação profissional exclusiva"); qualquer
 * ocupação da Tabela A — inclusive nenhuma da B — leva ao limite geral (§ 1º-B).
 */
export function transportadorNaTabelaB(ocupacoes: readonly OcupacaoAnexoXi[]): { soTabelaB: boolean; algumaB: boolean } {
  const algumaB = ocupacoes.some((o) => o.tabela === 'B');
  return { soTabelaB: ocupacoes.length > 0 && ocupacoes.every((o) => o.tabela === 'B'), algumaB };
}

const diaSeguinte = (d: string): string => new Date(Date.parse(`${d}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

/**
 * Item 16 (dono, chat, 10/10: "Texto vigente da Res. 140") — ocupação excluída do Anexo XI: o desenquadramento vale a
 * partir do 1º dia do mês em que a alteração produz efeitos (Res. CGSN 140 art. 101 § 3º II c/c art. 115 § 2º II "c").
 * `excluidas` = chaves declaradas sem linha vigente na data (com a data de efeito, quando a linha encerrada é conhecida);
 * `aExcluir` = vigentes com fim de vigência já publicado (efeito no dia seguinte ao `vigenteAte`).
 */
export function ocupacoesExcluidas(
  linhas: readonly LinhaLegal[],
  anexo: ReadonlyMap<string, OcupacaoAnexoXi>,
  chaves: readonly string[],
  data: string,
): { excluidas: Array<{ chave: string; efeitoDesde: string | null }>; aExcluir: Array<{ chave: string; efeitoDesde: string }> } {
  const emVigor = linhasEmVigor(linhas).filter((l) => l.tabela === TABELA_ANEXO_XI);
  const excluidas = chaves
    .filter((c) => !anexo.has(c))
    .map((chave) => {
      const fim = emVigor.filter((l) => l.chave === chave && l.vigenteAte !== null && l.vigenteAte < data).map((l) => l.vigenteAte as string).sort().pop();
      return { chave, efeitoDesde: fim ? diaSeguinte(fim) : null };
    });
  const aExcluir = chaves
    .map((c) => anexo.get(c))
    .filter((o): o is OcupacaoAnexoXi => o !== undefined && o.vigenteAte !== null)
    .map((o) => ({ chave: o.chave, efeitoDesde: diaSeguinte(o.vigenteAte as string) }));
  return { excluidas, aExcluir };
}
