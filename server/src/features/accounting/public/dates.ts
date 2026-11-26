/**
 * Porta pública da feature `accounting` para a validação de data pelo calendário (`models/dates`), que o cliente
 * da PTAX (`fx/adapters/BcbPtaxClient`) usa antes de consultar o BCB.
 * Regra `M1` (ADR-MODULE-BOUNDARIES §10 e §11.9; dono, questionário, 25/11/2026: "Pagar as 14"). Só reexporta por
 * nome; a função mora em `models/dates`.
 */
export { isValidDateOnly } from '../models/dates';
