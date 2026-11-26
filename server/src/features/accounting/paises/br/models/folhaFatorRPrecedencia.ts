/**
 * BE-INCR-DP-PONTE-RAZAO itens 37–38 (F-PNT-6 a, dono 21/11: "Ler do DP") — qual folha o fator r usa em cada mês. Função
 * pura, chamada pelo `SimplesApuracaoService` (legado BR, escopo `LEGADO_BR` do ADR-PAIS-NA-BORDA §3.1).
 *
 * Mesmo precedente da receita do Simples (subrazão × histórico, `HISTORICO_IGNORADO`):
 * - mês com folha do DP **completa** ⇒ ela prevalece; com `folhaCents` digitado no mesmo mês ⇒ `HISTORICO_FOLHA_IGNORADO`;
 * - mês com folha do DP **incompleta** ⇒ vale o histórico, se houver, com `FOLHA_DP_INCOMPLETA` (o mês e o que falta);
 * - mês sem folha do DP ⇒ o histórico, sem alerta (é a pré-adoção);
 * - qualquer mês com a folha do DP usada ⇒ `FOLHA_FATOR_R_LEITURA_PROVISORIA` (item 38): a leitura é a de caixa (F-PNT-7 b)
 *   até o contador responder A-1/A-2 do dossiê `emenda-pes4-ponte-folha`.
 */
import type { AlertaSimples } from '../../../dtos/SimplesDto';
import type { FolhaFatorR } from '../ports/FolhaFatorRPort';

export interface PrecedenciaFolha {
  /** Folha usada por mês (`null` = nenhuma fonte: o fator r conta 0, como hoje). */
  folha: Map<string, bigint | null>;
  alertas: AlertaSimples[];
}

/**
 * @param meses os meses cuja folha entra no fator r (a janela do RBT12 e o PA); só eles geram alerta.
 * @param historico `folhaCents` digitado por mês (`null`/ausente = não digitado).
 * @param dp o que a `FolhaFatorRPort` devolveu.
 */
export function precedenciaFolhaFatorR(
  meses: readonly string[],
  historico: ReadonlyMap<string, bigint | null>,
  dp: ReadonlyMap<string, FolhaFatorR>,
): PrecedenciaFolha {
  const folha = new Map<string, bigint | null>();
  const ignorados: string[] = [];
  const incompletos: string[] = [];
  let usouDp = false;
  for (const m of meses) {
    const h = historico.get(m) ?? null;
    const d = dp.get(m);
    if (d?.completa) {
      folha.set(m, d.folhaCents);
      usouDp = true;
      if (h !== null) ignorados.push(m);
    } else {
      folha.set(m, h);
      if (d) incompletos.push(`${m} (falta ${d.falta ?? 'dado do DP'})`);
    }
  }
  const alertas: AlertaSimples[] = [];
  if (incompletos.length > 0) {
    alertas.push({ severity: 'WARNING', codigo: 'FOLHA_DP_INCOMPLETA', detalhe: `folha do DP incompleta em ${incompletos.join(', ')} — o fator r usa o histórico digitado nesses meses` });
  }
  if (ignorados.length > 0) {
    alertas.push({ severity: 'WARNING', codigo: 'HISTORICO_FOLHA_IGNORADO', detalhe: `folha digitada no histórico ignorada em ${ignorados.join(', ')} — a folha do DP prevalece` });
  }
  if (usouDp) {
    alertas.push({
      severity: 'WARNING',
      codigo: 'FOLHA_FATOR_R_LEITURA_PROVISORIA',
      detalhe: 'folha do fator r tirada do DP pela leitura de caixa (pago e recolhido no mês; LC 123 art. 18 § 24): provisória até a confirmação do contador',
    });
  }
  return { folha, alertas };
}
