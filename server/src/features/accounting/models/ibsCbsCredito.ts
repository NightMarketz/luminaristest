/**
 * IBS-CBS-2027 PR-3 (BRIEF `docs/accounting/BE-INCR-IBS-CBS-2027-brief.md` itens 14–15; F-IBS-4 a) — crédito candidato da
 * NF-e de entrada. Puro: sem I/O, sem `new Date`.
 *
 * - Crédito só no regime regular e só sobre o IBS/CBS **destacado** no documento de aquisição (LC 214 art. 47 caput e
 *   § 2º I [D03 do dossiê verif-2026-10-21-ibs-cbs-pr3]); nasce `PENDENTE` — a extinção (art. 27) vem depois (item 16).
 * - Uso ou consumo pessoal fica fora (art. 57 [D03]) por lista versionada em `legal_parameters` (tabela
 *   `IBS_CBS_USO_CONSUMO`, chave = prefixo de NCM — dono 21/10). O conteúdo é do contador (P-IBS-2): sem linha publicada
 *   nenhum item é excluído e o resultado avisa. O IBS/CBS do item excluído é custo do item (não recuperável).
 * - Nota emitida antes de 2027 não gera crédito (F-IBS-7 b: nada é apurado em 2026).
 */
import { linhasEmVigor, type LinhaLegal } from '../../legalParameters/models/legalParameter';

export const TABELA_USO_CONSUMO = 'IBS_CBS_USO_CONSUMO';
export const INICIO_CREDITO_IBS_CBS = '2027-01-01';

export interface LinhaUsoConsumo {
  /** Prefixo de NCM (2 a 8 dígitos). */
  ncmPrefixo: string;
  fonte: string;
  vigenteDesde: string;
  vigenteAte: string | null;
}

/** Linhas PUBLISHED em vigor da lista (L-7). Chave fora do formato de prefixo de NCM ⇒ erro (dado corrompido). */
export function listaUsoConsumoDe(linhas: readonly LinhaLegal[]): readonly LinhaUsoConsumo[] {
  return linhasEmVigor(linhas)
    .filter((l) => l.tabela === TABELA_USO_CONSUMO)
    .map((l) => {
      if (!/^\d{2,8}$/.test(l.chave)) throw new Error(`ibsCbsCredito: linha ${l.id} de ${TABELA_USO_CONSUMO} com chave '${l.chave}' fora do formato de prefixo de NCM`);
      return { ncmPrefixo: l.chave, fonte: l.fonte, vigenteDesde: l.vigenteDesde, vigenteAte: l.vigenteAte };
    });
}

/** A linha da lista que casa o NCM na data (o prefixo mais longo vence), ou null. */
export function usoConsumoDoNcm(lista: readonly LinhaUsoConsumo[], ncm: string, data: string): LinhaUsoConsumo | null {
  let melhor: LinhaUsoConsumo | null = null;
  for (const l of lista) {
    if (l.vigenteDesde > data || (l.vigenteAte !== null && data > l.vigenteAte) || !ncm.startsWith(l.ncmPrefixo)) continue;
    if (!melhor || l.ncmPrefixo.length > melhor.ncmPrefixo.length) melhor = l;
  }
  return melhor;
}

export interface ItemEntradaIbsCbs {
  nItem: number;
  ncm: string;
  ibsCbs?: { vIBSCents: bigint | null; vCBSCents: bigint | null };
}

export interface ItemUsoConsumo {
  nItem: number;
  ncm: string;
  ibsCents: number;
  cbsCents: number;
  fonte: string;
}

export interface CreditoIbsCbsEntrada {
  ibsCents: number;
  cbsCents: number;
  usoConsumo: ItemUsoConsumo[];
  /** IBS + CBS não creditável por item (uso/consumo) — soma ao custo do próprio item. */
  naoCreditavelPorItem: Map<number, number>;
  avisos: string[];
}

const SEM_CREDITO: CreditoIbsCbsEntrada = { ibsCents: 0, cbsCents: 0, usoConsumo: [], naoCreditavelPorItem: new Map(), avisos: [] };

const centavos = (v: bigint | null | undefined, rotulo: string): number => {
  const n = Number(v ?? 0n);
  if (!Number.isSafeInteger(n) || n < 0) throw new Error(`ibsCbsCredito: ${rotulo} fora da faixa de centavos`);
  return n;
};

/**
 * Itens 14–15. `itens` = os que compõem o total (`indTot ≠ 0`, o chamador filtrou). Sem regime regular, antes de 2027 ou
 * sem o grupo IBSCBS ⇒ zero, sem aviso.
 */
export function creditoIbsCbsEntrada(input: {
  dataEmissao: string;
  regimeRegular: boolean;
  itens: readonly ItemEntradaIbsCbs[];
  lista: readonly LinhaUsoConsumo[];
}): CreditoIbsCbsEntrada {
  if (!input.regimeRegular || input.dataEmissao < INICIO_CREDITO_IBS_CBS) return SEM_CREDITO;
  const comGrupo = input.itens.filter((it) => it.ibsCbs);
  if (comGrupo.length === 0) return SEM_CREDITO;

  const out: CreditoIbsCbsEntrada = { ibsCents: 0, cbsCents: 0, usoConsumo: [], naoCreditavelPorItem: new Map(), avisos: [] };
  if (!input.lista.some((l) => l.vigenteDesde <= input.dataEmissao && (l.vigenteAte === null || input.dataEmissao <= l.vigenteAte))) {
    out.avisos.push(`lista de uso ou consumo pessoal (${TABELA_USO_CONSUMO}) sem linha publicada em ${input.dataEmissao} — nenhum item excluído do crédito (P-IBS-2; LC 214 art. 57)`);
  }
  for (const it of comGrupo) {
    const ibs = centavos(it.ibsCbs!.vIBSCents, `vIBS do item ${it.nItem}`);
    const cbs = centavos(it.ibsCbs!.vCBSCents, `vCBS do item ${it.nItem}`);
    const linha = usoConsumoDoNcm(input.lista, it.ncm, input.dataEmissao);
    if (linha) {
      out.usoConsumo.push({ nItem: it.nItem, ncm: it.ncm, ibsCents: ibs, cbsCents: cbs, fonte: linha.fonte });
      if (ibs + cbs > 0) out.naoCreditavelPorItem.set(it.nItem, ibs + cbs);
      continue;
    }
    out.ibsCents += ibs;
    out.cbsCents += cbs;
  }
  return out;
}

/**
 * Item 16 — a linha de crédito de IBS/CBS de uma nota, como a apuração a lê (`Payable.recoverableTaxLines`, variante
 * `tributo`). `apropriadoEm` = dia escrito da apropriação (null enquanto PENDENTE).
 */
export interface IbsCbsCreditoNota {
  payableId: string;
  documentNumber: string | null;
  issueDate: string;
  tributo: 'IBS' | 'CBS';
  amountCents: bigint;
  status: 'PENDENTE' | 'APROPRIADO';
  apropriadoEm: string | null;
  usoConsumoCents: bigint;
}
