/**
 * Porta pública da feature `analytics` para os processadores de KPI do CRM, que o `CrmAnalyticsService` chama direto.
 * Importar este arquivo registra os sete processadores, como importar `kpis/crm` registrava.
 * Regra `M1` (ADR-MODULE-BOUNDARIES §10 e §11.8; dono, questionário, 25/11/2026: "Pagar as 29").
 */
export {
  crmFunnelProcessor,
  crmConversionProcessor,
  crmSourceProcessor,
  crmStatusProcessor,
  crmBantProcessor,
  crmProposalsByStatusProcessor,
  crmActivitiesByTypeProcessor,
} from '../domain/kpis/crm';
