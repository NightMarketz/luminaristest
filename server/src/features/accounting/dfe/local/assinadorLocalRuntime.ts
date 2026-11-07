import type { SefazTransporte } from '../sefaz/SefazTransporte';

/**
 * X10a EMENDA-4 (AL-2) — o ponto de ligação do transporte do assinador local. `selectDfeEmissor` é pura e chamada com
 * `process.env` em vários serviços; o transporte do assinador depende da fila persistida (`DfeSignerTask`), que só o
 * factory monta. O factory liga a instância uma vez no boot; sem ela, a porta `sefaz` fica desabilitada com o motivo
 * nomeado (nunca silêncio).
 */
let transporte: SefazTransporte | null = null;

export function ligarTransporteAssinadorLocal(t: SefazTransporte | null): void {
  transporte = t;
}

export function transporteAssinadorLocal(): SefazTransporte | null {
  return transporte;
}
