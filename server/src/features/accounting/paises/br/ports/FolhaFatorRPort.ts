/**
 * BE-INCR-DP-PONTE-RAZAO item 35 (F-PNT-6 a, dono 21/11: "Ler do DP") — a folha do fator r chega à apuração do Simples
 * por esta porta, não por gravação no `SimplesHistoricoMensal` (o histórico é da pré-adoção, `SimplesApuracaoService`).
 *
 * Só tipos. O fator r é do Simples (LC 123 art. 18 § 24; Res. CGSN 140 art. 26), então a porta mora na borda brasileira
 * da contabilidade (ADR-PAIS-NA-BORDA R2). O adaptador do DP (`features/dp/paises/br/adapters/`) é montado só no
 * `lib/factory.ts`: a contabilidade não importa o DP (sem ciclo `accounting → dp`, `X3-no-circular`).
 */
import type { AccountingScope } from '../../../scope/AccountingScope';

/** Folha do fator r de um mês, pela leitura de caixa (F-PNT-7 b). `completa = false` ⇒ o histórico digitado manda. */
export interface FolhaFatorR {
  mes: string;
  folhaCents: bigint;
  origem: 'DP';
  completa: boolean;
  /** O que falta para o mês ficar completo (ex.: o recolhimento de FGTS/CPP, que é do F5); `null` quando completa. */
  falta: string | null;
}

export interface FolhaFatorRPort {
  /** Um item por mês que o DP conhece; mês ausente do mapa = o DP não tem folha nele (vale o histórico, sem alerta). */
  folhaPorMes(scope: AccountingScope, meses: readonly string[]): Promise<Map<string, FolhaFatorR>>;
}
