/**
 * Códigos de erro do DP — BE-INCR-DP-F0-F1 item 5 (PR-0), lista do §3.6.
 *
 * Sem classe nova: os erros são `ValidationError` (400) e `ConflictError` (409) de `lib/errors`. O `reason` vai no
 * `errorCode` (o `handleApiError` o devolve como `code`) e, no 400, também em `details.reason`. O texto em português
 * fica no `throw`; o FE traduz pelo `reason`.
 */
import { ConflictError, ValidationError } from '../../../lib/errors';

export const DP_ERROR_REASONS = [
  'DP_MODULE_MISSING_DEPENDENCY',
  'DP_MODULE_REQUIRES_ONE_OF',
  'DP_MODULE_UNAVAILABLE',
  'DP_MODULE_ACTIVATION_OVERLAP',
  'DP_MODULE_DEPENDENT_ACTIVE',
  'DP_JORNADA_EM_USO',
  'DP_CODIGO_DUPLICADO',
  'DP_CPF_DUPLICADO',
  'DP_MATRICULA_DUPLICADA',
  'DP_EMPLOYEE_REF_INVALIDO',
  'DP_CATEGORIA_FORA_DO_NUCLEO',
  'DP_APRENDIZ_IDADE',
  'DP_APRENDIZ_PRAZO',
  'DP_IDADE_MINIMA',
  'DP_PRO_LABORE_SEM_SOCIO',
  'DP_PRO_LABORE_FORA_DA_SOCIEDADE',
  'DP_PRO_LABORE_MEI',
  'DP_VERSAO_SOBREPOSTA',
  'DP_VERSAO_ANTES_DO_INICIO',
  'DP_TRABALHADOR_COM_VINCULO',
  'DP_AFASTAMENTO_SOBREPOSTO',
  'DP_FERIAS_PERIODO_INEXISTENTE',
  // BE-INCR-DP-F2 PR-0R (item 68): escala que não se descreve por dias fixos da semana × minutos por dia (12×36 é do F6).
  'DP_ESCALA_IRREGULAR',
] as const;
export type DpErrorReason = (typeof DP_ERROR_REASONS)[number];

/** 400 com `reason` no `code` e em `details.reason` (mais o contexto em `extra`, nunca PII). */
export function dpValidationError(reason: DpErrorReason, message: string, extra: Record<string, unknown> = {}): ValidationError {
  return new ValidationError(message, { reason, ...extra }, reason);
}

/** 409 com `reason` no `code`. */
export function dpConflictError(reason: DpErrorReason, message: string): ConflictError {
  return new ConflictError(message, reason);
}
