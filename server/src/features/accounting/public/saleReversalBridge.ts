/**
 * Porta pública da feature `accounting` para a ponte do estorno da venda (`maybeReverseSale`), que o cancelamento
 * (`sales/services/SalesCancellationService`) chama.
 * Regra `M1` (ADR-MODULE-BOUNDARIES §10 e §11.10; dono, questionário, 26/11/2026: "Destinos propostos"). Só reexporta
 * por nome; a função mora em `services/bridges/SaleReversalBridge`.
 */
export { maybeReverseSale } from '../services/bridges/SaleReversalBridge';
