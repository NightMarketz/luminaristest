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
