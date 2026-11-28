/**
 * BE-INCR-DP-PONTE-RAZAO item 36 — a folha do fator r de um mês pela leitura de caixa (F-PNT-7 b, dono 21/11: "Caixa
 * (pago no mês)"; LC 123 art. 18 § 24 [D03]; Res. CGSN 140 art. 26 § 1º [D05]). Função pura.
 *
 * Soma: (i) a remuneração **paga** no mês (`bases.cp` bruta de empregados e contribuintes individuais das folhas
 * `FECHADA` pela `dataPagamento`, decisão C-4 da casa) — quem escolhe as folhas e soma as bases é o adaptador do DP, que
 * espera o F2 PR-5; (ii) o FGTS **recolhido** no mês; (iii) a CPP recolhida **fora do DAS** no mês, só com Anexo IV
 * (A-2, leitura 1 do dossiê `emenda-pes4-ponte-folha`). Sem o recolhimento (adaptador nulo até o F5), o mês sai
 * `completa = false` com o que falta, e a apuração usa o histórico digitado (item 37).
 */
import type { FolhaFatorR } from '../../../../accounting/paises/br/ports/FolhaFatorRPort';
import type { RecolhimentoFolhaDoMes } from '../../../../accounting/paises/br/ports/RecolhimentoFolhaPort';

export const FALTA_RECOLHIMENTO_F5 = 'recolhimento de FGTS/CPP (F5)';

export interface EntradaFolhaFatorR {
  mes: string;
  /** Soma das `bases.cp` brutas (empregados e CI) das folhas `FECHADA` pagas no mês. */
  remuneracaoPagaCents: bigint;
  recolhimento: RecolhimentoFolhaDoMes | null;
  /** O estabelecimento recolhe a CPP fora do DAS (Anexo IV). */
  cppForaDoDas: boolean;
}

export function folhaFatorRDoMes(e: EntradaFolhaFatorR): FolhaFatorR {
  if (e.remuneracaoPagaCents < 0n) throw new RangeError(`folhaFatorRDoMes: remuneração paga negativa em ${e.mes}`);
  const r = e.recolhimento;
  const recolhido = r === null ? 0n : r.fgtsCents + (e.cppForaDoDas ? r.cppCents : 0n);
  return {
    mes: e.mes,
    folhaCents: e.remuneracaoPagaCents + recolhido,
    origem: 'DP',
    completa: r !== null,
    falta: r === null ? FALTA_RECOLHIMENTO_F5 : null,
  };
}
