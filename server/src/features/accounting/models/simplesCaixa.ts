/**
 * BE-INCR-SIMPLES-CAIXA PR-2 (nó X14-CAIXA, BRIEF itens 8–14) — base mensal do DAS no regime de caixa (Res. CGSN 140
 * art. 16 § 1º, vigente até 31/12/2026). Funções PURAS: decidem quais vendas entram na base do PA e com que valor; a
 * composição por atividade (natureza, cTribNac, cota do parceiro) é do serviço, pelas linhas da venda.
 *
 * Decisões do dono (questionário, 2026-10-16) sobre as lacunas do BRIEF:
 *  - L1 (a) "Deduz no mês do estorno": base(PA) = recebido no PA (ACTIVE + REVERTED) − estornado/devolvido no PA; o PA
 *    de origem não é recalculado (Res. CGSN 140 art. 17 I e p.ú.; art. 18 § 1º).
 *  - L2 (a) "Só vendas de ano no caixa": a base caixa e o art. 20 contam só vendas auferidas em ano com perfil CAIXA. Sem
 *    texto expresso — ambiguidade A3 do BRIEF; o recebimento excluído sai em `excluidoCompetenciaCents` (alerta INFO).
 */

export interface RecebimentoCaixa {
  saleId: string;
  dia: string;
  competenciaCaixa: string;
  valorCents: bigint;
  meio: string;
  status: string;
  diaEstorno: string | null;
}

/** A venda auferida, pelas linhas do subrazão de receita (`ReceitaFiscalLinha`). */
export interface VendaCaixa {
  saleId: string;
  /** Dia da receita (finalização). */
  dia: string;
  /** Σ das linhas VENDA (receita bruta da venda). */
  receitaCents: bigint;
  /** Dia das linhas CANCELAMENTO, se houver. */
  cancelamentoDia: string | null;
  /** Dia e valor (positivo) das linhas DEVOLUCAO, se houver — F-CX-4 (a): o valor da devolução = o devolvido. */
  devolucao: { dia: string; cents: bigint } | null;
}

export interface PerfilCaixaAno {
  regimeApuracao: string;
  encerramentoAtividadeEm: string | null;
  simplesExclusaoEfeitosEm: string | null;
}

export type GatilhoArt20 = 'PARCELA_VENCIDA' | 'ENCERRAMENTO' | 'RETORNO_COMPETENCIA' | 'EXCLUSAO';
export type BucketCaixa = 'RECEBIDO' | 'ESTORNO' | 'DEVOLUCAO' | GatilhoArt20;

/** Um valor da base do PA, com sinal, atribuído a uma venda (`venda = null`: recebimento sem linha de receita). */
export interface ItemBaseCaixa {
  saleId: string;
  bucket: BucketCaixa;
  valorCents: bigint;
  venda: VendaCaixa | null;
  meio: string | null;
}

export interface BaseCaixaPura {
  itens: ItemBaseCaixa[];
  /** A3 (L2 a): recebidos no PA de vendas auferidas em ano por competência — fora da base. */
  excluidoCompetenciaCents: bigint;
}

type Perfis = (ano: number) => PerfilCaixaAno | null;

const ultimoDia = (comp: string) => `${comp}-31`; // comparação lexical YYYY-MM-DD: todo dia do mês é ≤ "AAAA-MM-31"
const mesAnterior = (dia: string): string => {
  const [a, m] = dia.split('-').map(Number);
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, '0')}`;
};
const noCaixa = (perfil: Perfis, v: VendaCaixa | null) => v === null || perfil(Number(v.dia.slice(0, 4)))?.regimeApuracao === 'CAIXA';

/** Último ano em que a volta à competência (art. 20 II b) tem comportamento decidido — Y = 2026 é a A1 (§5 do BRIEF). */
export const ULTIMO_ANO_RETORNO_DECIDIDO = 2025;

/**
 * Art. 20 — o PA em que a receita auferida e não recebida da venda é tributada, ou null. O gatilho é o PRIMEIRO dos
 * candidatos a partir do mês da venda; se a venda já foi recebida (ou cancelada/devolvida) até o fim dele, não há gatilho:
 *  - I: parcela não vencida até o último mês do ano seguinte ao da operação (dez/Y+1), com o perfil Y+1 no caixa;
 *  - II a: mês do encerramento de atividade;
 *  - II b: volta à competência — perfil(Z) CAIXA e perfil(Z+1) COMPETENCIA ⇒ dez/Z, só Z ≤ 2025 (A1);
 *  - II c: mês anterior aos efeitos da exclusão do Simples (F-CX-3 a).
 */
export function gatilhoArt20(venda: VendaCaixa, recebimentos: readonly RecebimentoCaixa[], perfil: Perfis): { pa: string; bucket: GatilhoArt20 } | null {
  const y = Number(venda.dia.slice(0, 4));
  const candidatos: Array<{ pa: string; bucket: GatilhoArt20 }> = [];
  if (perfil(y + 1)?.regimeApuracao === 'CAIXA') candidatos.push({ pa: `${y + 1}-12`, bucket: 'PARCELA_VENCIDA' });
  for (const z of [y, y + 1]) {
    const p = perfil(z);
    if (!p) continue;
    if (p.encerramentoAtividadeEm) candidatos.push({ pa: p.encerramentoAtividadeEm.slice(0, 7), bucket: 'ENCERRAMENTO' });
    if (p.simplesExclusaoEfeitosEm) candidatos.push({ pa: mesAnterior(p.simplesExclusaoEfeitosEm), bucket: 'EXCLUSAO' });
    if (z <= ULTIMO_ANO_RETORNO_DECIDIDO && p.regimeApuracao === 'CAIXA' && perfil(z + 1)?.regimeApuracao === 'COMPETENCIA') {
      candidatos.push({ pa: `${z}-12`, bucket: 'RETORNO_COMPETENCIA' });
    }
  }
  const primeiro = candidatos.filter((c) => c.pa >= venda.dia.slice(0, 7)).sort((a, b) => a.pa.localeCompare(b.pa))[0];
  if (!primeiro) return null;
  const fim = ultimoDia(primeiro.pa);
  if (recebimentos.some((r) => r.dia <= fim)) return null;
  if ((venda.cancelamentoDia && venda.cancelamentoDia <= fim) || (venda.devolucao && venda.devolucao.dia <= fim)) return null;
  return primeiro;
}

/** Recebimento depois do gatilho do art. 20 da venda: a receita já foi tributada no PA do gatilho. */
function jaTributada(perfil: Perfis, v: VendaCaixa | null, recs: readonly RecebimentoCaixa[], dia: string): boolean {
  if (!v) return false;
  const g = gatilhoArt20(v, recs.filter((r) => r.dia < dia), perfil);
  return g !== null && g.pa < dia.slice(0, 7);
}

/**
 * Itens 8–12 e 14 — os valores da base do PA. `vendas` = as vendas auferidas que podem pesar no PA; `recebimentosDaVenda`
 * = TODOS os recebimentos de cada uma; `recebidosNoPa` e `estornadosNoPa` = os recebimentos do PA e os estornados nele.
 */
export function baseCaixaDoPa(input: {
  competencia: string;
  vendas: ReadonlyMap<string, VendaCaixa>;
  recebimentosDaVenda: ReadonlyMap<string, readonly RecebimentoCaixa[]>;
  recebidosNoPa: readonly RecebimentoCaixa[];
  estornadosNoPa: readonly RecebimentoCaixa[];
  perfil: Perfis;
}): BaseCaixaPura {
  const { competencia, vendas, perfil } = input;
  const recs = (saleId: string) => input.recebimentosDaVenda.get(saleId) ?? [];
  const itens: ItemBaseCaixa[] = [];
  let excluidoCompetenciaCents = 0n;
  for (const r of input.recebidosNoPa) {
    const v = vendas.get(r.saleId) ?? null;
    if (jaTributada(perfil, v, recs(r.saleId), r.dia)) continue;
    if (!noCaixa(perfil, v)) {
      excluidoCompetenciaCents += r.valorCents;
      continue;
    }
    // L1 (a): o recebido no PA conta mesmo que tenha sido estornado depois (status REVERTED).
    itens.push({ saleId: r.saleId, bucket: 'RECEBIDO', valorCents: r.valorCents, venda: v, meio: r.meio });
  }
  for (const r of input.estornadosNoPa) {
    const v = vendas.get(r.saleId) ?? null;
    if (r.diaEstorno?.slice(0, 7) !== competencia || !noCaixa(perfil, v) || jaTributada(perfil, v, recs(r.saleId), r.dia)) continue;
    itens.push({ saleId: r.saleId, bucket: 'ESTORNO', valorCents: -r.valorCents, venda: v, meio: r.meio });
  }
  for (const v of vendas.values()) {
    if (!noCaixa(perfil, v)) continue;
    // Item 14: a devolução de venda paga deduz o valor devolvido no mês da devolução, limitado ao recebido (art. 17 p.ú.);
    // venda não paga nunca entrou na base.
    const dev = v.devolucao;
    if (dev && dev.dia.slice(0, 7) === competencia) {
      const pagos = recs(v.saleId).filter((r) => r.status === 'ACTIVE' && r.dia <= dev.dia && !jaTributada(perfil, v, recs(v.saleId), r.dia));
      const recebido = pagos.reduce((s, r) => s + r.valorCents, 0n);
      const deduz = recebido < dev.cents ? recebido : dev.cents;
      if (deduz > 0n) itens.push({ saleId: v.saleId, bucket: 'DEVOLUCAO', valorCents: -deduz, venda: v, meio: null });
    }
    const g = gatilhoArt20(v, recs(v.saleId), perfil);
    if (g && g.pa === competencia) itens.push({ saleId: v.saleId, bucket: g.bucket, valorCents: v.receitaCents, venda: v, meio: null });
  }
  return { itens, excluidoCompetenciaCents };
}

/**
 * Item 13 (art. 20 IV) — vendas no caixa auferidas e não recebidas até o fim do PA, sem gatilho do art. 20 até ele: a
 * base do bloco `impedimentoCaixa` (fora do DAS).
 */
export function naoRecebidasAte(
  competencia: string,
  vendas: ReadonlyMap<string, VendaCaixa>,
  recebimentosDaVenda: ReadonlyMap<string, readonly RecebimentoCaixa[]>,
  perfil: Perfis,
): VendaCaixa[] {
  const fim = ultimoDia(competencia);
  return [...vendas.values()].filter((v) => {
    if (v.dia > fim || !noCaixa(perfil, v)) return false;
    if ((v.cancelamentoDia && v.cancelamentoDia <= fim) || (v.devolucao && v.devolucao.dia <= fim)) return false;
    const recs = recebimentosDaVenda.get(v.saleId) ?? [];
    if (recs.some((r) => r.dia <= fim)) return false;
    const g = gatilhoArt20(v, recs, perfil);
    return !(g && g.pa <= competencia);
  });
}
