/**
 * BE-INCR-DP-PONTE-RAZAO item 36 (F-PNT-7 b, dono 21/11: "Caixa (pago no mês)"; decisão C-4 da casa) — o FGTS e a CPP
 * **efetivamente recolhidos** no mês, que a folha do fator r soma pela leitura de caixa (LC 123 art. 18 § 24; Res. CGSN
 * 140 art. 26 § 1º). Só tipos. O adaptador real é do F5 (guias e pagamento); até lá o adaptador é nulo e todo mês do DP
 * sai incompleto.
 */
import type { AccountingScope } from '../../../scope/AccountingScope';

export interface RecolhimentoFolhaDoMes {
  fgtsCents: bigint;
  /** CPP recolhida fora do DAS (só tem efeito no fator r com Anexo IV; A-2 leitura 1 do dossiê). */
  cppCents: bigint;
}

export interface RecolhimentoFolhaPort {
  /** `null` = não há recolhimento conhecido do mês (sem o F5, sempre). */
  recolhidoNoMes(scope: AccountingScope, mes: string): Promise<RecolhimentoFolhaDoMes | null>;
}
