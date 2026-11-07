import type { FiscalDocument } from 'generated/prisma';

/**
 * BE-INCR-DFE-EVENTOS (nó X11, PR-2, itens 18–19) — regras puras do cancelamento em voo e da consulta de eventos,
 * usadas pelo ciclo de vida (o 409 e o job) e pela view (a pendência). Fonte: BRIEF §3 itens 18–19 e a emenda do PR-2
 * (decisões do dono de 07/11, Q1–Q3).
 */

/**
 * Q1 (dono, 07/11): o 409 `DFE_CANCEL_EM_ANDAMENTO` vale por 24 h desde o `cancelRequestedAt`. Depois disso um novo
 * pedido passa e a view mostra `cancelamento_sem_resposta` até ele sair.
 */
export const CANCEL_EM_VOO_MS = 24 * 60 * 60 * 1000;

/** Q3 (dono, 07/11): por tick, todas as notas em voo e até 50 das demais em rodízio (memória fila-de-job-com-teto). */
export const EVENTOS_POR_TICK = 50;

/** Item 19 / Q1: o cancelamento pedido ainda segura o 2º pedido (menos de 24 h desde o `cancelRequestedAt`). */
export function cancelamentoEmVoo(cancelRequestedAt: Date | null, agora: Date): boolean {
  return cancelRequestedAt != null && agora.getTime() - cancelRequestedAt.getTime() < CANCEL_EM_VOO_MS;
}

/** Q1: pedido em voo há 24 h ou mais, sem evento que o concluísse — a pendência `cancelamento_sem_resposta`. */
export function cancelamentoSemResposta(cancelRequestedAt: Date | null, agora: Date): boolean {
  return cancelRequestedAt != null && !cancelamentoEmVoo(cancelRequestedAt, agora);
}

/** A3 (régua de testes do BRIEF) — a nota nomeada por número e série, nunca pelo id interno. */
export function nomeDaNota(doc: Pick<FiscalDocument, 'nNFSe' | 'serie' | 'numero'>): string {
  return `NFS-e nº ${doc.nNFSe ?? '—'} (DPS série ${doc.serie} nº ${doc.numero == null ? '—' : String(doc.numero)})`;
}

/**
 * BE-INCR-DFE-EVENTOS (PR-3, item 20; F-EVT-4 b) — o desfecho da análise fiscal do cancelamento pelos eventos do fisco,
 * quando nenhum evento cancela a nota (o e105104 cancela pelo caminho do item 18). Vale o ÚLTIMO dos dois, por `dhProc`
 * (uma análise indeferida pode ser pedida de novo — Anexo II [4]–[6]):
 * - e101103 por último e a nota `AUTHORIZED*` → `'entrar'` em `CANCEL_ANALYSIS` (o pedido foi feito fora do Luminaris, ou
 *   em voo — item 19);
 * - e105105 por último e a nota em `CANCEL_ANALYSIS` → `'indeferir'` (volta ao status de antes da análise).
 * Qualquer outro caso: nada a fazer (`null`).
 */
export function desfechoDaAnalise(
  eventos: ReadonlyArray<{ tipo: string; dhProc: string }>,
  status: string,
): 'entrar' | 'indeferir' | null {
  const ultimo = eventos
    .filter((e) => e.tipo === 'e101103' || e.tipo === 'e105105')
    .sort((a, b) => Date.parse(a.dhProc) - Date.parse(b.dhProc))
    .at(-1);
  if (!ultimo) return null;
  if (ultimo.tipo === 'e101103' && (status === 'AUTHORIZED' || status === 'AUTHORIZED_DIVERGENT')) return 'entrar';
  if (ultimo.tipo === 'e105105' && status === 'CANCEL_ANALYSIS') return 'indeferir';
  return null;
}
