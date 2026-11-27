/**
 * BE-INCR-DP-PONTE-RAZAO item 18 (borda BR; ADR-PAIS-NA-BORDA R1/R3, F-PBA-2 a: vocabulário da lei) — o papel contábil de
 * cada rubrica do catálogo fechado do DP (F-PES-9), e os papéis brasileiros que a composição do lançamento (item 20,
 * `ComposicaoLancamentoFolhaBr`) usa.
 *
 * Regra do BRIEF: proventos de 101/103 (salário, HE, noturno, DSR, comissão, complementos) ⇒ `SALARIES_EXPENSE`;
 * 723 ⇒ `OWNER_PAY_EXPENSE`; 901 ⇒ `INTERNSHIP_STIPEND_EXPENSE`. `SALARIO_FAMILIA` é pago pela empresa e compensado no
 * INSS (Lei 8.213 art. 68); `FALTAS` reduz o provento e não é conta. `INSS_SEGURADO`, `IRRF`, `ADIANTAMENTO_DESCONTADO`
 * também são papel de rubrica sem conta própria: o item 20 os leva aos passivos (`INSS_A_RECOLHER`,
 * `IRRF_FOLHA_A_RECOLHER`, `SALARY_ADVANCES`).
 *
 * Leituras desta tabela que o BRIEF não nomeia (registradas no corpo do PR): `DSR_PERDIDO` (desconto do repouso pela
 * falta, Lei 605 art. 6º) ⇒ `FALTAS`, porque reduz o provento como a falta; `AFASTAMENTO_EMPRESA_15D` (provento de
 * 101/103) ⇒ `SALARIES_EXPENSE` pela regra dos proventos; `ADIANTAMENTO` (provento da folha de adiantamento) ⇒
 * `SALARY_ADVANCES`, a conta debitada no item 21.
 */
import type { RubricaCodigo } from '../../../../models/rubricas/catalogo';
import type { PayrollAccountRole } from '../../../../models/payrollAccountRole';

export const PAPEIS_CONTABEIS_BR = [
  // despesas
  'INSS_PATRONAL',
  'RAT',
  'TERCEIROS',
  'FGTS',
  // passivos
  'INSS_A_RECOLHER',
  'FGTS_A_RECOLHER',
  'IRRF_FOLHA_A_RECOLHER',
  // provisão (PR-P4)
  'PROVISAO_13',
  'DESPESA_13',
  // encargos sobre a provisão de 13º (dono, 26/11: "encargos divididos em férias e 13º"); os de férias são do centro
  'ENCARGOS_PROVISAO_13',
  'DESPESA_ENCARGOS_13',
  // papel de rubrica, sem conta própria
  'SALARIO_FAMILIA',
  'INSS_SEGURADO',
  'IRRF',
  'ADIANTAMENTO_DESCONTADO',
  'FALTAS',
] as const;
export type PapelContabilBr = (typeof PAPEIS_CONTABEIS_BR)[number];

/** Os 5 papéis de rubrica que não recebem conta (o item 19 não cria coluna para eles). */
export const PAPEIS_BR_SEM_CONTA: readonly PapelContabilBr[] = ['SALARIO_FAMILIA', 'INSS_SEGURADO', 'IRRF', 'ADIANTAMENTO_DESCONTADO', 'FALTAS'];

export type PapelDaRubrica = PayrollAccountRole | PapelContabilBr;

/** `Record` sobre o tipo do catálogo: rubrica nova sem papel não compila (e o teste reprova o catálogo validado). */
export const PAPEL_CONTABIL_POR_RUBRICA: Readonly<Record<RubricaCodigo, PapelDaRubrica>> = {
  SALARIO_BASE: 'SALARIES_EXPENSE',
  HORAS_NORMAIS: 'SALARIES_EXPENSE',
  HORA_EXTRA_50: 'SALARIES_EXPENSE',
  HORA_EXTRA_100: 'SALARIES_EXPENSE',
  ADICIONAL_NOTURNO: 'SALARIES_EXPENSE',
  COMISSAO: 'SALARIES_EXPENSE',
  DSR_VARIAVEIS: 'SALARIES_EXPENSE',
  COMPLEMENTO_MINIMO: 'SALARIES_EXPENSE',
  COMPLEMENTO_PISO: 'SALARIES_EXPENSE',
  AFASTAMENTO_EMPRESA_15D: 'SALARIES_EXPENSE',
  PRO_LABORE: 'OWNER_PAY_EXPENSE',
  BOLSA_ESTAGIO: 'INTERNSHIP_STIPEND_EXPENSE',
  ADIANTAMENTO: 'SALARY_ADVANCES',
  INSS_SEGURADO: 'INSS_SEGURADO',
  IRRF: 'IRRF',
  FGTS_MES: 'FGTS',
  FALTAS: 'FALTAS',
  DSR_PERDIDO: 'FALTAS',
  DESCONTO_ADIANTAMENTO: 'ADIANTAMENTO_DESCONTADO',
  SALARIO_FAMILIA: 'SALARIO_FAMILIA',
};
