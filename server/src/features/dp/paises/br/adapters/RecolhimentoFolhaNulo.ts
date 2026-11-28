/**
 * BE-INCR-DP-PONTE-RAZAO item 36 (decisão C-4) — adaptador nulo da `RecolhimentoFolhaPort`: sem o F5 (guias e
 * pagamento) não há FGTS nem CPP recolhidos conhecidos, então todo mês do DP sai `completa = false`.
 */
import type { RecolhimentoFolhaDoMes, RecolhimentoFolhaPort } from '../../../../accounting/paises/br/ports/RecolhimentoFolhaPort';

export class RecolhimentoFolhaNulo implements RecolhimentoFolhaPort {
  async recolhidoNoMes(): Promise<RecolhimentoFolhaDoMes | null> {
    return null;
  }
}
