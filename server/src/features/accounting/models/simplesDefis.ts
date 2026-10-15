/**
 * BE-INCR-SIMPLES-DEFIS-MANUAL item 7 (F-DM-1 a) — limite da isenção dos lucros distribuídos ao sócio da ME/EPP, que decide
 * se a DEFIS pede o lucro contábil (manual 9.4.3.1 item 4). Função pura.
 *
 * Res. CGSN 140 art. 145 § 1º (`fontes-oficiais/Res-CGSN-140-2018.txt:3635`): percentuais do art. 15 da Lei 9.249 "sobre a
 * receita bruta total anual, no caso de declaração de ajuste, subtraído do valor devido no âmbito do Simples Nacional no
 * período, relativo ao IRPJ". § 2º: não se aplica a quem escritura e evidencia lucro maior que o limite.
 *
 * - Percentual = `PRESUNCAO_IRPJ` da tabela de plataforma (SERVICO 32%, REVENDA 8%), vigente em 31/12 do ano. O 16% do art.
 *   15 § 4º (`PRESUNCAO_IRPJ_REDUZIDA`) é faculdade ("poderão utilizar" — IN RFB 1.700 art. 33 § 7º) e só baixaria o
 *   limite; não entra.
 * - Receita e IRPJ = as apurações CONFIRMED do ano (`SimplesApuracao.memoria`: receita por atividade e a parcela IRPJ
 *   calculada — o DAS oficial só tem o total; BRIEF §5).
 * - Natureza sem linha na tabela (LOCACAO_MOVEL, PARCERIA_GESTAO) ⇒ limite `null` + aviso (BRIEF §5: 16%/8%/1,6% etc.
 *   não cadastrados).
 */
import { z } from 'zod';
import { mulBp, parametroVigente, type AtividadePresuncao, type TabelaApuracao } from './taxAssessmentParams';

/** O pedaço da memória gravada (`ApuracaoCalculada` + alertas) que o limite lê; o resto é ignorado. */
const MemoriaLimiteSchema = z.object({
  atividades: z.array(
    z.object({
      natureza: z.string(),
      receitaCents: z.number().int().min(0),
      tributos: z.object({ IRPJ: z.number().int().min(0).optional() }),
    }),
  ),
});

const COM_PRESUNCAO: ReadonlySet<string> = new Set<AtividadePresuncao>(['SERVICO', 'REVENDA']);

export interface LimiteIsencaoDefis {
  /** `null` = alguma natureza do ano sem presunção cadastrada. */
  limiteCents: bigint | null;
  receitaPorNaturezaCents: Record<string, bigint>;
  irpjDasCents: bigint;
  avisos: string[];
}

export function limiteIsencaoDefis(ano: number, memorias: readonly unknown[], tabela: TabelaApuracao): LimiteIsencaoDefis {
  const receita: Record<string, bigint> = {};
  let irpj = 0n;
  for (const m of memorias) {
    for (const at of MemoriaLimiteSchema.parse(m).atividades) {
      receita[at.natureza] = (receita[at.natureza] ?? 0n) + BigInt(at.receitaCents);
      irpj += BigInt(at.tributos.IRPJ ?? 0);
    }
  }
  const semPresuncao = Object.keys(receita).filter((n) => !COM_PRESUNCAO.has(n) && receita[n] > 0n).sort();
  if (semPresuncao.length > 0) {
    return {
      limiteCents: null,
      receitaPorNaturezaCents: receita,
      irpjDasCents: irpj,
      avisos: [
        `Limite de isenção (Res. CGSN 140 art. 145 § 1º) não calculado: sem percentual de presunção do IRPJ cadastrado para ${semPresuncao.join(', ')}. Confira com a contabilidade se o lucro contábil precisa ser informado (manual 9.4.3.1 item 4).`,
      ],
    };
  }
  const dataFim = `${ano}-12-31`;
  let base = 0n;
  for (const natureza of COM_PRESUNCAO) {
    const r = receita[natureza] ?? 0n;
    if (r > 0n) base += mulBp(r, parametroVigente(tabela, 'PRESUNCAO_IRPJ', dataFim, natureza as AtividadePresuncao));
  }
  return { limiteCents: base - irpj, receitaPorNaturezaCents: receita, irpjDasCents: irpj, avisos: [] };
}
