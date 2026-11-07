/**
 * Salário-família — BE-INCR-DP-F2 item 15 e F-DPF-7 (escrito no PR-2 por decisão do dono, chat, 2026-11-07: "Escrever
 * agora"; o motor do PR-4 só consome).
 *
 * Só a forma: cota × filhos ou equiparados elegíveis, devida mensalmente ao segurado empregado (Lei 8.213 arts. 65 e 66
 * [D03]) quando a remuneração mensal não passa do limite. A cota e o limite são dado com vigência (portaria anual) e
 * **ainda não têm linha** (F-DPF-7): sem a tabela, a função devolve a pendência `SALARIO_FAMILIA_SEM_PARAMETRO`, aviso
 * não bloqueante (dono, 06/11: "Calcula e avisa") — nunca um valor padrão.
 *
 * A remuneração que define o direito é o salário de contribuição somado de todos os vínculos (INSS, página "Valor
 * limite para direito ao salário-família" [S01 do dossiê brief-pes4-f2-contador §8]): o chamador a soma.
 * A elegibilidade de cada dependente (idade até `SALARIO_FAMILIA_IDADE_MAX` ou inválido) é do item 15, já no PR-1.
 */
import type { DpPendenciaFolha } from './pendencias';
import { no, type Calculo } from './calcNode';

/** A cota e o limite vigentes na competência, com a fonte (a linha que entrar por PR de dado). */
export interface TabelaSalarioFamilia {
  cotaCents: bigint;
  limiteRemuneracaoCents: bigint;
  fonte: string;
}

export type ResultadoSalarioFamilia =
  | { tipo: 'CALCULADO'; calculo: Calculo<bigint> }
  | { tipo: 'SEM_PARAMETRO'; pendencia: DpPendenciaFolha };

/**
 * Sem dependente elegível ⇒ `null` (sem linha e sem aviso). Remuneração acima do limite ⇒ calculado com valor 0
 * (a prova diz por quê).
 */
export function salarioFamilia(
  vinculo: { id: string; matricula: string },
  dependentesElegiveis: number,
  remuneracaoMensalCents: bigint,
  tabela: TabelaSalarioFamilia | null,
): ResultadoSalarioFamilia | null {
  if (dependentesElegiveis <= 0) return null;
  if (tabela === null) {
    return {
      tipo: 'SEM_PARAMETRO',
      pendencia: {
        codigo: 'SALARIO_FAMILIA_SEM_PARAMETRO',
        vinculoId: vinculo.id,
        bloqueante: false,
        dado: vinculo.matricula,
        mensagem: `Vínculo ${vinculo.matricula}: ${dependentesElegiveis} dependente(s) com salário-família, mas a cota e o limite vigentes não estão cadastrados; o holerite sai sem o salário-família.`,
      },
    };
  }
  const dentro = remuneracaoMensalCents <= tabela.limiteRemuneracaoCents;
  const valor = dentro ? tabela.cotaCents * BigInt(dependentesElegiveis) : 0n;
  return {
    tipo: 'CALCULADO',
    calculo: {
      valor,
      prova: no(
        dentro
          ? `Salário-família: ${dependentesElegiveis} × cota ${tabela.cotaCents}`
          : `Salário-família: remuneração ${remuneracaoMensalCents} acima do limite ${tabela.limiteRemuneracaoCents}`,
        valor,
        {
          fonte: 'Lei 8.213/1991 arts. 65 e 66',
          filhos: [no(`Cota ${tabela.cotaCents}; limite ${tabela.limiteRemuneracaoCents}`, 0n, { fonte: tabela.fonte })],
        },
      ),
    },
  };
}
