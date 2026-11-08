import { z } from 'zod';

/**
 * BE-INCR-DFE-EVENTOS (nó X11, PR-2, item 18; BRIEF §4, F-EVT-5 b) — contrato materializado do que
 * `DfeEmissorPort.consultarEventos(chave)` devolve. O serviço valida cada item da porta por este schema: o que não
 * casa (tipo fora da lista, `dhProc` sem fuso) vira "evento desconhecido" no resumo do tick, nunca uma transição.
 *
 * Tipos (Anexo II v1.01, aba `TIPO EVENTOS DE NFSe`): e101101 [2] · e105102 [3] · e101103 [4] · e105104 [5] ·
 * e105105 [6] · e305101 [15]. `dhProc` é TSDateTimeUTC (com fuso). `chSubstituta` = TSChaveNFSe (50 dígitos);
 * `cMotivo` do e105102 = TSCodJustSubst (01|02|03|04|05|99, XSD 1.01).
 */
const DH_PROC = z.string().datetime({ offset: true });

export const EventoNfseSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.enum(['e101101', 'e305101', 'e105104', 'e105105', 'e101103']), dhProc: DH_PROC }).strict(),
  z
    .object({
      tipo: z.literal('e105102'),
      dhProc: DH_PROC,
      chSubstituta: z.string().regex(/^\d{50}$/),
      cMotivo: z.enum(['01', '02', '03', '04', '05', '99']),
    })
    .strict(),
]);

/**
 * Eventos que cancelam a nota (item 18): o cancelamento do emitente (e101101), o de ofício (e305101), o deferido pela
 * análise fiscal (e105104) e o por substituição (e105102). e101103/e105105 são do PR-3 (F-EVT-4 b): conhecidos, sem efeito.
 */
export const EVENTOS_QUE_CANCELAM = ['e101101', 'e305101', 'e105104', 'e105102'] as const;
export type EventoQueCancela = (typeof EVENTOS_QUE_CANCELAM)[number];

/**
 * Item 19 — a porta devolveu `PROCESSING` ao cancelamento da NFS-e: o pedido fica em voo (`cancelRequestedAt`), a
 * resposta é 202 e o job de eventos (item 18) conclui. Vai no `avisos` da resposta; o controller responde 202 quando o vê.
 */
export const AVISO_CANCEL_EM_ANDAMENTO = 'cancelamento_em_andamento';

/** Resumo do passo de eventos no tick do `dfe_poll_pending` (item 18). `avisos` nomeia a nota por número e série (A3). */
export const EventosTickSummarySchema = z
  .object({
    consultadas: z.number().int(),
    canceladas: z.number().int(),
    substituidasFora: z.number().int(),
    ignorados: z.number().int(),
    skipped: z.number().int(),
    failed: z.number().int(),
    avisos: z.array(z.string()),
  })
  .strict();
export type EventosTickSummary = z.infer<typeof EventosTickSummarySchema>;
