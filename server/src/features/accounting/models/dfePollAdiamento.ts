/**
 * Lacuna 92c5 (dono, 24/11/2026) — o polling de DF-e adia, sem gastar tentativa, o documento cujo transporte local está
 * indisponível (`DfeTransporteIndisponivelError`). Para ALERTAR depois de 1 h adiado é preciso saber desde quando. Lacuna 6e13
 * (dono, 25/11): o início do episódio e o "já alertei" moram em colunas próprias do documento (`pollDeferredSince`,
 * `pollAlertedAt`); este módulo é só a regra. Puro: sem relógio, sem banco.
 *
 * Um episódio acaba quando a consulta dá certo ou quando outra falha da consulta é registrada (o serviço zera as duas colunas):
 * o episódio seguinte começa do zero e pode alertar de novo.
 */
export interface AdiamentoTransporte {
  /** 1º adiamento do episódio (não a idade da nota). */
  desde: Date;
  /** O alerta deste episódio já saiu. */
  alertado: boolean;
}

/**
 * Alerta quando o episódio já dura `aposMs` ou mais e ainda não alertou. O primeiro adiamento (`anterior` = null) tem duração 0:
 * nunca alerta. `>=` porque o documento adiado só volta à fila exatamente 1 h depois (`nextPollAt`).
 */
export function deveAlertarAdiamento(anterior: AdiamentoTransporte | null, agora: Date, aposMs: number): boolean {
  if (!anterior || anterior.alertado) return false;
  return agora.getTime() - anterior.desde.getTime() >= aposMs;
}
