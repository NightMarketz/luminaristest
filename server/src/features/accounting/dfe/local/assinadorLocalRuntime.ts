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

/**
 * AL-PR-3 — o transporte que o factory liga no boot. O mTLS de verdade é o `AssinadorLocalTransporte` do DISPOSITIVO da
 * unidade, que o `DfeAssinaturaResolver` põe em `ctx.assinatura.transporte`; chamada sem esse contexto (o serviço não
 * resolveu a unidade) não tem caixa para onde ir. Erro nomeado e NÃO de comunicação: não liga contingência.
 */
export const DFE_ASSINADOR_SEM_DISPOSITIVO = 'dfe_assinador_sem_dispositivo';

export const transporteSemDispositivo: SefazTransporte = {
  async call() {
    throw new Error(`${DFE_ASSINADOR_SEM_DISPOSITIVO}: a transmissão pelo assinador local precisa do dispositivo da unidade do documento`);
  },
};
