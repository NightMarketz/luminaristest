/**
 * Porta pública da feature `crm` para a ordem dos status e a sentinela de etapa sem ordem, que os processadores de KPI
 * do CRM (em `analytics`) usam para ordenar o funil.
 * Regra `M1` (ADR-MODULE-BOUNDARIES §10 e §11.8; dono, questionário, 25/11/2026: "Pagar as 29").
 */
export { LEAD_STATUS_ORDER, PROPOSAL_STATUS_ORDER, UNORDERED_STAGE_SENTINEL } from '../constants';
