/**
 * BE-INCR-DP-PONTE-RAZAO item 35 — adaptador nulo da `FolhaFatorRPort`: a instância sem folha `FECHADA` devolve o mapa
 * vazio, e a apuração do Simples segue pelo histórico digitado, sem alerta.
 *
 * É o adaptador montado no `lib/factory.ts` enquanto o adaptador do DP (`FolhaFatorRDpAdapter`, que lê as folhas
 * `FECHADA` pela `dataPagamento`) espera o F2 PR-5 (`DpFolha`, `DpResultadoVinculo`) e o PR-P2 da ponte (`FECHADA`).
 */
import type { FolhaFatorR, FolhaFatorRPort } from '../../../../accounting/paises/br/ports/FolhaFatorRPort';

export class FolhaFatorRNulo implements FolhaFatorRPort {
  async folhaPorMes(): Promise<Map<string, FolhaFatorR>> {
    return new Map();
  }
}
