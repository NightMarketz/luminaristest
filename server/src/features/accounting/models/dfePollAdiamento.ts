/**
 * Lacuna 92c5 (dono, 24/11/2026) — o polling de DF-e adia, sem gastar tentativa, o documento cujo transporte local está
 * indisponível (`DfeTransporteIndisponivelError`). Para ALERTAR depois de 1 h adiado é preciso saber desde quando; sem coluna
 * nova (nenhuma migração), o início do episódio e o "já alertei" ficam no `pollLastError` do documento, em formato fixo e
 * legível: `dfe_transporte_indisponivel desde=<ISO> alertado=<0|1>: <mensagem>`. Puro: sem relógio, sem banco.
 *
 * Um episódio acaba quando a consulta dá certo (o serviço zera `pollLastError`) ou quando outra falha da consulta sobrescreve
 * o campo (`registrarFalhaDePoll`): o episódio seguinte começa do zero e pode alertar de novo.
 */
const PREFIXO = 'dfe_transporte_indisponivel';
const FORMATO = /^dfe_transporte_indisponivel desde=(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z) alertado=([01]): /;

export interface AdiamentoTransporte {
  /** 1º adiamento do episódio (não a idade da nota). */
  desde: Date;
  /** O alerta deste episódio já saiu. */
  alertado: boolean;
}

/** O episódio gravado em `pollLastError`, ou `null` se o campo é outra coisa (outro erro, vazio ou data ilegível). */
export function lerAdiamentoTransporte(pollLastError: string | null | undefined): AdiamentoTransporte | null {
  const m = pollLastError ? FORMATO.exec(pollLastError) : null;
  if (!m) return null;
  const desde = new Date(m[1]);
  return Number.isNaN(desde.getTime()) ? null : { desde, alertado: m[2] === '1' };
}

export function gravarAdiamentoTransporte(adiamento: AdiamentoTransporte, mensagem: string): string {
  return `${PREFIXO} desde=${adiamento.desde.toISOString()} alertado=${adiamento.alertado ? 1 : 0}: ${mensagem}`;
}

/**
 * Alerta quando o episódio já dura `aposMs` ou mais e ainda não alertou. O primeiro adiamento (`anterior` = null) tem duração 0:
 * nunca alerta. `>=` porque o documento adiado só volta à fila exatamente 1 h depois (`nextPollAt`).
 */
export function deveAlertarAdiamento(anterior: AdiamentoTransporte | null, agora: Date, aposMs: number): boolean {
  if (!anterior || anterior.alertado) return false;
  return agora.getTime() - anterior.desde.getTime() >= aposMs;
}
