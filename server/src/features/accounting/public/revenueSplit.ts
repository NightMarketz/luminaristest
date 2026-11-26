/**
 * Porta pública da feature `accounting` para a segregação do crédito de receita (serviço × revenda), que o intérprete
 * do `accountingBinding` reusa para dar o mesmo resultado dos mappers.
 * Regra `M1` (ADR-MODULE-BOUNDARIES §10 e §11.9; dono, questionário, 25/11/2026: "Portas e lista ajustada"). Só
 * reexporta por nome; a função e as contas moram em `sync/mappers/revenueSplit`.
 */
export { RESALE_REVENUE_ACCOUNT, SERVICE_REVENUE_ACCOUNT, splitRevenueCredit } from '../sync/mappers/revenueSplit';
export type { RevenueCreditLine } from '../sync/mappers/revenueSplit';
