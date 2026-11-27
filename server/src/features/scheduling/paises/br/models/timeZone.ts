/**
 * BE-INCR-ESCALA-BASE F-ESC-13/F-ESC-18 — fuso padrão da borda BR para a unidade sem `timeZone` (PRE-ADR
 * `PRE-ADR-ESCALA-DISPONIBILIDADE.md` §F-ESC-13 (a): "BR: `America/Sao_Paulo`"). Ligado pela factory e pelo script de
 * rollout; o centro (`features/scheduling/models`) não importa `paises/` (R3).
 */
export const BR_DEFAULT_TIME_ZONE = 'America/Sao_Paulo';
