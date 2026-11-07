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
