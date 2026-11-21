/**
 * Pendências da folha — BE-INCR-DP-F2 §3.1 (contrato). Nasce no PR-1 porque o item 19 (`LANCAMENTO_DUPLICADO_COM_PONTO`)
 * já a produz; o motor (PR-4) produz as outras.
 */
export const DP_PENDENCIA_CODIGOS = [
  'SEM_VERSAO_NA_COMPETENCIA',
  'PARAMETRO_LEGAL_AUSENTE',
  'JORNADA_AUSENTE',
  'AFASTAMENTO_SEM_REGRA_NO_F2',
  'LIQUIDO_NEGATIVO',
  'LANCAMENTO_DUPLICADO_COM_PONTO',
  'SALARIO_FAMILIA_SEM_PARAMETRO',
  'JORNADA_ACIMA_DO_LIMITE',
  'REPOUSO_ABAIXO_DO_MINIMO',
  // PR-4, L3 (dono, 21/11: "Trava 2/3/4/6; 7 calcula"): unidade de salário dia, semana, quinzena ou tarefa.
  'UNIDADE_SALARIO_SEM_REGRA_NO_F2',
  // PR-4, L2 (dono, 21/11): horista sem o lançamento HORAS_NORMAIS (o vínculo não calcula) ou HORAS_NORMAIS lançada em
  // vínculo que não é horista (fail closed: nunca soma nem some em silêncio). O nome do código é leitura do executor.
  'HORAS_NORMAIS_INCOERENTES',
  // PR-4, L1: lançamento de FALTAS sem a data (anterior à coluna) — sem semana não há DSR perdido; fail closed.
  'FALTA_SEM_DATA',
  // PR-4, item 41: um vínculo anterior do mesmo trabalhador tem pendência bloqueante; o teto do INSS e a soma do IRRF do
  // mês dependem dele, então este também não calcula (leitura do executor).
  'OUTRO_VINCULO_PENDENTE',
] as const;
export type DpPendenciaCodigo = (typeof DP_PENDENCIA_CODIGOS)[number];

export interface DpPendenciaFolha {
  codigo: DpPendenciaCodigo;
  vinculoId: string;
  bloqueante: boolean;
  /** Rótulo visível: matrícula, código da rubrica, tabela + data. */
  dado: string;
  mensagem: string;
}
